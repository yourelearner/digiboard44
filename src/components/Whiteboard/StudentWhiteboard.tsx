import React, { useRef, useState, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Video, Square } from 'lucide-react';
import { io } from 'socket.io-client';
import { uploadSessionRecording } from '../../lib/cloudinary';

const socket = io(import.meta.env.VITE_API_URL, {
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

  useEffect(() => {
    const teacherId = localStorage.getItem('userId');
    if (teacherId) {
      socket.emit('joinTeacherRoom', teacherId);
    }

    const handleWhiteboardUpdate = async (data: any) => {
      if (canvasRef.current) {
        await canvasRef.current.clearCanvas();
        if (data.whiteboardData && data.whiteboardData !== '[]') {
          await canvasRef.current.loadPaths(JSON.parse(data.whiteboardData));
        }
        if (isRecording) {
          setWhiteboardHistory(prev => [...prev, data.whiteboardData]);
        }
      }
    };

    const handleTeacherOnline = () => {
      console.log('Teacher is online');
      setIsTeacherLive(true);
    };

    const handleTeacherOffline = () => {
      console.log('Teacher went offline');
      setIsTeacherLive(false);
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
    };

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsTeacherLive(false);
    });

    socket.on('whiteboardUpdate', handleWhiteboardUpdate);
    socket.on('teacherOnline', handleTeacherOnline);
    socket.on('teacherOffline', handleTeacherOffline);

    return () => {
      socket.off('whiteboardUpdate', handleWhiteboardUpdate);
      socket.off('teacherOnline', handleTeacherOnline);
      socket.off('teacherOffline', handleTeacherOffline);
      if (teacherId) {
        socket.emit('leaveTeacherRoom', teacherId);
      }
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    if (!isTeacherLive) {
      alert('Cannot start recording when teacher is not live');
      return;
    }
    setIsRecording(true);
    setRecordingStartTime(new Date());
    setWhiteboardHistory([]);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    if (!recordingStartTime) return;

    try {
      const recordingData = JSON.stringify({
        history: whiteboardHistory,
        startTime: recordingStartTime,
        endTime: new Date()
      });

      const videoUrl = await uploadSessionRecording(recordingData);

      await fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          teacherId: localStorage.getItem('currentTeacherId'),
          videoUrl,
          whiteboardData: JSON.stringify(whiteboardHistory)
        })
      });

      alert('Recording saved successfully!');
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording');
    }
  };

  if (!isTeacherLive) {
    return (
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Live Whiteboard</h2>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white p-8 flex items-center justify-center min-h-[600px]">
          <div className="text-center text-gray-500">
            <p className="text-xl font-semibold mb-2">Teacher is not live</p>
            <p>Please wait for the teacher to start the session</p>
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
          readOnly={true}
        />
      </div>
    </div>
  );
};

export default StudentWhiteboard;