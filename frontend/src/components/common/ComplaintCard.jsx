import React from 'react';
import { MessageSquare, Heart, Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../../utils/formatters';

const ComplaintCard = ({ complaint, onSupport, isSupported, userRole, proximityText }) => {
  const {
    _id,
    complaintId,
    title,
    description,
    category,
    priority,
    status,
    createdAt,
    supportCount,
    assignedOfficer,
  } = complaint;

  return (
    <div className="glass-panel rounded-xl border border-slate-800 p-5 flex flex-col justify-between glass-panel-hover shadow-lg">
      <div>
        {/* Card Header: Category & Priority */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
          <span className="text-[11px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-full">
            {category}
          </span>
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityBadgeColor(priority)}`}>
              {priority}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(status)}`}>
              {status}
            </span>
            {proximityText && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                {proximityText}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className="text-base font-semibold text-slate-100 line-clamp-1 mb-1">{title}</h4>
        <span className="text-[11px] font-medium text-slate-500 block mb-3">ID: {complaintId}</span>

        {/* Description */}
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {description}
        </p>
      </div>

      {/* Card Footer: Metadata and Action */}
      <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4.5">
          {/* Created Date */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(createdAt)}</span>
          </div>

          {/* Supports */}
          <div className="flex items-center gap-1">
            <Heart className={`h-3.5 w-3.5 ${isSupported ? 'text-rose-500 fill-rose-500' : ''}`} />
            <span className={isSupported ? 'text-rose-400 font-semibold' : ''}>{supportCount || 0}</span>
          </div>
        </div>

        {/* View Details Link */}
        <div className="flex items-center gap-2">
          {userRole === 'Citizen' && onSupport && status !== 'Resolved' && status !== 'Rejected' && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onSupport(_id);
              }}
              disabled={isSupported}
              className={`px-3 py-1 rounded text-xs font-semibold border flex items-center gap-1 transition-all ${
                isSupported
                  ? 'border-rose-500/30 bg-rose-500/5 text-rose-400 cursor-default'
                  : 'border-slate-700 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400'
              }`}
            >
              <Heart className="h-3 w-3" />
              {isSupported ? 'Supported' : 'Support'}
            </button>
          )}

          <Link
            to={
              userRole === 'Admin'
                ? `/admin/complaints/${_id}`
                : userRole === 'Department Officer'
                ? `/officer/assigned`
                : `/citizen/my-complaints` // we will handle click redirects in the page views
            }
            className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-0.5 hover:underline"
          >
            Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ComplaintCard;
