import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const Table = ({
  headers = [],
  data = [],
  renderRow,
  loading = false,
  error = '',
  emptyMessage = 'No records found.',
  className = '',
}) => {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 glass-panel ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-slate-300">
          <thead className="bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className="px-6 py-4 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-transparent">
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="py-12">
                  <LoadingSpinner label="Loading data..." />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={headers.length} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-rose-400 font-semibold">Failed to load records</span>
                    <span className="text-xs text-slate-500">{error}</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-12">
                  <EmptyState title="No Data Available" description={emptyMessage} showAction={false} />
                </td>
              </tr>
            ) : (
              data.map((item, idx) => renderRow(item, idx))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
