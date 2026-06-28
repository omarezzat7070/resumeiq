import express from 'express';
import {
  analyzeResume,
  getAnalyses,
  getAnalysisById,
  getDashboardStats,
  analyzeJobDescription
  , getAdminStats
} from '../controllers/analysisController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', analyzeResume);
router.post('/jobdesc', analyzeJobDescription);
router.get('/', getAnalyses);
router.get('/stats', getDashboardStats);
router.get('/admin/stats', adminOnly, getAdminStats);
router.get('/:id', getAnalysisById);

export default router;
