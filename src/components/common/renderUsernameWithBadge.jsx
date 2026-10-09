import React from 'react';
import { MASTER_USER } from '../../constants';

export const renderUsernameWithBadge = (username, displayName, accountsInfo, className = "font-bold text-slate-800 dark:text-slate-100 truncate") => {
  const isUserMaster = username === MASTER_USER;
  const isUserAcquaintance = !isUserMaster && accountsInfo && accountsInfo[MASTER_USER]?.friends?.includes(username);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="truncate">{displayName || username || '不明'}</span>
      {isUserMaster && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: '#3b82f6', fill: '#3b82f6' }} title="マスター">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" stroke="#3b82f6"/>
          <path d="m9 12 2 2 4-4" stroke="white" />
        </svg>
      )}
      {isUserAcquaintance && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: '#1e293b', fill: '#1e293b' }} title="知り合い">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" stroke="#1e293b"/>
          <path d="m9 12 2 2 4-4" stroke="white" />
        </svg>
      )}
    </span>
  );
};

const MUSCLE_CATEGORIES = ['胸', '背中', '肩', '腕', '脚', '腹筋', 'その他', '有酸素'];
