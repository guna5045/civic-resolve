import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { AlertCircle, CheckCircle, RefreshCw, ClipboardList } from 'lucide-react';
import StatsCard from '../components/common/StatsCard';
import ComplaintCard from '../components/common/ComplaintCard';
import { Link } from 'react-router-dom';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, resolved: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const fetchOfficerData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await api.get(`/officers/${user._id}/stats`);
      if (statsRes.data.success) {
        const s = statsRes.data.data;
        setStats({
          total: s.totalAssigned,
          inProgress: s.inProgress,
          resolved: s.resolved,
          pending: s.reported,
        });
      }

      // Fetch complaints filtered by assignedOfficer
      const compRes = await api.get(`/complaints?officer=${user._id}`);
      if (compRes.data.success) {
        setComplaints(compRes.data.data.slice(0, 3)); // show top 3 recent
      }
    } catch (err) {
      console.error('Error fetching officer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficerData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Officer Console</h2>
        <p className="text-xs text-slate-400">Department: {user?.department?.name || 'Municipal Officer'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Assigned"
          value={stats.total}
          icon={ClipboardList}
          description="Lifetime assigned tickets"
          colorClass="text-brand-400 bg-brand-500/10 border-brand-500/20"
        />
        <StatsCard
          title="Assigned (New)"
          value={stats.pending}
          icon={AlertCircle}
          description="Awaiting inspection"
          colorClass="text-blue-400 bg-blue-500/10 border-blue-500/20"
        />
        <StatsCard
          title="In Progress"
          value={stats.inProgress}
          icon={RefreshCw}
          description="Currently active repairs"
          colorClass="text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
        />
        <StatsCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle}
          description="Issues closed and resolved"
          colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        />
      </div>

      {/* Active Work list */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-base font-bold text-slate-200">Active Work Assignments</h4>
          <Link to="/officer/assigned" className="text-xs font-semibold text-brand-400 hover:underline">
            View All Tasks &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="glass-panel rounded-xl border border-slate-800 py-12 text-center text-sm text-slate-500">
            No work assignments. You are all caught up!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {complaints.map((c) => (
              <ComplaintCard key={c._id} complaint={c} userRole="Department Officer" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerDashboard;
