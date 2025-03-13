import React, { useRef, useEffect, useState } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Play, Pause, RotateCcw } from 'lucide-react';
import axios from 'axios';

interface SavedLessonPlayerProps {
  videoUrl: string;
}

const SavedLessonPlayer: React.FC<SavedLessonPlayerProps> = ({ videoUrl }) => {
  const canvasRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [whiteboardHistory, setWhiteboardHistory] = useState<string[]>([]);

  useEffect(() => {
    const loadRecording = async () => {
      try {
        const response = await axios.get(videoUrl);
        setWhiteboardHistory(response.data.history);
      } catch (error) {
        console.error('Error loading recording:', error);
      }
    };

    loadRecording();
  }, [videoUrl]);

  useEffect(() => {
    let animationFrame: number;

    const animate = async () => {
      if (isPlaying && currentFrame < whiteboardHistory.length) {
        if (canvasRef.current) {
          await canvasRef.current.clearCanvas();
          await canvasRef.current.loadPaths(JSON.parse(whiteboardHistory[currentFrame]));
        }
        setCurrentFrame(prev => prev + 1);
        animationFrame = requestAnimationFrame(animate);
      } else if (currentFrame >= whiteboardHistory.length) {
        setIsPlaying(false);
      }
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, currentFrame, whiteboardHistory]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = async () => {
    setCurrentFrame(0);
    setIsPlaying(false);
    if (canvasRef.current) {
      await canvasRef.current.clearCanvas();
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Saved Lesson</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isPlaying ? (
              <>
                <Pause size={20} /> Pause
              </>
            ) : (
              <>
                <Play size={20} /> Play
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-500 hover:bg-gray-600 text-white"
          >
            <RotateCcw size={20} /> Reset
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
          readOnly
        />
      </div>
    </div>
  );
};

export default SavedLessonPlayer;