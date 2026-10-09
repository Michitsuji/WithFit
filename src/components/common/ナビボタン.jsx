import React from 'react';

export function NavButton({ icon, label, isActive, onClick, isPrimary, isTraining }) {
  if (isPrimary) {
    return (
      <button onClick={onClick} className="flex flex-col items-center justify-center -mt-8 relative group">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 text-white nav-primary-btn ${isTraining ? 'bg-amber-500 shadow-amber-500/40 scale-110 is-training' : isActive ? 'bg-indigo-500 shadow-indigo-500/40 scale-110 active' : 'bg-slate-800 dark:bg-slate-700 border-4 border-white dark:border-slate-800 group-hover:bg-slate-700 dark:group-hover:bg-slate-600 inactive'}`}><div>{icon}</div></div>
        <span className={`text-[10px] mt-1 font-bold transition-colors nav-primary-label ${isTraining ? 'text-amber-500 is-training' : isActive ? 'text-indigo-600 dark:text-indigo-400 active' : 'text-slate-500 dark:text-slate-400 inactive'}`}>{label}</span>
      </button>
    );
  }
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
      <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
