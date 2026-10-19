// ============================================================================
// WithFit v2 - 共通UIコンポーネントシステム
// 全画面で統一されたアイコンカラー・タッチ挙動（active:scale-*）・アバター・ボタン
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { AlignLeft, Edit2 } from 'lucide-react';
import { MASTER_USER } from '../../config/firebase';
import { MUSCLE_CATEGORIES, getCategoryTabColor } from '../../constants';
import { generateColor } from '../../utils/helpers';

export const WithFitLogo = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="7" cy="12" r="3" />
    <circle cx="17" cy="12" r="3" />
    <line x1="10" y1="12" x2="14" y2="12" />
    <path d="M4 12a8 8 0 0 1 16 0" strokeOpacity="0.45" />
  </svg>
);

export const renderUsernameWithBadge = (username, displayName, accountsInfo, className = "font-bold text-slate-800 dark:text-slate-100 truncate") => {
  const isUserMaster = username === MASTER_USER;
  const isUserAcquaintance = !isUserMaster && accountsInfo && accountsInfo[MASTER_USER]?.friends?.includes(username);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="truncate">{displayName || username || '不明'}</span>
      {isUserMaster && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: '#3b82f6', fill: '#3b82f6' }} title="マスター">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" stroke="#3b82f6" />
          <path d="m9 12 2 2 4-4" stroke="white" />
        </svg>
      )}
      {isUserAcquaintance && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: '#475569', fill: '#475569' }} title="公認メンバー">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" stroke="#475569" />
          <path d="m9 12 2 2 4-4" stroke="white" />
        </svg>
      )}
    </span>
  );
};

