import express from 'express';
import {
	registerUser,
	loginUser,
	getMe,
	verifyEmail,
	resendVerification
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

export default router;
