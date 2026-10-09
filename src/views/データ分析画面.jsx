import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { WorkoutCard } from '../components/workout/ワークアウトカード';
import { MonthlyReport } from '../components/data/月間レポート';
import { BodyCompositionInfo } from '../components/data/体組成情報';
import { SimpleChart } from '../components/common/推移グラフ';
import { formatDateFromTimestamp } from '../utils/日付ユーティリティ';

export function DataView({ posts, currentUser, accountsInfo, onEdit, onDelete, onImport, targetUser, onToggleLike, onAddComment, onDeleteComment, onToggleCommentLike, onUserClick, onOpenCoach }) {
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

// --- 記録入力画面 ---
