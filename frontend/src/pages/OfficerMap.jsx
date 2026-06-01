import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { getStatusBadgeColor } from '../utils/formatters';

const OfficerMap = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOfficerMap = async () => {
      try {
        const res = await api.get(`/complaints?officer=${user._id}`);
        if (res.data.success) {
          setComplaints(res.data.data);
          if (res.data.data.length > 0) {
            setMapCenter([res.data.data[0].latitude, res.data.data[0].longitude]);
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Department Map Routing</h2>
        <p className="text-xs text-slate-400">Track geographical coordinates of issues assigned to your department queue.</p>
      </div>

      <div className="flex-1 glass-panel rounded-2xl border border-slate-800 p-4 relative z-10">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%', minHeight: '350px' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {complaints.map((c) => (
              <Marker key={c._id} position={[c.latitude, c.longitude]}>
                <Popup>
                  <div className="text-xs space-y-1 text-slate-200">
                    <p className="font-bold text-brand-400">{c.complaintId}</p>
                    <p className="font-medium text-slate-200">{c.title}</p>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] uppercase font-bold ${getStatusBadgeColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default OfficerMap;
