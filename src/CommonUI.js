// ==========================================
// CommonUI.js — 共通UIコンポーネント・カスタムフック・アイコン
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import { Activity, AlignLeft, Edit2 } from 'lucide-react';
import { MASTER_USER, generateColor, MUSCLE_CATEGORIES, getCategoryTabColor } from './utils';

// --- カスタムアイコン ---
const WithFitLogo = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="7" cy="12" r="3" />
    <circle cx="17" cy="12" r="3" />
    <line x1="10" y1="12" x2="14" y2="12" />
    <path d="M4 12a8 8 0 0 1 16 0" strokeOpacity="0.5" />
  </svg>
);

const renderUsernameWithBadge = (username, displayName, accountsInfo, className = "font-bold text-slate-800 dark:text-slate-100 truncate") => {
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

const UserAvatar = ({ userId, accountsInfo, size = 40, className = "", onClick = null, photoUrlOverride = undefined, displayNameOverride = undefined, colorOverride = undefined }) => {
  const userInfo = accountsInfo ? accountsInfo[userId] : null;
  const photoUrl = photoUrlOverride !== undefined && photoUrlOverride !== null ? photoUrlOverride : userInfo?.photoUrl;
  const displayName = displayNameOverride !== undefined && displayNameOverride !== null ? displayNameOverride : (userInfo?.displayName || userId || '?');
  const userColor = colorOverride !== undefined && colorOverride !== null ? colorOverride : (userInfo?.userColor || (userId ? generateColor(userId) : '#10b981'));
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  const handleAvatarClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      e.preventDefault();
      onClick(userId);
    }
  };

  return (
    <div 
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden shadow-sm ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: userColor, 
        border: size > 24 ? `2px solid ${userColor}` : `1px solid ${userColor}`,
        fontSize: Math.max(10, size * 0.4)
      }}
      onClick={handleAvatarClick}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={displayName} className="w-full h-full object-cover bg-white" />
      ) : (
        initial
      )}
    </div>
  );
};

