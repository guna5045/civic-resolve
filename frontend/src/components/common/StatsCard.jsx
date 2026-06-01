import React from 'react';

const StatsCard = ({ title, value, icon: Icon, description, trend, colorClass = 'text-brand-400 bg-brand-500/10 border-brand-500/20' }) => {
  return (
    <div className="glass-panel rounded-xl p-6 flex items-center justify-between border border-slate-800">
      <div className="space-y-1.5 overflow-hidden">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{title}</span>
        <h3 className="text-3xl font-bold text-slate-100 tracking-tight">{value}</h3>
        {description && <p className="text-xs text-slate-500 truncate">{description}</p>}
      </div>
      <div className={`p-3.5 rounded-xl flex items-center justify-center border ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
};

export default StatsCard;
