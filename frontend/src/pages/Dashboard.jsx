import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import StatCard from '../components/StatCard.jsx';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, analysesRes] = await Promise.all([
          api.get('/analysis/stats'),
          api.get('/analysis')
        ]);
        setStats(statsRes.data);
        setAnalyses(analysesRes.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p className="text-center mt-12">Loading dashboard...</p>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/upload" className="bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primaryDark">
          + New Analysis
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Analyses" value={stats?.totalAnalyses ?? 0} />
        <StatCard label="Average Match Score" value={`${stats?.avgMatchScore ?? 0}%`} />
        <StatCard label="Best Match Score" value={`${stats?.bestMatchScore ?? 0}%`} />
        <StatCard label="Uploaded Resumes" value={stats?.uploadedResumes ?? 0} />
      </div>

      <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
      <div className="bg-parchment border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-stone-100 text-sm text-taupe">
            <tr>
              <th className="p-3">Resume</th>
              <th className="p-3">Job Title</th>
              <th className="p-3">Score</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {analyses.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-taupe">
                  No analyses yet. Upload a resume to get started.
                </td>
              </tr>
            )}
            {analyses.map((a) => (
              <tr key={a._id} className="border-t border-stone-200 hover:bg-cream">
                <td className="p-3">
                  <Link to={`/analysis/${a._id}`} className="text-primary">
                    {a.resumeId?.originalFileName || 'Resume'}
                  </Link>
                </td>
                <td className="p-3">{a.jobTitle}</td>
                <td className="p-3">{a.matchScore}%</td>
                <td className="p-3">{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
