import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import api from '../services/api';
import { getStatusBadgeColor, formatDate } from '../utils/formatters';
import { MapPin, Map as MapIcon, Compass } from 'lucide-react';

// Controller to fly center of map to targeted coordinate
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const PublicMap = () => {
  const [complaints, setComplaints] = useState([]);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]); // default NYC coords
  const [mapZoom, setMapZoom] = useState(13);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Public Issues Map</h2>
        <p className="text-xs text-slate-400">Interact with the city map to review open and resolved complaints in all departments.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-0">
        
        {/* Left Side: Side list of complaints */}
        <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-800 p-4 overflow-y-auto space-y-3 flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
            City Directory ({complaints.length} Issues)
          </span>

          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : complaints.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No public issues reported yet.</div>
            ) : (
              complaints.map((c) => (
                <div
                  key={c._id}
                  onClick={() => handleFocusComplaint(c.latitude, c.longitude)}
                  className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/20 hover:bg-slate-800/30 hover:border-brand-500/30 transition-all cursor-pointer text-left space-y-1.5"
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-brand-400 uppercase tracking-widest">{c.category}</span>
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

        {/* Right Side: Big Leaflet Map */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-800 p-4 relative z-10 flex flex-col">
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-805 bg-slate-950">
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

              {complaints.map((c) => (
                <Marker key={c._id} position={[c.latitude, c.longitude]}>
                  <Popup>
                    <div className="text-xs space-y-1 text-slate-200">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-brand-400 truncate">{c.title}</span>
                        <span className={`px-1 py-0.2 rounded text-[8px] uppercase font-bold ${getStatusBadgeColor(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 capitalize">Category: {c.category}</p>
                      <p className="text-[10px] text-slate-400">Reported: {formatDate(c.createdAt)}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicMap;
