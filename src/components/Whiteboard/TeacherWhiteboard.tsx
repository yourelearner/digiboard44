import React, { useRef, useState } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Play, X, Eraser } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL);

const TeacherWhiteboard: React.FC = () => {
  const canvasRef = useRef<any>(null);
  const [isLive, setIsLive] = useState(false);

  const handleStartLive = () => {
    setIsLive(true);
    socket.emit('startLive', localStorage.getItem('userId'));
  };

  const handleStopLive = () => {
    setIsLive(false);
    socket.emit('stopLive', localStorage.getItem('userId'));
  };

  const handleStroke = async () => {
    if (isLive && canvasRef.current) {
      const paths = await canvasRef.current.exportPaths();
      const data = {
        teacherId: localStorage.getItem('userId'),
        whiteboardData: JSON.stringify(paths)
      };
      socket.emit('whiteboardUpdate', data);
    }
  };

  const handleClearCanvas = async () => {
    if (canvasRef.current) {
      await canvasRef.current.clearCanvas();
      if (isLive) {
        socket.emit('whiteboardUpdate', {
          teacherId: localStorage.getItem('userId'),
          whiteboardData: JSON.stringify([])
        });
      }
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Whiteboard</h2>
        <div className="flex gap-2">
          <button
            onClick={handleClearCanvas}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Eraser size={20} /> Clear Board
          </button>
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
        />
      </div>
    </div>
  );
};

export default TeacherWhiteboard;