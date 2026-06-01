import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const ChartCard = ({
  title,
  description,
  children,
  loading = false,
  error = '',
  empty = false,
  emptyMessage = 'No chart data to display.',
  className = '',
}) => {
  return (
    <div className={`glass-panel rounded-xl border border-slate-800 p-5 flex flex-col gap-4 shadow-lg bg-slate-900/20 ${className}`}>
      {/* Header */}
      {(title || description) && (
        <div className="pb-3 border-b border-slate-800/60">
          {title && <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h4>}
          {description && <p className="text-xs text-slate-500 mt-1 leading-normal">{description}</p>}
        </div>
      )}

      {/* Chart container body */}
      <div className="relative min-h-[260px] flex items-center justify-center w-full">
        {loading ? (
          <LoadingSpinner label="Compiling charts data..." />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-center p-6">
            <span className="text-rose-400 font-semibold text-sm">Failed to generate chart</span>
            <span className="text-xs text-slate-500">{error}</span>
          </div>
        ) : empty ? (
          <EmptyState title="No Data Available" description={emptyMessage} showAction={false} />
        ) : (
          <div className="w-full h-full min-h-[260px]">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartCard;
