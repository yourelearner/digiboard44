import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('startLive', (teacherId) => {
    console.log('Teacher started live session:', teacherId);
    socket.join(`teacher-${teacherId}`);
    io.emit('teacherOnline', { teacherId });
  });

  socket.on('stopLive', (teacherId) => {
    console.log('Teacher stopped live session:', teacherId);
    io.emit('teacherOffline', { teacherId });
    socket.leave(`teacher-${teacherId}`);
  });

  socket.on('joinTeacherRoom', (teacherId) => {
    console.log('Student joined teacher room:', teacherId);
    socket.join(`teacher-${teacherId}`);
  });

  socket.on('leaveTeacherRoom', (teacherId) => {
    console.log('Student left teacher room:', teacherId);
    socket.leave(`teacher-${teacherId}`);
  });

  socket.on('whiteboardUpdate', (data) => {
    console.log('Whiteboard update from teacher:', data.teacherId);
    io.to(`teacher-${data.teacherId}`).emit('whiteboardUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});