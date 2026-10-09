import React from 'react';

export function FormInput({ label, type, value, onChange, placeholder, unit, className = "" }) {
  return (
    <div className={`min-w-0 overflow-hidden w-full ${className}`}>
      {label && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{label}</label>}
      <div className="relative">
        <input type={type} inputMode={type === 'number' ? 'decimal' : undefined} step={type === 'number' ? '0.1' : undefined} value={value} onChange={onChange} placeholder={placeholder} className={`w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 sm:px-3 py-2 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 box-border ${unit ? 'pr-8' : ''}`} style={{ fontSize: '16px' }} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}
