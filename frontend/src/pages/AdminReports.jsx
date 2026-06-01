import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/common/Button';
import { Download, FileSpreadsheet, History } from 'lucide-react';
import { formatDate } from '../utils/formatters';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReportsHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports');
      if (res.data.success) {
        setReports(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load reports metadata history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsHistory();
  }, []);

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/reports/excel', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `City_Complaints_Report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Refresh history logs
      fetchReportsHistory();
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Municipal Reports Console</h2>
        <p className="text-xs text-slate-400">Generate city-wide analytics spreadsheets and review historical export records.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Export Button */}
        <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-805 p-6 space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
            Compile Database Exports
          </span>

          <div className="space-y-3.5">
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 w-fit">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">Compile Complaints Ledger</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export all city-wide complaints registered inside the municipal database, containing geolocation data, priority classifications, timeline audits, and assigned officer info.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleDownloadExcel}
            loading={downloading}
            className="flex items-center gap-1.5 w-full justify-center"
          >
            <Download className="h-4 w-4" /> Export Complete Excel Ledger
          </Button>
        </div>

        {/* Right Side: History list */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-805 p-6 space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
            Historical Export Records
          </span>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No export logs captured in history.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-3 font-semibold uppercase tracking-wider">Report Details</th>
                    <th className="py-3 font-semibold uppercase tracking-wider">Format</th>
                    <th className="py-3 font-semibold uppercase tracking-wider">Operator</th>
                    <th className="py-3 font-semibold uppercase tracking-wider text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-350">
                  {reports.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-900/30">
                      <td className="py-3 font-semibold text-slate-200">{r.name}</td>
                      <td className="py-3 font-mono text-[10px] text-brand-400 uppercase font-bold">{r.type}</td>
                      <td className="py-3">{r.generatedBy?.fullName}</td>
                      <td className="py-3 text-right">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
