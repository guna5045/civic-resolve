import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../utils/formatters';
import { Calendar, Eye, ThumbsUp, MapPin, Sparkles, X, Download, AlertTriangle } from 'lucide-react';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { LanguageContext } from '../context/LanguageContext';
import ComplaintDetailsDrawer from '../components/common/ComplaintDetailsDrawer';

const MyComplaints = () => {
  const { t } = useContext(LanguageContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState(location.state?.filter || 'all');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints');
      if (res.data.success) {
        // Filter complaints reported by current citizen
        const filtered = res.data.data.filter(c => String(c.citizen._id || c.citizen) === String(user._id));
        setComplaints(filtered);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (complaint) => {
    setComplaintToDelete(complaint);
    setShowDeleteConfirm(true);
  };

  const handleDeleteComplaint = async () => {
    if (!complaintToDelete) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/complaints/${complaintToDelete._id}`);
      if (res.data.success) {
        setShowDeleteConfirm(false);
        setComplaintToDelete(null);
        fetchComplaints();
      }
    } catch (err) {
      console.error('Failed to delete complaint:', err);
      alert(err.response?.data?.message || 'Failed to delete complaint.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    if (location.state?.filter) {
      setActiveFilter(location.state.filter);
    }
  }, [location.state]);

  const getFilteredComplaints = () => {
    if (activeFilter === 'resolved') {
      return complaints.filter(c => ['Resolved', 'Closed'].includes(c.status));
    }
    if (activeFilter === 'pending') {
      return complaints.filter(c => ['Submitted', 'Under Review', 'Clarification Required', 'Information Clarified', 'Assigned', 'Verified', 'Verified By Officer', 'Work Started'].includes(c.status));
    }
    return complaints;
  };

  const filteredComplaints = getFilteredComplaints();

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

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
        {[
          { id: 'all', label: 'All Complaints', count: complaints.length },
          { id: 'pending', label: 'Pending Review', count: complaints.filter(c => ['Submitted', 'Under Review', 'Clarification Required', 'Information Clarified', 'Assigned', 'Verified', 'Verified By Officer', 'Work Started'].includes(c.status)).length },
          { id: 'resolved', label: 'Resolved / Closed', count: complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length }
        ].map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`py-2 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                isActive 
                  ? 'border-brand-500 text-brand-400 font-semibold' 
                  : 'border-transparent text-slate-450 hover:text-slate-200'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-950/45 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
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
      ) : filteredComplaints.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800 py-20 text-center text-xs text-slate-500">
          No complaints inside this status queue at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredComplaints.map((c) => (
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
                <div className="flex items-center gap-3">
                  {['Submitted', 'Clarification Required', 'Information Clarified'].includes(c.status) && (
                    <button
                      onClick={() => handleDeleteClick(c)}
                      className="text-rose-400 hover:text-rose-300 font-bold uppercase text-[9px] bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded border border-rose-500/20 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedComplaint(c)}
                    className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 hover:underline bg-transparent border-0 cursor-pointer"
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && complaintToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 overflow-hidden animate-scale-in">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="h-5.5 w-5.5 text-rose-500" />
                Delete Complaint?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete this complaint? This action cannot be undone. Once a complaint has been reviewed or verified by the administration, deletion will no longer be permitted.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end items-center gap-3.5 border-t border-slate-850 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setComplaintToDelete(null);
                }}
                disabled={deleting}
                className="px-4.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-205 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteComplaint}
                disabled={deleting}
                className="px-4 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-slate-100 rounded-lg transition-all cursor-pointer shadow-md shadow-rose-600/10"
              >
                {deleting ? 'Deleting...' : 'Delete Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyComplaints;
