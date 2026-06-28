import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalFileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'docx'], required: true },
    extractedText: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('Resume', resumeSchema);
