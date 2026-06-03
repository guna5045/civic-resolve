import React, { useState, useEffect } from 'react';
import '../utils/mapSetup';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../utils/formatters';
import { MapPin, Compass, AlertCircle, Layers } from 'lucide-react';

// Controller to update Leaflet view coordinates dynamically
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Generates status-colored marker icons
const getMarkerIcon = (status) => {
  let color = '#3b82f6'; // Blue: Submitted / Open
  if (['Under Review', 'Assigned', 'Verified', 'Verified By Officer', 'Work Started', 'In Progress'].includes(status)) {
    color = '#eab308'; // Yellow: In progress/assigned
  } else if (['Resolved', 'Closed'].includes(status)) {
    color = '#10b981'; // Green: Resolved
  } else if (['Rejected', 'Rejected By Officer'].includes(status)) {
    color = '#ef4444'; // Red: Rejected
  }

  const svgTemplate = `
    <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 36 12 36C12 36 24 21 24 12C24 5.37258 18.6274 0 12 0ZM12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12C16.5 14.4853 14.4853 16.5 12 16.5Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="3.5" fill="#ffffff" />
    </svg>
  `;

  return L.divIcon({
    html: svgTemplate,
    className: 'custom-leaflet-marker',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -32]
  });
};

const AdminMap = () => {
  const [complaints, setComplaints] = useState([]);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]);
  const [mapZoom, setMapZoom] = useState(13);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDept, setFilterDept] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Location detection state
  const [detecting, setDetecting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setDetecting(true);
    setLocationStatus('Detecting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapCenter([lat, lng]);
        setMapZoom(15);
        setLocationStatus('Location Detected');
        setDetecting(false);
      },
      (err) => {
        console.error(err);
        setLocationStatus('Location Permission Denied');
        setDetecting(false);
      }
    );
  };

  useEffect(() => {
    const fetchAllComplaints = async () => {
      try {
        const res = await api.get('/complaints');
        if (res.data.success) {
          const list = res.data.data;
          setComplaints(list);
          const firstValid = list.find(c => 
            typeof c.latitude === 'number' && 
            typeof c.longitude === 'number' && 
            !isNaN(c.latitude) && 
            !isNaN(c.longitude) &&
            c.latitude !== 0 &&
            c.longitude !== 0
          );
          if (firstValid) {
            setMapCenter([firstValid.latitude, firstValid.longitude]);
          }
        }
      } catch (err) {
        console.error('Failed to load complaints for admin map:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllComplaints();
  }, []);

  const handleFocusComplaint = (lat, lng) => {
    setMapCenter([lat, lng]);
    setMapZoom(16);
  };

  // Get departments present in loaded complaints
  const departmentsList = Array.from(new Set(complaints.map(c => c.department?.name).filter(Boolean)));
  const categoriesList = ['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'];

  const filteredComplaints = complaints.filter(c => {
    const deptMatch = filterDept === 'All' || c.department?.name === filterDept;
    const catMatch = filterCategory === 'All' || c.category === filterCategory;
    const hasCoords = typeof c.latitude === 'number' && 
      typeof c.longitude === 'number' && 
      !isNaN(c.latitude) && 
      !isNaN(c.longitude) &&
      c.latitude !== 0 &&
      c.longitude !== 0;
    return deptMatch && catMatch && hasCoords;
  });

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Public Issues Map</h2>
          <p className="text-xs text-slate-400">Centrally monitor all geographical markers, department workload distribution, and active issues.</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={detectLocation}
            disabled={detecting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-slate-205 hover:border-brand-500 hover:text-brand-400 transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            <Compass className={`h-4 w-4 ${detecting ? 'animate-spin' : ''}`} />
            Detect My Location
          </button>
          {locationStatus && (
            <span className={`text-[10px] font-semibold ${
              locationStatus === 'Location Detected' ? 'text-emerald-450' : 'text-rose-450'
            }`}>
              {locationStatus}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-0">
        {/* Sidebar Directory */}
        <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-800 p-4 overflow-y-auto space-y-4 flex flex-col">
          <span className="text-xs font-bold text-slate-350 uppercase tracking-widest block border-b border-slate-850 pb-2">
            City Directory ({filteredComplaints.length} Unresolved Pins)
          </span>

          {/* Filtering */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="space-y-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider block">Department</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 focus:border-brand-500 outline-none text-[11px]"
              >
                <option value="All">All Departments</option>
                {departmentsList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider block">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 focus:border-brand-500 outline-none text-[11px]"
              >
                <option value="All">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrollable list directory */}
          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-0">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 italic">No matching unresolved issues on map.</div>
            ) : (
              filteredComplaints.map((c) => (
                <div
                  key={c._id}
                  onClick={() => handleFocusComplaint(c.latitude, c.longitude)}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/20 hover:bg-slate-800/30 hover:border-brand-500/30 transition-all cursor-pointer text-left space-y-2"
                >
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-brand-405 uppercase tracking-widest">{c.complaintId}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${getStatusBadgeColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{c.title}</h4>
                  <div className="flex flex-wrap gap-2 text-[9px] text-slate-400">
                    <span className="font-semibold px-1.5 py-0.2 bg-slate-900 rounded border border-slate-850">{c.category}</span>
                    <span className={`font-bold px-1.5 py-0.2 rounded border uppercase ${getPriorityBadgeColor(c.priority)}`}>{c.priority} Priority</span>
                  </div>
                  {c.department?.name && (
                    <span className="text-[9px] text-slate-500 flex items-center gap-1">
                      <Layers className="h-3 w-3" /> {c.department.name}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Panel */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-800 p-4 relative z-10 flex flex-col">
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-805 bg-slate-950 relative">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%', minHeight: '350px' }}
              >
                <ChangeView center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {filteredComplaints.map((c) => (
                  <Marker 
                    key={c._id} 
                    position={[c.latitude, c.longitude]}
                    icon={getMarkerIcon(c.status)}
                  >
                    <Popup>
                      <div className="text-[11px] space-y-2 p-1.5 text-slate-205 bg-slate-900 rounded-lg min-w-[170px]">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                          <span className="font-bold text-brand-400 font-mono">{c.complaintId}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${getStatusBadgeColor(c.status)}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-100 text-xs leading-tight">{c.title}</p>
                          <p className="text-[9px] font-mono text-slate-500">Tracking ID: {c.trackingId}</p>
                          <p className="text-[9px] text-slate-450 uppercase font-semibold">Category: {c.category}</p>
                          <div className="flex gap-2 items-center">
                            <span className="text-[8px] uppercase font-bold text-slate-500">Priority:</span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${getPriorityBadgeColor(c.priority)}`}>
                              {c.priority}
                            </span>
                          </div>
                          {c.department?.name && (
                            <p className="text-[9px] text-slate-450 flex items-center gap-1 pt-0.5">
                              <Layers className="h-3 w-3 text-slate-500" /> {c.department.name}
                            </p>
                          )}
                          <div className="text-[8px] font-mono text-slate-500 pt-1 border-t border-slate-850/60 mt-1">
                            Lat: {c.latitude.toFixed(6)}<br />
                            Lng: {c.longitude.toFixed(6)}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMap;
