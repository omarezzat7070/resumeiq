import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
    jobTitle: { type: String, required: true },
    jobDescription: { type: String, required: true },
    matchScore: { type: Number, default: 0 },
    atsScore: { type: Number, default: 0 },
    foundSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    requiredSkills: { type: [String], default: [] },
    niceToHaveSkills: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    improvedSummary: { type: String, default: '' },
    atsFindings: { type: [String], default: [] },
    sectionChecks: { type: [mongoose.Schema.Types.Mixed], default: [] },
    keywordCoverage: {
      requiredFound: { type: Number, default: 0 },
      requiredTotal: { type: Number, default: 0 },
      niceFound: { type: Number, default: 0 },
      niceTotal: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export default mongoose.model('Analysis', analysisSchema);
