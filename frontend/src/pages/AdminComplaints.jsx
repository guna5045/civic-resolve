import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate, cleanSystemFormatting, getClarificationData } from '../utils/formatters';
import { 
  Eye, 
  X, 
  UserCheck, 
  Layers, 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles, 
  MapPin, 
  Calendar, 
  User
} from 'lucide-react';
import '../utils/mapSetup';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import Button from '../components/common/Button';

const AdminComplaints = () => {
  const location = useLocation();
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tab Filtering state
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'review'); // 'review' | 'active' | 'clarify' | 'resolved'
  const [statusFilter, setStatusFilter] = useState(location.state?.status || 'all');

  // Administrative adjustment states
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [priority, setPriority] = useState('Medium');

  // Decision System state
  const [decisionMode, setDecisionMode] = useState(''); // 'approve' | 'reject' | 'clarification' | ''
  const [decisionRemarks, setDecisionRemarks] = useState('');

  // Confirmation state for final assignment
  const [showConfirmAssignModal, setShowConfirmAssignModal] = useState(false);

  // Nearby issues state
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // Correction return states
  const [correctionsRequired, setCorrectionsRequired] = useState('');
  const [reasonForReturn, setReasonForReturn] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const compRes = await api.get('/complaints');
      if (compRes.data.success) {
        setComplaints(compRes.data.data);
      }
      const deptRes = await api.get('/departments');
      if (deptRes.data.success) {
        setDepartments(deptRes.data.data.filter(d => d.status !== 'Inactive'));
      }
    } catch (err) {
      console.error('Error fetching complaints board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
    if (location.state?.status) {
      setStatusFilter(location.state.status);
    }
  }, [location.state]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setStatusFilter('all');
  };

  // Fetch officers for the department when selecting/changing department
  useEffect(() => {
    const fetchOfficersForDept = async () => {
      if (selectedDeptId) {
        try {
          const offRes = await api.get(`/officers?departmentId=${selectedDeptId}`);
          if (offRes.data.success) {
            setOfficers(offRes.data.data.filter(o => o.status === 'Active'));
            setSelectedOfficerId('');
          }
        } catch (err) {
          console.error('Error fetching officers for department:', err);
        }
      } else {
        setOfficers([]);
        setSelectedOfficerId('');
      }
    };
    fetchOfficersForDept();
  }, [selectedDeptId]);

  const fetchNearbySimilarIssues = async (complaint) => {
    setLoadingNearby(true);
    try {
      const res = await api.get(`/complaints/nearby?lat=${complaint.latitude}&lng=${complaint.longitude}&radiusKm=0.1`);
      if (res.data.success) {
        // Exclude the current complaint
        const filtered = res.data.data.filter(c => c._id !== complaint._id);
        setNearbyIssues(filtered);
      }
    } catch (err) {
      console.error('Error finding nearby issues:', err);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSelect = (c) => {
    setSelectedComplaint(c);
    setSelectedDeptId(c.department?._id || '');
    setSelectedOfficerId(c.assignedOfficer?._id || '');
    setPriority(c.priority || 'Medium');
    setDecisionMode('');
    setDecisionRemarks('');
    setCorrectionsRequired('');
    setReasonForReturn('');
    setNearbyIssues([]);
    fetchNearbySimilarIssues(c);
  };

  // Close drawer and reset states
  const handleClose = () => {
    setSelectedComplaint(null);
    setDecisionMode('');
    setDecisionRemarks('');
    setCorrectionsRequired('');
    setReasonForReturn('');
    setNearbyIssues([]);
    setShowConfirmAssignModal(false);
  };

  // Handle decisions: Reject or Clarification
  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!decisionRemarks.trim()) return;
    setSubmitting(true);

    try {
      const decisionType = decisionMode === 'reject' ? 'Reject' : 'Request Clarification';
      const res = await api.patch(`/admin/complaints/${selectedComplaint._id}/review`, {
        decision: decisionType,
        remarks: decisionRemarks,
      });

      if (res.data.success) {
        handleClose();
        fetchData();
      }
    } catch (err) {
      console.error('Failed to submit administrative decision:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Open confirmation modal for Approve & Assign
  const handleReassignSubmit = (e) => {
    e.preventDefault();
    if (!selectedDeptId || !selectedOfficerId) return;
    setShowConfirmAssignModal(true);
  };

  // Perform actual API calls after confirmation
  const executeAssignment = async () => {
    setSubmitting(true);
    try {
      // 1. Move to Under Review (Approve) if currently Submitted or Information Clarified
      if (['Submitted', 'Information Clarified'].includes(selectedComplaint.status)) {
        await api.patch(`/admin/complaints/${selectedComplaint._id}/review`, {
          decision: 'Approve',
        });
      }

      // 2. Perform assignment
      const res = await api.patch(`/admin/complaints/${selectedComplaint._id}/assign`, {
        departmentId: selectedDeptId,
        officerId: selectedOfficerId,
        priority: priority,
      });

      if (res.data.success) {
        handleClose();
        fetchData();
      }
    } catch (err) {
      console.error('Failed administrative reassignment:', err);
    } finally {
      setSubmitting(false);
      setShowConfirmAssignModal(false);
    }
  };

  // Filter complaints based on active tab and status
  const getFilteredComplaints = () => {
    let list = [];
    switch (activeTab) {
      case 'review':
        list = complaints.filter(c => ['Submitted', 'Under Review', 'Information Clarified'].includes(c.status));
        break;
      case 'active':
        list = complaints.filter(c => ['Assigned', 'Verified', 'Verified By Officer', 'Work Started'].includes(c.status));
        break;
      case 'clarify':
        list = complaints.filter(c => ['Clarification Required', 'Rejected'].includes(c.status));
        break;
      case 'resolved':
        list = complaints.filter(c => ['Resolved', 'Closed', 'Rejected By Officer'].includes(c.status));
        break;
      default:
        list = complaints;
    }
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter(c => c.status === statusFilter);
    }
    return list;
  };

  const filteredList = getFilteredComplaints();

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Complaint Review Board</h2>
        <p className="text-xs text-slate-400">Validate incoming citizen requests, route complaints to service departments, and direct field officers.</p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
        {[
          { id: 'review', label: 'Review Queue', count: complaints.filter(c => ['Submitted', 'Under Review', 'Information Clarified'].includes(c.status)).length, icon: Clock },
          { id: 'active', label: 'Active Workloads', count: complaints.filter(c => ['Assigned', 'Verified', 'Verified By Officer', 'Work Started'].includes(c.status)).length, icon: ClipboardList },
          { id: 'clarify', label: 'Action Required', count: complaints.filter(c => ['Clarification Required', 'Rejected'].includes(c.status)).length, icon: AlertTriangle },
          { id: 'resolved', label: 'Resolved Tickets', count: complaints.filter(c => ['Resolved', 'Closed', 'Rejected By Officer'].includes(c.status)).length, icon: CheckCircle }
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 py-3.5 px-5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                isActive 
                  ? 'border-brand-500 text-brand-400 font-semibold' 
                  : 'border-transparent text-slate-450 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-950/45 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {statusFilter !== 'all' && (
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-350">
          <span>Showing only complaints with status: <strong className="text-brand-400 font-semibold">{statusFilter}</strong></span>
          <button 
            onClick={() => setStatusFilter('all')}
            className="text-brand-400 hover:underline cursor-pointer font-bold uppercase tracking-wider text-[10px]"
          >
            Show All Queue
          </button>
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800 py-20 text-center text-xs text-slate-500">
          No complaints inside this queue status at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((c) => (
            <div 
              key={c._id} 
              onClick={() => handleSelect(c)}
              className="glass-panel rounded-xl border border-slate-800 p-5 flex flex-col justify-between glass-panel-hover cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-950/50 px-2 py-0.5 rounded border border-slate-850">
                    ID: {c.complaintId}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 line-clamp-1 leading-snug">{c.title}</h4>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase mt-0.5">Reporter: {c.citizen?.fullName}</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{c.description}</p>
              </div>

              <div className="border-t border-slate-800/40 pt-3.5 mt-4 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <div className="flex gap-2.5">
                  <span className={`px-2 py-0.5 rounded ${getPriorityBadgeColor(c.priority)}`}>{c.priority}</span>
                  <span className="text-slate-400 bg-slate-950/20 px-2 py-0.5 rounded flex items-center gap-1.5 font-bold">
                    <ThumbsUp className="h-3 w-3 text-brand-400" /> {c.supportCount || 0}
                  </span>
                </div>
                <span className="text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Details &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side Reassignment & Review Drawer Panel */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="flex-1 animate-fade-in" onClick={handleClose} />

          <div className="w-full lg:w-[50vw] md:w-[70vw] bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl animate-slide-in-right">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-slate-100">Review Complaint details</h3>
                <span className="text-xs text-slate-450">Tracking: {selectedComplaint.trackingId} | ID: {selectedComplaint.complaintId}</span>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              
              {/* Badges / Header Stats */}
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(selectedComplaint.status)}`}>
                    {selectedComplaint.status}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityBadgeColor(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority} Priority
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-950/20 px-3 py-1 rounded border border-slate-850/60 uppercase">
                  Community Upvotes: {selectedComplaint.supportCount || 0}
                </span>
              </div>

              {/* Title, Category & Reporter */}
              <div>
                <h4 className="text-lg font-bold text-slate-100 leading-snug">{selectedComplaint.title}</h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-brand-400 font-semibold bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">{selectedComplaint.category}</span>
                  <span>Reported: {formatDate(selectedComplaint.createdAt)}</span>
                </p>
              </div>

              {/* Citizen Details */}
              <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-450" /> Reporter Information
                </span>
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="font-bold text-slate-200">{selectedComplaint.citizen?.fullName}</div>
                  <div>Email: {selectedComplaint.citizen?.email}</div>
                  <div>Mobile: {selectedComplaint.citizen?.mobile || 'N/A'}</div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 font-sans">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Citizen Description</span>
                <p className="text-xs text-slate-250 leading-relaxed bg-slate-950/40 p-5 rounded-xl border border-slate-800/80">
                  {cleanSystemFormatting(getClarificationData(selectedComplaint).description)}
                </p>
              </div>

              {/* Clarification Response */}
              {getClarificationData(selectedComplaint).clarificationResponse && (
                <div className="space-y-2 font-sans">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Citizen Clarification Response</span>
                  <p className="text-xs text-slate-250 leading-relaxed bg-slate-950/40 p-5 rounded-xl border border-slate-800/80">
                    {cleanSystemFormatting(getClarificationData(selectedComplaint).clarificationResponse)}
                  </p>
                </div>
              )}

              {/* AI Summary */}
              {selectedComplaint.aiSummary && (
                <div className="space-y-2.5 bg-gradient-to-br from-brand-950/20 to-brand-500/5 p-5 rounded-xl border border-brand-500/30">
                  <div className="flex items-center gap-2 text-brand-400">
                    <Sparkles className="h-4.5 w-4.5 text-brand-300" />
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-300">AI Insights & Suggestion Reason</span>
                  </div>
                  <p className="text-xs text-slate-250 leading-relaxed italic bg-slate-950/20 p-3.5 rounded-lg border border-brand-500/10">
                    "{cleanSystemFormatting(selectedComplaint.aiSummary)}"
                  </p>
                  {selectedComplaint.aiReason && (
                    <div className="text-[11px] text-slate-400 mt-2 pl-2 border-l border-brand-500/35">
                      <span className="font-semibold text-slate-350 block mb-0.5">AI Suggestion Rationale:</span>
                      {selectedComplaint.aiReason}
                    </div>
                  )}
                </div>
              )}

              {/* Map & Coordinates with Leaflet Safeguard */}
              {(() => {
                const hasValidCoords = selectedComplaint && 
                  typeof selectedComplaint.latitude === 'number' && 
                  typeof selectedComplaint.longitude === 'number' && 
                  !isNaN(selectedComplaint.latitude) && 
                  !isNaN(selectedComplaint.longitude) &&
                  selectedComplaint.latitude !== 0 &&
                  selectedComplaint.longitude !== 0;

                return hasValidCoords ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-brand-400" /> Location Coordinates
                    </span>
                    <div className="h-56 w-full rounded-xl overflow-hidden border border-slate-800 relative z-10">
                      <MapContainer
                        center={[selectedComplaint.latitude, selectedComplaint.longitude]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        dragging={false}
                        scrollWheelZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[selectedComplaint.latitude, selectedComplaint.longitude]} />
                      </MapContainer>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>Lat: {selectedComplaint.latitude.toFixed(6)}</span>
                      <span>Lng: {selectedComplaint.longitude.toFixed(6)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/20 text-center text-xs text-slate-500">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                    Invalid or missing coordinates. Map cannot be rendered.
                  </div>
                );
              })()}

              {/* Evidence Images */}
              {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Evidence Photos</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedComplaint.images.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noreferrer" className="aspect-video rounded-xl border border-slate-805 overflow-hidden bg-slate-950/60 p-1 hover:border-brand-500/40 transition-all block">
                        <img src={src} alt="Evidence" className="w-full h-full object-cover rounded-lg" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby similar issues */}
              <div className="space-y-3.5 border-t border-slate-850 pt-6">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  Nearby Similar Issues (100m Radius)
                </span>
                {loadingNearby ? (
                  <div className="py-2 flex justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  </div>
                ) : nearbyIssues.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No similar issues detected in the database within 100 meters.</p>
                ) : (
                  <div className="space-y-2.5">
                    {nearbyIssues.map((issue) => (
                      <div key={issue._id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-350 font-mono">{issue.complaintId}</span>
                            <span className="text-[8px] uppercase tracking-wider text-slate-500">{issue.category}</span>
                          </div>
                          <h5 className="font-bold text-slate-200 truncate mt-0.5">{issue.title}</h5>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${getStatusBadgeColor(issue.status)}`}>
                          {issue.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Side-by-Side Before / After Resolution Comparison View */}
              {['Resolved', 'Closed'].includes(selectedComplaint.status) && (
                <div className="space-y-4 border-t border-slate-850 pt-6">
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
                            "{cleanSystemFormatting(getClarificationData(selectedComplaint).description)}"
                          </p>
                        </div>
                        {getClarificationData(selectedComplaint).clarificationResponse && (
                          <div>
                            <span className="text-[9px] text-slate-550 font-bold uppercase block">Citizen Clarification Response</span>
                            <p className="text-slate-300 leading-relaxed italic">
                              "{cleanSystemFormatting(getClarificationData(selectedComplaint).clarificationResponse)}"
                            </p>
                          </div>
                        )}
                        {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                          <div>
                            <span className="text-[9px] text-slate-550 font-bold uppercase block mb-1">Citizen Photos</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {selectedComplaint.images.map((src, i) => (
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
                          <p className="text-slate-200 font-semibold">{selectedComplaint.resolutionSummary || 'Completed repairs.'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-550 font-bold uppercase block">Officer Completion Notes</span>
                          <p className="text-slate-300 leading-relaxed italic">
                            "{cleanSystemFormatting(selectedComplaint.resolutionNotes) || 'No notes provided.'}"
                          </p>
                        </div>
                        {selectedComplaint.resolutionImages && selectedComplaint.resolutionImages.length > 0 && (
                          <div>
                            <span className="text-[9px] text-slate-550 font-bold uppercase block mb-1">Officer Photos</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {selectedComplaint.resolutionImages.map((src, i) => (
                                <img key={i} src={src} alt="After" className="aspect-video object-cover rounded border border-slate-800" />
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedComplaint.completionTimestamp && (
                          <div className="text-[9px] text-slate-500 font-mono pt-1">
                            Completed: {new Date(selectedComplaint.completionTimestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-4 border-t border-slate-850 pt-6">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Audit History Timeline</span>
                <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6 py-1">
                  {selectedComplaint.timeline?.map((event, i) => (
                    <div key={i} className="relative pl-1">
                      <span className="absolute -left-[30px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[8px] font-bold text-brand-400">
                        {i + 1}
                      </span>
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-slate-300">{cleanSystemFormatting(event.title)}</h5>
                        <p className="text-[11px] text-slate-450 leading-relaxed">{cleanSystemFormatting(event.description)}</p>
                        <span className="text-[9px] text-slate-500 font-mono block">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Decision & Assignment workflows */}
              {['Submitted', 'Under Review', 'Information Clarified'].includes(selectedComplaint.status) && (
                <div className="space-y-6 border-t border-slate-850 pt-6 bg-slate-950/20 p-5 rounded-2xl border border-slate-850/80 shadow-md">
                  <span className="text-xs font-bold text-slate-350 uppercase tracking-widest block border-b border-slate-850 pb-2">
                    Admin Verification & Assignment
                  </span>

                  {decisionMode === '' ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => setDecisionMode('approve')}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-brand-600/10"
                      >
                        <ThumbsUp className="h-4 w-4" /> Approve & Assign
                      </button>
                      <button
                        onClick={() => setDecisionMode('clarification')}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-orange-400 border border-slate-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <HelpCircle className="h-4 w-4" /> Request Clarification
                      </button>
                      <button
                        onClick={() => setDecisionMode('reject')}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-rose-450 border border-slate-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ThumbsDown className="h-4 w-4" /> Reject Ticket
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in">
                      {/* Action back trigger */}
                      <button
                        onClick={() => {
                          setDecisionMode('');
                          setDecisionRemarks('');
                        }}
                        className="text-[10px] font-bold text-brand-400 hover:underline uppercase flex items-center gap-1 cursor-pointer"
                      >
                        &larr; Back to review options
                      </button>

                      {decisionMode === 'approve' ? (
                        /* Approve Assignment Form */
                        <form onSubmit={handleReassignSubmit} className="space-y-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Sector Department</label>
                            <select
                              value={selectedDeptId}
                              onChange={(e) => setSelectedDeptId(e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                              required
                            >
                              <option value="" className="text-slate-500">-- Select Department --</option>
                              {departments.map((d) => (
                                <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Department Officer</label>
                            <select
                              value={selectedOfficerId}
                              onChange={(e) => setSelectedOfficerId(e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                              required
                              disabled={!selectedDeptId}
                            >
                              <option value="" className="text-slate-500">-- Choose Officer --</option>
                              {officers.map((o) => (
                                <option key={o._id} value={o._id} className="bg-slate-900 text-slate-200">
                                  {o.fullName} ({o.email})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Priority Level</label>
                            <select
                              value={priority}
                              onChange={(e) => setPriority(e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </div>

                          <Button 
                            type="submit" 
                            loading={submitting} 
                            disabled={!selectedDeptId || !selectedOfficerId}
                            className="w-full flex justify-center items-center gap-1.5 mt-2"
                          >
                            <UserCheck className="h-4 w-4" /> Dispatch Assignment
                          </Button>
                        </form>
                      ) : (
                        /* Reject or Clarification Form */
                        <form onSubmit={handleDecisionSubmit} className="space-y-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">
                              {decisionMode === 'reject' ? 'Rejection Reason' : 'Clarification Instructions'}
                            </label>
                            <textarea
                              value={decisionRemarks}
                              onChange={(e) => setDecisionRemarks(e.target.value)}
                              placeholder={
                                decisionMode === 'reject' 
                                  ? 'Detail why this ticket cannot be processed...' 
                                  : 'Specify details or clarify photo requirements from reporter...'
                              }
                              className="w-full text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              rows={3}
                              required
                            />
                          </div>

                          <Button 
                            type="submit" 
                            loading={submitting} 
                            disabled={!decisionRemarks.trim()}
                            className={`w-full flex justify-center items-center gap-1.5 mt-2 ${
                              decisionMode === 'reject' 
                                ? 'bg-rose-500 hover:bg-rose-650 text-white' 
                                : 'bg-orange-500 hover:bg-orange-650 text-white'
                            }`}
                          >
                            {decisionMode === 'reject' ? <ThumbsDown className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                            {decisionMode === 'reject' ? 'Confirm Rejection' : 'Submit Clarification Request'}
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Admin Resolution Verification */}
              {/* Admin Resolution & Rejection Verification */}
              {['Resolved', 'Rejected By Officer'].includes(selectedComplaint.status) && (
                <div className="space-y-6 border-t border-slate-850 pt-6 bg-slate-950/20 p-5 rounded-2xl border border-slate-850/80 shadow-md">
                  <span className="text-xs font-bold text-slate-350 uppercase tracking-widest block border-b border-slate-850 pb-2">
                    {selectedComplaint.status === 'Resolved' ? 'Admin Resolution Verification' : 'Admin Rejection Verification'}
                  </span>
                  
                  {['accept_res', 'reject_res'].includes(decisionMode) ? (
                    <div className="space-y-4 animate-fade-in">
                      <button
                        onClick={() => {
                          setDecisionMode('');
                          setDecisionRemarks('');
                          setCorrectionsRequired('');
                          setReasonForReturn('');
                        }}
                        className="text-[10px] font-bold text-brand-400 hover:underline uppercase flex items-center gap-1 cursor-pointer font-sans"
                      >
                        &larr; Back to verification options
                      </button>

                      {decisionMode === 'accept_res' ? (
                        <div className="space-y-3.5">
                          <p className="text-xs text-slate-450 leading-relaxed">
                            Confirm that the action or proof uploaded by the officer is satisfactory. This will mark the complaint as **Closed** and update the citizen.
                          </p>
                          <Button 
                            onClick={async () => {
                              setSubmitting(true);
                              try {
                                const res = await api.patch(`/admin/complaints/${selectedComplaint._id}/resolve-review`, {
                                  decision: 'Accept'
                                });
                                if (res.data.success) {
                                  handleClose();
                                  fetchData();
                                }
                              } catch (err) {
                                console.error(err);
                              } finally {
                                setSubmitting(false);
                              }
                            }}
                            loading={submitting} 
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold"
                          >
                            Confirm & Close Issue
                          </Button>
                        </div>
                      ) : (
                        <form 
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!reasonForReturn.trim() || !correctionsRequired.trim()) return;
                            setSubmitting(true);
                            try {
                              const res = await api.patch(`/admin/complaints/${selectedComplaint._id}/resolve-review`, {
                                decision: 'Reject',
                                remarks: decisionRemarks,
                                correctionsRequired,
                                reasonForReturn
                              });
                              if (res.data.success) {
                                handleClose();
                                fetchData();
                              }
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          className="space-y-4"
                        >
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-semibold text-slate-350 uppercase tracking-wider">Reason for Return *</label>
                            <input
                              type="text"
                              value={reasonForReturn}
                              onChange={(e) => setReasonForReturn(e.target.value)}
                              placeholder="e.g. Incomplete repairs, invalid photos, re-work required"
                              className="w-full text-xs text-slate-205 bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-200"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-semibold text-slate-350 uppercase tracking-wider">Corrections Required *</label>
                            <textarea
                              value={correctionsRequired}
                              onChange={(e) => setCorrectionsRequired(e.target.value)}
                              placeholder="Detail precisely what adjustments or work needs to be completed..."
                              className="w-full text-xs text-slate-205 bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-200"
                              rows={2.5}
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-semibold text-slate-350 uppercase tracking-wider">Admin Remarks / Instructions</label>
                            <textarea
                              value={decisionRemarks}
                              onChange={(e) => setDecisionRemarks(e.target.value)}
                              placeholder="General instructions for the department officer..."
                              className="w-full text-xs text-slate-205 bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-200"
                              rows={2}
                            />
                          </div>

                          <Button 
                            type="submit" 
                            loading={submitting} 
                            disabled={!reasonForReturn.trim() || !correctionsRequired.trim()}
                            className="w-full bg-rose-500 hover:bg-rose-650 text-white font-bold"
                          >
                            Return Ticket to Officer
                          </Button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => setDecisionMode('accept_res')}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg font-bold"
                      >
                        <CheckCircle className="h-4 w-4" /> Approve Resolution
                      </button>
                      <button
                        onClick={() => setDecisionMode('reject_res')}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-rose-450 border border-slate-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                      >
                        <ThumbsDown className="h-4 w-4" /> Return to Officer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-850 bg-slate-950/20 text-right">
              <Button onClick={handleClose}>Close Panel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Confirmation Modal Overlay */}
      {showConfirmAssignModal && selectedComplaint && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Confirm Assignment
              </h3>
              <button onClick={() => setShowConfirmAssignModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-4 leading-relaxed">
              <p>Please review the administrative dispatch routing details before confirming:</p>
              
              <div className="space-y-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <div>
                  <span className="text-[10px] text-slate-550 uppercase font-bold block mb-0.5">Complaint</span>
                  <span className="text-slate-250 font-bold text-xs">{selectedComplaint.title}</span>
                </div>
                <div className="border-t border-slate-850 pt-2.5">
                  <span className="text-[10px] text-slate-550 uppercase font-bold block mb-0.5">Department</span>
                  <span className="text-brand-400 font-semibold text-xs">
                    {departments.find(d => d._id === selectedDeptId)?.name || 'Unknown Department'}
                  </span>
                </div>
                <div className="border-t border-slate-850 pt-2.5">
                  <span className="text-[10px] text-slate-550 uppercase font-bold block mb-0.5">Officer</span>
                  <span className="text-emerald-400 font-semibold text-xs">
                    {officers.find(o => o._id === selectedOfficerId)?.fullName || 'Unknown Officer'}
                  </span>
                </div>
                <div className="border-t border-slate-850 pt-2.5 flex justify-between">
                  <div>
                    <span className="text-[10px] text-slate-550 uppercase font-bold block mb-0.5">Priority</span>
                    <span className="text-slate-300 font-mono text-xs">{priority}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-[11px] text-slate-450 italic">
                Once confirmed, the assigned officer will be notified and this ticket will be added to their active workloads queue.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmAssignModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAssignment}
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-brand-500 hover:bg-brand-600 text-slate-950 shadow-md shadow-brand-500/20 disabled:opacity-50"
              >
                {submitting ? 'Assigning...' : 'Assign Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplaints;
