import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate, cleanSystemFormatting, getClarificationData } from '../utils/formatters';
import { 
  Eye, 
  Check, 
  X, 
  FileUp, 
  ShieldAlert, 
  Sparkles, 
  MapPin, 
  AlertTriangle,
  Calendar,
  User,
  ThumbsUp,
  Clock,
  Navigation,
  FileText,
  RefreshCw
} from 'lucide-react';
import '../utils/mapSetup';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import Button from '../components/common/Button';
import Input from '../components/common/Input';



const deg2rad = (deg) => deg * (Math.PI / 180);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d.toFixed(1) + ' km';
};

const AssignedIssues = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // Workload filtering states
  const [statusFilter, setStatusFilter] = useState(location.state?.status || 'all');
  const [priorityFilter, setPriorityFilter] = useState(location.state?.priority || 'all');

  // Status transition states
  const [notes, setNotes] = useState('');
  const [resolutionImages, setResolutionImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Decision type ('work' vs 'reject')
  const [decisionType, setDecisionType] = useState('work');

  // Resolution phase states
  const [resolutionSummary, setResolutionSummary] = useState('');

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
    // Geolocation capture
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => console.warn('Geolocation failed:', err)
      );
    }
  }, []);

  useEffect(() => {
    if (location.state?.status) {
      setStatusFilter(location.state.status);
    }
    if (location.state?.priority) {
      setPriorityFilter(location.state.priority);
    }
  }, [location.state]);

  const getFilteredComplaints = () => {
    return complaints.filter((c) => {
      const matchStatus = statusFilter === 'all' || 
        (statusFilter === 'Assigned' && ['Assigned', 'Reassigned'].includes(c.status)) ||
        (statusFilter === 'Verified' && ['Verified', 'Verified By Officer'].includes(c.status)) ||
        c.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || 
        (priorityFilter === 'High' && ['High', 'Critical'].includes(c.priority)) ||
        c.priority === priorityFilter;
      return matchStatus && matchPriority;
    });
  };

  const filteredComplaints = getFilteredComplaints();

  const handleSelect = (c) => {
    setSelectedComplaint(c);
    setNotes('');
    setResolutionImages([]);
    setImagePreviews([]);
    setDecisionType('work');
    setResolutionSummary(c.resolutionSummary || '');
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setResolutionImages(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleSubmitTransition = async (targetStatus) => {
    if (targetStatus === 'Resolved') {
      if (!resolutionImages || resolutionImages.length === 0) {
        alert('Please upload at least one completion photo before marking this issue as resolved.');
        return;
      }
    }
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('status', targetStatus);
      
      if (targetStatus === 'Verified By Officer') {
        formData.append('notes', notes);
      } 
      else if (targetStatus === 'Rejected By Officer') {
        formData.append('rejectionReason', notes);
        resolutionImages.forEach((img) => {
          formData.append('resolutionImages', img);
        });
      } 
      else if (targetStatus === 'Resolved') {
        formData.append('resolutionNotes', notes);
        resolutionImages.forEach((img) => {
          formData.append('resolutionImages', img);
        });
      }

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
      console.error('Error transitioning issue status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Primary Assigned Workload</h2>
        <p className="text-xs text-slate-400">Manage municipal dispatch tasks. Update status logs, compile inspection sheets, and resolve issues.</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-450 font-semibold uppercase tracking-wider text-[10px]">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-brand-500 text-[11px]"
          >
            <option value="all">All Statuses</option>
            <option value="Assigned">Assigned / Reassigned</option>
            <option value="Verified">Verified</option>
            <option value="Work Started">Work Started</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-450 font-semibold uppercase tracking-wider text-[10px]">Filter Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-brand-500 text-[11px]"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High / Critical</option>
          </select>
        </div>

        {(statusFilter !== 'all' || priorityFilter !== 'all') && (
          <button
            onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); }}
            className="text-brand-400 font-bold hover:underline cursor-pointer uppercase tracking-wider text-[10px] ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800 py-16 text-center text-sm text-slate-500">
          No dispatch tickets found matching the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/20">
          <table className="min-w-full text-xs text-left text-slate-350">
            <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Tracking ID</th>
                <th className="px-5 py-4">Complaint Title</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Community Support</th>
                <th className="px-5 py-4">Reporter</th>
                <th className="px-5 py-4">Assigned Date</th>
                <th className="px-5 py-4">Distance</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredComplaints.map((c) => {
                const distanceVal = userCoords 
                  ? calculateDistance(userCoords.lat, userCoords.lng, c.latitude, c.longitude)
                  : 'N/A';
                
                return (
                  <tr key={c._id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-400">{c.trackingId}</td>
                    <td className="px-5 py-4 font-bold text-slate-200 truncate max-w-[150px]">{c.title}</td>
                    <td className="px-5 py-4">
                      <span className="bg-slate-950/60 border border-slate-800 px-2 py-0.5 rounded font-semibold text-[10px] uppercase">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${getPriorityBadgeColor(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${getStatusBadgeColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-350">{c.supportCount || 0}</td>
                    <td className="px-5 py-4 font-semibold text-slate-450">{c.citizen?.fullName || 'Citizen'}</td>
                    <td className="px-5 py-4 text-slate-500">{c.assignmentTimestamp ? formatDate(c.assignmentTimestamp) : formatDate(c.createdAt)}</td>
                    <td className="px-5 py-4 font-semibold text-brand-400">
                      <span className="flex items-center gap-1.5">
                        <Navigation className="h-3.5 w-3.5" />
                        {distanceVal}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleSelect(c)}
                        className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-slate-950 cursor-pointer shadow-md shadow-brand-500/10 flex items-center gap-1 ml-auto"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Workspace Panel (45% Width Slide-out) */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="flex-1 animate-fade-in" onClick={() => setSelectedComplaint(null)} />

          <div className="w-full lg:w-[50vw] md:w-[70vw] bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl animate-slide-in-right">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-slate-100">Workstation Console</h3>
                <span className="text-xs text-slate-450">ID: {selectedComplaint.complaintId} | Tracking: {selectedComplaint.trackingId}</span>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Panel Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              
              {/* Stepper Kanban or Rejection Box */}
              {['Rejected', 'Rejected By Officer'].includes(selectedComplaint.status) ? (
                <div className="w-full bg-rose-500/10 p-5 rounded-xl border border-rose-500/20 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider">Complaint Rejected</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase text-[8px] font-bold">Reason for Rejection</span>
                      <span className="text-slate-200 mt-1 block leading-relaxed font-semibold">
                        {selectedComplaint.rejectionReason || selectedComplaint.adminRemarks || 'No rejection notes provided.'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[8px] font-bold">Rejection Date</span>
                      <span className="text-slate-200 mt-1 block font-mono">
                        {formatDate(
                          (() => {
                            const rejectEvent = selectedComplaint.timeline?.find(t => ['Rejected', 'Rejected By Officer'].includes(t.status));
                            return rejectEvent ? rejectEvent.timestamp : selectedComplaint.updatedAt;
                          })()
                        )}
                      </span>
                    </div>
                  </div>
                  {selectedComplaint.rejectionImages && selectedComplaint.rejectionImages.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-rose-500/10">
                      <span className="text-slate-500 block uppercase text-[8px] font-bold">Rejection Evidence Photos</span>
                      <div className="grid grid-cols-5 gap-2">
                        {selectedComplaint.rejectionImages.map((src, i) => (
                          <div key={i} className="aspect-square rounded-lg border border-slate-805 overflow-hidden bg-slate-950 relative">
                            <img src={src} alt="Rejection Proof" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Workflow Stepper</span>
                  <div className="flex justify-between items-center gap-1 overflow-x-auto pb-1.5">
                    {['Assigned', 'Verified', 'Work Started', 'Resolved', 'Closed'].map((stg, idx) => {
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
                      const currentIdx = getStatusIndex(selectedComplaint.status);
                      const isCompleted = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      
                      return (
                        <div key={stg} className="flex items-center gap-1">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            isCurrent 
                              ? selectedComplaint.status === 'Rejected By Officer' ? 'bg-rose-500 text-slate-950 ring-2 ring-rose-500/20' : 'bg-brand-500 text-slate-950 ring-2 ring-brand-500/20' 
                              : isCompleted 
                              ? 'bg-emerald-500 text-slate-950' 
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[9px] font-bold tracking-wider uppercase whitespace-nowrap ${
                            isCurrent ? 'text-slate-100' : isCompleted ? 'text-slate-355' : 'text-slate-550'
                          }`}>
                            {selectedComplaint.status === 'Rejected By Officer' && isCurrent ? 'Rejected By Officer' : stg}
                          </span>
                          {idx < 4 && <span className="text-slate-700 text-[10px] px-0.5">&rarr;</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}



              {/* Title & Basics */}
              <div>
                <h4 className="text-lg font-bold text-slate-100 leading-snug">{selectedComplaint.title}</h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-brand-400 font-semibold bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">{selectedComplaint.category}</span>
                  <span className="bg-slate-950/45 px-2 py-0.5 rounded border border-slate-850 text-[10px] uppercase tracking-wider">{selectedComplaint.priority} Priority</span>
                  <span>Reported: {formatDate(selectedComplaint.createdAt)}</span>
                </p>
              </div>

              {/* Reassignment context if returned */}
              {selectedComplaint.status === 'Reassigned' && (selectedComplaint.correctionsRequired || selectedComplaint.reasonForReturn) && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400 space-y-1.5">
                  <span className="font-bold uppercase tracking-wider block">Returned for Corrections by Admin</span>
                  {selectedComplaint.reasonForReturn && <div><span className="font-semibold">Reason for Return:</span> {cleanSystemFormatting(selectedComplaint.reasonForReturn)}</div>}
                  {selectedComplaint.correctionsRequired && <div><span className="font-semibold">Corrections Required:</span> {cleanSystemFormatting(selectedComplaint.correctionsRequired)}</div>}
                  {selectedComplaint.adminRemarks && <div><span className="font-semibold">Admin Remarks:</span> {cleanSystemFormatting(selectedComplaint.adminRemarks)}</div>}
                </div>
              )}

              {/* Before Resolution Card (Citizen Evidence) */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-350 uppercase tracking-widest block border-b border-slate-850 pb-2">
                  Before Resolution (Citizen Evidence)
                </span>
                
                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl space-y-4">
                  <div className="space-y-1.5 font-sans">
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block">Original Citizen Description</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                      {cleanSystemFormatting(getClarificationData(selectedComplaint).description)}
                    </p>
                  </div>
                  {getClarificationData(selectedComplaint).clarificationResponse && (
                    <div className="space-y-1.5 font-sans">
                      <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block">Citizen Clarification Response</span>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                        {cleanSystemFormatting(getClarificationData(selectedComplaint).clarificationResponse)}
                      </p>
                    </div>
                  )}

                  {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block">Citizen Photos</span>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedComplaint.images.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noreferrer" className="aspect-video rounded border border-slate-800 overflow-hidden bg-slate-950 block">
                            <img src={src} alt="Evidence" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-6 text-[10px] border-t border-slate-850 pt-3 text-slate-400">
                    <div>
                      <span className="text-[8px] uppercase text-slate-550 block font-bold">Citizen Name</span>
                      {selectedComplaint.citizen?.fullName}
                    </div>
                    <div>
                      <span className="text-[8px] uppercase text-slate-550 block font-bold">Contact</span>
                      {selectedComplaint.citizen?.mobile || 'N/A'}
                    </div>
                    <div>
                      <span className="text-[8px] uppercase text-slate-550 block font-bold">Community Support</span>
                      <span className="flex items-center gap-1 text-slate-300 font-semibold mt-0.5">
                        <ThumbsUp className="h-3.5 w-3.5 text-brand-400" />
                        {selectedComplaint.supportCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
                      <MapPin className="h-3.5 w-3.5 text-brand-400" /> Site Location Coordinates
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
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/20 text-center text-xs text-slate-500">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
                    Invalid or missing coordinates. Map cannot be rendered.
                  </div>
                );
              })()}

              {/* Status Stepper Action Panels */}
              <div className="border-t border-slate-850 pt-6">
                
                {/* Step 1: Verification */}
                {['Assigned', 'Reassigned'].includes(selectedComplaint.status) && (
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmitTransition('Verified'); }} className="space-y-4 bg-slate-950/20 border border-slate-850 p-5 rounded-xl">
                    <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Step 1: Verify Issue On-Site</span>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verification Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Log any initial verification details..."
                        className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-200"
                        rows={2}
                      />
                    </div>
                    <Button type="submit" loading={updating} className="w-full flex items-center justify-center gap-1.5">
                      <Check className="h-4 w-4" /> Verify Complaint on Site
                    </Button>
                  </form>
                )}                {/* Step 2: Decision */}
                {['Verified', 'Verified By Officer'].includes(selectedComplaint.status) && (
                  <div className="space-y-4 bg-slate-950/20 border border-slate-850 p-5 rounded-xl">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Step 2: Officer Decision</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDecisionType('work')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                          decisionType === 'work'
                            ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-205 hover:border-slate-700'
                        }`}
                      >
                        <RefreshCw className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Work Required</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionType('reject')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                          decisionType === 'reject'
                            ? 'border-rose-500 bg-rose-500/10 text-rose-450'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-250 hover:border-slate-700'
                        }`}
                      >
                        <X className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Invalid / Reject</span>
                      </button>
                    </div>

                    {decisionType === 'work' ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleSubmitTransition('Work Started'); }} className="pt-2">
                        <Button type="submit" loading={updating} className="w-full flex items-center justify-center gap-1.5 py-3">
                          <RefreshCw className="h-4 w-4" /> Start Repair Work
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={(e) => { e.preventDefault(); handleSubmitTransition('Rejected By Officer'); }} className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rejection Reason</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Detail why this complaint is invalid, duplicate, out of scope, or no problem was found..."
                            className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-rose-500 text-slate-200"
                            rows={3}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Supporting Proof Photo *</label>
                          <div className="border border-dashed border-rose-500/20 hover:border-rose-500/40 rounded-lg p-4 text-center relative cursor-pointer">
                            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                            <FileUp className="h-5 w-5 text-rose-450/60 mx-auto mb-1" />
                            <p className="text-[9px] text-slate-450">Upload site proof photo to verify no work is needed</p>
                          </div>
                          {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-5 gap-2 mt-2">
                              {imagePreviews.map((src, i) => (
                                <img key={i} src={src} alt="Preview" className="aspect-square object-cover rounded border border-slate-800 w-full" />
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={updating}
                          className="w-full bg-rose-600 hover:bg-rose-550 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <X className="h-4 w-4" /> Submit Rejection to Admin
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Step 3: Complete Work */}
                {selectedComplaint.status === 'Work Started' && (
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmitTransition('Resolved'); }} className="space-y-4 bg-slate-950/20 border border-slate-850 p-5 rounded-xl border-emerald-500/25">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Step 3: Complete Work & Submit Resolution</span>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Resolution / Completion Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Describe repairs finished and current resolved state."
                        className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-200"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">After Resolution Photo *</label>
                      <div className="border border-dashed border-emerald-500/20 rounded-lg p-4 text-center relative hover:border-emerald-500/40 cursor-pointer">
                        <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                        <FileUp className="h-5 w-5 text-emerald-500/45 mx-auto mb-1" />
                        <p className="text-[9px] text-slate-450">Upload final resolution proof photos</p>
                      </div>
                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-5 gap-2 mt-2">
                          {imagePreviews.map((src, i) => (
                            <img key={i} src={src} alt="Preview" className="aspect-square object-cover rounded border border-slate-800 w-full" />
                          ))}
                        </div>
                      )}
                    </div>

                    <Button type="submit" loading={updating} className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10">
                      <Check className="h-4 w-4" /> Mark as Resolved & Submit Proof
                    </Button>
                  </form>
                )}

              </div>

              {/* Side-by-Side Rejection details */}
              {selectedComplaint.status === 'Rejected By Officer' && (
                <div className="space-y-4 border-t border-slate-850 pt-6">
                  <span className="text-xs font-bold text-rose-450 uppercase tracking-widest block">
                    Officer Rejection Information
                  </span>
                  <div className="bg-slate-950/45 p-5 rounded-xl border border-rose-500/15 space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-550 font-bold uppercase block">Rejection Reason</span>
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-850 italic">
                        "{cleanSystemFormatting(selectedComplaint.rejectionReason) || 'No reason provided.'}"
                      </p>
                    </div>

                    {selectedComplaint.rejectionImages && selectedComplaint.rejectionImages.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-550 font-bold uppercase block mb-2">Supporting Proof Photos</span>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedComplaint.rejectionImages.map((src, i) => (
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

              {/* Timeline Audit History */}
              <div className="space-y-4 border-t border-slate-850 pt-6">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Audit Timeline History</span>
                <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-5 py-1">
                  {selectedComplaint.timeline?.map((event, i) => (
                    <div key={i} className="relative pl-1">
                      <span className="absolute -left-[30px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[8px] font-bold text-brand-400">
                        {i + 1}
                      </span>
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-slate-300">{cleanSystemFormatting(event.title)}</h5>
                        <p className="text-[11px] text-slate-450 leading-relaxed">{cleanSystemFormatting(event.description)}</p>
                        <span className="text-[9px] text-slate-550 font-mono block">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-850 bg-slate-950/20 text-right">
              <Button onClick={() => setSelectedComplaint(null)}>Close Panel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedIssues;
