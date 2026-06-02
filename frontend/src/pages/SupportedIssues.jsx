import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ComplaintCard from '../components/common/ComplaintCard';
import EmptyState from '../components/common/EmptyState';
import { Heart } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';

const SupportedIssues = () => {
  const { t } = useContext(LanguageContext);
  const { user } = useAuth();
  const navigate = useNavigate();
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
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">{t('supported.title')}</h2>
        <p className="text-xs text-slate-400">{t('supported.subtitle')}</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          title={t('supported.emptyState')}
          description={t('supported.emptyStateDesc')}
          icon={Heart}
          showAction={true}
          actionText={t('nav.nearbyIssues')}
          onActionClick={() => navigate('/citizen/nearby')}
        />
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
