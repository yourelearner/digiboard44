import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Video, Square } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { uploadSessionRecording } from '../../lib/cloudinary';
import { WhiteboardUpdate, TeacherStatus } from '../../types/socket';

const socket: Socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

const StudentWhiteboard: React.FC = () => {
  const canvasRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [whiteboardHistory, setWhiteboardHistory] = useState<string[]>([]);
  const [isTeacherLive, setIsTeacherLive] = useState(false);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [currentPaths, setCurrentPaths] = useState<string>('[]');

  const handleStopRecording = useCallback(async () => {
    if (!isRecording || !recordingStartTime || !currentTeacherId) return;

    setIsRecording(false);

    try {
      const recordingData = {
        history: whiteboardHistory,
        startTime: recordingStartTime,
        endTime: new Date()
      };

      const videoUrl = await uploadSessionRecording(JSON.stringify(recordingData));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          teacherId: currentTeacherId,
          videoUrl,
          whiteboardData: JSON.stringify(whiteboardHistory)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      alert('Recording saved successfully!');
      setWhiteboardHistory([]);
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording. Please try again.');
    }
  }, [isRecording, recordingStartTime, currentTeacherId, whiteboardHistory]);

  useEffect(() => {
    const handleWhiteboardUpdate = async (data: WhiteboardUpdate) => {
      if (canvasRef.current) {
        await canvasRef.current.clearCanvas();
        if (data.whiteboardData && data.whiteboardData !== '[]') {
          const paths = JSON.parse(data.whiteboardData);
          await canvasRef.current.loadPaths(paths);
          setCurrentPaths(data.whiteboardData);

          if (isRecording) {
            setWhiteboardHistory(prev => [...prev, data.whiteboardData]);
          }
        }
      }
    };

    const handleTeacherOnline = (data: TeacherStatus) => {
      setIsTeacherLive(true);
      setCurrentTeacherId(data.teacherId);
      socket.emit('joinTeacherRoom', data.teacherId);
    };

    const handleTeacherOffline = () => {
      setIsTeacherLive(false);
      setCurrentTeacherId(null);
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
      if (isRecording) {
        handleStopRecording();
      }
      setCurrentPaths('[]');
    };

    socket.on('connect', () => {});
    socket.on('disconnect', () => {
      setIsTeacherLive(false);
      setCurrentTeacherId(null);
      if (isRecording) {
        handleStopRecording();
      }
      setCurrentPaths('[]');
    });

    socket.on('whiteboardUpdate', handleWhiteboardUpdate);
    socket.on('teacherOnline', handleTeacherOnline);
    socket.on('teacherOffline', handleTeacherOffline);

    return () => {
      socket.off('whiteboardUpdate', handleWhiteboardUpdate);
      socket.off('teacherOnline', handleTeacherOnline);
      socket.off('teacherOffline', handleTeacherOffline);
      socket.off('connect');
      socket.off('disconnect');

      if (currentTeacherId) {
        socket.emit('leaveTeacherRoom', currentTeacherId);
      }
    };
  }, [isRecording, currentTeacherId, handleStopRecording]);

  const handleStartRecording = () => {
    if (!isTeacherLive) {
      alert('Cannot start recording when teacher is not live');
      return;
    }
    setIsRecording(true);
    setRecordingStartTime(new Date());
    setWhiteboardHistory([currentPaths]); // Start with current canvas state
  };

  if (!isTeacherLive) {
    return (
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Live Whiteboard</h2>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white p-8 flex items-center justify-center min-h-[600px]">
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
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Live Whiteboard</h2>
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-md ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
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
      <div className="border rounded-lg overflow-hidden bg-white">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={4}
          strokeColor="black"
          width="800px"
          height="600px"
          style={{ pointerEvents: 'none' }}
          canvasColor="white"
          exportWithBackgroundImage={false}
          withTimestamp={false}
          allowOnlyPointerType="all"
          readOnly={true}
        />
      </div>
    </div>
  );
};

export default StudentWhiteboard;