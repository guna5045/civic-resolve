import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BadgeCard from '../components/common/BadgeCard';

const AdminRewards = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      setLoading(true);
      try {
        const res = await api.get('/badges');
        if (res.data.success) {
          setBadges(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBadges();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Municipal Gamification Directory</h2>
        <p className="text-xs text-slate-400">Configure digital badge rewards, XP multipliers, and track user reputation parameters.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((b) => (
            <BadgeCard key={b._id} badge={b} isUnlocked={true} /> // show all unlocked for admin inspect
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRewards;
