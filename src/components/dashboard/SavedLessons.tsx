import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
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
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Remove the session from state
      setSessions(prev => prev.filter(session => session._id !== sessionId));
      if (selectedSession?._id === sessionId) {
        setSelectedSession(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete the recording. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Saved Lessons</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Lesson History</h2>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedSession?._id === session._id
                      ? 'bg-indigo-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="flex-grow text-left"
                  >
                    <p className={`font-medium ${
                      selectedSession?._id === session._id
                        ? 'text-indigo-700'
                        : 'text-gray-900'
                    }`}>
                      {session.teacherId.firstName} {session.teacherId.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(session.startTime), 'PPp')}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(session._id)}
                    disabled={isDeleting}
                    className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                    title="Delete recording"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No saved lessons yet
                </p>
              )}
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