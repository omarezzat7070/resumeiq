import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis' },
    provider: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    meta: { type: Object, default: {} }
  },
  { timestamps: true }
);

export default mongoose.model('AiUsage', aiUsageSchema);