// 全画面共通ユーザーアバター（タッチ時のスケールアニメーション・枠カラー完全統一）
export const UserAvatar = ({
  userId,
  accountsInfo,
  size = 40,
  className = "",
  onClick = null,
  photoUrlOverride = undefined,
  displayNameOverride = undefined,
  colorOverride = undefined,
  statusDot = null // 'training' | 'online' | 'offline' | null
}) => {
  const userInfo = accountsInfo ? accountsInfo[userId] : null;
  const photoUrl = photoUrlOverride !== undefined && photoUrlOverride !== null ? photoUrlOverride : userInfo?.photoUrl;
  const displayName = displayNameOverride !== undefined && displayNameOverride !== null ? displayNameOverride : (userInfo?.displayName || userId || '?');
  const userColor = colorOverride !== undefined && colorOverride !== null ? colorOverride : (userInfo?.userColor || (userId ? generateColor(userId) : '#10b981'));
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  const handleAvatarClick = (e) => {
    if (onClick && userId) {
      e.stopPropagation();
      e.preventDefault();
      onClick(userId);
    }
  };

  return (
    <div
      className={`relative inline-flex shrink-0 select-none ${onClick ? 'cursor-pointer active:scale-90 hover:opacity-90 transition-all duration-150' : ''} ${className}`}
      style={{ width: size, height: size }}
      onClick={handleAvatarClick}
    >
      <div
        className="w-full h-full rounded-full flex items-center justify-center font-bold text-white overflow-hidden shadow-sm"
        style={{
          backgroundColor: userColor,
          border: size > 26 ? `2px solid ${userColor}` : `1.5px solid ${userColor}`,
          fontSize: Math.max(10, Math.round(size * 0.42))
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={displayName} className="w-full h-full object-cover bg-white" />
        ) : (
          initial
        )}
      </div>
      {statusDot && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900 z-10 ${
            statusDot === 'training' ? 'bg-amber-400 animate-pulse' : statusDot === 'online' ? 'bg-emerald-400' : 'bg-slate-400'
          }`}
          style={{ width: Math.max(10, Math.round(size * 0.28)), height: Math.max(10, Math.round(size * 0.28)) }}
        />
      )}
    </div>
  );
};

// 全画面共通アイコンボタン（カラー・ホバー・タッチ時の縮小アニメーションを完全統一）
export const IconButton = ({
  icon,
  onClick,
  variant = 'default', // 'default' | 'emerald' | 'indigo' | 'amber' | 'danger' | 'close'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  title = '',
  className = '',
  badge = null
}) => {
  const sizeClasses = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-xl',
    lg: 'p-2.5 rounded-2xl'
  }[size] || 'p-2 rounded-xl';

  const variantClasses = {
    default: 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
    emerald: 'text-slate-400 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50',
    indigo: 'text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50',
    amber: 'text-slate-400 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50',
    danger: 'text-slate-400 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50',
    close: 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full'
  }[variant] || 'text-slate-400 hover:text-slate-700 hover:bg-slate-100';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`relative inline-flex items-center justify-center transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:pointer-events-none select-none shrink-0 ${sizeClasses} ${variantClasses} ${className}`}
    >
      {icon}
      {badge !== null && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-sm">
          {badge}
        </span>
      )}
    </button>
  );
};

// 全画面共通セグメントタブ
export const SegmentedTabs = ({ tabs, activeTab, onChange, className = "mb-5" }) => (
  <div className={`flex bg-slate-200/80 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 ${className}`}>
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold text-center rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 ${
            isActive
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span className="truncate">{tab.label}</span>
          {tab.badge > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
              {tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// 全画面共通ページヘッダー
export const PageHeader = ({ icon, title, subtitle, rightElement }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2.5 min-w-0">
      {icon && (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs font-bold text-slate-400 dark:text-slate-500 truncate mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {rightElement && <div className="shrink-0 ml-2">{rightElement}</div>}
  </div>
);

export function TimerDisplay({ startTime, isStopped = false }) {
  const [elapsed, setElapsed] = useState(startTime ? Math.max(0, Date.now() - startTime) : 0);
  useEffect(() => {
    if (!startTime) { setElapsed(0); return; }
    if (isStopped) return;
    setElapsed(Math.max(0, Date.now() - startTime));
    const interval = setInterval(() => setElapsed(Math.max(0, Date.now() - startTime)), 1000);
    return () => clearInterval(interval);
  }, [startTime, isStopped]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return (
    <span className="font-mono font-bold tracking-wider">
      {hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

export function ToggleSwitch({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer active:scale-95 transition-transform">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  );
}

export function CategoryFilterGrid({ selectedCategories, toggleCategory }) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {MUSCLE_CATEGORIES.map(cat => {
        const isSelected = selectedCategories.includes(cat);
        return (
          <button
            key={cat}
            type="button"
            onClick={() => toggleCategory(cat)}
            className={`py-2.5 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 border ${getCategoryTabColor(cat, isSelected)}`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

export function FormInput({ label, type, value, onChange, placeholder, unit, className = "" }) {
  return (
    <div className={`min-w-0 overflow-hidden w-full ${className}`}>
      {label && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>}
      <div className="relative">
        <input
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          step={type === 'number' ? '0.1' : undefined}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all box-border ${unit ? 'pr-9' : ''}`}
          style={{ fontSize: '16px' }}
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

export function AdBanner() {
  return (
    <div className="w-full flex flex-col items-center justify-center my-3 overflow-hidden">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">スポンサー</span>
      <div className="flex justify-center items-center min-h-[50px] w-full max-w-[320px] rounded-xl overflow-hidden">
        <a href="https://hb.afl.rakuten.co.jp/hsc/5629539f.0c9e8d7b.562953a0.7017e1e0/?link_type=pict&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJwaWN0IiwiY29sIjoxLCJjYXQiOiI5NSIsImJhbiI6MjA1MTk0MiwiYW1wIjpmYWxzZX0%3D" target="_blank" rel="nofollow sponsored noopener noreferrer" style={{ wordWrap: 'break-word' }}>
          <img src="https://hbb.afl.rakuten.co.jp/hsb/5629539f.0c9e8d7b.562953a0.7017e1e0/?me_id=1&me_adv_id=2051942&t=pict" border="0" style={{ margin: '2px' }} alt="Sponsor" />
        </a>
      </div>
    </div>
  );
}

export function RecordWheelWrapper({ myInfo, currentTab, setCurrentTab, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const wrapperRef = useRef(null);
  const hoveredRef = useRef(null);
  const isOpenRef = useRef(false);
  const pressTimer = useRef(null);
  const touchPos = useRef({ x: 0, y: 0 });

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const calculateHover = (clientX, clientY) => {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = centerY - clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 30 && dy > -10) {
      return dx < 0 ? 'left' : 'right';
    }
    return null;
  };

  const updateHover = (clientX, clientY) => {
    const nextHover = calculateHover(clientX, clientY);
    hoveredRef.current = nextHover;
    setHovered(nextHover);
  };

  const handleStart = (e) => {
    if (!myInfo?.isTraining) return;
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }
    touchPos.current = { x: clientX, y: clientY };
    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      isOpenRef.current = true;
      setIsOpen(true);
      updateHover(touchPos.current.x, touchPos.current.y);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 200);
  };

  const handleMove = (e) => {
    if (!myInfo?.isTraining) return;
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if (e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }
    touchPos.current = { x: clientX, y: clientY };
    if (isOpenRef.current) {
      if (e.cancelable && e.type === 'touchmove') e.preventDefault();
      updateHover(clientX, clientY);
    } else if (pressTimer.current) {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
        if (dist > 40) clearPressTimer();
      }
    }
  };

  const handleEnd = (e) => {
    if (!myInfo?.isTraining) return;
    clearPressTimer();
    if (!isOpenRef.current) return;
    if (e.type === 'touchend' || e.type === 'touchcancel' || e.type === 'mouseup' || e.type === 'mouseleave') {
      updateHover(touchPos.current.x, touchPos.current.y);
    }
    const finalSelected = hoveredRef.current;
    isOpenRef.current = false;
    setIsOpen(false);
    hoveredRef.current = null;
    setHovered(null);

    if (finalSelected === 'left') {
      if (currentTab !== 'record') setCurrentTab('record');
      setTimeout(() => window.dispatchEvent(new CustomEvent('showRecordDashboard')), 10);
    } else if (finalSelected === 'right') {
      if (currentTab !== 'record') setCurrentTab('record');
      setTimeout(() => window.dispatchEvent(new CustomEvent('returnToRecordInput')), 10);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative flex flex-col items-center ${myInfo?.isTraining ? 'touch-none select-none z-50' : ''}`}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onContextMenu={(e) => {
        if (myInfo?.isTraining) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }}
    >
      {myInfo?.isTraining && (
        <div
          className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex transition-all duration-200 pointer-events-none ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <div className={`relative w-28 h-28 bg-indigo-500/95 backdrop-blur-md rounded-tl-full flex items-center justify-center border-[3px] border-r-[1.5px] border-indigo-300 dark:border-indigo-700 transition-transform duration-200 ${hovered === 'left' ? 'scale-110 bg-indigo-500 z-10 shadow-[0_0_20px_rgba(99,102,241,0.6)]' : 'opacity-75'} origin-bottom-right`}>
            <div className="flex flex-col items-center justify-center text-white mr-4 mt-6">
              <AlignLeft size={26} />
              <span className="text-xs font-bold mt-1 tracking-wider">メニュー</span>
            </div>
          </div>
          <div className={`relative w-28 h-28 bg-emerald-500/95 backdrop-blur-md rounded-tr-full flex items-center justify-center border-[3px] border-l-[1.5px] border-emerald-300 dark:border-emerald-700 transition-transform duration-200 ${hovered === 'right' ? 'scale-110 bg-emerald-500 z-10 shadow-[0_0_20px_rgba(16,185,129,0.6)]' : 'opacity-75'} origin-bottom-left`}>
            <div className="flex flex-col items-center justify-center text-white ml-4 mt-6">
              <Edit2 size={26} />
              <span className="text-xs font-bold mt-1 tracking-wider">記録画面</span>
            </div>
          </div>
        </div>
      )}
      <div className={`transition-transform duration-200 ${isOpen && myInfo?.isTraining ? 'scale-90 opacity-80' : 'scale-100'}`}>
        <div className={myInfo?.isTraining ? "pointer-events-none" : ""}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function NavButton({ icon, label, isActive, onClick, isPrimary, isTraining }) {
  if (isPrimary) {
    return (
      <button type="button" onClick={onClick} className="flex flex-col items-center justify-center -mt-7 relative group active:scale-90 transition-transform duration-150 select-none">
        <div
          className={`w-15 h-15 sm:w-16 sm:h-16 w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-lg transition-all duration-300 text-white nav-primary-btn ${
            isTraining
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/40 scale-105 is-training ring-4 ring-white dark:ring-slate-900'
              : isActive
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/40 scale-105 active ring-4 ring-white dark:ring-slate-900'
              : 'bg-slate-800 dark:bg-slate-700 border-4 border-white dark:border-slate-900 group-hover:bg-emerald-600 inactive'
          }`}
        >
          <div>{icon}</div>
        </div>
        <span
          className={`text-[10px] mt-1 font-bold transition-colors nav-primary-label ${
            isTraining
              ? 'text-amber-500 is-training'
              : isActive
              ? 'text-emerald-600 dark:text-emerald-400 active'
              : 'text-slate-500 dark:text-slate-400 inactive'
          }`}
        >
          {label}
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all duration-150 active:scale-90 select-none ${
        isActive
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
      }`}
    >
      <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
