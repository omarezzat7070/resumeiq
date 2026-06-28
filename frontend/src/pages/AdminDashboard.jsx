import { useEffect, useState } from 'react';
import api from '../api/axios.js';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/analysis/admin/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p className="text-center mt-12">Loading admin dashboard...</p>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold">Users</h3>
          <p>Total: {stats?.users?.totalUsers ?? 0}</p>
          <p>Active (verified): {stats?.users?.activeUsers ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold">Analyses</h3>
          <p>Daily: {stats?.analyses?.daily ?? 0}</p>
          <p>Weekly: {stats?.analyses?.weekly ?? 0}</p>
          <p>Monthly: {stats?.analyses?.monthly ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold">AI Usage</h3>
          <p>Requests: {stats?.aiUsage?.requests ?? 0}</p>
          <p>Estimated Cost: ${stats?.aiUsage?.cost?.toFixed(2) ?? 0}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
