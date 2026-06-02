import React, { useState, useEffect, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { X, Download, Heart, Sparkles, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { LanguageContext } from '../../context/LanguageContext';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../../utils/formatters';

const KanbanStatusTracker = ({ status }) => {
  const { t } = useContext(LanguageContext);
  const stages = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  
  let currentIndex = stages.indexOf(status);
  if (status === 'Escalated') {
    currentIndex = stages.indexOf('In Progress');
  } else if (status === 'Rejected') {
    currentIndex = stages.indexOf('Submitted');
  }

  return (
    <div className="w-full space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850/80">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Workflow Stage</span>
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 md:gap-1">
        {stages.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isActive = idx <= currentIndex;
          
          return (
            <React.Fragment key={stage}>
              <div className="flex items-center gap-2.5 shrink-0">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-brand-500 text-slate-950 ring-4 ring-brand-500/20 shadow-lg shadow-brand-500/25' 
                    : isCompleted 
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60'
                }`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <div className="text-left">
                  <span className={`text-[11px] font-bold block leading-none tracking-wide ${
                    isCurrent ? 'text-slate-100 uppercase' : isActive ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    {t(`workflow.${stage}`) || stage}
                  </span>
                  {isCurrent && (
                    <span className="text-[8px] text-brand-400 font-bold uppercase tracking-wider block mt-0.5">Active</span>
                  )}
                </div>
              </div>
              {idx < stages.length - 1 && (
                <div className={`transition-all duration-300 md:flex-1 md:h-0.5 md:w-auto h-4 w-0.5 mx-3 md:mx-0 my-0.5 md:my-0 ${
                  isCompleted ? 'bg-emerald-500/60' : 'bg-slate-800'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const ComplaintDetailsDrawer = ({ complaintId, onClose, onSupportChange }) => {
  const { user } = useAuth();
  const { t } = useContext(LanguageContext);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [supporting, setSupporting] = useState(false);

  const fetchComplaintDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/complaints/${complaintId}`);
      if (res.data.success) {
        setComplaint(res.data.data);
        
        // Check if supported
        const checkRes = await api.get(`/complaints/${complaintId}/supported`);
        setIsSupported(checkRes.data.supported);
      }
    } catch (err) {
      console.error('Error fetching complaint details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      fetchComplaintDetails();
    }
  }, [complaintId]);

  const handleDownload = async () => {
    if (!complaint) return;
    setDownloading(true);
    try {
      const response = await api.get(`/reports/pdf/${complaint._id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Complaint_${complaint.complaintId}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF summary:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSupport = async () => {
    if (!complaint || supporting) return;
    setSupporting(true);
    try {
      const res = await api.post(`/complaints/${complaint._id}/support`);
      if (res.data.success) {
        setIsSupported(true);
        // Refresh complaint details to get updated support count and priority
        await fetchComplaintDetails();
        if (onSupportChange) {
          onSupportChange(complaint._id);
        }
      }
    } catch (err) {
      console.error('Error supporting complaint:', err);
    } finally {
      setSupporting(false);
    }
  };

  if (!complaintId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} />

      <div className="w-full lg:w-[48vw] md:w-[70vw] sm:w-[90vw] max-w-none bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl animate-slide-in">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : !complaint ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-rose-500 mb-2" />
            <h4 className="text-slate-250 font-semibold">Complaint Not Found</h4>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg">Close</button>
          </div>
        ) : (() => {
          const citizenId = complaint.citizen?._id || complaint.citizen;
          const isOwnComplaint = user && citizenId && String(citizenId) === String(user._id);

          return (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/40">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{complaint.complaintId} Details</h3>
                  <span className="text-xs text-slate-400">Tracking: {complaint.trackingId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-brand-400 border border-slate-800 disabled:opacity-50"
                    title="Download PDF Report"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                {/* Badges */}
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex gap-2.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityBadgeColor(complaint.priority)}`}>
                      {complaint.priority} Priority
                    </span>
                  </div>
                  
                  {/* Upvote Button/Status */}
                  <div>
                    {isOwnComplaint ? (
                      <span className="px-3 py-1 rounded text-xs font-bold bg-slate-800/40 text-slate-400 border border-slate-700/40">
                        Reported By You
                      </span>
                    ) : (
                      <button
                        onClick={handleSupport}
                        disabled={isSupported || supporting}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${
                          isSupported
                            ? 'border-rose-500/30 bg-rose-500/5 text-rose-400 cursor-default'
                            : 'border-slate-700 bg-slate-950/20 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-450'
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isSupported ? 'text-rose-500 fill-rose-500' : ''}`} />
                        {isSupported ? 'Supported' : 'Support Issue'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Category */}
                <div>
                  <h4 className="text-lg font-bold text-slate-100">{complaint.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Category: {t(`categories.${complaint.category}`) || complaint.category} | Reported: {formatDate(complaint.createdAt)}
                  </p>
                </div>

                {/* Kanban Workflow Tracker */}
                <KanbanStatusTracker status={complaint.status} />

                {/* GovTech Quick Stats Row */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase font-bold text-slate-400 bg-slate-950/20 p-3 rounded-xl border border-slate-850/60">
                  <div>
                    <span className="text-[8px] text-slate-500 block mb-0.5">Community Upvotes</span>
                    <span className="text-slate-200">{complaint.supportCount || 0}</span>
                  </div>
                  <div className="border-l border-slate-850">
                    <span className="text-[8px] text-slate-500 block mb-0.5">Original Priority</span>
                    <span className="text-slate-200">{complaint.originalPriority || complaint.priority || 'Medium'}</span>
                  </div>
                  <div className="border-l border-slate-850">
                    <span className="text-[8px] text-slate-500 block mb-0.5">Current Priority</span>
                    <span className={`text-[10px] font-bold ${getPriorityBadgeColor(complaint.priority)}`}>{complaint.priority}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Citizen Description</span>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-5 rounded-xl border border-slate-800/80">
                    {complaint.description}
                  </p>
                </div>

                {/* AI Summary */}
                {complaint.aiSummary && (
                  <div className="space-y-2.5 bg-gradient-to-br from-brand-950/20 to-brand-500/5 p-5 md:p-6 rounded-xl border border-brand-500/30 shadow-lg shadow-brand-500/5">
                    <div className="flex items-center gap-2 text-brand-400">
                      <Sparkles className="h-4.5 w-4.5 text-brand-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-300">AI-Assisted Summary</span>
                    </div>
                    <p className="text-xs text-slate-250 leading-relaxed italic mt-1 bg-slate-950/20 p-3.5 rounded-lg border border-brand-500/10">
                      "{complaint.aiSummary}"
                    </p>
                  </div>
                )}

                {/* Location Map */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-brand-400" /> Map Coordinates
                  </span>
                  <div className="h-56 w-full rounded-xl overflow-hidden border border-slate-800 relative z-10">
                    <MapContainer
                      center={[complaint.latitude, complaint.longitude]}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                      dragging={false}
                      scrollWheelZoom={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[complaint.latitude, complaint.longitude]} />
                    </MapContainer>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Latitude: {complaint.latitude.toFixed(6)}</span>
                    <span>Longitude: {complaint.longitude.toFixed(6)}</span>
                  </div>
                </div>

                {/* Images */}
                {complaint.images && complaint.images.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Evidence Photos</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {complaint.images.map((src, i) => (
                        <div key={i} className="aspect-video rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60 p-1 hover:border-brand-500/40 transition-all shadow-md">
                          <img src={src} alt="Evidence" className="w-full h-full object-cover rounded-lg" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution notes & images */}
                {complaint.status === 'Resolved' && (
                  <div className="space-y-5 bg-emerald-500/5 p-5 md:p-6 rounded-xl border border-emerald-500/25 shadow-lg shadow-emerald-500/5">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Resolution Proof</span>
                      <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/20 p-4 rounded-lg border border-emerald-500/10">
                        {complaint.resolutionNotes || 'This issue has been resolved by municipal workers.'}
                      </p>
                    </div>
                    {complaint.resolutionImages && complaint.resolutionImages.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">After Photos</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {complaint.resolutionImages.map((src, i) => (
                            <div key={i} className="aspect-video rounded-xl border border-slate-850 overflow-hidden bg-slate-950/60 p-1 hover:border-emerald-500/40 transition-all shadow-md">
                              <img src={src} alt="Resolution Proof" className="w-full h-full object-cover rounded-lg" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-4 border-t border-slate-800/60 pt-6">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Audit Timeline</span>
                  <div className="relative border-l-2 border-slate-800 ml-3.5 pl-8 space-y-8 py-2">
                    {complaint.timeline && complaint.timeline.map((event, i) => (
                      <div key={i} className="relative pl-1.5">
                        <span className="absolute -left-[44px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border-2 border-slate-700 text-[10px] font-bold text-brand-400 shadow-md ring-4 ring-slate-900">
                          {i + 1}
                        </span>
                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-slate-200">{event.title}</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default ComplaintDetailsDrawer;
