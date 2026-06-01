import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../utils/formatters';
import { Eye, Check, X, FileUp, ShieldAlert, Sparkles, MapPin, AlertTriangle } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const isPending15Days = (createdAt) => {
  const diffMs = new Date() - new Date(createdAt);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 15;
};

const AssignedIssues = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Status transition states
  const [status, setStatus] = useState('In Progress');
  const [notes, setNotes] = useState('');
  const [resolutionImages, setResolutionImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/complaints?officer=${user._id}`);
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching assigned issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  const handleSelect = (c) => {
    setSelectedComplaint(c);
    setStatus(c.status === 'Submitted' || c.status === 'Assigned' ? 'In Progress' : c.status);
    setNotes(c.resolutionNotes || '');
    setResolutionImages([]);
    setImagePreviews([]);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setResolutionImages(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('status', status);
      formData.append('notes', notes);

      resolutionImages.forEach((img) => {
        formData.append('resolutionImages', img);
      });

      const res = await api.patch(`/complaints/${selectedComplaint._id}/status`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setSelectedComplaint(null);
        fetchAssigned();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Work assignments</h2>
        <p className="text-xs text-slate-400">Review tickets assigned to you. Mark as In Progress or upload resolution proof to close tickets.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800 py-16 text-center text-sm text-slate-500">
          No active tickets assigned to your queue.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((c) => {
            const hasHighSupportAlert = (c.supportCount || 0) >= 50;
            const hasPendingAlert = isPending15Days(c.createdAt) && c.status !== 'Closed' && c.status !== 'Resolved';

            return (
              <div key={c._id} className={`glass-panel rounded-xl border p-5 flex flex-col justify-between glass-panel-hover relative overflow-hidden ${
                hasHighSupportAlert || hasPendingAlert ? 'border-rose-500/30' : 'border-slate-800'
              }`}>
                
                {/* Visual SLA Alerts Banner */}
                {(hasHighSupportAlert || hasPendingAlert) && (
                  <div className="absolute top-0 inset-x-0 bg-rose-600/10 border-b border-rose-500/25 px-4 py-1 flex items-center justify-between text-[10px] font-bold text-rose-400 tracking-wide uppercase">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 animate-pulse" />
                      SLA Alert Active
                    </span>
                    <span>
                      {hasPendingAlert ? 'Pending > 15 Days' : 'High Support (50+)'}
                    </span>
                  </div>
                )}

                <div className={hasHighSupportAlert || hasPendingAlert ? 'pt-4' : ''}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2.5 py-0.5 rounded-full border border-brand-500/20">
                      {c.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{c.title}</h4>
                  <p className="text-[11px] text-slate-500 mb-2">Ticket ID: {c.complaintId}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">{c.description}</p>
                </div>

                <div className="border-t border-slate-800/40 pt-4 flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityBadgeColor(c.priority)}`}>
                    {c.priority}
                  </span>
                  <button
                    onClick={() => handleSelect(c)}
                    className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Eye className="h-3.5 w-3.5" /> Inspect &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Overlay Panel */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="flex-1" onClick={() => setSelectedComplaint(null)} />

          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-slate-100">Ticket {selectedComplaint.complaintId}</h3>
                <span className="text-xs text-slate-400">Reporter: {selectedComplaint.citizen?.fullName}</span>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-base font-bold text-slate-100">{selectedComplaint.title}</h4>
                <p className="text-xs text-slate-400 mt-1">Category: {selectedComplaint.category} | Priority: {selectedComplaint.priority}</p>
              </div>

              {/* AI Summary */}
              {selectedComplaint.aiSummary && (
                <div className="space-y-1.5 bg-brand-500/5 p-4 rounded-xl border border-brand-500/20">
                  <div className="flex items-center gap-1.5 text-brand-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="h-4.5 w-4.5" /> Gemini AI Brief
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic mt-1">{selectedComplaint.aiSummary}</p>
                </div>
              )}

              {/* Status Update Form */}
              <form onSubmit={handleUpdateStatus} className="space-y-4 border-t border-slate-800/60 pt-6">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Update Progress</span>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Transition Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Work Notes / Resolution logs</label>
                  <textarea
                    placeholder="Describe inspection results or resolution details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                  />
                </div>

                {status === 'Resolved' && (
                  <div className="space-y-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Upload Resolution Proof Photos</label>
                    <div className="border-2 border-dashed border-slate-800 rounded-lg p-5 text-center hover:border-brand-500/50 transition-all cursor-pointer relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FileUp className="h-6 w-6 text-slate-500 mx-auto mb-1.5" />
                      <p className="text-[11px] text-slate-400">Click to upload resolved proof photos</p>
                    </div>

                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-1.5">
                        {imagePreviews.map((src, idx) => (
                          <div key={idx} className="aspect-square rounded border border-slate-800 overflow-hidden">
                            <img src={src} alt="proof upload" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" loading={updating} className="w-full">
                  Commit Status Transition
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedIssues;
