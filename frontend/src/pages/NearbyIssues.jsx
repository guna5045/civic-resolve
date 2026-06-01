import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { MapPin, Heart, AlertCircle } from 'lucide-react';
import ComplaintCard from '../components/common/ComplaintCard';
import Button from '../components/common/Button';

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

const NearbyIssues = () => {
  const { user } = useAuth();
  
  const [position, setPosition] = useState([40.7128, -74.006]); // Default center (NYC coords)
  const [complaints, setComplaints] = useState([]);
  const [supportedMap, setSupportedMap] = useState({});
  const [radius, setRadius] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNearby = async (lat, lng, r) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/complaints/nearby?lat=${lat}&lng=${lng}&radiusKm=${r}`);
      if (res.data.success) {
        setComplaints(res.data.data);
        
        // Batch evaluate support statuses for all returned complaints
        const supports = {};
        for (const c of res.data.data) {
          try {
            const checkRes = await api.get(`/complaints/${c._id}/supported`);
            supports[c._id] = checkRes.data.supported;
          } catch (e) {
            console.error('Error checking support for', c._id, e);
          }
        }
        setSupportedMap(supports);
      }
    } catch (err) {
      setError('Could not retrieve nearby issues. Please verify coordinates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          fetchNearby(lat, lng, radius);
        },
        (err) => {
          console.warn('Geolocation error. Loading from default coordinates.');
          fetchNearby(position[0], position[1], radius);
        }
      );
    } else {
      fetchNearby(position[0], position[1], radius);
    }
  }, [radius]);

  const handleSupport = async (complaintId) => {
    try {
      const res = await api.post(`/complaints/${complaintId}/support`);
      if (res.data.success) {
        setSupportedMap((prev) => ({ ...prev, [complaintId]: true }));
        setComplaints((prev) =>
          prev.map((c) =>
            c._id === complaintId
              ? { ...c, supportCount: (c.supportCount || 0) + 1 }
              : c
          )
        );
      }
    } catch (err) {
      console.error(err.response?.data?.message || 'Failed to support issue');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Nearby Issues</h2>
          <p className="text-xs text-slate-400">View complaints reported by neighbors and support them to raise priority levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-semibold uppercase">Search Radius</label>
          <select
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-brand-500"
          >
            <option value={2}>2 Kilometers</option>
            <option value={5}>5 Kilometers</option>
            <option value={10}>10 Kilometers</option>
            <option value={25}>25 Kilometers</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      {(() => {
        const criticalProximityCount = complaints.filter(c => {
          const dist = getDistanceMeters(position[0], position[1], c.latitude, c.longitude);
          return dist <= 100 && c.status !== 'Closed' && c.status !== 'Resolved' && c.status !== 'Rejected';
        }).length;

        if (criticalProximityCount > 0) {
          return (
            <div className="flex items-center gap-3 rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0 animate-bounce" />
              <div className="text-xs">
                <span className="font-bold uppercase tracking-wider block mb-0.5">🚨 Proximity Alert:</span>
                There are <span className="font-bold text-slate-100">{criticalProximityCount}</span> active unresolved issues reported within <span className="font-bold text-slate-100">100 meters</span> of your location. Please review nearby tickets for hazard details.
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Main Grid: Left List, Right Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Complaints List */}
        <div className="lg:col-span-6 space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {loading ? (
            <div className="py-24 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="glass-panel rounded-xl border border-slate-800 py-16 text-center text-sm text-slate-500">
              No issues reported within {radius}km of your location.
            </div>
          ) : (
            complaints.map((c) => {
              const dist = getDistanceMeters(position[0], position[1], c.latitude, c.longitude);
              const isClose = dist <= 100;
              const proximityText = isClose ? `${Math.round(dist)}m away` : null;
              return (
                <ComplaintCard
                  key={c._id}
                  complaint={c}
                  userRole="Citizen"
                  onSupport={handleSupport}
                  isSupported={!!supportedMap[c._id]}
                  proximityText={proximityText}
                />
              );
            })
          )}
        </div>

        {/* Right Side: Map view */}
        <div className="lg:col-span-6 min-h-[400px] glass-panel rounded-2xl border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-800/80 relative z-10">
            <MapContainer
              center={position}
              zoom={13}
              style={{ height: '100%', width: '100%', minHeight: '380px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* User location pin */}
              <Marker position={position}>
                <Popup>Your Coordinates</Popup>
              </Marker>

              {/* Complaints pins */}
              {complaints.map((c) => (
                <Marker key={c._id} position={[c.latitude, c.longitude]}>
                  <Popup>
                    <div className="text-xs space-y-1 text-slate-200">
                      <p className="font-bold text-brand-400 truncate">{c.title}</p>
                      <p className="text-[10px] text-slate-400 capitalize">Status: {c.status}</p>
                      <p className="text-[10px] text-slate-400">Upvotes: {c.supportCount || 0}</p>
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

export default NearbyIssues;
