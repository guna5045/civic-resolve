import React, { useState, useEffect, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { getStatusBadgeColor, formatDate } from '../utils/formatters';
import { MapPin, Map as MapIcon, Compass } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';

// Controller to fly center of map to targeted coordinate safely
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Generates custom status-colored SVG map pins to bypass Vite icon bundle issues
const getMarkerIcon = (status, t) => {
  let color = '#3b82f6'; // Default: Blue (Submitted / Open)
  if (['Under Review', 'Assigned', 'In Progress'].includes(status)) {
    color = '#eab308'; // Yellow: In Progress
  } else if (['Resolved', 'Closed'].includes(status)) {
    color = '#10b981'; // Green: Resolved/Closed
  } else if (['Escalated'].includes(status)) {
    color = '#f97316'; // Orange: Escalated
  } else if (['Rejected'].includes(status)) {
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

const PublicMap = () => {
  const { t } = useContext(LanguageContext);
  const [complaints, setComplaints] = useState([]);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]); // default NYC coords
  const [mapZoom, setMapZoom] = useState(13);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

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
        setMapZoom(16);
        setLocationStatus('Centered on your location');
        setDetecting(false);
        setTimeout(() => setLocationStatus(''), 3000);
      },
      (err) => {
        console.error(err);
        setLocationStatus('Unable to retrieve location');
        setDetecting(false);
        setTimeout(() => setLocationStatus(''), 3000);
      }
    );
  };

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await api.get('/complaints');
        if (res.data.success) {
          setComplaints(res.data.data);
          // Set map center to first complaint coordinates if present
          if (res.data.data.length > 0) {
            setMapCenter([res.data.data[0].latitude, res.data.data[0].longitude]);
          }
        }
      } catch (err) {
        console.error('Error fetching public map complaints:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const handleFocusComplaint = (lat, lng) => {
    setMapCenter([lat, lng]);
    setMapZoom(16); // closer look
  };

  // Filter logic — always compare against English values stored in DB
  const filteredComplaints = complaints.filter((c) => {
    const categoryMatch = filterCategory === 'All' || c.category === filterCategory;
    const statusMatch =
      filterStatus === 'All' ||
      (filterStatus === 'Active' && ['Submitted', 'Under Review', 'Assigned', 'In Progress'].includes(c.status)) ||
      (filterStatus === 'Resolved' && ['Resolved', 'Closed'].includes(c.status));
    return categoryMatch && statusMatch;
  });

  const CATEGORIES = ['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'];

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">{t('map.title')}</h2>
        <p className="text-xs text-slate-400">{t('map.subtitle')}</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-0">
        
        {/* Left Side: Side list of complaints with filtering and stats */}
        <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-800 p-4 overflow-y-auto space-y-4 flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-800/60 pb-2">
            {t('map.cityDirectory')} ({filteredComplaints.length} {t('map.issues')})
          </span>

          {/* Quick Metrics Stats Block */}
          <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-950/40 border border-slate-850 text-center">
            <div>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-semibold">{t('map.active')}</span>
              <span className="text-xs font-bold text-amber-500">
                {complaints.filter((c) => ['Submitted', 'Under Review', 'Assigned', 'In Progress'].includes(c.status)).length}
              </span>
            </div>
            <div className="border-x border-slate-900">
              <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-semibold">{t('map.resolved')}</span>
              <span className="text-xs font-bold text-emerald-450">
                {complaints.filter((c) => ['Resolved', 'Closed'].includes(c.status)).length}
              </span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-semibold">{t('map.slaRate')}</span>
              <span className="text-xs font-bold text-brand-405">92.4%</span>
            </div>
          </div>

          {/* Location Auto Detection Control */}
          <div className="space-y-1">
            <button
              onClick={detectLocation}
              disabled={detecting}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-200 hover:border-brand-500 hover:text-brand-400 transition-all disabled:opacity-50"
            >
              <Compass className={`h-3.5 w-3.5 ${detecting ? 'animate-spin' : ''}`} />
              {detecting ? t('location.detecting') || 'Detecting...' : t('location.detectBtn') || 'Auto Detect My Location'}
            </button>
            {locationStatus && (
              <span className={`text-[10px] block text-center mt-1 ${locationStatus.includes('Centered') ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>{locationStatus}</span>
            )}
          </div>

          {/* Filters Panel */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">{t('map.category')}</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-slate-350 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-[11px]"
              >
                <option value="All" className="bg-slate-900">{t('map.allCategories')}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900">
                    {t(`categories.${cat}`) || cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">{t('map.statusQueue')}</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-slate-350 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-[11px]"
              >
                <option value="All" className="bg-slate-900">{t('map.allStatuses')}</option>
                <option value="Active" className="bg-slate-900">{t('map.activeQueue')}</option>
                <option value="Resolved" className="bg-slate-900">{t('map.resolved')}</option>
              </select>
            </div>
          </div>

          {/* Scrollable list content */}
          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-0">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">{t('map.noIssues')}</div>
            ) : (
              filteredComplaints.map((c) => (
                <div
                  key={c._id}
                  onClick={() => handleFocusComplaint(c.latitude, c.longitude)}
                  className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/20 hover:bg-slate-800/30 hover:border-brand-500/30 transition-all cursor-pointer text-left space-y-1.5"
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-brand-400 uppercase tracking-widest">
                      {t(`categories.${c.category}`) || c.category}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${getStatusBadgeColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{c.title}</h4>
                  <span className="text-[10px] text-slate-500 block">{formatDate(c.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Leaflet Map and Overlay Legend */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-800 p-4 relative z-10 flex flex-col">
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-805 bg-slate-950 relative">
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

              {filteredComplaints
                .filter((c) => c && typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude))
                .map((c) => (
                  <Marker 
                    key={c._id} 
                    position={[c.latitude, c.longitude]}
                    icon={getMarkerIcon(c.status, t)}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 text-slate-250">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-bold text-brand-400 truncate">{c.title}</span>
                          <span className={`px-1 py-0.2 rounded text-[8px] uppercase font-bold ${getStatusBadgeColor(c.status)}`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 capitalize font-mono">{t('map.popupCategory')}: {t(`categories.${c.category}`) || c.category}</p>
                        <p className="text-[10px] text-slate-450">{t('map.popupReported')}: {formatDate(c.createdAt)}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>

            {/* Map Legend Floating Overlay */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-slate-800/80 shadow-2xl text-[10px] space-y-2 text-slate-400 max-w-[170px] pointer-events-auto">
              <span className="font-bold text-slate-200 uppercase tracking-wider block border-b border-slate-850 pb-1.5 mb-1.5">{t('map.legend')}</span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                <span>{t('map.legendNew')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50" />
                <span>{t('map.legendInProgress')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <span>{t('map.legendResolved')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicMap;
