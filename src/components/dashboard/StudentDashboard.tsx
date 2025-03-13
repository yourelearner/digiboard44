import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../layout/Layout';
import { Video } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoinWhiteboard = () => {
    navigate('/student/live-whiteboard');
  };

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Welcome, {user?.firstName}!</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Join Live Whiteboard Session</h2>
            <p className="text-gray-600 mb-6">
              Click below to join a live whiteboard session with your teacher. The session will be automatically recorded and saved.
            </p>
            <button
              onClick={handleJoinWhiteboard}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg mx-auto transition-colors"
            >
              <Video size={20} />
              Join Live Session
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudentDashboard;