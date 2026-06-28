import express from 'express';
import {
  handleChatMessage,
  uploadCVForChat,
  generateCV,
  getConversationHistory
} from '../controllers/chatbotController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// POST /api/chat - Handle chat messages
router.post('/', handleChatMessage);

// POST /api/chat/upload-cv - Upload CV for improvement
router.post('/upload-cv', upload.single('file'), uploadCVForChat);

// POST /api/chat/generate-cv - Generate CV from data
router.post('/generate-cv', generateCV);

// GET /api/chat/history - Get conversation history
router.get('/history', getConversationHistory);

export default router;
