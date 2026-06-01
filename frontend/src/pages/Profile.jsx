import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { getBadgeIcon } from '../utils/formatters';
import { User, Mail, Phone, Award, Shield } from 'lucide-react';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  
  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">My Profile</h2>
        <p className="text-xs text-slate-400">Manage account information and review digital badges.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Card details */}
        <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-20 w-20 rounded-full bg-brand-500/10 border-2 border-brand-500/30 flex items-center justify-center text-3xl font-bold text-brand-400">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{user?.fullName}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800/40 pt-5 space-y-3 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-slate-500" />
              <span className="text-slate-200">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-500" />
              <span className="text-slate-200">{user?.mobile || 'N/A'}</span>
            </div>
            {user?.department && (
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-slate-500" />
                <span className="text-slate-200">{user?.department?.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reputation and Badges (Citizen only) */}
        {user?.role === 'Citizen' && (
          <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-805 pb-3">
              <Award className="h-5 w-5 text-brand-400" />
              <h4 className="text-sm font-bold text-slate-200">Earned Badges & Milestones</h4>
            </div>

            {user?.earnedBadges?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No digital badges unlocked yet. Start reporting complaints to earn rewards!</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {user?.earnedBadges?.map((eb, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/20 text-center space-y-1.5 hover:border-brand-500/20 transition-all">
                    <span className="text-3xl block filter drop-shadow">{getBadgeIcon(eb.badge?.icon)}</span>
                    <span className="text-xs font-bold text-slate-200 block truncate">{eb.badge?.name}</span>
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">
                      {new Date(eb.earnedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
