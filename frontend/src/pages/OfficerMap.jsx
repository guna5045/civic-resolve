import React, { useState, useEffect } from 'react';
import '../utils/mapSetup';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor } from '../utils/formatters';
import { Compass, AlertCircle } from 'lucide-react';

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


// Controller to update Leaflet view coordinates dynamically
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const OfficerMap = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]);
  const [mapZoom, setMapZoom] = useState(13);
  const [loading, setLoading] = useState(true);

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
    const fetchOfficerMap = async () => {
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
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOfficerMap();
  }, [user]);

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      {/* Title & Location Trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Department Map Routing</h2>
          <p className="text-xs text-slate-400">Track geographical coordinates of issues assigned to your department queue.</p>
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
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-semibold ${
                locationStatus === 'Location Detected' ? 'text-emerald-450' : 'text-rose-455'
              }`}>
                {locationStatus}
              </span>
              {locationStatus === 'Location Detected' && (
                <span className="text-[9px] text-slate-500 mt-0.5">
                  If not your current location, continue using the map manually.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl border border-slate-800 p-4 relative z-10">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          (() => {
            const hasValidCenter = Array.isArray(mapCenter) && 
              mapCenter.length === 2 && 
              typeof mapCenter[0] === 'number' && 
              typeof mapCenter[1] === 'number' && 
              !isNaN(mapCenter[0]) && 
              !isNaN(mapCenter[1]);

            return hasValidCenter ? (
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
                {complaints.filter(c => 
                  typeof c.latitude === 'number' && 
                  typeof c.longitude === 'number' && 
                  !isNaN(c.latitude) && 
                  !isNaN(c.longitude) &&
                  c.latitude !== 0 &&
                  c.longitude !== 0
                ).map((c) => (
                  <Marker key={c._id} position={[c.latitude, c.longitude]} icon={getMarkerIcon(c.status)}>
                    <Popup>
                      <div className="text-[11px] space-y-2 p-1.5 text-slate-200 bg-slate-900 rounded-lg min-w-[160px]">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                          <span className="font-bold text-brand-400 font-mono">{c.complaintId}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${getStatusBadgeColor(c.status)}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-100 text-xs leading-tight">{c.title}</p>
                          <p className="text-[9px] font-mono text-slate-450">Tracking ID: {c.trackingId}</p>
                          <p className="text-[9px] text-slate-450 uppercase font-semibold">Category: {c.category}</p>
                          <div className="flex gap-2 items-center">
                            <span className="text-[8px] uppercase font-bold text-slate-500">Priority:</span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${getPriorityBadgeColor(c.priority)}`}>
                              {c.priority}
                            </span>
                          </div>
                          <div className="text-[8px] font-mono text-slate-500 pt-1">
                            Lat: {c.latitude.toFixed(6)}<br />
                            Lng: {c.longitude.toFixed(6)}
                          </div>
                        </div>
                        <a
                          href="/officer/assigned"
                          className="text-brand-400 font-bold hover:underline text-[9px] block pt-1.5 border-t border-slate-800/80 mt-1.5 uppercase tracking-wider"
                        >
                          Inspect in Workspace &rarr;
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 italic p-6">
                 No valid coordinates found in department workload to center the map.
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default OfficerMap;
