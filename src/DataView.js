// ==========================================
// DataView.js — データ画面（カレンダー・グラフ・月間レポート・体組成・種目成長率チャート）
// ==========================================
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, TrendingUp, X, Award, Users, User } from 'lucide-react';
import { formatDateFromTimestamp, MUSCLE_CATEGORIES, getCategoryColor, getAge, getBMR, getFFMI, getFFMIEval, calcSetVolume } from './utils';
import { UserAvatar, renderUsernameWithBadge, SimpleChart } from './CommonUI';
import { WorkoutCard } from './WorkoutCard';

// --- 月間レポートコンポーネント ---
function MonthlyReport({ monthDate, posts, userName, accountsInfo }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthPosts = posts.filter(p => {
    const d = new Date(p.timestamp);
    return d.getFullYear() === year && d.getMonth() === month && p.author === userName;
  });

  const totalVolume = monthPosts.reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
  const totalCalories = monthPosts.reduce((sum, p) => sum + (Number(p.calories) || 0), 0);
  const trainingDays = new Set(monthPosts.map(p => formatDateFromTimestamp(p.timestamp))).size;
  
  let totalSets = 0;
  const categoryCount = {};
  MUSCLE_CATEGORIES.forEach(c => categoryCount[c] = 0);

  monthPosts.forEach(post => {
    if (post.items) {
      post.items.forEach(item => {
        const sets = item.sets ? item.sets.length : 0;
        totalSets += sets;
        const cat = item.category || 'その他';
        if (categoryCount[cat] !== undefined) categoryCount[cat] += sets;
        else categoryCount['その他'] += sets;
      });
    }
  });

  const hasData = monthPosts.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
      <div className="flex items-center gap-3 mb-5">
         <UserAvatar userId={userName} accountsInfo={accountsInfo} size={32} />
         <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">{renderUsernameWithBadge(userName, accountsInfo[userName]?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100")} のレポート</h3>
      </div>
      
      {!hasData ? (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 font-bold text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">記録がありません</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">月間総負荷量</p>
               <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalVolume.toLocaleString()} <span className="text-xs">kg</span></p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">月間総消費カロリー</p>
               <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{totalCalories.toLocaleString()} <span className="text-xs">kcal</span></p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">トレーニング日数</p>
               <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{trainingDays} <span className="text-xs">日</span></p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">総セット数</p>
               <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalSets} <span className="text-xs">set</span></p>
             </div>
          </div>
          
          <div className="pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">部位別のセット数</p>
            <div className="space-y-2">
              {MUSCLE_CATEGORIES.map(cat => {
                if (categoryCount[cat] === 0) return null;
                const percent = Math.min(100, (categoryCount[cat] / totalSets) * 100);
                return (
                  <div key={cat} className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-12 text-slate-600 dark:text-slate-300">{cat}</span>
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${getCategoryColor(cat).split(' ')[0]} ${getCategoryColor(cat).split(' ')[2]}`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <span className="w-8 text-right text-slate-500 dark:text-slate-400">{categoryCount[cat]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 体組成バッジコンポーネント ---
function BodyCompositionInfo({ info, dailyCalories = 0, dateLabel = '' }) {
  if (!info.height || !info.weight || !info.birthDate) return null;
  const age = getAge(info.birthDate);
  const bmr = getBMR(info.weight, info.height, age, info.gender);
  const totalCalories = bmr + dailyCalories;
  
  let advancedStatsBlock = null;
  if (info.weight && info.height && info.gender) {
      if (info.lastFat) {
          const ffmi = getFFMI(info.weight, info.lastFat, info.height);
          const evalText = getFFMIEval(ffmi, info.gender);
          const leanBodyMass = info.weight * (1 - (info.lastFat / 100));

          advancedStatsBlock = (
             <div className="flex gap-2 sm:gap-3 w-full">
                <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-xl p-3 flex flex-col">
                   <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mb-1">FFMI (除脂肪量指数)</p>
                   <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{ffmi.toFixed(1)} <span className="text-xs font-normal">({evalText})</span></p>
                   <p className="text-[9px] text-indigo-500 dark:text-indigo-500 mt-auto pt-1">※男性20、女性16以上で優秀</p>
                </div>
                <div className="flex-1 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-100 dark:border-cyan-900 rounded-xl p-3 flex flex-col">
                   <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold mb-1">除脂肪体重 (LBM)</p>
                   <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{leanBodyMass.toFixed(1)} <span className="text-xs font-normal">kg</span></p>
                   <p className="text-[9px] text-cyan-500 dark:text-cyan-500 mt-auto pt-1">※筋肉・骨・内臓などの総重量</p>
                </div>
             </div>
          );
      } else {
          advancedStatsBlock = (
             <div className="flex gap-2 sm:gap-3 w-full">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                   <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">FFMI / 除脂肪体重 (LBM)</p>
                   <p className="text-base font-bold text-slate-400 dark:text-slate-500 my-1">データなし</p>
                   <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-auto">※計算には体脂肪率の記録が必要です</p>
                </div>
             </div>
          );
      }
  }

  return (
     <div className="space-y-3 mb-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
           <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 rounded-xl p-2 flex flex-col justify-center">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-0.5">基礎代謝</p>
              <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-300">{bmr.toLocaleString()} <span className="text-[9px] sm:text-[10px] font-normal">kcal</span></p>
           </div>
           <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-100 dark:border-orange-900 rounded-xl p-2 flex flex-col justify-center">
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold mb-0.5">運動消費 {dateLabel && <span className="font-normal opacity-80">({dateLabel})</span>}</p>
              <p className="text-sm sm:text-base font-bold text-orange-700 dark:text-orange-300">{dailyCalories.toLocaleString()} <span className="text-[9px] sm:text-[10px] font-normal">kcal</span></p>
           </div>
           <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 rounded-xl p-2 flex flex-col justify-center">
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mb-0.5">合計</p>
              <p className="text-sm sm:text-base font-bold text-rose-700 dark:text-rose-300">{totalCalories.toLocaleString()} <span className="text-[9px] sm:text-[10px] font-normal">kcal</span></p>
           </div>
        </div>
        {advancedStatsBlock && (
           <div className="flex w-full">
              {advancedStatsBlock}
           </div>
        )}
     </div>
  );
}

// --- データ画面 (カレンダー・グラフ・レポート) ---
function DataView({ posts, currentUser, accountsInfo, onEdit, onDelete, onImport, onImportItem, targetUser, onToggleLike, onAddComment, onDeleteComment, onToggleCommentLike, onUserClick, onOpenCoach }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateFromTimestamp(Date.now()));
  const displayUser = targetUser || currentUser;
  const isMyData = displayUser === currentUser;
  const hideMetrics = !isMyData && accountsInfo[displayUser]?.hideBodyMetrics;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayStr = formatDateFromTimestamp(Date.now());
  
  const myPosts = posts.filter(p => p.author === displayUser);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeContainerRef = useRef(null);
  const calendarCardRef = useRef(null);
  const touchState = useRef({ startX: 0, startY: 0, isHorizontal: null });

  const handleMonthChange = (direction) => {
    let offset = 0;
    let scrollParent = window;
    if (calendarCardRef.current) {
      offset = calendarCardRef.current.getBoundingClientRect().top;
      const modal = calendarCardRef.current.closest('.overflow-y-auto');
      if (modal) scrollParent = modal;
    }
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    setTimeout(() => {
      if (calendarCardRef.current) {
         const newOffset = calendarCardRef.current.getBoundingClientRect().top;
         if (scrollParent === window) {
            window.scrollBy(0, newOffset - offset);
         } else {
            scrollParent.scrollTop += (newOffset - offset);
         }
      }
    }, 0);
  };

  useEffect(() => {
    const container = swipeContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      touchState.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        isHorizontal: null
      };
    };

    const handleTouchMove = (e) => {
      if (!touchState.current.startX) return;

      const dx = e.touches[0].clientX - touchState.current.startX;
      const dy = e.touches[0].clientY - touchState.current.startY;

      if (touchState.current.isHorizontal === null) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
          touchState.current.isHorizontal = true;
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
          touchState.current.isHorizontal = false;
        }
      }

      if (touchState.current.isHorizontal) {
        if (e.cancelable) e.preventDefault();
        setSwipeOffset(dx);
      }
    };

    const handleTouchEnd = (e) => {
      if (touchState.current.isHorizontal) {
        const dx = e.changedTouches ? e.changedTouches[0].clientX - touchState.current.startX : 0;
        if (dx > 50) {
          handleMonthChange(-1);
        } else if (dx < -50) {
          handleMonthChange(1);
        }
        setSwipeOffset(0);
      }
      touchState.current = { startX: 0, startY: 0, isHorizontal: null };
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  const renderMonthGrid = (targetDate) => {
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const fd = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    
    const monthBlanks = Array.from({ length: fd || 0 }).map((_, i) => <div key={`blank-${i}`} className="p-1 h-14"></div>);
    const monthDays = Array.from({ length: dim || 0 }).map((_, i) => {
      const date = i + 1;
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
      const daysPosts = myPosts.filter(p => formatDateFromTimestamp(p.timestamp) === dateStr);
      const isMyTraining = daysPosts.length > 0;
      const isSelected = selectedDateStr === dateStr;
      const isToday = dateStr === todayStr;
      
      let dots = [];
      if (isMyTraining) {
        const categoryCounts = {};
        daysPosts.forEach(p => {
          (p.items || []).forEach(item => {
            if (item.category) {
              categoryCounts[item.category] = (categoryCounts[item.category] || 0) + (item.sets?.length || 0);
            }
          });
        });
        const categories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
        
        dots = categories.slice(0, 3).map(cat => {
           switch (cat) {
             case '胸': return 'bg-rose-500';
             case '背中': return 'bg-blue-500';
             case '肩': return 'bg-amber-500';
             case '腕': return 'bg-purple-500';
             case '脚': return 'bg-emerald-500';
             case '腹筋': return 'bg-lime-500';
             case '有酸素': return 'bg-cyan-500';
             default: return 'bg-slate-600';
           }
        });
      }
      
      return (
        <div key={`day-${date}`} className="p-1 flex flex-col justify-center items-center h-14" onClick={() => setSelectedDateStr(dateStr)}>
          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all cursor-pointer 
            ${isSelected ? 'ring-2 ring-offset-1 ring-emerald-500 dark:ring-offset-slate-900' : ''} 
            ${isMyTraining ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
            ${isToday ? 'border-2 border-emerald-400 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}
          `}>
            {date}
          </div>
          <div className="flex gap-0.5 mt-1 h-1.5">
            {dots.map((bg, idx) => <div key={idx} className={`w-1.5 h-1.5 rounded-full ${bg}`}></div>)}
          </div>
        </div>
      );
    });

    const totalCells = (fd || 0) + (dim || 0);
    const trailingBlanks = Array.from({ length: 42 - totalCells }).map((_, i) => <div key={`trail-${i}`} className="p-1 h-14"></div>);

    return (
      <div className="w-1/3 shrink-0 flex-none px-1">
        <div className="grid grid-cols-7 text-center mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d} className={`text-xs font-bold ${d === '日' ? 'text-rose-400' : d === '土' ? 'text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 text-center">{monthBlanks}{monthDays}{trailingBlanks}</div>
      </div>
    );
  };
  
  const weightData = myPosts.filter(p => p.bodyWeight && !isNaN(p.bodyWeight)).map(p => ({ date: p.date, value: Number(p.bodyWeight) })).reverse();
  const fatData = myPosts.filter(p => p.bodyFat && !isNaN(p.bodyFat)).map(p => ({ date: p.date, value: Number(p.bodyFat) })).reverse();

  const selectedPosts = myPosts.filter(p => formatDateFromTimestamp(p.timestamp) === selectedDateStr);

  const myUserInfo = accountsInfo[displayUser] || {};
  const lastMyFatPost = myPosts.find(p => p.bodyFat);
  const myCompositionInfo = { ...myUserInfo, lastFat: lastMyFatPost ? lastMyFatPost.bodyFat : null };

  const myDailyCalories = selectedPosts.reduce((sum, p) => sum + (Number(p.calories) || 0), 0);
  
  const dateLabel = selectedDateStr ? selectedDateStr.substring(5).replace('-', '/') : '';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">データ</h2>

      {onOpenCoach && (
      <button 
        onClick={onOpenCoach} 
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-4 rounded-2xl shadow-md flex items-center justify-center gap-2 mb-6 hover:opacity-90 transition-opacity"
      >
        <Sparkles size={20} />
        AI専属コーチに相談・台帳管理
      </button>
      )}

      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">月間レポート ({month + 1}月)</h3>
        <MonthlyReport monthDate={currentMonth} posts={posts} userName={displayUser} accountsInfo={accountsInfo} />
      </div>

      <div ref={calendarCardRef} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => handleMonthChange(-1)} className="text-slate-400 hover:text-emerald-500 font-bold p-2 transition-colors">&lt;</button>
          <span className="font-bold text-slate-700 dark:text-slate-200">{year}年 {month + 1}月</span>
          <button onClick={() => handleMonthChange(1)} className="text-slate-400 hover:text-emerald-500 font-bold p-2 transition-colors">&gt;</button>
        </div>

        <div 
          ref={swipeContainerRef}
          className="overflow-hidden w-full relative -mx-1 px-1"
          style={{ touchAction: 'pan-y' }}
        >
          <div 
            className="flex w-[300%]"
            style={{ 
              transform: `translateX(calc(-33.333% + ${swipeOffset}px))`,
              transition: swipeOffset !== 0 ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)' 
            }}
          >
            {renderMonthGrid(new Date(year, month - 1, 1))}
            {renderMonthGrid(currentMonth)}
            {renderMonthGrid(new Date(year, month + 1, 1))}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 mx-auto w-max">
           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-rose-500"></div>胸</div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div>背中</div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-amber-500"></div>肩</div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-purple-500"></div>腕</div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>脚</div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-lime-500"></div>腹筋</div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-cyan-500"></div>有酸素</div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-600"></div>その他</div>
        </div>
      </div>
      
      {selectedDateStr && (
        <div className="pt-2 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{selectedDateStr.replace(/-/g, '/')} の記録</h3>

          {selectedPosts.length > 0 ? (
            selectedPosts.map(post => <WorkoutCard key={post.id} post={post} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={onEdit} onDelete={onDelete} onImport={onImport} onImportItem={onImportItem} onToggleLike={onToggleLike} onAddComment={onAddComment} onDeleteComment={onDeleteComment} onToggleCommentLike={onToggleCommentLike} onUserClick={onUserClick} />)
          ) : (
             <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl text-center text-slate-400 dark:text-slate-500 text-sm font-bold border border-slate-200 dark:border-slate-800">記録はありません</div>
          )}
        </div>
      )}

      <div className="pt-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">体組成データ</h3>
        {hideMetrics ? (
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-center text-slate-500 font-bold border border-slate-200 dark:border-slate-700">ないしょ♡</div>
        ) : (
          <BodyCompositionInfo info={myCompositionInfo} dailyCalories={myDailyCalories} dateLabel={dateLabel} />
        )}
      </div>

      {!hideMetrics && (
      <div className="space-y-6 pt-4">
         <h3 className="text-lg font-bold text-slate-900 dark:text-white">体重・体脂肪率の推移</h3>
         <SimpleChart data={weightData} color="#10b981" unit="kg" title={`${accountsInfo[displayUser]?.displayName || displayUser}の体重推移 (kg)`} />
         <SimpleChart data={fatData} color="#6366f1" unit="%" title={`${accountsInfo[displayUser]?.displayName || displayUser}の体脂肪率推移 (%)`} />
      </div>
      )}
    </div>
  );
}

