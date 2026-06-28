import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Extracts plain text from an uploaded PDF or DOCX resume file
export const extractTextFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  throw new Error('Unsupported file type. Only PDF and DOCX are supported.');
};
