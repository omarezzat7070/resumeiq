import path from 'path';
import Resume from '../models/Resume.js';
import { extractTextFromFile } from '../services/resumeParser.js';

// POST /api/resumes  (multipart/form-data, field name: "resume")
export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const extractedText = await extractTextFromFile(req.file.path);
    const fileUrl = `/uploads/${req.file.filename}`;

    const resume = await Resume.create({
      userId: req.user._id,
      originalFileName: req.file.originalname,
      fileUrl,
      fileType: ext,
      extractedText
    });

    res.status(201).json(resume);
  } catch (error) {
    next(error);
  }
};

// GET /api/resumes
export const getResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(resumes);
  } catch (error) {
    next(error);
  }
};

// GET /api/resumes/:id
export const getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.json(resume);
  } catch (error) {
    next(error);
  }
};
