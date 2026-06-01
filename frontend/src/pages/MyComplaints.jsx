import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../utils/formatters';
import { Calendar, Eye, Heart, MapPin, Sparkles, X, Download } from 'lucide-react';
import Button from '../components/common/Button';

const MyComplaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints');
      if (res.data.success) {
        // Filter complaints reported by current citizen
        const filtered = res.data.data.filter(c => String(c.citizen._id) === String(user._id));
        setComplaints(filtered);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleDownloadPDF = async (complaintId) => {
    setDownloadingId(complaintId);
    try {
      // Trigger browser download by requesting binary file stream
      const response = await api.get(`/reports/pdf/${complaintId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Complaint_${complaintId}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF summary:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">My Registered Complaints</h2>
        <p className="text-xs text-slate-400">Track timelines, read AI summaries, and export PDFs of your submitted complaints.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800 py-16 text-center text-sm text-slate-500">
          You haven't registered any complaints. Click "Report Issue" to file your first complaint.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((c) => (
            <div key={c._id} className="glass-panel rounded-xl border border-slate-800 p-5 flex flex-col justify-between glass-panel-hover">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                    {c.category}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{c.title}</h4>
                <p className="text-[11px] text-slate-500 mb-2">Tracking ID: {c.trackingId}</p>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">{c.description}</p>
              </div>

              <div className="border-t border-slate-800/40 pt-4 flex items-center justify-between text-xs">
                <span className="text-slate-500">{formatDate(c.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedComplaint(c)}
                    className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Progress
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side Details Drawer overlay */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          {/* Close click blocker */}
          <div className="flex-1" onClick={() => setSelectedComplaint(null)} />

          {/* Drawer container */}
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl animate-slide-in">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedComplaint.complaintId} Details</h3>
                <span className="text-xs text-slate-400">Tracking: {selectedComplaint.trackingId}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadPDF(selectedComplaint._id)}
                  disabled={downloadingId === selectedComplaint._id}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-brand-400 border border-slate-800 disabled:opacity-50"
                  title="Download PDF Report"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Title & category */}
              <div>
                <div className="flex gap-2.5 mb-2.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(selectedComplaint.status)}`}>
                    {selectedComplaint.status}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityBadgeColor(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority} Priority
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-100">{selectedComplaint.title}</h4>
                <p className="text-xs text-slate-500 mt-1">Category: {selectedComplaint.category} | Reported: {formatDate(selectedComplaint.createdAt)}</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Citizen Description</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* AI Summary */}
              {selectedComplaint.aiSummary && (
                <div className="space-y-1.5 bg-brand-500/5 p-4 rounded-xl border border-brand-500/20">
                  <div className="flex items-center gap-1.5 text-brand-400">
                    <Sparkles className="h-4.5 w-4.5" />
                    <span className="text-xs font-bold uppercase tracking-wide">Gemini AI Summary</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic mt-1.5">
                    "{selectedComplaint.aiSummary}"
                  </p>
                </div>
              )}

              {/* Images */}
              {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Attached photos</span>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedComplaint.images.map((src, i) => (
                      <div key={i} className="aspect-square rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
                        <img src={src} alt="Complaint upload" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Images and Notes */}
              {selectedComplaint.status === 'Resolved' && (
                <div className="space-y-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Resolution Notes</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedComplaint.resolutionNotes || 'This issue has been resolved by municipal workers.'}
                    </p>
                  </div>
                  {selectedComplaint.resolutionImages && selectedComplaint.resolutionImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedComplaint.resolutionImages.map((src, i) => (
                        <div key={i} className="aspect-square rounded-lg border border-slate-850 overflow-hidden">
                          <img src={src} alt="Resolution upload" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Vertical timeline events */}
              <div className="space-y-4 border-t border-slate-800/60 pt-6">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tracking timeline</span>
                <div className="relative border-l border-slate-800 ml-2.5 pl-5 space-y-5 py-1.5">
                  {selectedComplaint.timeline && selectedComplaint.timeline.map((event, i) => (
                    <div key={i} className="relative">
                      {/* Timeline dot bullet */}
                      <span className="absolute -left-7.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[10px] font-semibold text-slate-300">
                        {i + 1}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-slate-200">{event.title}</h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{event.description}</p>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyComplaints;
