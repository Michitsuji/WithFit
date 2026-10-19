// ============================================================================
// WithFit v2 - データ分析画面 (DataView / MonthlyReport / BodyCompositionInfo)
// 月間レポート・スワイプ対応カレンダー・体組成(BMR/FFMI/LBM)・重ならない推移グラフ
// ※AIコーチボタン・AIモーダルは完全撤去済み
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flame, Dumbbell, Scale } from 'lucide-react';
import { PageHeader, UserAvatar, renderUsernameWithBadge, IconButton } from '../common/UI';
import SimpleChart from '../charts/SimpleChart';
import WorkoutCard from '../workout/WorkoutCard';
import { MUSCLE_CATEGORIES, getCategoryDotColor, getCategoryBarColor } from '../../constants';
import { formatDateFromTimestamp, getAge, getBMR, getFFMI, getFFMIEval } from '../../utils/helpers';

export function MonthlyReport({ monthDate, posts, userName, accountsInfo, onUserClick }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthPosts = (posts || []).filter(p => {
    const d = new Date(p.timestamp);
    return d.getFullYear() === year && d.getMonth() === month && p.author === userName;
  });

  const totalVolume = monthPosts.reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
  const totalCalories = monthPosts.reduce((sum, p) => sum + (Number(p.calories) || 0), 0);
  const trainingDays = new Set(monthPosts.map(p => formatDateFromTimestamp(p.timestamp))).size;

  let totalSets = 0;
  const categoryCount = {};
  MUSCLE_CATEGORIES.forEach(c => { categoryCount[c] = 0; });

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
    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <UserAvatar userId={userName} accountsInfo={accountsInfo} size={34} onClick={onUserClick} />
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1">
            {renderUsernameWithBadge(userName, accountsInfo[userName]?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100")}
            <span>の月間サマリー ({month + 1}月)</span>
          </h3>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 font-bold text-sm bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800">
          {month + 1}月の記録はまだありません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/60">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mb-0.5">月間総負荷量</p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {totalVolume.toLocaleString()} <span className="text-xs font-bold">kg</span>
              </p>
            </div>
            <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/60">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mb-0.5">月間消費カロリー</p>
              <p className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {totalCalories.toLocaleString()} <span className="text-xs font-bold">kcal</span>
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">トレーニング日数</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {trainingDays} <span className="text-xs font-bold">日</span>
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">合計セット数</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {totalSets} <span className="text-xs font-bold">set</span>
              </p>
            </div>
          </div>

          {totalSets > 0 && (
            <div className="pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2.5">部位別セット割合</p>
              <div className="space-y-2">
                {MUSCLE_CATEGORIES.map(cat => {
                  if (categoryCount[cat] === 0) return null;
                  const percent = Math.min(100, (categoryCount[cat] / totalSets) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-2 text-xs font-bold">
                      <span className="w-12 text-slate-600 dark:text-slate-300 shrink-0">{cat}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getCategoryBarColor(cat)}`} style={{ width: `${percent}%` }} />
                      </div>
                      <span className="w-10 text-right text-slate-500 dark:text-slate-400 font-mono">{categoryCount[cat]}s</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BodyCompositionInfo({ info, dailyCalories = 0, dateLabel = '' }) {
  if (!info.height || !info.weight || !info.birthDate) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center text-xs font-bold text-slate-400">
        右上のプロフィール設定から「身長・基本体重・生年月日」を登録すると、基礎代謝・FFMI・除脂肪体重が自動計算されます。
      </div>
    );
  }
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
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900 rounded-2xl p-3.5 flex flex-col">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mb-0.5">FFMI (除脂肪量指数)</p>
            <p className="text-lg font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
              {ffmi.toFixed(1)} <span className="text-xs font-bold">({evalText})</span>
            </p>
            <p className="text-[9px] text-indigo-500/80 mt-auto pt-1 font-bold">※男性20、女性16以上で優秀</p>
          </div>
          <div className="bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200/70 dark:border-cyan-900 rounded-2xl p-3.5 flex flex-col">
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold mb-0.5">除脂肪体重 (LBM)</p>
            <p className="text-lg font-extrabold text-cyan-700 dark:text-cyan-300 font-mono">
              {leanBodyMass.toFixed(1)} <span className="text-xs font-bold">kg</span>
            </p>
            <p className="text-[9px] text-cyan-500/80 mt-auto pt-1 font-bold">※体脂肪を除いた総重量</p>
          </div>
        </div>
      );
    } else {
      advancedStatsBlock = (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center">
          <p className="text-xs font-bold text-slate-400">体脂肪率を記録すると FFMI・除脂肪体重(LBM) が算出されます</p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900 rounded-2xl p-3 flex flex-col justify-center">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-0.5">基礎代謝</p>
          <p className="text-sm sm:text-base font-extrabold text-amber-700 dark:text-amber-300 font-mono">
            {bmr.toLocaleString()}<span className="text-[10px] font-normal ml-0.5">kcal</span>
          </p>
        </div>
        <div className="bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900 rounded-2xl p-3 flex flex-col justify-center">
          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold mb-0.5">
            運動消費 {dateLabel && <span className="opacity-80">({dateLabel})</span>}
          </p>
          <p className="text-sm sm:text-base font-extrabold text-orange-700 dark:text-orange-300 font-mono">
            {dailyCalories.toLocaleString()}<span className="text-[10px] font-normal ml-0.5">kcal</span>
          </p>
        </div>
        <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900 rounded-2xl p-3 flex flex-col justify-center">
          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mb-0.5">1日総消費</p>
          <p className="text-sm sm:text-base font-extrabold text-rose-700 dark:text-rose-300 font-mono">
            {totalCalories.toLocaleString()}<span className="text-[10px] font-normal ml-0.5">kcal</span>
          </p>
        </div>
      </div>
      {advancedStatsBlock}
    </div>
  );
}

export default function DataView({
  posts,
  currentUser,
  accountsInfo,
  onEdit,
  onDelete,
  onImport,
  targetUser,
  onToggleLike,
  onAddComment,
  onDeleteComment,
  onToggleCommentLike,
  onUserClick,
  hideHeader = false
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateFromTimestamp(Date.now()));
  const displayUser = targetUser || currentUser;
  const isMyData = displayUser === currentUser;
  const hideMetrics = !isMyData && accountsInfo[displayUser]?.hideBodyMetrics;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayStr = formatDateFromTimestamp(Date.now());
  const myPosts = (posts || []).filter(p => p.author === displayUser);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeContainerRef = useRef(null);
  const calendarCardRef = useRef(null);
  const touchState = useRef({ startX: 0, startY: 0, isHorizontal: null });

  const handleMonthChange = (direction) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
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
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) touchState.current.isHorizontal = true;
        else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) touchState.current.isHorizontal = false;
      }
      if (touchState.current.isHorizontal) {
        if (e.cancelable) e.preventDefault();
        setSwipeOffset(dx);
      }
    };

    const handleTouchEnd = (e) => {
      if (touchState.current.isHorizontal) {
        const dx = e.changedTouches ? e.changedTouches[0].clientX - touchState.current.startX : 0;
        if (dx > 50) handleMonthChange(-1);
        else if (dx < -50) handleMonthChange(1);
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

    const monthBlanks = Array.from({ length: fd || 0 }).map((_, i) => <div key={`blank-${i}`} className="p-1 h-12" />);
    const monthDays = Array.from({ length: dim || 0 }).map((_, i) => {
      const date = i + 1;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
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
        dots = categories.slice(0, 3).map(cat => getCategoryDotColor(cat));
      }

      return (
        <div
          key={`day-${date}`}
          className="p-0.5 flex flex-col justify-center items-center h-12 cursor-pointer select-none"
          onClick={() => setSelectedDateStr(dateStr)}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all active:scale-90 ${
              isSelected
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : isMyTraining
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            } ${isToday && !isSelected ? 'ring-2 ring-emerald-400 text-emerald-600 dark:text-emerald-400' : ''}`}
          >
            {date}
          </div>
          <div className="flex gap-0.5 mt-1 h-1.5">
            {dots.map((bg, idx) => <div key={idx} className={`w-1.5 h-1.5 rounded-full ${bg}`} />)}
          </div>
        </div>
      );
    });

    const totalCells = (fd || 0) + (dim || 0);
    const trailingBlanks = Array.from({ length: Math.max(0, 42 - totalCells) }).map((_, i) => <div key={`trail-${i}`} className="p-1 h-12" />);

    return (
      <div className="w-1/3 shrink-0 flex-none px-1">
        <div className="grid grid-cols-7 text-center mb-1.5">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => (
            <div key={d} className={`text-[11px] font-bold ${d === '日' ? 'text-rose-400' : d === '土' ? 'text-blue-400' : 'text-slate-400'}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-center">{monthBlanks}{monthDays}{trailingBlanks}</div>
      </div>
    );
  };

  const weightData = myPosts.filter(p => p.bodyWeight && !isNaN(p.bodyWeight)).map(p => ({ date: p.date || p.timestamp, value: Number(p.bodyWeight) }));
  const fatData = myPosts.filter(p => p.bodyFat && !isNaN(p.bodyFat)).map(p => ({ date: p.date || p.timestamp, value: Number(p.bodyFat) }));
  const selectedPosts = myPosts.filter(p => formatDateFromTimestamp(p.timestamp) === selectedDateStr);

  const myUserInfo = accountsInfo[displayUser] || {};
  const lastMyFatPost = myPosts.find(p => p.bodyFat);
  const lastMyWeightPost = myPosts.find(p => p.bodyWeight);
  const myCompositionInfo = {
    ...myUserInfo,
    weight: lastMyWeightPost ? Number(lastMyWeightPost.bodyWeight) : myUserInfo.weight,
    lastFat: lastMyFatPost ? Number(lastMyFatPost.bodyFat) : null
  };

  const myDailyCalories = selectedPosts.reduce((sum, p) => sum + (Number(p.calories) || 0), 0);
  const dateLabel = selectedDateStr ? selectedDateStr.substring(5).replace('-', '/') : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {!hideHeader && (
        <PageHeader
          icon={<CalendarIcon size={18} />}
          title="データ・分析"
          subtitle="月間レポート・カレンダー・体組成の推移"
        />
      )}

      {/* 月間レポート */}
      <MonthlyReport monthDate={currentMonth} posts={posts} userName={displayUser} accountsInfo={accountsInfo} onUserClick={onUserClick} />

      {/* カレンダー */}
      <div ref={calendarCardRef} className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <IconButton icon={<ChevronLeft size={20} />} variant="emerald" size="sm" onClick={() => handleMonthChange(-1)} />
          <span className="font-extrabold text-slate-800 dark:text-slate-100 text-base">{year}年 {month + 1}月</span>
          <IconButton icon={<ChevronRight size={20} />} variant="emerald" size="sm" onClick={() => handleMonthChange(1)} />
        </div>

        <div ref={swipeContainerRef} className="overflow-hidden w-full relative -mx-1 px-1" style={{ touchAction: 'pan-y' }}>
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

        <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 mx-auto w-max">
          {MUSCLE_CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <div className={`w-2 h-2 rounded-full ${getCategoryDotColor(cat)}`} />
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* 選択日の記録 */}
      {selectedDateStr && (
        <div>
          <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2.5 ml-1 flex items-center gap-1.5">
            <CalendarIcon size={14} className="text-emerald-500" />
            {selectedDateStr.replace(/-/g, '/')} の記録 ({selectedPosts.length}件)
          </h3>
          {selectedPosts.length > 0 ? (
            selectedPosts.map(post => (
              <WorkoutCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                accountsInfo={accountsInfo}
                onEdit={onEdit}
                onDelete={onDelete}
                onImport={onImport}
                onToggleLike={onToggleLike}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onToggleCommentLike={onToggleCommentLike}
                onUserClick={onUserClick}
              />
            ))
          ) : (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl text-center text-slate-400 dark:text-slate-500 text-xs font-bold border border-slate-200 dark:border-slate-800">
              この日のトレーニング記録はありません
            </div>
          )}
        </div>
      )}

      {/* 体組成＆推移グラフ */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-3 ml-1 flex items-center gap-1.5">
          <Scale size={16} className="text-indigo-500" /> 体組成・代謝データ
        </h3>
        {hideMetrics ? (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl text-center text-slate-500 font-bold border border-slate-200 dark:border-slate-800">
            ないしょ♡ (非公開設定中)
          </div>
        ) : (
          <div className="space-y-4">
            <BodyCompositionInfo info={myCompositionInfo} dailyCalories={myDailyCalories} dateLabel={dateLabel} />
            <SimpleChart
              data={weightData}
              color="#10b981"
              unit="kg"
              title={`${accountsInfo[displayUser]?.displayName || displayUser}の体重推移`}
            />
            <SimpleChart
              data={fatData}
              color="#6366f1"
              unit="%"
              title={`${accountsInfo[displayUser]?.displayName || displayUser}の体脂肪率推移`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
