import React, { useState, useEffect, useContext } from 'react';
import '../../utils/mapSetup';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { X, Download, ThumbsUp, Sparkles, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { LanguageContext } from '../../context/LanguageContext';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate, cleanSystemFormatting, getClarificationData } from '../../utils/formatters';

const KanbanStatusTracker = ({ status }) => {
  const { t } = useContext(LanguageContext);
  const stages = ['Assigned', 'Verified', 'Work Started', 'Resolved', 'Closed'];
  
  const getStatusIndex = (st) => {
    switch (st) {
      case 'Assigned':
      case 'Reassigned':
        return 0;
      case 'Verified':
      case 'Verified By Officer':
      case 'Rejected By Officer':
        return 1;
      case 'Work Started':
      case 'In Progress':
      case 'Escalated':
        return 2;
      case 'Resolved':
        return 3;
      case 'Closed':
        return 4;
      default:
        return -1;
    }
  };

  const currentIndex = getStatusIndex(status);

  return (
    <div className="w-full space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850/80">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Workflow Stage</span>
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 md:gap-1">
        {stages.map((stage, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          
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
                    isCurrent ? 'text-slate-100 uppercase' : isCompleted ? 'text-slate-300' : 'text-slate-500'
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

  // Citizen Clarification Form States
  const [isClarifying, setIsClarifying] = useState(false);
  const [clarifyTitle, setClarifyTitle] = useState('');
  const [clarifyDesc, setClarifyDesc] = useState('');
  const [clarificationResponse, setClarificationResponse] = useState('');
  const [clarifyFiles, setClarifyFiles] = useState([]);
  const [submittingClarify, setSubmittingClarify] = useState(false);
  const [errorClarify, setErrorClarify] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteComplaint = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/complaints/${complaint._id}`);
      if (res.data.success) {
        setShowDeleteConfirm(false);
        onClose();
        if (onSupportChange) {
          onSupportChange();
        }
      }
    } catch (err) {
      console.error('Failed to delete complaint:', err);
      alert(err.response?.data?.message || 'Failed to delete complaint.');
    } finally {
      setDeleting(false);
    }
  };

  const fetchComplaintDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/complaints/${complaintId}`);
      if (res.data.success) {
        setComplaint(res.data.data);
        setClarifyTitle(res.data.data.title || '');
        setClarifyDesc(res.data.data.description || '');
        
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

  const handleSubmitClarification = async (e) => {
    e.preventDefault();
    if (!clarificationResponse.trim()) {
      setErrorClarify('Clarification response is required.');
      return;
    }
    setSubmittingClarify(true);
    setErrorClarify('');
    try {
      const formData = new FormData();
      formData.append('title', clarifyTitle);
      
      formData.append('description', clarifyDesc);
      formData.append('clarificationResponse', clarificationResponse);
      
      for (let i = 0; i < clarifyFiles.length; i++) {
        formData.append('images', clarifyFiles[i]);
      }
      const res = await api.put(`/complaints/${complaint._id}/clarify`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data.success) {
        setIsClarifying(false);
        setClarificationResponse('');
        setClarifyFiles([]);
        // Refresh the drawer details
        await fetchComplaintDetails();
        if (onSupportChange) {
          onSupportChange(complaint._id);
        }
      }
    } catch (err) {
      console.error('Error submitting clarification:', err);
      setErrorClarify(err.response?.data?.message || 'Failed to submit clarification.');
    } finally {
      setSubmittingClarify(false);
    }
  };

  if (!complaintId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} />

      <div className="w-full lg:w-[50vw] md:w-[70vw] bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl animate-slide-in">
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
                  {isOwnComplaint && ['Submitted', 'Clarification Required', 'Information Clarified'].includes(complaint.status) && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1"
                    >
                      Delete Complaint
                    </button>
                  )}
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
                            ? 'border-brand-500/30 bg-brand-500/5 text-brand-405 cursor-default'
                            : 'border-slate-700 bg-slate-950/20 hover:border-brand-500/50 hover:bg-brand-500/10 hover:text-brand-400'
                        }`}
                      >
                        <ThumbsUp className={`h-3.5 w-3.5 ${isSupported ? 'text-brand-400 fill-brand-400' : ''}`} />
                        {isSupported ? 'Supported' : 'Support Issue'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Clarification Section */}
                {complaint.status === 'Clarification Required' && (
                  <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-xl space-y-4 shadow-lg shadow-amber-500/5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-bold text-amber-400 uppercase tracking-wide">Clarification Required</h5>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          The reviewing administrator has requested additional details or modifications before this complaint can be assigned.
                        </p>
                      </div>
                    </div>

                    {complaint.adminRemarks && (
                      <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-800 text-xs text-amber-250 leading-relaxed">
                        <span className="font-bold text-amber-300 block mb-1 text-[10px] uppercase tracking-wider">Admin Remarks:</span>
                        "{cleanSystemFormatting(complaint.adminRemarks)}"
                      </div>
                    )}

                    {isOwnComplaint && (
                      <div className="pt-2 border-t border-slate-800">
                        {!isClarifying ? (
                          <button
                            onClick={() => setIsClarifying(true)}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md"
                          >
                            Provide Clarification
                          </button>
                        ) : (
                          <form onSubmit={handleSubmitClarification} className="space-y-4 pt-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-sans">
                                Clarification Response *
                              </label>
                              <textarea
                                value={clarificationResponse}
                                onChange={(e) => setClarificationResponse(e.target.value)}
                                placeholder="Please explain the issue in more detail..."
                                className="w-full h-32 px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none font-sans"
                                required
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-sans">
                                Update Description (Optional)
                              </label>
                              <textarea
                                value={clarifyDesc}
                                onChange={(e) => setClarifyDesc(e.target.value)}
                                className="w-full h-24 px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none font-sans"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-sans">
                                Attach Additional Evidence Photos
                              </label>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => setClarifyFiles(e.target.files)}
                                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                              />
                              <span className="text-[9px] text-slate-500 block mt-1 font-sans">
                                You can select up to 5 images. These will be appended to your existing evidence.
                              </span>
                            </div>

                            {errorClarify && (
                              <p className="text-xs text-rose-500 font-medium font-sans">{errorClarify}</p>
                            )}

                            <div className="flex gap-2 pt-2">
                              <button
                                type="submit"
                                disabled={submittingClarify}
                                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md"
                              >
                                {submittingClarify ? 'Submitting...' : 'Submit Clarification'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsClarifying(false);
                                  setClarifyTitle(complaint.title || '');
                                  setClarifyDesc(complaint.description || '');
                                  setClarifyFiles([]);
                                  setErrorClarify('');
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-bold transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Title & Category */}
                <div>
                  <h4 className="text-lg font-bold text-slate-100">{complaint.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Category: {t(`categories.${complaint.category}`) || complaint.category} | Reported: {formatDate(complaint.createdAt)}
                  </p>
                </div>

                {/* Kanban Workflow Tracker or Rejection Box */}
                {['Rejected', 'Rejected By Officer'].includes(complaint.status) ? (
                  <div className="w-full bg-rose-500/10 p-5 rounded-xl border border-rose-500/20 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-rose-400">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">Complaint Rejected</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block uppercase text-[8px] font-bold">Reason for Rejection</span>
                        <span className="text-slate-200 mt-1 block leading-relaxed font-semibold">
                          {cleanSystemFormatting(complaint.rejectionReason || complaint.adminRemarks || 'No rejection notes provided.')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase text-[8px] font-bold">Rejection Date</span>
                        <span className="text-slate-200 mt-1 block font-mono">
                          {formatDate(
                            (() => {
                              const rejectEvent = complaint.timeline?.find(t => ['Rejected', 'Rejected By Officer'].includes(t.status));
                              return rejectEvent ? rejectEvent.timestamp : complaint.updatedAt;
                            })()
                          )}
                        </span>
                      </div>
                    </div>
                    {complaint.rejectionImages && complaint.rejectionImages.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-rose-500/10">
                        <span className="text-slate-500 block uppercase text-[8px] font-bold">Rejection Evidence Photos</span>
                        <div className="grid grid-cols-5 gap-2">
                          {complaint.rejectionImages.map((src, i) => (
                            <div key={i} className="aspect-square rounded-lg border border-slate-805 overflow-hidden bg-slate-950 relative">
                              <img src={src} alt="Rejection Proof" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <KanbanStatusTracker status={complaint.status} />
                )}

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
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                    {cleanSystemFormatting(getClarificationData(complaint).description)}
                  </p>
                </div>

                {/* Clarification Response */}
                {getClarificationData(complaint).clarificationResponse && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Citizen Clarification Response</span>
                    <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                      {cleanSystemFormatting(getClarificationData(complaint).clarificationResponse)}
                    </p>
                  </div>
                )}

                {/* AI Summary */}
                {complaint.aiSummary && (
                  <div className="space-y-2.5 bg-gradient-to-br from-brand-950/20 to-brand-500/5 p-5 md:p-6 rounded-xl border border-brand-500/30 shadow-lg shadow-brand-500/5">
                    <div className="flex items-center gap-2 text-brand-400">
                      <Sparkles className="h-4.5 w-4.5 text-brand-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-300">AI-Assisted Summary</span>
                    </div>
                    <p className="text-xs text-slate-250 leading-relaxed italic mt-1 bg-slate-950/20 p-3.5 rounded-lg border border-brand-500/10">
                      "{cleanSystemFormatting(complaint.aiSummary)}"
                    </p>
                  </div>
                )}

                {/* Location Map with Leaflet Safeguard */}
                {(() => {
                  const hasValidCoords = complaint && 
                    typeof complaint.latitude === 'number' && 
                    typeof complaint.longitude === 'number' && 
                    !isNaN(complaint.latitude) && 
                    !isNaN(complaint.longitude) &&
                    complaint.latitude !== 0 &&
                    complaint.longitude !== 0;

                  return hasValidCoords ? (
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
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/20 text-center text-xs text-slate-500">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                      Invalid or missing coordinates. Map cannot be rendered.
                    </div>
                  );
                })()}

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

                {/* Reassignment info if returned */}
                {complaint.status === 'Reassigned' && (complaint.correctionsRequired || complaint.reasonForReturn) && (
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400 space-y-1.5">
                    <span className="font-bold uppercase tracking-wider block">Returned for Corrections by Admin</span>
                    {complaint.reasonForReturn && <div><span className="font-semibold">Reason for Return:</span> {cleanSystemFormatting(complaint.reasonForReturn)}</div>}
                    {complaint.correctionsRequired && <div><span className="font-semibold">Corrections Required:</span> {cleanSystemFormatting(complaint.correctionsRequired)}</div>}
                    {complaint.adminRemarks && <div><span className="font-semibold">Admin Remarks:</span> {cleanSystemFormatting(complaint.adminRemarks)}</div>}
                  </div>
                )}

                {/* Rejection Details */}
                {complaint.status === 'Rejected By Officer' && (
                  <div className="space-y-4 border-t border-slate-800/60 pt-6">
                    <span className="text-xs font-bold text-rose-450 uppercase tracking-widest block">
                      Officer Rejection Information
                    </span>
                    <div className="bg-slate-950/45 p-5 rounded-xl border border-rose-500/15 space-y-4">
                      <div>
                        <span className="text-[10px] text-slate-550 font-bold uppercase block">Rejection Reason</span>
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-850 italic">
                          "{cleanSystemFormatting(complaint.rejectionReason) || 'No reason provided.'}"
                        </p>
                      </div>

                      {complaint.rejectionImages && complaint.rejectionImages.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-550 font-bold uppercase block mb-2">Supporting Proof Photos</span>
                          <div className="grid grid-cols-3 gap-2">
                            {complaint.rejectionImages.map((src, i) => (
                              <a key={i} href={src} target="_blank" rel="noreferrer" className="aspect-video rounded border border-slate-800 overflow-hidden bg-slate-950 block">
                                <img src={src} alt="Rejection Proof" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Side-by-Side Before / After Resolution Comparison View */}
                {['Resolved', 'Closed'].includes(complaint.status) && (
                  <div className="space-y-4 border-t border-slate-800/60 pt-6">
                    <span className="text-xs font-bold text-slate-350 uppercase tracking-widest block">
                      Before / After Resolution Comparison
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Before Column */}
                      <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-850 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-800 pb-1">Before Resolution</span>
                        <div className="text-xs space-y-2">
                          <div>
                            <span className="text-[9px] text-slate-550 font-bold uppercase block">Citizen Description</span>
                            <p className="text-slate-300 leading-relaxed italic">
                              "{cleanSystemFormatting(getClarificationData(complaint).description)}"
                            </p>
                          </div>
                          {getClarificationData(complaint).clarificationResponse && (
                            <div>
                              <span className="text-[9px] text-slate-550 font-bold uppercase block">Citizen Clarification Response</span>
                              <p className="text-slate-300 leading-relaxed italic">
                                "{cleanSystemFormatting(getClarificationData(complaint).clarificationResponse)}"
                              </p>
                            </div>
                          )}
                          {complaint.images && complaint.images.length > 0 && (
                            <div>
                              <span className="text-[9px] text-slate-550 font-bold uppercase block mb-1">Citizen Photos</span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {complaint.images.map((src, i) => (
                                  <img key={i} src={src} alt="Before" className="aspect-video object-cover rounded border border-slate-800" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* After Column */}
                      <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-850 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-emerald-450 block border-b border-slate-800 pb-1">After Resolution</span>
                        <div className="text-xs space-y-2">
                          <div>
                            <span className="text-[9px] text-slate-550 font-bold uppercase block">Resolution Information</span>
                            <p className="text-slate-200 font-semibold">{complaint.resolutionSummary || 'Completed repairs.'}</p>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-550 font-bold uppercase block">Officer Completion Notes</span>
                            <p className="text-slate-300 leading-relaxed italic">
                              "{cleanSystemFormatting(complaint.resolutionNotes) || 'No notes provided.'}"
                            </p>
                          </div>
                          {complaint.resolutionImages && complaint.resolutionImages.length > 0 && (
                            <div>
                              <span className="text-[9px] text-slate-550 font-bold uppercase block mb-1">Officer Photos</span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {complaint.resolutionImages.map((src, i) => (
                                  <img key={i} src={src} alt="After" className="aspect-video object-cover rounded border border-slate-800" />
                                ))}
                              </div>
                            </div>
                          )}
                          {complaint.completionTimestamp && (
                            <div className="text-[9px] text-slate-500 font-mono pt-1">
                              Completed: {new Date(complaint.completionTimestamp).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
                          <h5 className="text-sm font-bold text-slate-200">{cleanSystemFormatting(event.title)}</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">{cleanSystemFormatting(event.description)}</p>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
                  <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 overflow-hidden animate-scale-in">
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <AlertTriangle className="h-5.5 w-5.5 text-rose-500" />
                        Delete Complaint?
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Are you sure you want to permanently delete this complaint? This action cannot be undone. Once a complaint has been reviewed or verified by the administration, deletion will no longer be permitted.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end items-center gap-3.5 border-t border-slate-850 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                        className="px-4.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-205 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteComplaint}
                        disabled={deleting}
                        className="px-4 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-slate-100 rounded-lg transition-all cursor-pointer shadow-md shadow-rose-600/10"
                      >
                        {deleting ? 'Deleting...' : 'Delete Complaint'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default ComplaintDetailsDrawer;
