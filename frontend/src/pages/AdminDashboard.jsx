import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AlertCircle, CheckCircle, RefreshCw, ShieldAlert, Users, Layers, ShieldCheck, ThumbsUp, ThumbsDown, MessageSquare, Clock } from 'lucide-react';
import StatsCard from '../components/common/StatsCard';
import { formatDate } from '../utils/formatters';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingResolutions, setPendingResolutions] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [remarks, setRemarks] = useState('');
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
        setAuditLogs(logsRes.data.data.slice(0, 5)); // show recent 5
      }

      const resolutionsRes = await api.get('/complaints?status=Resolved');
      if (resolutionsRes.data.success) {
        setPendingResolutions(resolutionsRes.data.data);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Governance Control Panel</h2>
          <p className="text-xs text-slate-400">City-wide analytics overview, department audits, and system configuration.</p>
        </div>
        <button
          onClick={fetchAdminData}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
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
          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="Total Complaints"
              value={analytics?.complaints?.total || 0}
              icon={Layers}
              description="Cumulative reported issues"
              colorClass="text-brand-400 bg-brand-500/10 border-brand-500/20"
            />
            <StatsCard
              title="Active Escalations"
              value={analytics?.complaints?.escalated || 0}
              icon={ShieldAlert}
              description="SLA breach auto-escalated"
              colorClass="text-rose-400 bg-rose-500/10 border-rose-500/20"
            />
            <StatsCard
              title="Resolved"
              value={analytics?.complaints?.resolved || 0}
              icon={CheckCircle}
              description="Successfully verified resolved"
              colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            />
            <StatsCard
              title="Registered Citizens"
              value={analytics?.users?.citizens || 0}
              icon={Users}
              description="Cumulative user base"
              colorClass="text-blue-400 bg-blue-500/10 border-blue-500/20"
            />
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
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{c.description}</p>
                        </div>
                        <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Officer resolution proof notes</span>
                          <p className="text-xs text-slate-300 leading-relaxed mt-1">
                            {c.resolutionNotes || 'No notes provided.'}
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
                              <span className="text-[10px] text-slate-605 italic">No photo</span>
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
                              <span className="text-[10px] text-slate-605 italic">No photo</span>
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
                            className="w-full text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRemarks('');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleReject(c._id)}
                              disabled={!remarks.trim()}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAccept(c._id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" /> Accept & Close Ticket
                          </button>
                          <button
                            onClick={() => setRejectingId(c._id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-rose-450 border border-slate-850 hover:border-slate-800 transition-colors"
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

          {/* Department Breakdown Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Department workload index</span>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="py-3 font-semibold uppercase tracking-wider">Department</th>
                      <th className="py-3 font-semibold uppercase tracking-wider text-center">Total Tickets</th>
                      <th className="py-3 font-semibold uppercase tracking-wider text-center">Resolved</th>
                      <th className="py-3 font-semibold uppercase tracking-wider text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {analytics?.departmentStats?.map((dept) => {
                      const percent = dept.count > 0 ? Math.round((dept.resolved / dept.count) * 100) : 0;
                      return (
                        <tr key={dept._id} className="hover:bg-slate-900/30 text-slate-300">
                          <td className="py-3.5 font-semibold text-slate-200">{dept.name}</td>
                          <td className="py-3.5 text-center">{dept.count}</td>
                          <td className="py-3.5 text-center">{dept.resolved}</td>
                          <td className="py-3.5 text-right font-mono font-bold text-brand-400">{percent}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Log Widget */}
            <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Security Audit Trails</span>

              <div className="space-y-3.5">
                {auditLogs.map((log) => (
                  <div key={log._id} className="text-xs border-b border-slate-800/40 pb-3 last:border-b-0 last:pb-0 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-400">{log.action}</span>
                      <span className="text-slate-500">{formatDate(log.timestamp)}</span>
                    </div>
                    <p className="text-slate-350 leading-relaxed font-mono text-[11px]">{log.description}</p>
                    <span className="text-[10px] text-slate-500 block">Operator: {log.user?.fullName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
