import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Layout from '../layout/Layout';
import SavedLessonPlayer from '../SavedLessons/SavedLessonPlayer';

interface Session {
  _id: string;
  teacherId: {
    firstName: string;
    lastName: string;
  };
  videoUrl: string;
  startTime: string;
}

const SavedLessons = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/student`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Saved Lessons</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Lesson History</h2>
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session._id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedSession?._id === session._id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium">
                    {session.teacherId.firstName} {session.teacherId.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(session.startTime), 'PPp')}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            {selectedSession ? (
              <SavedLessonPlayer videoUrl={selectedSession.videoUrl} />
            ) : (
              <div className="p-6 text-center text-gray-500">
                Select a lesson to view the recording
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SavedLessons;