import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getPriorityBadgeColor, formatDate } from '../utils/formatters';
import { ShieldAlert, UserCheck, Eye, X } from 'lucide-react';
import Button from '../components/common/Button';

const AdminEscalations = () => {
  const [escalations, setEscalations] = useState({
    pending15: [],
    pending30: [],
    criticalUnassigned: [],
  });
  const [officers, setOfficers] = useState([]);
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [priority, setPriority] = useState('Critical');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/escalations');
      if (res.data.success) {
        setEscalations(res.data.data);
      }
      const offRes = await api.get('/officers');
      if (offRes.data.success) {
        setOfficers(offRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelect = (c) => {
    setSelectedComplaint(c);
    setSelectedOfficerId(c.assignedOfficer?._id || '');
    setPriority(c.priority || 'Critical');
  };

  const handleEscalationResolve = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.patch(`/admin/complaints/${selectedComplaint._id}/assign`, {
        officerId: selectedOfficerId,
        priority: priority,
      });

      if (res.data.success) {
        setSelectedComplaint(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderQueueList = (list, type) => {
    return (
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {list.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/5">
            No complaints in this queue
          </div>
        ) : (
          list.map((c) => (
            <div
              key={c._id}
              className={`glass-panel p-4 rounded-xl border border-slate-800/80 space-y-3 hover:border-slate-700 transition-all bg-slate-950/20`}
            >
              <div className="flex justify-between items-start gap-1">
                <span className="text-[10px] font-bold text-slate-350 font-mono">
                  {c.complaintId}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  c.priority === 'Critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-300'
                }`}>
                  {c.category}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{c.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>
              <div className="border-t border-slate-800/40 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>Created: {formatDate(c.createdAt)}</span>
                <button
                  onClick={() => handleSelect(c)}
                  className="text-brand-400 hover:text-brand-300 font-semibold hover:underline"
                >
                  Intervene &rarr;
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">SLA Escalation Desk</h2>
          <p className="text-xs text-slate-400">Review tickets auto-escalated by background services due to SLA breach parameters.</p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          Refresh Queue
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Warning Breach (&gt;15 Days)</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {escalations.pending15.length}
              </span>
            </div>
            {renderQueueList(escalations.pending15, 'warning')}
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Severe Breach (&gt;30 Days)</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-450 border border-rose-500/20">
                {escalations.pending30.length}
              </span>
            </div>
            {renderQueueList(escalations.pending30, 'severe')}
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-red-500/30">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-650 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Critical Unassigned</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {escalations.criticalUnassigned.length}
              </span>
            </div>
            {renderQueueList(escalations.criticalUnassigned, 'critical')}
          </div>
        </div>
      )}

      {/* Side overlay details */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="flex-1" onClick={() => setSelectedComplaint(null)} />

          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-805 h-full flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/40">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Escalated Ticket {selectedComplaint.complaintId}</h3>
                  <span className="text-xs text-slate-500">SLA breach resolution desk</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEscalationResolve} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="space-y-1 bg-rose-500/5 p-4 rounded-xl border border-rose-500/20">
                <h5 className="text-xs font-bold text-rose-450">{selectedComplaint.title}</h5>
                <p className="text-[11px] text-slate-350 leading-relaxed">{selectedComplaint.description}</p>
              </div>

              {/* Assign officer */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Assign High Priority Officer</label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-850 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                  required
                >
                  <option value="" disabled>
                    -- Select Officer --
                  </option>
                  {officers.map((o) => (
                    <option key={o._id} value={o._id} className="bg-slate-900 text-slate-200">
                      {o.fullName} ({o.department?.name || 'Officer'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjust priority */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Escalate Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-850 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                >
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <Button type="submit" loading={submitting} className="w-full flex justify-center items-center gap-1.5 mt-4">
                <UserCheck className="h-4 w-4" /> Save SLA Intervention Updates
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEscalations;
