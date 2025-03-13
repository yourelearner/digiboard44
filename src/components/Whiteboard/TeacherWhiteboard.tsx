import React, { useRef, useState, useEffect } from 'react';
import CanvasDraw from 'react-canvas-draw';
import { Play, X } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL);

const TeacherWhiteboard: React.FC = () => {
  const whiteboardRef = useRef<any>(null);
  const [isLive, setIsLive] = useState(false);

  const handleStartLive = () => {
    setIsLive(true);
    socket.emit('startLive', localStorage.getItem('userId'));
  };

  const handleStopLive = () => {
    setIsLive(false);
    socket.emit('stopLive', localStorage.getItem('userId'));
  };

  const handleDraw = () => {
    if (isLive && whiteboardRef.current) {
      const data = {
        teacherId: localStorage.getItem('userId'),
        whiteboardData: whiteboardRef.current.getSaveData()
      };
      socket.emit('whiteboardUpdate', data);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Whiteboard</h2>
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
      <div className="border rounded-lg overflow-hidden">
        <CanvasDraw
          ref={whiteboardRef}
          onChange={handleDraw}
          brushRadius={2}
          lazyRadius={0}
          brushColor="#000"
          canvasWidth={800}
          canvasHeight={600}
          className="bg-white"
        />
      </div>
    </div>
  );
};

export default TeacherWhiteboard;