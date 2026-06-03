import React, { useState } from 'react';
import api from '../services/api';
import Button from '../components/common/Button';
import { Download, FileSpreadsheet, FileText, ClipboardList, CheckCircle, TrendingUp } from 'lucide-react';

const OfficerReports = () => {
  const [downloading, setDownloading] = useState({
    allExcel: false,
    allPdf: false,
    assignExcel: false,
    assignPdf: false,
    resExcel: false,
    resPdf: false,
    perfExcel: false,
    perfPdf: false
  });

  const handleDownload = async (key, endpoint, reportType, format, filename) => {
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      const response = await api.get(`${endpoint}?reportType=${reportType}`, {
        responseType: 'blob',
      });
      const contentType = format === 'Excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'application/pdf';
      
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${Date.now()}.${format === 'Excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(`Export failed for ${reportType} (${format}):`, err);
      if (err.response && err.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorObj = JSON.parse(reader.result);
            alert(errorObj.message || 'Export failed.');
          } catch (e) {
            alert('Export failed.');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        alert(err.response?.data?.message || 'Export failed.');
      }
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Workload Reports & Exports</h2>
        <p className="text-xs text-slate-400">Compile and export professional files detailing assignments, resolutions, and performance audits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card 1: Overall Workload Report */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 w-fit">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-200">Overall Workload Ledger</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compile all assigned, pending, in-progress, and resolved complaints into a comprehensive worksheet or summary document.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleDownload('allExcel', '/reports/excel', 'all', 'Excel', 'Overall_Workload_Ledger')}
              loading={downloading.allExcel}
              className="flex-1 flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold"
            >
              <Download className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button
              onClick={() => handleDownload('allPdf', '/reports/pdf-summary', 'all', 'PDF', 'Overall_Workload_Summary')}
              loading={downloading.allPdf}
              variant="secondary"
              className="flex-1 flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold"
            >
              <Download className="h-3.5 w-3.5" /> PDF Summary
            </Button>
          </div>
        </div>

        {/* Card 2: Active Assignments Report */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 w-fit">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-200">Active Assignment Sheet</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export details of all tasks currently in Assigned, Verified, or Work Started status.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleDownload('assignExcel', '/reports/excel', 'assignment', 'Excel', 'Active_Assignments')}
              loading={downloading.assignExcel}
              className="flex-1 flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold"
            >
              <Download className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button
              onClick={() => handleDownload('assignPdf', '/reports/pdf-summary', 'assignment', 'PDF', 'Active_Assignments_Brief')}
              loading={downloading.assignPdf}
              variant="secondary"
              className="flex-1 flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold"
            >
              <Download className="h-3.5 w-3.5" /> PDF summary
            </Button>
          </div>
        </div>

        {/* Card 3: Resolution & Completion Report */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-200">Resolution Evidence Log</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export all completed and resolved complaints. Includes completion timestamps and resolution notes.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleDownload('resExcel', '/reports/excel', 'resolution', 'Excel', 'Resolution_Log')}
              loading={downloading.resExcel}
              className="flex-1 flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold"
            >
              <Download className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button
              onClick={() => handleDownload('resPdf', '/reports/pdf-summary', 'resolution', 'PDF', 'Resolution_Briefs')}
              loading={downloading.resPdf}
              variant="secondary"
              className="flex-1 flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold"
            >
              <Download className="h-3.5 w-3.5" /> PDF summary
            </Button>
          </div>
        </div>

        {/* Card 4: Performance & Performance Report */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-200">Officer Performance Report</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compile performance indicators, resolution success rates, category workload stats, and speed stats.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleDownload('perfExcel', '/reports/excel', 'performance', 'Excel', 'Performance_Report')}
              loading={downloading.perfExcel}
              className="flex-1 flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold"
            >
              <Download className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button
              onClick={() => handleDownload('perfPdf', '/reports/pdf-summary', 'performance', 'PDF', 'Performance_Audit')}
              loading={downloading.perfPdf}
              variant="secondary"
              className="flex-1 flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold"
            >
              <Download className="h-3.5 w-3.5" /> PDF Summary
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OfficerReports;
