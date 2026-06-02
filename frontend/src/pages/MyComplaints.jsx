import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../utils/formatters';
import { Calendar, Eye, Heart, MapPin, Sparkles, X, Download } from 'lucide-react';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { LanguageContext } from '../context/LanguageContext';
import ComplaintDetailsDrawer from '../components/common/ComplaintDetailsDrawer';

const MyComplaints = () => {
  const { t } = useContext(LanguageContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints');
      if (res.data.success) {
        // Filter complaints reported by current citizen
        const filtered = res.data.data.filter(c => String(c.citizen._id) === String(user._id));
        setComplaints(filtered);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleDownloadPDF = async (complaintId) => {
    setDownloadingId(complaintId);
    try {
      // Trigger browser download by requesting binary file stream
      const response = await api.get(`/reports/pdf/${complaintId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Complaint_${complaintId}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF summary:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">{t('myComplaints.title')}</h2>
        <p className="text-xs text-slate-400">{t('myComplaints.subtitle')}</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          title={t('myComplaints.emptyState')}
          description={t('myComplaints.emptyStateDesc')}
          icon={Calendar}
          showAction={true}
          actionText={t('nav.reportIssue')}
          onActionClick={() => navigate('/citizen/report')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {complaints.map((c) => (
            <div key={c._id} className="glass-panel rounded-xl border border-slate-800 p-6 md:p-7 flex flex-col justify-between glass-panel-hover shadow-lg transition-all duration-300">
              <div>
                <div className="flex justify-between items-center mb-3.5">
                  <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-500/20">
                    {c.category}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-100 mb-1">{c.title}</h4>
                <p className="text-[11px] text-slate-500 mb-3">{t('myComplaints.trackingId')}: {c.trackingId}</p>
                <p className="text-sm text-slate-350 line-clamp-2 leading-relaxed mb-5">{c.description}</p>
              </div>

              <div className="border-t border-slate-800/40 pt-4 flex items-center justify-between text-xs">
                <span className="text-slate-500">{formatDate(c.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedComplaint(c)}
                    className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Eye className="h-3.5 w-3.5" /> {t('myComplaints.viewProgress')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side Details Drawer overlay */}
      {selectedComplaint && (
        <ComplaintDetailsDrawer
          complaintId={selectedComplaint._id}
          onClose={() => setSelectedComplaint(null)}
          onSupportChange={fetchComplaints}
        />
      )}
    </div>
  );
};

export default MyComplaints;
