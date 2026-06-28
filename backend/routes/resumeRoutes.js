import express from 'express';
import { uploadResume, getResumes, getResumeById } from '../controllers/resumeController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.post('/', upload.single('resume'), uploadResume);
router.get('/', getResumes);
router.get('/:id', getResumeById);

export default router;
