import React from 'react';

interface SavedLessonPlayerProps {
  videoUrl: string;
}

const SavedLessonPlayer: React.FC<SavedLessonPlayerProps> = ({ videoUrl }) => {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Saved Lesson</h2>
      </div>
      <div className="border rounded-lg overflow-hidden bg-white">
        <video
          controls
          className="w-full h-auto"
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default SavedLessonPlayer;