function TimerDisplay({ startTime, isStopped = false }) {
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
  return <span className="font-mono font-bold tracking-wider">{hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>;
}

// --- グラフコンポーネント ---
function SimpleChart({ data, color, title }) {
  const scrollRef = useRef(null);
  const isFirstRender = useRef(true);
  const prevLength = useRef(data?.length || 0);

  useEffect(() => {
    if (scrollRef.current) {
      if (isFirstRender.current) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        isFirstRender.current = false;
      } else if (data?.length !== prevLength.current) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }
    }
    prevLength.current = data?.length || 0;
  }, [data?.length]);

  if (!data || data.length === 0) return (
    <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 w-full flex items-center gap-2"><Activity size={16} className="text-slate-400"/> {title}</h4>
      <p className="text-sm font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl text-center border border-slate-100 dark:border-slate-800 w-full">データがありません</p>
    </div>
  );

  const values = data.map(d => d.value).filter(v => !isNaN(v));
  if (values.length === 0) return null;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) === 0 ? (minVal === 0 ? 1 : minVal * 0.1) : (maxVal - minVal) * 0.2;
  const min = Math.max(0, minVal - padding);
  const max = maxVal + padding;
  const range = max - min === 0 ? 1 : max - min;
  
  const height = 100;

  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const minTime = new Date(sortedData[0].date).getTime();
  const maxTime = new Date(sortedData[sortedData.length - 1].date).getTime();
  const daysDiff = (maxTime - minTime) / (1000 * 60 * 60 * 24);

  const PIXELS_PER_DAY = 5;
  const chartWidth = Math.max(300, Math.round(daysDiff * PIXELS_PER_DAY + 80));

  const points = sortedData.map(d => {
    let x;
    if (daysDiff === 0) {
      x = chartWidth / 2;
    } else {
      const t = new Date(d.date).getTime();
      x = 40 + ((t - minTime) / (maxTime - minTime)) * (chartWidth - 80);
    }
    const y = height - ((d.value - min) / range) * height;
    return { x, y, val: d.value };
  });

  const dateTicks = [];
  if (daysDiff === 0) {
    const d = new Date(minTime);
    dateTicks.push({ x: chartWidth / 2, dateStr: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` });
  } else {
    for (let i = 0; i <= daysDiff; i += 10) {
      const tickTime = minTime + i * 24 * 60 * 60 * 1000;
      const x = 40 + (i / daysDiff) * (chartWidth - 80);
      const d = new Date(tickTime);
      dateTicks.push({ x, dateStr: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` });
    }
  }

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2"><Activity size={16} className="text-slate-400"/> {title}</h4>
      
      <div className="relative w-full" style={{ height: '160px' }}>
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-white/90 dark:bg-slate-900/90 pointer-events-none">
          <svg viewBox="0 -10 32 140" width="32" height="140" className="overflow-visible">
            {[0, 0.5, 1].map(tick => {
               const y = height - tick * height;
               const val = (min + range * tick).toFixed(1);
               return (
                 <text key={tick} x="28" y={y + 4} fontSize="10" fill="currentColor" textAnchor="end" className="text-slate-400 font-bold">{val}</text>
               );
            })}
          </svg>
        </div>
        
        <div ref={scrollRef} className="overflow-x-auto w-full hide-scrollbar">
          <div style={{ width: `${chartWidth}px`, height: '140px' }}>
            <svg viewBox={`0 -10 ${chartWidth} 140`} width={chartWidth} height={140} className="overflow-visible">
              {[0, 0.5, 1].map(tick => {
                 const y = height - tick * height;
                 return (
                   <line key={tick} x1="0" y1={y} x2={chartWidth} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                 );
              })}
              <polyline points={polylinePoints} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill="currentColor" className="text-white dark:text-slate-900" stroke={color} strokeWidth="2.5" />
                  <text x={p.x} y={p.y - 12} fontSize="12" fill={color} textAnchor="middle" className="font-bold tracking-tighter">{p.val}</text>
                </g>
              ))}
              {dateTicks.map((t, i) => (
                <text key={`tick-${i}`} x={t.x} y={height + 25} fontSize="10" fill="currentColor" textAnchor="middle" className="font-bold text-slate-400 dark:text-slate-500">{t.dateStr}</text>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function useAutoScrollDisable() {
  useEffect(() => {
    const checkScroll = () => {
      if (document.documentElement.scrollHeight <= window.innerHeight) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    const observer = new MutationObserver(checkScroll);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
      document.body.style.overflow = '';
    };
  }, []);
}

function ToggleSwitch({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  );
}

function CategoryFilterGrid({ selectedCategories, toggleCategory }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
      {MUSCLE_CATEGORIES.map(cat => {
        const isSelected = selectedCategories.includes(cat);
        return <button key={cat} onClick={() => toggleCategory(cat)} className={`py-2.5 px-1 rounded-xl text-sm font-bold transition-all border ${getCategoryTabColor(cat, isSelected)}`}>{cat}</button>;
      })}
    </div>
  );
}

function RecordWheelWrapper({ myInfo, currentTab, setCurrentTab, children }) {
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
        navigator.vibrate(50);
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
      if (e.cancelable && e.type === 'touchmove') {
        e.preventDefault();
      }
      updateHover(clientX, clientY);
    } else if (pressTimer.current) {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
        if (dist > 40) {
          clearPressTimer();
        }
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
      if (currentTab !== 'record') {
        setCurrentTab('record');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('showRecordDashboard'));
      }, 10);
    } else if (finalSelected === 'right') {
      if (currentTab !== 'record') {
        setCurrentTab('record');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('returnToRecordInput'));
      }, 10);
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
           <div className={`relative w-28 h-28 bg-indigo-500/95 backdrop-blur-md rounded-tl-full flex items-center justify-center border-[3px] border-r-[1.5px] border-indigo-300 dark:border-indigo-700 transition-transform duration-200 ${hovered === 'left' ? 'scale-110 bg-indigo-500 z-10 shadow-[0_0_20px_rgba(99,102,241,0.6)]' : 'opacity-70'} origin-bottom-right`}>
             <div className="flex flex-col items-center justify-center text-white mr-4 mt-6">
               <AlignLeft size={28} />
               <span className="text-xs font-bold mt-1 tracking-wider">メニュー</span>
             </div>
           </div>
           <div className={`relative w-28 h-28 bg-emerald-500/95 backdrop-blur-md rounded-tr-full flex items-center justify-center border-[3px] border-l-[1.5px] border-emerald-300 dark:border-emerald-700 transition-transform duration-200 ${hovered === 'right' ? 'scale-110 bg-emerald-500 z-10 shadow-[0_0_20px_rgba(16,185,129,0.6)]' : 'opacity-70'} origin-bottom-left`}>
             <div className="flex flex-col items-center justify-center text-white ml-4 mt-6">
               <Edit2 size={28} />
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

function FormInput({ label, type, value, onChange, placeholder, unit, className = "" }) {
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

// --- 広告コンポーネント ---
function AdBanner() {
  return (
    <div className="w-full flex flex-col items-center justify-center mb-4 overflow-hidden">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">スポンサー</span>
      <div className="flex justify-center items-center min-h-[50px] w-full max-w-[320px]">
        <a href="https://hb.afl.rakuten.co.jp/hsc/5629539f.0c9e8d7b.562953a0.7017e1e0/?link_type=pict&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJwaWN0IiwiY29sIjoxLCJjYXQiOiI5NSIsImJhbiI6MjA1MTk0MiwiYW1wIjpmYWxzZX0%3D" target="_blank" rel="nofollow sponsored noopener" style={{ wordWrap: 'break-word' }}>
          <img src="https://hbb.afl.rakuten.co.jp/hsb/5629539f.0c9e8d7b.562953a0.7017e1e0/?me_id=1&me_adv_id=2051942&t=pict" border="0" style={{ margin: '2px' }} alt="" title="" />
        </a>
      </div>
    </div>
  );
}

// --- ナビゲーションボタン ---
function NavButton({ icon, label, isActive, onClick, isPrimary, isTraining }) {
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

export {
  WithFitLogo,
  renderUsernameWithBadge,
  UserAvatar,
  TimerDisplay,
  SimpleChart,
  useAutoScrollDisable,
  ToggleSwitch,
  CategoryFilterGrid,
  RecordWheelWrapper,
  FormInput,
  AdBanner,
  NavButton
};