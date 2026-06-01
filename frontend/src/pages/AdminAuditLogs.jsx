import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/formatters';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/audit-logs');
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Security Audit Logs</h2>
        <p className="text-xs text-slate-400">Review platform access audits, reassignment histories, user creation records, and logs.</p>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
          Municipal Audit Trails
        </span>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No logs generated inside the system database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-3 font-semibold uppercase tracking-wider">Timestamp</th>
                  <th className="py-3 font-semibold uppercase tracking-wider">Operator</th>
                  <th className="py-3 font-semibold uppercase tracking-wider">Module</th>
                  <th className="py-3 font-semibold uppercase tracking-wider">Action</th>
                  <th className="py-3 font-semibold uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-350 font-mono">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/30">
                    <td className="py-3.5 pr-4 text-slate-500 text-[10px] whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="py-3.5 pr-4 text-slate-200">{log.user?.fullName} ({log.user?.role})</td>
                    <td className="py-3.5 pr-4 text-brand-400 font-semibold">{log.module}</td>
                    <td className="py-3.5 pr-4 text-slate-300 font-bold uppercase">{log.action}</td>
                    <td className="py-3.5 text-slate-400 font-sans text-xs leading-normal">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
