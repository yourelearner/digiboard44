import React from 'react';
import Layout from '../layout/Layout';
import StudentWhiteboard from '../Whiteboard/StudentWhiteboard';

const LiveWhiteboard = () => {
  return (
    <Layout>
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          <StudentWhiteboard />
        </div>
      </div>
    </Layout>
  );
};

export default LiveWhiteboard;