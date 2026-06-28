import Resume from '../models/Resume.js';
import Analysis from '../models/Analysis.js';
import AiUsage from '../models/AiUsage.js';
import User from '../models/User.js';
import { analyzeResumeWithAI } from '../services/aiService.js';
import { extractSkillsFromJobDescription } from '../services/aiService.js';

// POST /api/analysis  { resumeId, jobTitle, jobDescription }
export const analyzeResume = async (req, res, next) => {
  try {
    const { resumeId, jobTitle, jobDescription } = req.body;

    if (!resumeId || !jobTitle || !jobDescription) {
      return res.status(400).json({ message: 'resumeId, jobTitle and jobDescription are required' });
    }

    const resume = await Resume.findOne({ _id: resumeId, userId: req.user._id });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const aiResponse = await analyzeResumeWithAI(resume.extractedText, jobTitle, jobDescription);
    const aiResult = aiResponse.result || aiResponse;

    const analysis = await Analysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      jobTitle,
      jobDescription,
      ...aiResult
    });

    // record AI usage if provided
    try {
      const usage = aiResponse.usage || {};
      await AiUsage.create({
        userId: req.user._id,
        analysisId: analysis._id,
        provider: usage.provider || (process.env.OPENAI_API_KEY ? 'openai' : 'ollama'),
        promptTokens: usage.promptTokens || 0,
        completionTokens: usage.completionTokens || 0,
        cost: usage.cost || 0,
        meta: { model: process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL }
      });
    } catch (err) {
      console.error('Failed to record AI usage:', err.message);
    }

    res.status(201).json(analysis);
  } catch (error) {
    next(error);
  }
};

// POST /api/analysis/jobdesc  { jobDescription }
export const analyzeJobDescription = async (req, res, next) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription) return res.status(400).json({ message: 'jobDescription is required' });

    const skills = await extractSkillsFromJobDescription(jobDescription);
    res.json(skills);
  } catch (error) {
    next(error);
  }
};

// GET /api/analysis
export const getAnalyses = async (req, res, next) => {
  try {
    const analyses = await Analysis.find({ userId: req.user._id })
      .populate('resumeId', 'originalFileName')
      .sort({ createdAt: -1 });

    res.json(analyses);
  } catch (error) {
    next(error);
  }
};

// GET /api/analysis/:id
export const getAnalysisById = async (req, res, next) => {
  try {
    const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('resumeId', 'originalFileName fileUrl');

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

// GET /api/analysis/stats  (dashboard stats for the logged-in user)
export const getDashboardStats = async (req, res, next) => {
  try {
    const analyses = await Analysis.find({ userId: req.user._id });
    const resumeCount = await Resume.countDocuments({ userId: req.user._id });

    const totalAnalyses = analyses.length;
    const avgMatchScore = totalAnalyses
      ? Math.round(analyses.reduce((sum, a) => sum + a.matchScore, 0) / totalAnalyses)
      : 0;
    const bestMatchScore = totalAnalyses
      ? Math.max(...analyses.map((a) => a.matchScore))
      : 0;

    res.json({
      totalAnalyses,
      avgMatchScore,
      bestMatchScore,
      uploadedResumes: resumeCount
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analysis/admin/stats  (admin only)
export const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ emailVerified: true });

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyAnalyses = await Analysis.countDocuments({ createdAt: { $gte: dayAgo } });
    const weeklyAnalyses = await Analysis.countDocuments({ createdAt: { $gte: weekAgo } });
    const monthlyAnalyses = await Analysis.countDocuments({ createdAt: { $gte: monthAgo } });

    const aiUsageCount = await AiUsage.countDocuments();
    const aiUsageCost = (await AiUsage.aggregate([{ $group: { _id: null, total: { $sum: '$cost' } } }]))[0]?.total || 0;

    res.json({
      users: { totalUsers, activeUsers },
      analyses: { daily: dailyAnalyses, weekly: weeklyAnalyses, monthly: monthlyAnalyses },
      aiUsage: { requests: aiUsageCount, cost: aiUsageCost }
    });
  } catch (error) {
    next(error);
  }
};
