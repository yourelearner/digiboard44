import React, { useRef, useState, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Play, X, Eraser } from 'lucide-react';
import { io } from 'socket.io-client';
import { SketchCanvas } from '../../types/whiteboard';

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

const TeacherWhiteboard: React.FC = () => {
  const canvasRef = useRef<SketchCanvas>(null);
  const [isLive, setIsLive] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');

    socket.on('connect', () => {
      console.log('Teacher connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Teacher disconnected from server');
      setIsLive(false);
    });

    // Clean up on component unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      if (userId && isLive) {
        socket.emit('stopLive', userId);
      }
    };
  }, [isLive]);

  const handleStartLive = () => {
    setShowModal(true);
  };

  const confirmStartLive = async () => {
    const userId = localStorage.getItem('userId');
    if (userId && canvasRef.current) {
      setIsLive(true);
      setShowModal(false);
      socket.emit('startLive', userId);
      
      // Send initial canvas state
      const paths = await canvasRef.current.exportPaths();
      socket.emit('whiteboardUpdate', {
        teacherId: userId,
        whiteboardData: JSON.stringify(paths)
      });
    }
  };

  const handleStopLive = () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setIsLive(false);
      socket.emit('stopLive', userId);
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
    }
  };

  const handleStroke = async () => {
    if (isLive && canvasRef.current) {
      try {
        const paths = await canvasRef.current.exportPaths();
        const userId = localStorage.getItem('userId');
        if (userId) {
          socket.emit('whiteboardUpdate', {
            teacherId: userId,
            whiteboardData: JSON.stringify(paths)
          });
        }
      } catch (error) {
        console.error('Error handling stroke:', error);
      }
    }
  };

  const handleClearCanvas = async () => {
    if (canvasRef.current && isLive) {
      await canvasRef.current.clearCanvas();
      const userId = localStorage.getItem('userId');
      if (userId) {
        socket.emit('whiteboardUpdate', {
          teacherId: userId,
          whiteboardData: JSON.stringify([])
        });
      }
    }
  };

  return (
    <>
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Whiteboard</h2>
          <div className="flex gap-2">
            {isLive && (
              <button
                onClick={handleClearCanvas}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Eraser size={20} /> Clear Board
              </button>
            )}
            <button
              onClick={isLive ? handleStopLive : handleStartLive}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isLive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white`}
            >
              {isLive ? (
                <>
                  <X size={20} /> Stop Live
                </>
              ) : (
                <>
                  <Play size={20} /> Start Live
                </>
              )}
            </button>
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={4}
            strokeColor="black"
            width="800px"
            height="600px"
            onStroke={handleStroke}
            onChange={handleStroke}
            canvasColor="white"
            exportWithBackgroundImage={false}
            withTimestamp={false}
            allowOnlyPointerType="all"
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Start Live Session</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to start a live whiteboard session? Students will be able to join and view your whiteboard.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartLive}
                className="px-4 py-2 rounded-md bg-green-500 hover:bg-green-600 text-white"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeacherWhiteboard;