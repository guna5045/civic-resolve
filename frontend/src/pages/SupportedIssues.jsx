import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import ComplaintCard from '../components/common/ComplaintCard';

const SupportedIssues = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupported = async () => {
      setLoading(true);
      try {
        const res = await api.get('/complaints');
        if (res.data.success) {
          // Check support list for each complaint
          const supported = [];
          for (const c of res.data.data) {
            try {
              const checkRes = await api.get(`/complaints/${c._id}/supported`);
              if (checkRes.data.supported) {
                supported.push(c);
              }
            } catch (e) {
              console.error('Error checking support state:', e);
            }
          }
          setComplaints(supported);
        }
      } catch (err) {
        console.error('Error loading supported issues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupported();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Supported Issues</h2>
        <p className="text-xs text-slate-400">Issues reported by other citizens that you have supported to boost priority.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800 py-16 text-center text-sm text-slate-500">
          You haven't supported any complaints yet. Check "Nearby Issues" to discover public complaints.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((c) => (
            <ComplaintCard key={c._id} complaint={c} userRole="Citizen" isSupported={true} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SupportedIssues;
