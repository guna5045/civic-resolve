import React from 'react';
import { Bell, AlertCircle, Award, CheckCircle, UserPlus, Eye } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const NotificationCard = ({ notification, onMarkRead }) => {
  const { _id, title, message, type, isRead, createdAt } = notification;

  // Icon mapping
  const getIcon = () => {
    switch (type) {
      case 'Complaint Status':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'Badge Earned':
        return <Award className="h-5 w-5 text-amber-400" />;
      case 'Points Added':
        return <Award className="h-5 w-5 text-violet-400" />;
      case 'Officer Assignment':
        return <UserPlus className="h-5 w-5 text-blue-400" />;
      case 'System Alert':
      default:
        return <AlertCircle className="h-5 w-5 text-rose-400" />;
    }
  };

  const getBorderColor = () => {
    if (isRead) return 'border-slate-800/80 bg-slate-900/10 opacity-70';
    switch (type) {
      case 'Complaint Status':
        return 'border-emerald-500/20 bg-emerald-500/5';
      case 'Badge Earned':
      case 'Points Added':
        return 'border-amber-500/20 bg-amber-500/5';
      case 'Officer Assignment':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'System Alert':
      default:
        return 'border-rose-500/20 bg-rose-500/5';
    }
  };

  return (
    <div
      className={`glass-panel rounded-xl border p-4.5 flex items-start gap-4 transition-all duration-300 ${getBorderColor()}`}
    >
      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className={`text-sm font-semibold tracking-tight text-slate-100 ${!isRead ? 'font-bold' : ''}`}>
            {title}
          </h4>
          <span className="text-[10px] text-slate-500 font-medium">
            {formatDate(createdAt)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{message}</p>
      </div>

      {!isRead && onMarkRead && (
        <button
          onClick={() => onMarkRead(_id)}
          title="Mark read"
          className="rounded-lg p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-brand-400 hover:border-brand-500/30 transition-colors shrink-0 self-center"
          aria-label="Mark notification as read"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default NotificationCard;
