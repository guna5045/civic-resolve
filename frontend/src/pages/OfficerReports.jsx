import React, { useState } from 'react';
import api from '../services/api';
import Button from '../components/common/Button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

const OfficerReports = () => {
  const [downloading, setDownloading] = useState(false);

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
      link.setAttribute('download', `Officer_Assigned_Workload_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Workload Reports & Exports</h2>
        <p className="text-xs text-slate-400">Generate professional spreadsheets detailing assigned, pending, and resolved tickets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spreadsheet Export Card */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 w-fit">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-200">Export Workload Spreadsheet</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compile all current complaints assigned to your user account, categorized by status, date, priority, and citizen details into a Microsoft Excel file.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleDownloadExcel}
            loading={downloading}
            className="flex items-center gap-1.5 w-full justify-center"
          >
            <Download className="h-4 w-4" /> Export Excel Sheet
          </Button>
        </div>

        {/* Audit Instructions Card */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4 bg-slate-900/40">
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 w-fit">
              <FileText className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-350">Individual Complaint Briefs</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              To download individual PDF reports containing timelines, coordinate logs, and AI-assisted summaries, inspect any complaint card on the "Assigned Issues" board and select the PDF icon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerReports;
