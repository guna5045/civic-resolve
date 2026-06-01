import React from 'react';

const LoadingSpinner = ({
  label = 'Loading...',
  size = 'md', // sm, md, lg
  className = '',
}) => {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-6 ${className}`}>
      <div
        className={`${sizes[size]} animate-spin rounded-full border-brand-500 border-t-transparent`}
        role="status"
        aria-label={label}
      />
      {label && (
        <span className="text-xs font-medium text-slate-400 animate-pulse tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
