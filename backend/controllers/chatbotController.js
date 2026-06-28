/**
 * Chatbot Controller - Handles chat endpoints
 */

import { processChatMessage, generateCVFromData, buildCVPDF } from '../services/chatbotService.js';
import { extractTextFromFile } from '../services/resumeParser.js';

export const handleChatMessage = async (req, res, next) => {
  try {
    const { message, step, cvData } = req.body;
    
    if (!message || !step) {
      return res.status(400).json({ message: 'Message and step are required' });
    }

    const result = await processChatMessage(req.user._id, message, step, cvData);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const uploadCVForChat = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Parse the uploaded CV
    const extractedText = await extractTextFromFile(req.file.path);
    
    const reply = `Great! I've analyzed your CV. I can see:\n- Length: ${extractedText.length} characters\n- Key sections detected: Experience, Education, Skills\n\nNow, paste your job description or tell me what role you're targeting so I can optimize your CV for better ATS and job matching.`;
    
    const cvData = {
      currentCvContent: extractedText,
      uploadedFileName: req.file.originalname
    };

    res.json({
      reply,
      nextStep: 'improve_focus',
      cvData,
      actions: [
        { label: 'Paste Job Description', action: 'paste_job' },
        { label: 'Describe Target Role', action: 'describe_role' }
      ]
    });
  } catch (error) {
    next(error);
  }
};

export const generateCV = async (req, res, next) => {
  try {
    const { cvData } = req.body;
    
    if (!cvData) {
      return res.status(400).json({ message: 'CV data is required' });
    }

    // Generate CV from data
    const generatedCV = await generateCVFromData(cvData);
    
    // Convert to PDF
    const pdfContent = buildCVPDF(generatedCV);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
    res.setHeader('Content-Length', pdfContent.length);
    
    res.send(pdfContent);
  } catch (error) {
    next(error);
  }
};

export const getConversationHistory = async (req, res, next) => {
  try {
    // In production, would fetch from database
    // For now, return empty history
    res.json({ messages: [] });
  } catch (error) {
    next(error);
  }
};
