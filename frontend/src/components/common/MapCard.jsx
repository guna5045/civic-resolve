import React from 'react';

const MapCard = ({
  title = 'Geographic Map View',
  description = 'Visual distribution of reported issues and hot zones.',
  children,
  heightClass = 'h-[400px]',
  actionButton = null,
  className = '',
}) => {
  return (
    <div className={`glass-panel rounded-xl border border-slate-800 p-5 flex flex-col gap-4 shadow-lg bg-slate-900/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3.5 border-b border-slate-800/60">
        <div>
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h4>
          {description && <p className="text-xs text-slate-500 mt-1 leading-normal">{description}</p>}
        </div>
        {actionButton && <div>{actionButton}</div>}
      </div>

      {/* Map Content Frame */}
      <div className={`relative w-full overflow-hidden rounded-lg border border-slate-800 ${heightClass}`}>
        {children}
      </div>
    </div>
  );
};

export default MapCard;
