import express from 'express';
import { auth, studentAuth } from '../middleware/auth.js';
import Session from '../models/Session.js';

const router = express.Router();

// Create a new session
router.post('/', auth, studentAuth, async (req, res) => {
  try {
    const { teacherId, videoUrl, whiteboardData } = req.body;
    const session = new Session({
      teacherId,
      studentId: req.user.userId,
      videoUrl,
      whiteboardData,
      endTime: new Date()
    });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student's saved sessions
router.get('/student', auth, studentAuth, async (req, res) => {
  try {
    const sessions = await Session.find({ studentId: req.user.userId })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;