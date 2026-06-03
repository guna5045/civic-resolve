import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  User, 
  Shield, 
  Wrench, 
  Check, 
  XCircle, 
  Archive, 
  AlertCircle, 
  History,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { formatDate, cleanSystemFormatting } from '../utils/formatters';
import ComplaintDetailsDrawer from '../components/common/ComplaintDetailsDrawer';
import EmptyState from '../components/common/EmptyState';

const ActivityHistory = () => {
  const { t } = useContext(LanguageContext);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  const fetchActivityHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints/my-complaints');
      if (res.data.success) {
        const citizenComplaints = res.data.data;

        const allEvents = [];
        citizenComplaints.forEach((c) => {
          if (c.timeline) {
            c.timeline.forEach((evt) => {
              allEvents.push({
                _id: evt._id,
                status: evt.status,
                title: cleanSystemFormatting(evt.title),
                description: cleanSystemFormatting(evt.description),
                timestamp: evt.timestamp || c.updatedAt,
                complaintId: c.complaintId,
                complaintDbId: c._id,
                complaintTitle: cleanSystemFormatting(c.title),
                category: c.category,
              });
            });
          }
        });

        // Sort chronologically descending
        allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setEvents(allEvents);
      }
    } catch (err) {
      console.error('Error loading activity history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityHistory();
  }, []);

  const getEventIcon = (status) => {
    switch (status) {
      case 'Submitted':
        return AlertCircle;
      case 'Clarification Required':
        return HelpCircle;
      case 'Information Clarified':
        return CheckCircle;
      case 'Under Review':
        return Clock;
      case 'Assigned':
      case 'Reassigned':
        return User;
      case 'Verified':
      case 'Verified By Officer':
        return Shield;
      case 'Work Started':
      case 'In Progress':
        return Wrench;
      case 'Resolved':
        return Check;
      case 'Rejected':
      case 'Rejected By Officer':
        return XCircle;
      case 'Closed':
        return Archive;
      default:
        return FileText;
    }
  };

  const getEventColorClass = (status) => {
    switch (status) {
      case 'Submitted':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Clarification Required':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Information Clarified':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'Under Review':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Assigned':
      case 'Reassigned':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'Verified':
      case 'Verified By Officer':
        return 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20';
      case 'Work Started':
      case 'In Progress':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Resolved':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Rejected':
      case 'Rejected By Officer':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Closed':
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default:
        return 'text-slate-300 bg-slate-805 border-slate-705/60';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Activity History</h2>
        <p className="text-xs text-slate-400">Complete historical timeline audit of updates and reviews on your reported complaints.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No Activity Logged"
          description="There are no historical updates or events registered for your complaints yet."
          icon={History}
        />
      ) : (
        <div className="relative border-l border-slate-800 ml-4.5 pl-6 space-y-8 py-2">
          {events.map((evt, idx) => {
            const Icon = getEventIcon(evt.status);
            const colorClass = getEventColorClass(evt.status);
            
            return (
              <div key={`${evt._id}-${idx}`} className="relative group">
                {/* Timeline Bullet Point */}
                <div className={`absolute -left-10 top-0 h-8 w-8 rounded-full border-2 border-slate-900 flex items-center justify-center transition-all duration-300 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Event Card Content */}
                <div 
                  onClick={() => setSelectedComplaintId(evt.complaintDbId)}
                  className="glass-panel p-5 rounded-xl border border-slate-800 bg-slate-950/20 hover:bg-slate-900/30 hover:border-brand-500/30 transition-all duration-300 shadow-md cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-205">{evt.title}</span>
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        {evt.complaintId}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        {t(`categories.${evt.category}`) || evt.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed pr-6">
                      {evt.description}
                    </p>

                    <div className="text-[10px] text-slate-500 font-medium font-sans">
                      Associated Issue: <span className="text-slate-350 font-semibold">"{evt.complaintTitle}"</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-2.5">
                    <span className="text-[10px] text-slate-505 font-mono">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Track Progress <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Overlay Drawer */}
      {selectedComplaintId && (
        <ComplaintDetailsDrawer
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onSupportChange={fetchActivityHistory}
        />
      )}
    </div>
  );
};

export default ActivityHistory;
