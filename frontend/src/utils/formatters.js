export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'Submitted':
      return 'bg-slate-500/10 text-slate-350 border border-slate-500/20';
    case 'Information Clarified':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'Under Review':
      return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    case 'Reported':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'Assigned':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'Reassigned':
      return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    case 'Verified By Officer':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'Work Started':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'Rejected By Officer':
      return 'bg-rose-500/10 text-rose-450 border border-rose-500/20';
    case 'In Progress':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'Resolved':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'Closed':
      return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
    case 'Escalated':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse';
    case 'Rejected':
      return 'bg-red-500/10 text-red-450 border border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};

export const getPriorityBadgeColor = (priority) => {
  switch (priority) {
    case 'Low':
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    case 'Medium':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'High':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'Critical':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};

export const getBadgeIcon = (iconSlug) => {
  switch (iconSlug) {
    case 'first_reporter':
      return '🥇';
    case 'voice_of_community':
      return '📢';
    case 'active_citizen':
      return '✨';
    case 'neighborhood_guardian':
      return '🛡️';
    case 'problem_solver':
      return '🛠️';
    case 'civic_champion':
      return '🏆';
    default:
      return '🎖️';
  }
};

export const cleanSystemFormatting = (text) => {
  if (!text) return '';
  return text
    .replace(/\[Clarification Response\]:?/gi, '')
    .replace(/\[System Note\]:?/gi, '')
    .replace(/\[Admin Note\]:?/gi, '')
    .replace(/\[Status\]:?/gi, '')
    .replace(/\[Admin Remarks\]:?/gi, '')
    .replace(/\[Corrections Required\]:?/gi, '')
    .replace(/\[Reason for Return\]:?/gi, '')
    .replace(/\[Mock AI Summary\]\s*/gi, '')
    .trim();
};

export const parseDescription = (desc) => {
  if (!desc) return { description: '', clarificationResponse: '' };
  const markerRegex = /(?:\r?\n)*\s*\[Clarification Response\]:\s*/i;
  const match = desc.split(markerRegex);
  if (match.length > 1) {
    return {
      description: match[0].trim(),
      clarificationResponse: match.slice(1).join(' ').trim()
    };
  }
  return { description: desc.trim(), clarificationResponse: '' };
};

export const getClarificationData = (complaint) => {
  if (!complaint) return { description: '', clarificationResponse: '' };
  const parsed = parseDescription(complaint.description);
  const response = complaint.clarificationResponse || parsed.clarificationResponse;
  return {
    description: parsed.description,
    clarificationResponse: response
  };
};
