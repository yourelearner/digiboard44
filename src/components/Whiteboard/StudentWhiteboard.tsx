import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { Video, Square } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { RecordRTCPromisesHandler } from 'recordrtc';
import { uploadSessionRecording } from '../../lib/cloudinary';
import { WhiteboardUpdate, TeacherStatus } from '../../types/socket';

// Create socket connection outside component to maintain a single instance
const socket: Socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

const StudentWhiteboard: React.FC = () => {
  const canvasRef = useRef<ReactSketchCanvasRef | null>(null);
  const recorderRef = useRef<RecordRTCPromisesHandler | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTeacherLive, setIsTeacherLive] = useState(false);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const handleWhiteboardUpdate = useCallback(async (data: WhiteboardUpdate) => {
    console.log('Received whiteboard update:', data);
    if (!canvasRef.current) return;

    try {
      await canvasRef.current.clearCanvas();
      if (data.whiteboardData && data.whiteboardData !== '[]') {
        const paths = JSON.parse(data.whiteboardData);
        await canvasRef.current.loadPaths(paths);
      }
    } catch (error) {
      console.error('Error updating whiteboard:', error);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!recorderRef.current || !currentTeacherId) return;

    try {
      await recorderRef.current.stopRecording();
      const blob = await recorderRef.current.getBlob();

      const videoBlob = new Blob([blob], { type: 'video/webm' });

      console.log('Uploading recording to Cloudinary...');
      const videoUrl = await uploadSessionRecording(videoBlob);
      console.log('Upload successful, video URL:', videoUrl);

      const whiteboardData = canvasRef.current ?
        JSON.stringify(await canvasRef.current.exportPaths()) :
        '[]';

      console.log('Saving session to backend...');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          teacherId: currentTeacherId,
          videoUrl,
          whiteboardData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error('Failed to save session');
      }

      const tracks = recorderRef.current.getState().stream.getTracks();
      tracks.forEach(track => track.stop());
      recorderRef.current = null;
      setIsRecording(false);

      alert('Recording saved successfully!');
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording. Please try again.');
      setIsRecording(false);
    }
  }, [currentTeacherId]);

  const handleStartRecording = async () => {
    if (!isTeacherLive) {
      alert('Cannot start recording when teacher is not live');
      return;
    }

    try {
      const container = document.getElementById('student-whiteboard-container');
      if (!container) {
        throw new Error('Whiteboard container not found');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: container.clientWidth },
          height: { ideal: container.clientHeight }
        }
      });

      recorderRef.current = new RecordRTCPromisesHandler(stream, {
        type: 'video',
        mimeType: 'video/webm',
        disableLogs: false,
        timeSlice: 1000 // Record in 1-second chunks
      });

      await recorderRef.current.startRecording();
      setIsRecording(true);

      stream.getVideoTracks()[0].onended = () => {
        handleStopRecording();
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please try again.');
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('student-whiteboard-container');
      if (container) {
        const width = container.clientWidth;
        const height = Math.min(window.innerHeight - 200, width * 0.75);
        setCanvasSize({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Socket event handlers
  useEffect(() => {
    const handleTeacherOnline = (data: TeacherStatus) => {
      console.log('Teacher online:', data);
      setIsTeacherLive(true);
      setCurrentTeacherId(data.teacherId);
      socket.emit('joinTeacherRoom', data.teacherId);
    };

    const handleTeacherOffline = () => {
      console.log('Teacher offline');
      setIsTeacherLive(false);
      setCurrentTeacherId(null);
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
      if (isRecording) {
        handleStopRecording();
      }
    };

    const handleConnect = () => {
      console.log('Connected to server');
      if (currentTeacherId) {
        socket.emit('joinTeacherRoom', currentTeacherId);
      }
    };

    const handleDisconnect = () => {
      console.log('Disconnected from server');
      if (isRecording) {
        handleStopRecording();
      }
    };

    // Register event handlers
    socket.on('whiteboardUpdate', handleWhiteboardUpdate);
    socket.on('teacherOnline', handleTeacherOnline);
    socket.on('teacherOffline', handleTeacherOffline);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Cleanup
    return () => {
      socket.off('whiteboardUpdate', handleWhiteboardUpdate);
      socket.off('teacherOnline', handleTeacherOnline);
      socket.off('teacherOffline', handleTeacherOffline);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);

      if (currentTeacherId) {
        socket.emit('leaveTeacherRoom', currentTeacherId);
      }
    };
  }, [handleWhiteboardUpdate, handleStopRecording, isRecording, currentTeacherId]);

  if (!isTeacherLive) {
    return (
      <div className="p-4">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold">Live Whiteboard</h2>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white p-8 flex items-center justify-center min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
          <div className="text-center text-gray-500">
            <p className="text-xl font-semibold mb-2">Waiting for teacher...</p>
            <p>The session will begin when the teacher starts the whiteboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Live Whiteboard</h2>
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-md ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white w-full sm:w-auto justify-center`}
        >
          {isRecording ? (
            <>
              <Square size={20} /> Stop Recording
            </>
          ) : (
            <>
              <Video size={20} /> Start Recording
            </>
          )}
        </button>
      </div>
      <div id="student-whiteboard-container" className="border rounded-lg overflow-hidden bg-white">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={4}
          strokeColor="black"
          width={`${canvasSize.width}px`}
          height={`${canvasSize.height}px`}
          style={{ pointerEvents: 'none' }}
          canvasColor="white"
          exportWithBackgroundImage={false}
          withTimestamp={false}
          allowOnlyPointerType="all"
          className="touch-none"
        />
      </div>
    </div>
  );
};

export default StudentWhiteboard;