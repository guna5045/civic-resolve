import React from 'react';
import { HelpCircle } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  title = 'No Data Available',
  description = 'There are no items found in this section.',
  icon: Icon = HelpCircle,
  actionText = '',
  onActionClick = null,
  showAction = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/10 max-w-md mx-auto ${className}`}>
      <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-500 mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h4 className="text-base font-bold text-slate-200 tracking-tight">{title}</h4>
      <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">{description}</p>
      {showAction && onActionClick && actionText && (
        <Button onClick={onActionClick} size="sm" className="mt-5">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
