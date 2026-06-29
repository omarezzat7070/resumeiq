import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';

const ScoreCircle = ({ label, score }) => (
  <div className="bg-parchment border border-stone-200 rounded-lg shadow-sm p-6 text-center flex-1">
    <p className="text-sm text-taupe mb-2">{label}</p>
    <p className="text-4xl font-bold text-primary">{score}%</p>
  </div>
);

const ListCard = ({ title, items, color }) => (
  <div className="bg-parchment border border-stone-200 rounded-lg shadow-sm p-6">
    <h3 className="font-semibold mb-3">{title}</h3>
    {(items || []).length === 0 ? (
      <p className="text-sm text-taupe">None</p>
    ) : (
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className={`text-sm px-3 py-2 rounded-lg ${color}`}>
            {item}
          </li>
        ))}
      </ul>
    )}
  </div>
);

const SectionChecks = ({ checks = [] }) => {
  const tone = {
    pass: 'bg-green-50 text-green-700 border-green-100',
    warning: 'bg-amber-50 text-amber-800 border-amber-100',
    fail: 'bg-red-50 text-red-700 border-red-100'
  };

  return (
    <div className="bg-parchment border border-stone-200 rounded-lg shadow-sm p-6">
      <h3 className="font-semibold mb-3">ATS Section Checks</h3>
      <div className="space-y-2">
        {checks.map((check, index) => (
          <div key={`${check.label}-${index}`} className={`border rounded-lg px-3 py-2 ${tone[check.status] || tone.warning}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{check.label}</p>
              <p className="text-xs uppercase">{check.status}</p>
            </div>
            <p className="text-xs mt-1">{check.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalysisResult = () => {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/analysis/${id}`);
        setAnalysis(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <p className="text-center mt-12">Loading analysis...</p>;
  if (error) return <p className="text-center mt-12 text-red-500">{error}</p>;
  if (!analysis) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{analysis.jobTitle}</h1>
        <p className="text-taupe text-sm">
          Analyzed on {new Date(analysis.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <ScoreCircle label="Match Score" score={analysis.matchScore} />
        <ScoreCircle label="ATS Score" score={analysis.atsScore} />
        <ScoreCircle label="Keyword Coverage" score={analysis.keywordCoverage?.percentage || 0} />
      </div>

      <div className="bg-parchment border border-stone-200 rounded-lg shadow-sm p-6">
        <h3 className="font-semibold mb-3">Keyword Coverage</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-taupe">
          <p>Required skills found: <strong>{analysis.keywordCoverage?.requiredFound || 0}</strong> / {analysis.keywordCoverage?.requiredTotal || 0}</p>
          <p>Nice-to-have skills found: <strong>{analysis.keywordCoverage?.niceFound || 0}</strong> / {analysis.keywordCoverage?.niceTotal || 0}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ListCard title="Found Skills" items={analysis.foundSkills} color="bg-green-50 text-green-700" />
        <ListCard title="Missing Skills" items={analysis.missingSkills} color="bg-red-50 text-red-700" />
        <ListCard title="Required Skills" items={analysis.requiredSkills} color="bg-stone-100 text-cocoa" />
        <ListCard title="Nice-to-Have Skills" items={analysis.niceToHaveSkills} color="bg-orange-50 text-orange-800" />
        <ListCard title="Strengths" items={analysis.strengths} color="bg-emerald-50 text-emerald-700" />
        <ListCard title="Weaknesses" items={analysis.weaknesses} color="bg-amber-50 text-amber-700" />
        <ListCard title="ATS Findings" items={analysis.atsFindings} color="bg-stone-100 text-taupe" />
        <SectionChecks checks={analysis.sectionChecks} />
      </div>

      <ListCard title="AI Recommendations" items={analysis.recommendations} color="bg-orange-50 text-primaryDark" />

      <div className="bg-parchment border border-stone-200 rounded-lg shadow-sm p-6">
        <h3 className="font-semibold mb-3">Improved Summary</h3>
        <p className="text-sm text-taupe leading-relaxed">{analysis.improvedSummary}</p>
      </div>
    </div>
  );
};

export default AnalysisResult;
