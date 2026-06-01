import React from 'react';

const Select = ({
  label,
  name,
  options = [],
  value,
  onChange,
  required = false,
  error = '',
  placeholder = 'Select an option',
  className = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full appearance-none rounded-lg border bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800'
          }`}
          {...props}
        >
          {placeholder && <option value="" disabled className="bg-slate-900 text-slate-500">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom Caret Icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      {error && <span className="text-xs font-medium text-rose-400">{error}</span>}
    </div>
  );
};

export default Select;
