import React from 'react';
import { Lock } from 'lucide-react';
import { getBadgeIcon } from '../../utils/formatters';

const BadgeCard = ({ badge, isUnlocked, earnedAt }) => {
  const { name, description, icon, requirement, pointsReward } = badge;

  return (
    <div
      className={`glass-panel rounded-xl border p-5 flex flex-col justify-between transition-all duration-300 ${
        isUnlocked
          ? 'border-brand-500/30 bg-brand-500/5 shadow-md shadow-brand-500/5'
          : 'border-slate-800/80 bg-slate-900/20 opacity-60'
      }`}
    >
      <div>
        {/* Badge Icon & Unlock Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-4xl filter drop-shadow">
            {isUnlocked ? getBadgeIcon(icon) : '🔒'}
          </div>
          {isUnlocked ? (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
              Unlocked
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> Locked
            </span>
          )}
        </div>

        {/* Title & Desc */}
        <h4 className="text-base font-bold text-slate-100">{name}</h4>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{description}</p>
      </div>

      {/* Requirement Details */}
      <div className="mt-4 border-t border-slate-800/50 pt-3 flex items-center justify-between text-[11px] text-slate-500">
        <div>
          <span className="block text-[9px] text-slate-600 font-semibold uppercase tracking-wider">Requirement</span>
          <span className="text-slate-400 font-medium">{requirement}</span>
        </div>
        <div className="text-right">
          <span className="block text-[9px] text-slate-600 font-semibold uppercase tracking-wider">Reward</span>
          <span className="text-brand-400 font-bold">+{pointsReward} XP</span>
        </div>
      </div>
    </div>
  );
};

export default BadgeCard;
