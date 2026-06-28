import { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { Link } from 'react-router-dom';

const ResumeHistory = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/resumes');
        setResumes(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p className="text-center mt-12">Loading resumes...</p>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Resume History</h1>
        <Link to="/upload" className="bg-primary text-white px-4 py-2 rounded-lg">Upload New</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-sm text-gray-600">
            <tr>
              <th className="p-3">File</th>
              <th className="p-3">Type</th>
              <th className="p-3">Uploaded</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resumes.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">No resumes uploaded yet.</td>
              </tr>
            )}
            {resumes.map((r) => (
              <tr key={r._id} className="border-t hover:bg-gray-50">
                <td className="p-3">{r.originalFileName}</td>
                <td className="p-3">{r.fileType}</td>
                <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-primary mr-3">View</a>
                  <Link to={`/upload`} className="text-gray-700">Analyze</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResumeHistory;