// --- 種目成長率チャートモーダル（体組成グラフと同じ見やすいUI・期間切替・指標切替・タッチ数値表示＆外タッチ非表示対応） ---
function ExerciseChartModal({ exercise, posts, accountsInfo, onClose, currentUser }) {
  const isCardio = exercise?.weightType === 'cardio' || exercise?.category === '有酸素';
  const [rangeType, setRangeType] = useState('3M'); // '1M' | '3M' | '1Y' | 'ALL'
  const [metricType, setMetricType] = useState(isCardio ? 'distance' : '1rm'); // '1rm' | 'maxWeight' | 'volume' | 'distance' | 'time'
  const [viewMode, setViewMode] = useState('me'); // 'me' | 'compare'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const svgRef = useRef(null);
  const gradientId = useRef(`ex-chart-grad-${Math.random().toString(36).substring(2, 9)}`).current;

  useEffect(() => {
    setMetricType(isCardio ? 'distance' : '1rm');
    setSelectedIndex(null);
  }, [exercise?.id, isCardio]);

  // 期間やモード変更時は選択解除（グラフを見やすく保つ）
  useEffect(() => {
    setSelectedIndex(null);
  }, [rangeType, metricType, viewMode]);

  // グラフ（SVG）以外の場所をタッチ・クリックしたときは再び非表示にする
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleOutsidePointer = (e) => {
      if (svgRef.current && !svgRef.current.contains(e.target)) {
        setSelectedIndex(null);
      }
    };
    document.addEventListener('touchstart', handleOutsidePointer, { passive: true });
    document.addEventListener('mousedown', handleOutsidePointer);
    return () => {
      document.removeEventListener('touchstart', handleOutsidePointer);
      document.removeEventListener('mousedown', handleOutsidePointer);
    };
  }, [selectedIndex]);

  const calc1RM = (weight, reps) => {
    if (!weight || isNaN(weight) || weight <= 0) return 0;
    if (!reps || isNaN(reps) || reps <= 0) return weight;
    return weight * (1 + reps / 40);
  };

  // 投稿データから日付・ユーザー別の種目パフォーマンスを集計
  const { allRecordsByDay, allAuthors } = useMemo(() => {
    if (!exercise || !posts) return { allRecordsByDay: {}, allAuthors: [] };
    const dayMap = {};
    const authorsSet = new Set();

    posts.forEach(p => {
      if (!p.date && !p.timestamp) return;
      const time = new Date(p.date || p.timestamp).getTime();
      if (isNaN(time)) return;
      const dt = new Date(time);
      const dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

      let maxRM = 0;
      let maxWeight = 0;
      let totalVol = 0;
      let totalDist = 0;
      let totalTime = 0;
      let bestSetText = '';
      let matched = false;
      const baseWeight = Number(p.bodyWeight) || Number(accountsInfo?.[p.author]?.weight) || 60;

      const checkSet = (wRaw, rRaw, wType, rawSet) => {
        if (wType === 'cardio' || isCardio) {
          const dist = Number(rawSet.distance) || 0;
          const tm = Number(rawSet.time) || 0;
          if (dist > 0 || tm > 0) {
            matched = true;
            totalDist += dist;
            totalTime += tm;
            if (!bestSetText || dist > maxWeight) {
              maxWeight = dist;
              bestSetText = `${dist}km / ${tm}分`;
            }
          }
          return;
        }
        const w = Number(wRaw) || 0;
        const r = Number(rRaw) || 0;
        if (w <= 0 && wType !== 'bodyWeight') return;
        matched = true;
        const rm = calc1RM(w, r);
        if (rm > maxRM) {
          maxRM = rm;
          const unitLabel = wType === 'plate' ? '枚' : 'kg';
          bestSetText = `${w}${unitLabel} × ${r}回`;
        }
        if (w > maxWeight) maxWeight = w;
        totalVol += calcSetVolume({ weight: w, reps: r }, wType, baseWeight);
      };

      (p.items || []).forEach(item => {
        if (item.exerciseName === exercise.name) {
          (item.sets || []).forEach(s => {
            const r = Number(s.reps) || Math.max(Number(s.lReps) || 0, Number(s.rReps) || 0);
            checkSet(s.weight, r, item.weightType || exercise.weightType, s);
            (s.dropSets || []).forEach(ds => {
              const dr = Number(ds.reps) || Math.max(Number(ds.lReps) || 0, Number(ds.rReps) || 0);
              checkSet(ds.weight, dr, item.weightType || exercise.weightType, ds);
            });
          });
        }
        if (item.isSuperSet && item.superExerciseName === exercise.name) {
          (item.sets || []).forEach(s => {
            const r = Number(s.superReps) || Math.max(Number(s.superLReps) || 0, Number(s.superRReps) || 0);
            checkSet(s.superWeight, r, item.superWeightType || exercise.weightType, s);
          });
        }
        if (item.isSuperSet && item.superExerciseName3 === exercise.name) {
          (item.sets || []).forEach(s => {
            const r = Number(s.superReps3) || Math.max(Number(s.superLReps3) || 0, Number(s.superRReps3) || 0);
            checkSet(s.superWeight3, r, item.superWeightType3 || exercise.weightType, s);
          });
        }
      });

      if (!matched) return;
      authorsSet.add(p.author);
      if (!dayMap[dStr]) dayMap[dStr] = { time, dStr, users: {} };

      const prevUserRec = dayMap[dStr].users[p.author];
      const nextRec = {
        oneRM: Math.round(maxRM * 10) / 10,
        maxWeight: Math.round(maxWeight * 10) / 10,
        volume: Math.round(totalVol),
        distance: Math.round(totalDist * 10) / 10,
        time: Math.round(totalTime),
        bestSetText
      };

      if (!prevUserRec || nextRec.oneRM >= prevUserRec.oneRM) {
        dayMap[dStr].users[p.author] = nextRec;
      }
    });

    const authorsList = Array.from(authorsSet);
    // 自分を先頭に並べる
    authorsList.sort((a, b) => (a === currentUser ? -1 : b === currentUser ? 1 : 0));
    return { allRecordsByDay: dayMap, allAuthors: authorsList };
  }, [exercise, posts, accountsInfo, currentUser, isCardio]);

  if (!exercise) return null;

  const hasFriendData = allAuthors.some(a => a !== currentUser);
  const hasMyData = allAuthors.includes(currentUser);
  const effectiveViewMode = !hasMyData && hasFriendData ? 'compare' : viewMode;

  const activeAuthors = effectiveViewMode === 'me'
    ? (hasMyData ? [currentUser] : allAuthors.slice(0, 1))
    : allAuthors;

  const getMetricValue = (rec) => {
    if (!rec) return null;
    if (metricType === 'maxWeight') return rec.maxWeight;
    if (metricType === 'volume') return rec.volume;
    if (metricType === 'distance') return rec.distance;
    if (metricType === 'time') return rec.time;
    return rec.oneRM;
  };

  const unitLabel = (() => {
    if (metricType === 'distance') return 'km';
    if (metricType === 'time') return '分';
    if (exercise.weightType === 'plate' && metricType !== 'volume') return '枚';
    return 'kg';
  })();

  const metricLabel = (() => {
    if (metricType === 'maxWeight') return '最大重量';
    if (metricType === 'volume') return '総負荷量';
    if (metricType === 'distance') return '走行距離';
    if (metricType === 'time') return '運動時間';
    return '推定1RM';
  })();

  // 対象ユーザーのデータがある日付のみ抽出しソート
  const allSortedDays = Object.values(allRecordsByDay)
    .filter(dayObj => activeAuthors.some(a => {
      const v = getMetricValue(dayObj.users[a]);
      return v !== null && v > 0;
    }))
    .sort((a, b) => a.time - b.time);

  // 期間フィルタリング
  const filteredDays = (() => {
    if (allSortedDays.length === 0) return [];
    if (rangeType === 'ALL') return allSortedDays;
    const latestTime = Math.max(Date.now(), allSortedDays[allSortedDays.length - 1].time);
    const daysMap = { '1M': 31, '3M': 92, '1Y': 366 };
    const cutoff = latestTime - (daysMap[rangeType] || 92) * 24 * 60 * 60 * 1000;
    return allSortedDays.filter(d => d.time >= cutoff);
  })();

  const rangeOptions = [
    { key: '1M', label: '1か月' },
    { key: '3M', label: '3か月' },
    { key: '1Y', label: '1年' },
    { key: 'ALL', label: '全期間' }
  ];

  const metricOptions = isCardio
    ? [
        { key: 'distance', label: '距離 (km)' },
        { key: 'time', label: '時間 (分)' }
      ]
    : [
        { key: '1rm', label: '推定1RM' },
        { key: 'maxWeight', label: '最大重量' },
        { key: 'volume', label: '総負荷量' }
      ];

  const palette = ['#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#06b6d4'];
  const getAuthorColor = (author, idx) => {
    if (author === currentUser) return '#10b981';
    return palette[(idx + 1) % palette.length];
  };

  // メインユーザー（自分または先頭ユーザー）のサマリー統計
  const primaryAuthor = activeAuthors[0] || currentUser;
  const primaryValues = filteredDays
    .map(d => getMetricValue(d.users[primaryAuthor]))
    .filter(v => v !== null && v > 0);

  const hasRangeData = filteredDays.length > 0;
  const minVal = primaryValues.length > 0 ? Math.min(...primaryValues) : 0;
  const maxVal = primaryValues.length > 0 ? Math.max(...primaryValues) : 0;
  const firstVal = primaryValues.length > 0 ? primaryValues[0] : 0;
  const latestVal = primaryValues.length > 0 ? primaryValues[primaryValues.length - 1] : 0;
  const periodDiff = Math.round((latestVal - firstVal) * 10) / 10;

  // 全ユーザーを含めたY軸スケール計算
  let globalMin = Infinity;
  let globalMax = -Infinity;
  filteredDays.forEach(d => {
    activeAuthors.forEach(a => {
      const v = getMetricValue(d.users[a]);
      if (v !== null && v > 0) {
        if (v < globalMin) globalMin = v;
        if (v > globalMax) globalMax = v;
      }
    });
  });
  if (globalMin === Infinity) { globalMin = 0; globalMax = 10; }

  const pad = (globalMax - globalMin) === 0 ? Math.max(1, globalMin * 0.08) : (globalMax - globalMin) * 0.22;
  const yMin = Math.max(0, Math.floor((globalMin - pad) * 10) / 10);
  const yMax = Math.ceil((globalMax + pad) * 10) / 10;
  const yRange = yMax - yMin === 0 ? 1 : yMax - yMin;

  // SVG座標設定（SimpleChartと完全統一）
  const svgW = 360;
  const svgH = 210;
  const padL = 40;
  const padR = 16;
  const padT = 36;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const minTime = hasRangeData ? filteredDays[0].time : 0;
  const maxTime = hasRangeData ? filteredDays[filteredDays.length - 1].time : 0;
  const timeSpan = maxTime - minTime;

  const dayPositions = filteredDays.map((d, idx) => {
    let x;
    if (filteredDays.length === 1 || timeSpan === 0) {
      x = padL + plotW / 2;
    } else {
      const timeRatio = (d.time - minTime) / timeSpan;
      const idxRatio = idx / (filteredDays.length - 1);
      const ratio = filteredDays.length > 20 ? idxRatio : (timeRatio * 0.7 + idxRatio * 0.3);
      x = padL + ratio * plotW;
    }
    const dt = new Date(d.time);
    const shortDate = `${dt.getMonth() + 1}/${dt.getDate()}`;
    const fullDate = `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
    return { ...d, x, shortDate, fullDate, idx };
  });

  const buildSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.35;
      const cpy1 = p0.y;
      const cpx2 = p1.x - (p1.x - p0.x) * 0.35;
      const cpy2 = p1.y;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  // 著者ごとのポイント＆パス生成
  const authorSeries = activeAuthors.map((author, aIdx) => {
    const color = getAuthorColor(author, aIdx);
    const pts = [];
    dayPositions.forEach((dayPos) => {
      const rec = dayPos.users[author];
      const val = getMetricValue(rec);
      if (val !== null && val > 0) {
        const y = padT + plotH - ((val - yMin) / yRange) * plotH;
        const prevPt = pts.length > 0 ? pts[pts.length - 1] : null;
        const prevDiff = prevPt ? Math.round((val - prevPt.val) * 10) / 10 : null;
        pts.push({
          x: dayPos.x,
          y,
          val,
          shortDate: dayPos.shortDate,
          fullDate: dayPos.fullDate,
          dayIdx: dayPos.idx,
          bestSetText: rec?.bestSetText || '',
          prevDiff,
          author,
          color
        });
      }
    });
    const linePath = buildSmoothPath(pts);
    const areaPath = pts.length > 1
      ? `${linePath} L ${pts[pts.length - 1].x} ${padT + plotH} L ${pts[0].x} ${padT + plotH} Z`
      : '';
    return { author, color, pts, linePath, areaPath };
  });

  // X軸メモリ（最大5個）
  const xTicks = (() => {
    if (dayPositions.length === 0) return [];
    if (dayPositions.length <= 5) return dayPositions;
    const tickCount = 5;
    const result = [];
    for (let i = 0; i < tickCount; i++) {
      const targetIdx = Math.round((i / (tickCount - 1)) * (dayPositions.length - 1));
      result.push(dayPositions[targetIdx]);
    }
    return result;
  })();

  const handlePointerInteract = (e) => {
    if (!svgRef.current || dayPositions.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0
      ? e.touches[0].clientX
      : e.clientX;
    if (clientX === undefined) return;

    const relX = ((clientX - rect.left) / rect.width) * svgW;
    let closestIdx = 0;
    let minDist = Infinity;
    dayPositions.forEach((p, idx) => {
      const dist = Math.abs(p.x - relX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });
    setSelectedIndex(closestIdx);
  };

  const activeDay = (selectedIndex !== null && dayPositions[selectedIndex])
    ? dayPositions[selectedIndex]
    : null;

  // 選択された日の各ユーザーのポイント
  const activeDayPoints = activeDay
    ? authorSeries
        .map(s => s.pts.find(pt => pt.dayIdx === activeDay.idx))
        .filter(Boolean)
    : [];

  const primaryActivePt = activeDayPoints[0] || null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/50">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-500 shrink-0" size={18} />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base truncate">{exercise.name}</h3>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {exercise.category && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(exercise.category)}`}>
                  {exercise.category}
                </span>
              )}
              {exercise.maker && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {exercise.maker}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {allSortedDays.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-bold text-sm bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
              まだこの種目の記録データがありません
            </div>
          ) : (
            <>
              {/* 指標切替 ＆ フレンド比較切替 */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70 flex-1 min-w-[200px]">
                  {metricOptions.map(opt => {
                    const active = metricType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setMetricType(opt.key)}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                          active
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {hasFriendData && hasMyData && (
                  <button
                    type="button"
                    onClick={() => setViewMode(prev => prev === 'me' ? 'compare' : 'me')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shrink-0 ${
                      effectiveViewMode === 'compare'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {effectiveViewMode === 'compare' ? <Users size={14} /> : <User size={14} />}
                    {effectiveViewMode === 'compare' ? 'フレンド比較中' : '自分のみ'}
                  </button>
                )}
              </div>

              {/* 期間セレクター（体組成グラフと統一） */}
              <div className="grid grid-cols-4 gap-1 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                {rangeOptions.map(opt => {
                  const active = rangeType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRangeType(opt.key)}
                      className={`py-1.5 text-xs font-bold rounded-lg text-center whitespace-nowrap transition-all ${
                        active
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {!hasRangeData ? (
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">選択した期間のデータがありません</p>
                  <button
                    type="button"
                    onClick={() => setRangeType('ALL')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  >
                    全期間を表示する
                  </button>
                </div>
              ) : (
                <>
                  {/* サマリー統計バー（期間変化・最新・自己ベスト） */}
                  <div className="bg-slate-50/90 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3">
                    <div className="grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-slate-800 text-center">
                      <div className="px-1 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5 whitespace-nowrap">期間成長</div>
                        <div className={`text-xs font-bold font-mono whitespace-nowrap ${
                          periodDiff > 0 ? 'text-emerald-500' : periodDiff < 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'
                        }`}>
                          {periodDiff > 0 ? `+${periodDiff}` : periodDiff}{unitLabel}
                        </div>
                      </div>
                      <div className="px-1 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5 whitespace-nowrap">最新 ({metricLabel})</div>
                        <div className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {latestVal}{unitLabel}
                        </div>
                      </div>
                      <div className="px-1 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold text-amber-500 mb-0.5 whitespace-nowrap flex items-center gap-0.5">
                          <Award size={11} /> 期間ベスト
                        </div>
                        <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {maxVal}{unitLabel}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* インタラクティブSVGチャート（最初タッチするまでは数値・ツールチップを非表示にしてグラフを見やすく表示） */}
                  <div className="relative w-full select-none">
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-auto overflow-visible touch-pan-y cursor-crosshair"
                      onClick={handlePointerInteract}
                      onTouchStart={handlePointerInteract}
                      onTouchMove={handlePointerInteract}
                      onMouseDown={handlePointerInteract}
                      onMouseMove={(e) => { if (e.buttons === 1) handlePointerInteract(e); }}
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.36" />
                          <stop offset="75%" stopColor="#10b981" stopOpacity="0.06" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* 水平グリッド線 ＆ Y軸ラベル */}
                      {[0, 0.333, 0.666, 1].map((t, idx) => {
                        const y = padT + plotH - t * plotH;
                        const rawVal = yMin + yRange * t;
                        const val = metricType === 'volume' ? Math.round(rawVal) : rawVal.toFixed(1);
                        return (
                          <g key={`grid-${idx}`}>
                            <line
                              x1={padL}
                              y1={y}
                              x2={svgW - padR}
                              y2={y}
                              stroke="currentColor"
                              className="text-slate-100 dark:text-slate-800/90"
                              strokeWidth="1"
                              strokeDasharray={idx === 0 ? undefined : "3 3"}
                            />
                            <text
                              x={padL - 6}
                              y={y + 3.5}
                              fontSize="9.5"
                              fill="currentColor"
                              textAnchor="end"
                              className="text-slate-400 dark:text-slate-500 font-bold font-mono"
                            >
                              {val}
                            </text>
                          </g>
                        );
                      })}

                      {/* 単一ユーザー表示時は美しいグラデーションエリアを描画 */}
                      {authorSeries.length === 1 && authorSeries[0].areaPath && (
                        <path d={authorSeries[0].areaPath} fill={`url(#${gradientId})`} />
                      )}

                      {/* 折れ線・ベジェ曲線 */}
                      {authorSeries.map(series => (
                        series.linePath ? (
                          <path
                            key={`line-${series.author}`}
                            d={series.linePath}
                            fill="none"
                            stroke={series.color}
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null
                      ))}

                      {/* 選択中の垂直ガイドライン（タッチ時のみ表示） */}
                      {activeDay && (
                        <line
                          x1={activeDay.x}
                          y1={padT - 4}
                          x2={activeDay.x}
                          y2={padT + plotH}
                          stroke="#10b981"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.7"
                        />
                      )}

                      {/* データポイント描画（常時テキスト表示をなくし、線の推移を見やすくする） */}
                      {authorSeries.map(series => (
                        <g key={`pts-${series.author}`}>
                          {series.pts.map((p, i) => {
                            const isSelected = activeDay && p.dayIdx === activeDay.idx;
                            const isDense = series.pts.length > 20;
                            const dotRadius = isSelected ? 5.5 : (isDense ? 2.2 : 3.2);
                            return (
                              <g key={`pt-${series.author}-${i}`}>
                                {isSelected && (
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="10"
                                    fill={series.color}
                                    opacity="0.22"
                                  />
                                )}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={dotRadius}
                                  fill={isSelected ? series.color : "currentColor"}
                                  className={isSelected ? "" : "text-white dark:text-slate-900"}
                                  stroke={series.color}
                                  strokeWidth={isSelected ? "2.5" : (isDense ? "1.5" : "2")}
                                />
                              </g>
                            );
                          })}
                        </g>
                      ))}

                      {/* フローティングツールチップ（タッチ選択時のみ表示） */}
                      {primaryActivePt && (() => {
                        const labelText = `${primaryActivePt.shortDate}  ${primaryActivePt.val}${unitLabel}`;
                        const boxW = Math.max(88, labelText.length * 6.5 + 16);
                        const boxH = 24;
                        const clampedX = Math.min(Math.max(primaryActivePt.x, padL + boxW / 2), svgW - padR - boxW / 2);
                        const placeBelow = primaryActivePt.y - boxH - 10 < 2;
                        const boxY = placeBelow ? Math.min(padT + plotH - boxH, primaryActivePt.y + 12) : primaryActivePt.y - boxH - 10;

                        return (
                          <g className="pointer-events-none">
                            <rect
                              x={clampedX - boxW / 2}
                              y={boxY}
                              width={boxW}
                              height={boxH}
                              rx="7"
                              fill={primaryActivePt.color}
                              opacity="0.96"
                            />
                            <text
                              x={clampedX}
                              y={boxY + 15.5}
                              fontSize="10"
                              fill="#ffffff"
                              textAnchor="middle"
                              className="font-bold font-mono"
                            >
                              {labelText}
                            </text>
                          </g>
                        );
                      })()}

                      {/* X軸の日付ラベル */}
                      {xTicks.map((t, idx) => (
                        <text
                          key={`xtick-${idx}`}
                          x={t.x}
                          y={svgH - 7}
                          fontSize="9.5"
                          fill="currentColor"
                          textAnchor="middle"
                          className="text-slate-400 dark:text-slate-500 font-bold font-mono"
                        >
                          {t.shortDate}
                        </text>
                      ))}
                    </svg>

                    {/* タッチ選択中のみその日の詳細（数値・ベストセット・前回比）を下部に表示 */}
                    {activeDay && activeDayPoints.length > 0 ? (
                      <div className="mt-2 bg-slate-50 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                            {activeDay.fullDate}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{metricLabel}</span>
                        </div>
                        <div className="space-y-1.5">
                          {activeDayPoints.map(pt => {
                            const dispName = accountsInfo?.[pt.author]?.displayName || pt.author;
                            return (
                              <div key={pt.author} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pt.color }}></span>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{dispName}</span>
                                  {pt.bestSetText && (
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                                      ベスト: {pt.bestSetText}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                                    {pt.val}<span className="text-[10px] font-bold text-slate-400 ml-0.5">{unitLabel}</span>
                                  </span>
                                  {pt.prevDiff !== null && (
                                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                                      pt.prevDiff > 0
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                        : pt.prevDiff < 0
                                        ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400'
                                        : 'bg-slate-200/60 text-slate-500 dark:bg-slate-800'
                                    }`}>
                                      {pt.prevDiff > 0 ? `+${pt.prevDiff}` : pt.prevDiff}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-right mt-1">
                        ※グラフをタッチするとその日の数値を表示（グラフ外タッチで非表示）
                      </div>
                    )}
                  </div>

                  {/* 複数ユーザー比較時の凡例 */}
                  {authorSeries.length > 1 && (
                    <div className="flex flex-wrap gap-3 pt-1 justify-center">
                      {authorSeries.map((s) => {
                        const displayName = accountsInfo?.[s.author]?.displayName || s.author;
                        return (
                          <div key={s.author} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                            {displayName}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {!isCardio && metricType === '1rm' && (
                <p className="text-[10px] text-slate-400 font-bold text-center">
                  ※推定1RM = 重量 × (1 + 回数 ÷ 40) で計算しています。
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export {
  MonthlyReport,
  BodyCompositionInfo,
  DataView,
  ExerciseChartModal
};