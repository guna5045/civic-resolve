import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import api from '../services/api';
import { 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ShieldAlert, 
  Users, 
  Layers, 
  ShieldCheck, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Clock, 
  MapPin, 
  Calendar, 
  ClipboardCheck, 
  XOctagon, 
  HelpCircle,
  TrendingUp,
  FolderSync,
  Sparkles
} from 'lucide-react';
import StatsCard from '../components/common/StatsCard';
import { formatDate, cleanSystemFormatting, getClarificationData } from '../utils/formatters';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#64748b'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  
  const tooltipStyle = theme === 'dark' 
    ? {
        contentStyle: { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' },
        labelStyle: { color: '#94a3b8' },
        itemStyle: { color: '#f1f5f9' }
      }
    : {
        contentStyle: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
        labelStyle: { color: '#475569' },
        itemStyle: { color: '#0f172a' }
      };

  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingResolutions, setPendingResolutions] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const analyticsRes = await api.get('/admin/analytics');
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
      
      const logsRes = await api.get('/admin/audit-logs');
      if (logsRes.data.success) {
        setAuditLogs(logsRes.data.data.slice(0, 6)); // show recent 6
      }

      const resolutionsRes = await api.get('/complaints?status=Resolved');
      if (resolutionsRes.data.success) {
        setPendingResolutions(resolutionsRes.data.data);
      }

      const settingsRes = await api.get('/admin/settings');
      if (settingsRes.data.success) {
        setAiEnabled(settingsRes.data.data.aiEnabled);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      const res = await api.patch(`/admin/complaints/${id}/resolve-review`, { decision: 'Accept' });
      if (res.data.success) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error accepting resolution:', err);
    }
  };

  const handleReject = async (id) => {
    if (!remarks.trim()) return;
    try {
      const res = await api.patch(`/admin/complaints/${id}/resolve-review`, { decision: 'Reject', remarks });
      if (res.data.success) {
        setRejectingId(null);
        setRemarks('');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error rejecting resolution:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Format Recharts data
  const priorityChartData = analytics?.priorityStats?.map((p) => ({
    name: p._id || 'Medium',
    value: p.count
  })) || [];

  const deptChartData = analytics?.departmentStats?.map((d) => ({
    name: d.name.replace(' Department', ''),
    'Total Tickets': d.count,
    'Resolved': d.resolved
  })) || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Under Review': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Clarification Required': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Information Clarified': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Assigned': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'In Progress': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'Resolved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Closed': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      case 'Rejected': return 'text-rose-455 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Municipal Command Center</h2>
          <p className="text-xs text-slate-400">City-wide analytics overview, real-time ticket review panel, and operation monitoring.</p>
        </div>
        <button
          onClick={fetchAdminData}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Refresh Dashboard"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Main Status Counts Grid */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Complaint Status Counters</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <StatsCard
                title="Total Complaints"
                value={analytics?.complaints?.total || 0}
                icon={Layers}
                description="Intake from all platforms"
                colorClass="text-brand-400 bg-brand-500/10 border-brand-500/20"
                onClick={() => navigate('/admin/complaints')}
              />
              <StatsCard
                title="Pending Review"
                value={analytics?.complaints?.pendingReview || 0}
                icon={Clock}
                description="Submitted & Under Review"
                colorClass="text-amber-400 bg-amber-500/10 border-amber-500/20"
                onClick={() => navigate('/admin/complaints', { state: { tab: 'review' } })}
              />
              <StatsCard
                title="Assigned"
                value={analytics?.complaints?.assigned || 0}
                icon={FolderSync}
                description="Dispatched to department queue"
                colorClass="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                onClick={() => navigate('/admin/complaints', { state: { tab: 'active', status: 'Assigned' } })}
              />
              <StatsCard
                title="In Progress"
                value={analytics?.complaints?.inProgress || 0}
                icon={TrendingUp}
                description="Active fields & escalated"
                colorClass="text-violet-400 bg-violet-500/10 border-violet-500/20"
                onClick={() => navigate('/admin/complaints', { state: { tab: 'active', status: 'Work Started' } })}
              />
              <StatsCard
                title="Resolved"
                value={analytics?.complaints?.resolved || 0}
                icon={CheckCircle}
                description="Awaiting admin closure confirmation"
                colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                onClick={() => navigate('/admin/complaints', { state: { tab: 'resolved', status: 'Resolved' } })}
              />
              <StatsCard
                title="Closed"
                value={analytics?.complaints?.closed || 0}
                icon={ClipboardCheck}
                description="Successfully closed complaints"
                colorClass="text-slate-400 bg-slate-500/10 border-slate-500/20"
                onClick={() => navigate('/admin/complaints', { state: { tab: 'resolved', status: 'Closed' } })}
              />
              <StatsCard
                title="Clarification Requested"
                value={analytics?.complaints?.clarificationRequired || 0}
                icon={HelpCircle}
                description="Awaiting reporter update"
                colorClass="text-orange-400 bg-orange-500/10 border-orange-500/20"
                onClick={() => navigate('/admin/complaints', { state: { tab: 'clarify', status: 'Clarification Required' } })}
              />
              <StatsCard
                title="Rejected"
                value={analytics?.complaints?.rejected || 0}
                icon={XOctagon}
                description="Declined by administration"
                colorClass="text-rose-400 bg-rose-500/10 border-rose-500/20"
                onClick={() => navigate('/admin/complaints', { state: { tab: 'clarify', status: 'Rejected' } })}
              />
            </div>
          </div>

          {/* Infrastructure Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div 
              onClick={() => navigate('/admin/departments')}
              className="glass-panel rounded-xl border border-slate-800 p-5 flex items-center justify-between cursor-pointer hover:border-brand-500/30 hover:bg-slate-800/10 active:scale-[0.98] transition-all"
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Service Departments</span>
                <span className="text-2xl font-bold text-slate-100">{analytics?.users?.departments || 0}</span>
                <span className="text-[10px] text-slate-400 block">Dynamic municipal agencies</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>

            <div 
              onClick={() => navigate('/admin/officers')}
              className="glass-panel rounded-xl border border-slate-800 p-5 flex items-center justify-between cursor-pointer hover:border-brand-500/30 hover:bg-slate-800/10 active:scale-[0.98] transition-all"
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Department Officers</span>
                <span className="text-2xl font-bold text-slate-100">{analytics?.users?.officers || 0}</span>
                <span className="text-[10px] text-slate-400 block">Active field inspectors</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div 
              onClick={() => navigate('/admin/audit-logs')}
              className="glass-panel rounded-xl border border-slate-800 p-5 flex items-center justify-between cursor-pointer hover:border-brand-500/30 hover:bg-slate-800/10 active:scale-[0.98] transition-all"
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Security Audit Trail</span>
                <span className="text-2xl font-bold text-slate-100">Live Logs</span>
                <span className="text-[10px] text-slate-400 block">Governance transaction logs</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <div 
              onClick={() => navigate('/admin/settings')}
              className="glass-panel rounded-xl border border-slate-800 p-5 flex items-center justify-between cursor-pointer hover:border-brand-500/30 hover:bg-slate-800/10 active:scale-[0.98] transition-all"
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">AI Control Mode</span>
                <span className={`text-sm font-extrabold block ${aiEnabled ? 'text-emerald-450' : 'text-amber-500'}`}>
                  {aiEnabled ? 'AI Enabled' : 'AI Disabled'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {aiEnabled ? 'Google Gemini Mode' : 'Fallback Engine Mode'}
                </span>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                aiEnabled 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-450' 
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
              }`}>
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Resolution Review Queue */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Officer Resolution Review Queue</h3>
                <p className="text-xs text-slate-400">Review and verify completed complaints before marking them as Closed.</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {pendingResolutions.length} Pending
              </span>
            </div>

            {pendingResolutions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No resolutions pending review at this time.
              </div>
            ) : (
              <div className="space-y-6">
                {pendingResolutions.map((c) => (
                  <div key={c._id} className="p-5 rounded-xl border border-slate-800 bg-slate-950/20 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/40 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-350 font-mono">{c.complaintId}</span>
                          <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2.5 py-0.5 rounded-full border border-brand-500/20">
                            {c.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200 mt-1">{c.title}</h4>
                      </div>
                      <div className="text-xs text-slate-400 text-left md:text-right">
                        <div>Reporter: <span className="text-slate-300 font-semibold">{c.citizen?.fullName}</span></div>
                        <div>Officer: <span className="text-slate-300 font-semibold">{c.assignedOfficer?.fullName || 'N/A'}</span></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left side: Notes and info */}
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Citizen description</span>
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{cleanSystemFormatting(getClarificationData(c).description)}</p>
                        </div>
                        <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Officer resolution proof notes</span>
                          <p className="text-xs text-slate-300 leading-relaxed mt-1">
                            {cleanSystemFormatting(c.resolutionNotes) || 'No notes provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Right side: Proof images */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Proof Photos (Before vs After)</span>
                        <div className="flex gap-4">
                          <div>
                            <span className="text-[9px] text-slate-500 block mb-1">Before:</span>
                            {c.images && c.images.length > 0 ? (
                              <div className="flex gap-1.5">
                                {c.images.slice(0, 2).map((img, idx) => (
                                  <a key={idx} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 block hover:border-brand-500 transition-colors">
                                    <img src={img} alt="Before" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic">No photo</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block mb-1">After (Resolution Proof):</span>
                            {c.afterImages && c.afterImages.length > 0 ? (
                              <div className="flex gap-1.5">
                                {c.afterImages.slice(0, 2).map((img, idx) => (
                                  <a key={idx} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 block hover:border-emerald-500 transition-colors">
                                    <img src={img} alt="After" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            ) : c.resolutionImages && c.resolutionImages.length > 0 ? (
                              <div className="flex gap-1.5">
                                {c.resolutionImages.slice(0, 2).map((img, idx) => (
                                  <a key={idx} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 block hover:border-emerald-500 transition-colors">
                                    <img src={img} alt="After" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic">No photo</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-3 border-t border-slate-800/40">
                      {rejectingId === c._id ? (
                        <div className="w-full space-y-3">
                          <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Enter rejection remarks or feedback for the officer..."
                            className="w-full text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 animate-fade-in"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRemarks('');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleReject(c._id)}
                              disabled={!remarks.trim()}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50 cursor-pointer"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAccept(c._id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" /> Accept & Close Ticket
                          </button>
                          <button
                            onClick={() => setRejectingId(c._id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-rose-400 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" /> Reject Resolution
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feeds Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Recent Complaints Feed */}
            <div className="lg:col-span-6 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block border-b border-slate-850 pb-2.5">
                Recent Complaint Activity
              </span>

              {analytics?.recentComplaintActivity && analytics.recentComplaintActivity.length > 0 ? (
                <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                  {analytics.recentComplaintActivity.map((c) => (
                    <div key={c._id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-300 font-mono">{c.complaintId}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500">{c.department?.name.replace(' Department', '')}</span>
                        </div>
                        <h4 className="font-bold text-slate-200 mt-1 truncate">{c.title}</h4>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Reporter: {c.citizen?.fullName || 'Anonymous'}</span>
                      </div>
                      <div className="text-right flex flex-col items-end shrink-0 gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">No recent reports found.</div>
              )}
            </div>

            {/* Recent Assignments Feed */}
            <div className="lg:col-span-6 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block border-b border-slate-850 pb-2.5">
                Recent Assignment Activity
              </span>

              {analytics?.recentAssignmentActivity && analytics.recentAssignmentActivity.length > 0 ? (
                <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                  {analytics.recentAssignmentActivity.map((c) => (
                    <div key={c._id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-350 font-mono">{c.complaintId}</span>
                          <span className="text-[9px] uppercase tracking-wider text-brand-400">{c.department?.name.replace(' Department', '')}</span>
                        </div>
                        <h4 className="font-bold text-slate-200 mt-1 truncate">{c.title}</h4>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Officer: {c.assignedOfficer?.fullName || 'N/A'}</span>
                      </div>
                      <div className="text-right flex flex-col items-end shrink-0 gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border text-indigo-400 bg-indigo-500/10 border-indigo-500/20">
                          {c.status}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {c.assignmentTimestamp ? formatDate(c.assignmentTimestamp) : formatDate(c.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">No recent assignments completed.</div>
              )}
            </div>
          </div>

          {/* Charts Layout Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Department Workloads Bar Chart */}
            <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">
                Department Workload Distribution
              </span>
              
              {deptChartData.length > 0 ? (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Bar dataKey="Total Tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">No department stats available.</div>
              )}
            </div>

            {/* Priority Distribution Pie Chart */}
            <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">
                Priority Distribution
              </span>

              {priorityChartData.length > 0 ? (
                <div className="w-full h-72 flex flex-col justify-center items-center">
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {priorityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">No priority metrics available.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
