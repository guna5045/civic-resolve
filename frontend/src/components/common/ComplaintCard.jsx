import React, { useContext } from 'react';
import { MessageSquare, Heart, Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../../utils/formatters';
import { LanguageContext } from '../../context/LanguageContext';

import { useAuth } from '../../hooks/useAuth';

const ComplaintCard = ({ complaint, onSupport, isSupported, userRole, proximityText, onViewDetails }) => {
  const { t } = useContext(LanguageContext);
  const { user } = useAuth();
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

  const citizenId = complaint.citizen?._id || complaint.citizen;
  const isOwner = user && citizenId && String(citizenId) === String(user._id);

  return (
    <div className="glass-panel rounded-xl border border-slate-800 p-6 md:p-7 flex flex-col justify-between glass-panel-hover shadow-lg transition-all duration-300">
      <div>
        {/* Card Header: Category & Priority */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4.5">
          <span className="text-[11px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-full">
            {t(`categories.${category}`) || category}
          </span>
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityBadgeColor(priority)}`}>
              {t(`priorities.${priority}`) || priority}
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
        <h4 className="text-lg font-bold text-slate-100 mb-1">{title}</h4>
        <span className="text-[11px] font-medium text-slate-500 block mb-3.5">ID: {complaintId}</span>

        {/* Description */}
        <p className="text-sm text-slate-350 line-clamp-2 leading-relaxed mb-5">
          {description}
        </p>

        {/* 4-column Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-1 border-t border-b border-slate-800/40 py-3 my-4.5 text-center bg-slate-950/10 rounded-lg">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{t('card.distance') || 'Distance'}</span>
            <span className="text-[11px] text-slate-350 font-medium mt-0.5">{proximityText || 'N/A'}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{t('card.supporters') || 'Supporters'}</span>
            <span className="text-[11px] text-slate-350 font-medium mt-0.5">{supportCount || 0}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{t('card.priority') || 'Priority'}</span>
            <span className={`text-[10px] font-bold mt-0.5 ${getPriorityBadgeColor(priority)}`}>
              {t(`priorities.${priority}`) || priority}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{t('card.status') || 'Status'}</span>
            <span className={`text-[10px] font-bold mt-0.5 ${getStatusBadgeColor(status)}`}>
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Metadata and Action */}
      <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4.5">
          {/* Created Date */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(createdAt)}</span>
          </div>
        </div>

        {/* View Details Link / Action */}
        <div className="flex items-center gap-2">
          {userRole === 'Citizen' && onSupport && status !== 'Resolved' && status !== 'Rejected' && (
            isOwner ? (
              <span className="px-3 py-1 rounded text-xs font-semibold border border-slate-800 bg-slate-800/20 text-slate-400 cursor-default">
                {t('nearby.reportedByYou') || 'Reported By You'}
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onSupport(_id);
                }}
                disabled={isSupported}
                className={`px-3 py-1 rounded text-xs font-semibold border flex items-center gap-1 transition-all ${
                  isSupported
                    ? 'border-rose-500/30 bg-rose-500/5 text-rose-400 cursor-default'
                    : 'border-slate-700 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-450'
                }`}
              >
                <Heart className="h-3 w-3" />
                {isSupported ? t('nearby.supported') : t('nearby.support')}
              </button>
            )
          )}

          {onViewDetails ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                onViewDetails(complaint);
              }}
              className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-0.5 hover:underline bg-transparent border-0 cursor-pointer p-0"
            >
              {t('card.details')} &rarr;
            </button>
          ) : (
            <Link
              to={
                userRole === 'Admin'
                  ? `/admin/complaints/${_id}`
                  : userRole === 'Department Officer'
                  ? `/officer/assigned`
                  : `/citizen/my-complaints`
              }
              className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-0.5 hover:underline"
            >
              {t('card.details')} &rarr;
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintCard;
