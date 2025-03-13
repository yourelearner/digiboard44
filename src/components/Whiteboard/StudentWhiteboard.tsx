import React, { useRef, useState, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Video, Square } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { uploadSessionRecording } from '../../lib/cloudinary';
import { WhiteboardUpdate, TeacherStatus } from '../../types/socket';
import { SketchCanvas, RecordingData } from '../../types/whiteboard';

const socket: Socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

const StudentWhiteboard: React.FC = () => {
  const canvasRef = useRef<SketchCanvas>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [whiteboardHistory, setWhiteboardHistory] = useState<string[]>([]);
  const [isTeacherLive, setIsTeacherLive] = useState(false);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  useEffect(() => {
    const handleWhiteboardUpdate = async (data: WhiteboardUpdate) => {
      console.log('Received whiteboard update:', data);
      if (canvasRef.current && data.whiteboardData) {
        try {
          const paths = JSON.parse(data.whiteboardData);
          await canvasRef.current.clearCanvas();
          await canvasRef.current.loadPaths(paths);
          
          if (isRecording) {
            setWhiteboardHistory(prev => [...prev, data.whiteboardData]);
          }
        } catch (error) {
          console.error('Error parsing whiteboard data:', error);
        }
      }
    };

    const handleTeacherOnline = (data: TeacherStatus) => {
      console.log('Teacher is online:', data);
      setIsTeacherLive(true);
      setCurrentTeacherId(data.teacherId);
      socket.emit('joinTeacherRoom', data.teacherId);
    };

    const handleTeacherOffline = () => {
      console.log('Teacher went offline');
      setIsTeacherLive(false);
      setCurrentTeacherId(null);
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
    };

    socket.on('connect', () => {
      console.log('Student connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Student disconnected from server');
      setIsTeacherLive(false);
      setCurrentTeacherId(null);
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
  }, [isRecording, currentTeacherId]);

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
    if (!isRecording || !recordingStartTime || !currentTeacherId) return;
    
    setIsRecording(false);

    try {
      const recordingData: RecordingData = {
        history: whiteboardHistory,
        startTime: recordingStartTime,
        endTime: new Date()
      };

      const videoUrl = await uploadSessionRecording(JSON.stringify(recordingData));

      await fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, {
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