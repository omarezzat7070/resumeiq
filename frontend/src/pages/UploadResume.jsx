import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

const UploadResume = () => {
  const [file, setFile] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select a resume file (PDF or DOCX)');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const { data: resume } = await api.post('/resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { data: analysis } = await api.post('/analysis', {
        resumeId: resume._id,
        jobTitle,
        jobDescription
      });

      navigate(`/analysis/${analysis._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractSkills = async () => {
    if (!jobDescription) return;
    try {
      const { data } = await api.post('/analysis/jobdesc', { jobDescription });
      setSkills(data);
    } catch (err) {
      console.error(err);
      setError('Failed to extract skills');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Analyze Your Resume</h1>
      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="bg-parchment border border-stone-200 rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Resume File (PDF or DOCX)</label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full border rounded-lg px-4 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Job Title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            placeholder="e.g. Backend Developer"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Job Description</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 h-40"
            placeholder="Paste the full job description here..."
            required
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={handleExtractSkills} className="bg-stone-200 text-cocoa px-3 py-1 rounded hover:bg-stone-300">Extract Skills</button>
            <span className="text-sm text-taupe">Use AI to extract required and nice-to-have skills</span>
          </div>
          {skills && (
            <div className="mt-3 bg-cream border border-stone-200 p-3 rounded">
              <div>
                <strong>Required Skills:</strong>
                <div className="text-sm mt-1">{(skills.requiredSkills || []).join(', ') || '—'}</div>
              </div>
              <div className="mt-2">
                <strong>Nice to Have:</strong>
                <div className="text-sm mt-1">{(skills.niceToHave || []).join(', ') || '—'}</div>
              </div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white py-2 rounded-lg font-medium hover:bg-primaryDark disabled:opacity-60"
        >
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </form>
    </div>
  );
};

export default UploadResume;
