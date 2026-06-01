import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, Check, CheckCheck } from 'lucide-react';
import Button from '../components/common/Button';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Notifications Inbox</h2>
          <p className="text-xs text-slate-400">Read in-app alert communications and ticket updates.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-xs">
            <CheckCheck className="h-4 w-4" /> Mark All Read
          </Button>
        )}
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
          Messages & Alerts
        </span>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Inbox is empty.</div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`py-4 flex items-start justify-between gap-4 transition-colors ${
                  !n.isRead ? 'bg-brand-500/5 -mx-6 px-6' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${!n.isRead ? 'bg-brand-500/15 text-brand-400' : 'bg-slate-900 text-slate-500'}`}>
                    <Bell className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-200">{n.title}</h5>
                    <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n._id)}
                    className="h-7 w-7 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-brand-400 hover:border-brand-500/30 transition-all shrink-0"
                    title="Mark read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
