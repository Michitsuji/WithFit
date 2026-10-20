// ==========================================
// DataView.js — データ画面（カレンダー・グラフ・月間レポート・体組成・種目成長率チャート）
// ==========================================
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, TrendingDown, X } from 'lucide-react';
import { formatDateFromTimestamp, MUSCLE_CATEGORIES, getCategoryColor, getAge, getBMR, getFFMI, getFFMIEval } from './utils';
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
  let totalWorkoutsCount = 0;
  const categoryCount = {};
  MUSCLE_CATEGORIES.forEach(c => categoryCount[c] = 0);

  monthPosts.forEach(post => {
    if (post.items) {
      post.items.forEach(item => {
        totalWorkoutsCount++;
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
function DataView({ posts, currentUser, accountsInfo, onEdit, onDelete, onImport, targetUser, onToggleLike, onAddComment, onDeleteComment, onToggleCommentLike, onUserClick, onOpenCoach }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateFromTimestamp(Date.now()));
  const displayUser = targetUser || currentUser;
  const isMyData = displayUser === currentUser;
  const hideMetrics = !isMyData && accountsInfo[displayUser]?.hideBodyMetrics;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
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
            selectedPosts.map(post => <WorkoutCard key={post.id} post={post} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={onEdit} onDelete={onDelete} onImport={onImport} onToggleLike={onToggleLike} onAddComment={onAddComment} onDeleteComment={onDeleteComment} onToggleCommentLike={onToggleCommentLike} onUserClick={onUserClick} />)
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
         <SimpleChart data={weightData} color="#10b981" title={`${accountsInfo[displayUser]?.displayName || displayUser}の体重推移 (kg)`} />
         <SimpleChart data={fatData} color="#6366f1" title={`${accountsInfo[displayUser]?.displayName || displayUser}の体脂肪率推移 (%)`} />
      </div>
      )}
    </div>
  );
}

// --- 種目成長率チャートモーダル ---
function ExerciseChartModal({ exercise, posts, accountsInfo, onClose, currentUser }) {
  if (!exercise) return null;
  
  const calc1RM = (weight, reps) => {
    if (!weight || isNaN(weight) || weight <= 0) return 0;
    if (!reps || isNaN(reps) || reps <= 0) return weight;
    return weight * (1 + reps / 40);
  };

  const chartDataMap = {};
  
  posts.forEach(p => {
    const dStr = p.date.substring(0, 10);
    if (!chartDataMap[dStr]) chartDataMap[dStr] = {};
    
    let maxRM = 0;
    p.items?.forEach(item => {
       if (item.exerciseName === exercise.name) {
          item.sets?.forEach(set => {
             const w = Number(set.weight) || 0;
             const r = Number(set.reps) || Math.max(Number(set.lReps)||0, Number(set.rReps)||0);
             const rm = calc1RM(w, r);
             if (rm > maxRM) maxRM = rm;
          });
       }
    });
    
    if (maxRM > 0) {
       if (!chartDataMap[dStr][p.author] || maxRM > chartDataMap[dStr][p.author]) {
          chartDataMap[dStr][p.author] = Math.round(maxRM * 10) / 10;
       }
    }
  });

  const dates = Object.keys(chartDataMap).sort();
  const authorsSet = new Set();
  dates.forEach(d => Object.keys(chartDataMap[d]).forEach(a => authorsSet.add(a)));
  const authors = Array.from(authorsSet);

  const renderMultiChart = () => {
     if (dates.length === 0) return <div className="p-4 text-center text-slate-500 font-bold">データがありません</div>;
     
     const width = 300, height = 150;
     let min = Infinity, max = -Infinity;
     dates.forEach(d => {
       authors.forEach(a => {
         const v = chartDataMap[d][a];
         if (v) {
           if (v < min) min = v;
           if (v > max) max = v;
         }
       });
     });
     
     if (min === Infinity) return <div className="p-4 text-center text-slate-500 font-bold">データがありません</div>;
     const padding = (max - min) === 0 ? (min === 0 ? 1 : min * 0.1) : (max - min) * 0.2;
     min = Math.max(0, min - padding);
     max = max + padding;
     const range = max - min === 0 ? 1 : max - min;
     const colors = ['#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#06b6d4'];

     return (
       <div className="relative w-full overflow-x-auto pb-6">
         <svg viewBox={`0 -10 ${width} ${height + 40}`} className="w-full min-w-[300px] h-48 overflow-visible pl-6">
           {[0, 0.5, 1].map(tick => {
             const y = height - tick * height;
             const val = Math.round(min + range * tick);
             return (
               <g key={tick}>
                 <line x1="0" y1={y} x2={width} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                 <text x="-8" y={y + 4} fontSize="10" fill="currentColor" textAnchor="end" className="text-slate-400">{val}</text>
               </g>
             );
           })}
           {authors.map((author, aIdx) => {
              const color = author === currentUser ? '#10b981' : colors[(aIdx + 1) % colors.length];
              const pointsData = dates.map((d, i) => {
                 const val = chartDataMap[d][author];
                 if (!val) return null;
                 const x = (i / (dates.length - 1 || 1)) * width;
                 const y = height - ((val - min) / range) * height;
                 return { x, y, val, d, author };
              }).filter(Boolean);

              if (pointsData.length === 0) return null;
              const pointsStr = pointsData.map(p => `${p.x},${p.y}`).join(' ');

              return (
                 <g key={author}>
                   <polyline points={pointsStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                   {pointsData.map((p, i) => (
                     <g key={i}>
                       <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
                       <text x={p.x} y={p.y - 10} fontSize="10" fill={color} textAnchor="middle" className="font-bold">{p.val}</text>
                     </g>
                   ))}
                 </g>
              );
           })}
           {dates.map((d, i) => {
              const x = (i / (dates.length - 1 || 1)) * width;
              const dateStr = d.substring(5).replace('-', '/');
              return (
                 <text key={d} x={x} y={height + 20} fontSize="9" fill="#94a3b8" textAnchor="middle" className="font-bold">{dateStr}</text>
              );
           })}
         </svg>
         <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {authors.map((author, aIdx) => {
               const color = author === currentUser ? '#10b981' : colors[(aIdx + 1) % colors.length];
               const displayName = accountsInfo[author]?.displayName || author;
               return (
                  <div key={author} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                     {displayName}
                  </div>
               );
            })}
         </div>
       </div>
     );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><TrendingDown className="transform rotate-180 text-emerald-500" size={18}/> 成長率 (推定1RM)</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4">
           <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 text-center">{exercise.name}</h4>
           {renderMultiChart()}
           <p className="text-[10px] text-slate-400 font-bold mt-4 text-center">※推定1RM = 重量 × (1 + 回数 ÷ 40) で計算しています。</p>
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