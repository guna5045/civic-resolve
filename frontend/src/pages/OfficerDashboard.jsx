import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Activity,
  Zap,
  ShieldAlert
} from 'lucide-react';
import StatsCard from '../components/common/StatsCard';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/formatters';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    pendingVerification: 0,
    verified: 0,
    workStarted: 0,
    resolvedAwaitingVerification: 0,
    resolvedToday: 0,
    averageResolutionTime: 0,
    highPriorityIssues: 0,
    overdueIssues: 0,
    recentAssignments: [],
    recentActivity: [],
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/officers/dashboard');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching officer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Officer Workstation</h2>
          <p className="text-xs text-slate-400">Department: {user?.departmentName || 'Municipal Operations'} Queue</p>
        </div>
        <div className="bg-slate-950/45 border border-slate-850 px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-brand-400" />
          Active Session: {user?.fullName}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <StatsCard
              title="Assigned Issues"
              value={stats.totalAssigned}
              icon={ClipboardList}
              description="Total workload assigned"
              colorClass="text-brand-400 bg-brand-500/10 border-brand-500/20"
              onClick={() => navigate('/officer/assigned')}
            />
            <StatsCard
              title="Pending Verification"
              value={stats.pendingVerification}
              icon={Clock}
              description="Awaiting on-site verification"
              colorClass="text-blue-400 bg-blue-500/10 border-blue-500/20"
              onClick={() => navigate('/officer/assigned', { state: { status: 'Assigned' } })}
            />
            <StatsCard
              title="Verified (Awaiting Decision)"
              value={stats.verified}
              icon={CheckCircle}
              description="Verified, pending action choice"
              colorClass="text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
              onClick={() => navigate('/officer/assigned', { state: { status: 'Verified' } })}
            />
            <StatsCard
              title="Work Started"
              value={stats.workStarted}
              icon={RefreshCw}
              description="Active repair work in progress"
              colorClass="text-amber-400 bg-amber-500/10 border-amber-500/20"
              onClick={() => navigate('/officer/assigned', { state: { status: 'Work Started' } })}
            />
            <StatsCard
              title="Awaiting Verification"
              value={stats.resolvedAwaitingVerification}
              icon={CheckCircle}
              description="Resolved, pending review"
              colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              onClick={() => navigate('/officer/assigned', { state: { status: 'Resolved' } })}
            />
            <StatsCard
              title="Resolved Today"
              value={stats.resolvedToday}
              icon={Zap}
              description="Tickets completed today"
              colorClass="text-teal-400 bg-teal-500/10 border-teal-500/20"
              onClick={() => navigate('/officer/assigned', { state: { status: 'Resolved' } })}
            />
            <StatsCard
              title="Avg Resolution Speed"
              value={`${stats.averageResolutionTime} Hrs`}
              icon={Activity}
              description="Average resolution time"
              colorClass="text-purple-400 bg-purple-500/10 border-purple-500/20"
              onClick={() => navigate('/officer/analytics')}
            />
            <StatsCard
              title="High Priority Issues"
              value={stats.highPriorityIssues}
              icon={AlertCircle}
              description="High / Critical priority"
              colorClass="text-rose-455 bg-rose-500/10 border-rose-500/20"
              onClick={() => navigate('/officer/assigned', { state: { priority: 'High' } })}
            />
          </div>

          {/* Details Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Recent Assignments */}
            <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-xs font-semibold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="h-4.5 w-4.5 text-brand-400" /> Recent Work Assignments
                </span>
                <Link to="/officer/assigned" className="text-[10px] font-bold text-brand-400 uppercase tracking-widest hover:underline">
                  View Workspace &rarr;
                </Link>
              </div>

              {stats.recentAssignments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 italic">No recent assignments found.</div>
              ) : (
                <div className="space-y-3.5">
                  {stats.recentAssignments.map((c) => (
                    <div key={c._id} className="p-3.5 bg-slate-950/30 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                            {c.complaintId}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                            {c.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 truncate leading-snug">{c.title}</h4>
                        <div className="text-[10px] text-slate-550 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Reported: {formatDate(c.createdAt)}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded block ${
                          c.priority === 'Critical' || c.priority === 'High' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-slate-900 text-slate-400'
                        }`}>
                          {c.priority}
                        </span>
                        <span className="text-[9px] font-mono text-slate-450 block">{c.citizen?.fullName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-xs font-semibold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-brand-400" /> Action Activity Logs
                </span>
              </div>

              {stats.recentActivity.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 italic">No logged activity recorded.</div>
              ) : (
                <div className="space-y-4 max-h-[310px] overflow-y-auto pr-1">
                  {stats.recentActivity.map((act, idx) => (
                    <div key={idx} className="flex gap-3 text-xs leading-relaxed">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="h-2 w-2 rounded-full bg-brand-400 mt-1.5" />
                        {idx < stats.recentActivity.length - 1 && (
                          <div className="w-0.5 bg-slate-850 flex-1 my-1" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-300">{act.eventTitle}</span>
                          <span className="text-[9px] font-mono text-slate-500">({act.complaintId})</span>
                        </div>
                        <p className="text-[11px] text-slate-450">{act.description}</p>
                        <span className="text-[9px] text-slate-650 block">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default OfficerDashboard;
