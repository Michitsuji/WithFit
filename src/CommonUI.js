// ==========================================
// CommonUI.js — 共通UIコンポーネント・カスタムフック・アイコン
// ==========================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, AlignLeft, Edit2, TrendingUp, TrendingDown } from 'lucide-react';
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

// --- グラフコンポーネント（1か月・3か月・1年・全期間切替＋タッチ数値確認対応） ---
function SimpleChart({ data, color = "#10b981", title, unit = "" }) {
  const [rangeType, setRangeType] = useState('3M'); // '1M' | '3M' | '1Y' | 'ALL'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const svgRef = useRef(null);
  const gradientId = useRef(`chart-grad-${Math.random().toString(36).substring(2, 9)}`).current;

  const inferredUnit = unit || (title?.includes('%') ? '%' : title?.includes('kg') ? 'kg' : '');

  // 全データを日付順にソートし、同日のデータは最新（または最後の記録）に集約
  const allSortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const valid = data
      .filter(d => d && d.date && !isNaN(Number(d.value)))
      .map(d => {
        const time = new Date(d.date).getTime();
        const dt = new Date(time);
        const dayKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        return {
          ...d,
          value: Math.round(Number(d.value) * 10) / 10,
          time,
          dayKey
        };
      })
      .filter(d => !isNaN(d.time))
      .sort((a, b) => a.time - b.time);

    // 同じ日に複数記録がある場合は最後の値を採用してグラフを見やすくする
    const byDay = new Map();
    valid.forEach(item => byDay.set(item.dayKey, item));
    return Array.from(byDay.values());
  }, [data]);

  // 表示範囲に応じたフィルタリング
  const filteredData = useMemo(() => {
    if (allSortedData.length === 0) return [];
    if (rangeType === 'ALL') return allSortedData;

    const latestTime = Math.max(Date.now(), allSortedData[allSortedData.length - 1].time);
    const daysMap = { '1M': 31, '3M': 92, '1Y': 366 };
    const cutoff = latestTime - (daysMap[rangeType] || 92) * 24 * 60 * 60 * 1000;
    return allSortedData.filter(d => d.time >= cutoff);
  }, [allSortedData, rangeType]);

  // 期間変更時やデータ更新時は最新ポイントを選択状態にする
  useEffect(() => {
    if (filteredData.length > 0) {
      setSelectedIndex(filteredData.length - 1);
    } else {
      setSelectedIndex(null);
    }
  }, [filteredData.length, rangeType]);

  const rangeOptions = [
    { key: '1M', label: '1か月' },
    { key: '3M', label: '3か月' },
    { key: '1Y', label: '1年' },
    { key: 'ALL', label: '全期間' }
  ];

  if (allSortedData.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
        <div className="flex justify-between items-center w-full mb-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
            <span className="truncate">{title}</span>
          </h4>
        </div>
        <p className="text-sm font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl text-center border border-slate-100 dark:border-slate-800 w-full">
          データがありません
        </p>
      </div>
    );
  }

  const values = filteredData.map(d => d.value);
  const hasRangeData = values.length > 0;

  const minVal = hasRangeData ? Math.min(...values) : 0;
  const maxVal = hasRangeData ? Math.max(...values) : 0;
  const avgVal = hasRangeData ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const firstVal = hasRangeData ? values[0] : 0;
  const latestVal = hasRangeData ? values[values.length - 1] : 0;
  const periodDiff = Math.round((latestVal - firstVal) * 10) / 10;

  const pad = (maxVal - minVal) === 0 ? Math.max(1, minVal * 0.05) : (maxVal - minVal) * 0.22;
  const yMin = Math.max(0, Math.floor((minVal - pad) * 10) / 10);
  const yMax = Math.ceil((maxVal + pad) * 10) / 10;
  const yRange = yMax - yMin === 0 ? 1 : yMax - yMin;

  // SVG座標設計 (レスポンシブViewBox・上部ツールチップ領域を確保)
  const svgW = 360;
  const svgH = 205;
  const padL = 38;
  const padR = 16;
  const padT = 34;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const minTime = hasRangeData ? filteredData[0].time : 0;
  const maxTime = hasRangeData ? filteredData[filteredData.length - 1].time : 0;
  const timeSpan = maxTime - minTime;

  const points = filteredData.map((d, idx) => {
    let x;
    if (filteredData.length === 1 || timeSpan === 0) {
      x = padL + plotW / 2;
    } else {
      // 時間比率とインデックス比率をハイブリッドして点の重なりを防止しつつ時間間隔も表現
      const timeRatio = (d.time - minTime) / timeSpan;
      const idxRatio = idx / (filteredData.length - 1);
      const ratio = filteredData.length > 20 ? idxRatio : (timeRatio * 0.7 + idxRatio * 0.3);
      x = padL + ratio * plotW;
    }
    const y = padT + plotH - ((d.value - yMin) / yRange) * plotH;
    const dt = new Date(d.time);
    const shortDate = `${dt.getMonth() + 1}/${dt.getDate()}`;
    const fullDate = `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
    const prevDiff = idx > 0 ? Math.round((d.value - filteredData[idx - 1].value) * 10) / 10 : null;
    return { x, y, val: d.value, shortDate, fullDate, prevDiff, idx };
  });

  // ベジェ曲線パスまたは滑らかな折れ線パス生成
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

  const linePath = buildSmoothPath(points);
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} ${padT + plotH} L ${points[0].x} ${padT + plotH} Z`
    : '';

  // X軸の日付メモリ（最大5個、重ならないように間引く）
  const xTicks = (() => {
    if (points.length === 0) return [];
    if (points.length <= 5) return points;
    const tickCount = 5;
    const result = [];
    for (let i = 0; i < tickCount; i++) {
      const targetIdx = Math.round((i / (tickCount - 1)) * (points.length - 1));
      result.push(points[targetIdx]);
    }
    return result;
  })();

  // タッチ・マウス操作で最も近いデータ点を選択
  const handlePointerInteract = (e) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0
      ? e.touches[0].clientX
      : e.clientX;
    if (clientX === undefined) return;

    const relX = ((clientX - rect.left) / rect.width) * svgW;
    let closestIdx = 0;
    let minDist = Infinity;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - relX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });
    setSelectedIndex(closestIdx);
  };

  const activePoint = (selectedIndex !== null && points[selectedIndex])
    ? points[selectedIndex]
    : (points[points.length - 1] || null);

  const showStaticLabels = points.length <= 6;

  return (
    <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-all">
      {/* ヘッダー＆期間セレクター（スマホでも綺麗に揃う2段構成） */}
      <div className="flex flex-col gap-3 mb-4">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}></span>
          <span className="truncate">{title}</span>
        </h4>
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
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                style={active ? { color } : undefined}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {!hasRangeData ? (
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center my-2">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">選択した期間のデータがありません</p>
          <button
            type="button"
            onClick={() => setRangeType('ALL')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:opacity-80"
          >
            全期間を表示する
          </button>
        </div>
      ) : (
        <>
          {/* 選択中のポイント詳細 ＆ サマリーカード（上下2段で文字潰れ・重なりを完全防止） */}
          <div className="bg-slate-50/90 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3.5 mb-4 flex flex-col gap-3">
            {/* 上段：選択日の数値 ＆ 前回比バッジ */}
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
                    {activePoint ? activePoint.fullDate : '-'}
                  </span>
                  {activePoint && activePoint.idx === points.length - 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 leading-none">
                      最新
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-mono leading-none">
                    {activePoint ? activePoint.val.toFixed(1) : '-'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{inferredUnit}</span>
                </div>
              </div>

              {activePoint && activePoint.prevDiff !== null && (
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 whitespace-nowrap">前回比</span>
                  <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg whitespace-nowrap inline-flex items-center ${
                    activePoint.prevDiff > 0
                      ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50'
                      : activePoint.prevDiff < 0
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50'
                      : 'bg-slate-200/60 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {activePoint.prevDiff > 0 ? `+${activePoint.prevDiff.toFixed(1)}` : activePoint.prevDiff.toFixed(1)}{inferredUnit}
                  </span>
                </div>
              )}
            </div>

            {/* 下段：期間変化・平均・最小/最大の3カラム均等配置 */}
            <div className="grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-slate-800 border-t border-slate-200/70 dark:border-slate-800 pt-2.5 text-center">
              <div className="px-1 flex flex-col items-center justify-center">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5 whitespace-nowrap">期間変化</div>
                <div className={`text-xs font-bold font-mono whitespace-nowrap ${
                  periodDiff > 0 ? 'text-rose-500' : periodDiff < 0 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {periodDiff > 0 ? `+${periodDiff.toFixed(1)}` : periodDiff.toFixed(1)}{inferredUnit}
                </div>
              </div>
              <div className="px-1 flex flex-col items-center justify-center">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5 whitespace-nowrap">平均</div>
                <div className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {avgVal.toFixed(1)}{inferredUnit}
                </div>
              </div>
              <div className="px-1 flex flex-col items-center justify-center">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5 whitespace-nowrap">最小 / 最大</div>
                <div className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {minVal.toFixed(1)}<span className="text-slate-400 mx-0.5">/</span>{maxVal.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* インタラクティブSVGチャート */}
          <div className="relative w-full select-none">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-auto overflow-visible touch-pan-y cursor-crosshair"
              onClick={handlePointerInteract}
              onTouchStart={handlePointerInteract}
              onTouchMove={handlePointerInteract}
              onMouseMove={(e) => { if (e.buttons === 1) handlePointerInteract(e); }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.38" />
                  <stop offset="75%" stopColor={color} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* 水平グリッド線 ＆ Y軸ラベル */}
              {[0, 0.333, 0.666, 1].map((t, idx) => {
                const y = padT + plotH - t * plotH;
                const val = (yMin + yRange * t).toFixed(1);
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

              {/* グラデーションエリア */}
              {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

              {/* メインの折れ線・曲線 */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 選択中の垂直ガイドライン */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={padT - 4}
                  x2={activePoint.x}
                  y2={padT + plotH}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.65"
                />
              )}

              {/* データポイント描画（データ数が多い場合は文字を重ねずドットをスマート化） */}
              {points.map((p, i) => {
                const isSelected = activePoint && activePoint.idx === i;
                const isDense = points.length > 20;
                const dotRadius = isSelected ? 5.5 : (isDense ? 2.2 : 3.5);

                return (
                  <g key={`pt-${i}`}>
                    {isSelected && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="10"
                        fill={color}
                        opacity="0.2"
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={dotRadius}
                      fill={isSelected ? color : "currentColor"}
                      className={isSelected ? "" : "text-white dark:text-slate-900"}
                      stroke={color}
                      strokeWidth={isSelected ? "2.5" : (isDense ? "1.5" : "2")}
                    />
                    {showStaticLabels && !isSelected && (
                      <text
                        x={p.x}
                        y={p.y - 9}
                        fontSize="9.5"
                        fill={color}
                        textAnchor="middle"
                        className="font-bold font-mono"
                        opacity="0.8"
                      >
                        {p.val}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 選択ポイントのフローティングツールチップ（常にポイント上部に配置し線との重なりを防止） */}
              {activePoint && (() => {
                const boxW = 84;
                const boxH = 22;
                const clampedX = Math.min(Math.max(activePoint.x, padL + boxW / 2), svgW - padR - boxW / 2);
                const boxY = Math.max(2, activePoint.y - boxH - 8);

                return (
                  <g className="pointer-events-none">
                    <rect
                      x={clampedX - boxW / 2}
                      y={boxY}
                      width={boxW}
                      height={boxH}
                      rx="6"
                      fill={color}
                      opacity="0.95"
                    />
                    <text
                      x={clampedX}
                      y={boxY + 14.5}
                      fontSize="10"
                      fill="#ffffff"
                      textAnchor="middle"
                      className="font-bold font-mono"
                    >
                      {activePoint.shortDate} {activePoint.val.toFixed(1)}{inferredUnit}
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
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-right mt-1">
              ※グラフをタッチ・なぞると各日の数値を表示します（全{points.length}件）
            </div>
          </div>
        </>
      )}
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

// --- 記録ボタン長押しホイール（ドラッグ選択＆長押し後タップ選択の両対応で安定化） ---
function RecordWheelWrapper({ myInfo, currentTab, setCurrentTab, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [tapSelectMode, setTapSelectMode] = useState(false);
  const wrapperRef = useRef(null);
  const hoveredRef = useRef(null);
  const isOpenRef = useRef(false);
  const isPressingRef = useRef(false);
  const pressTimer = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const closeMenu = () => {
    clearPressTimer();
    isPressingRef.current = false;
    isOpenRef.current = false;
    hoveredRef.current = null;
    setIsOpen(false);
    setHovered(null);
    setTapSelectMode(false);
  };

  const executeSelection = (target) => {
    closeMenu();
    if (target === 'left') {
      if (currentTab !== 'record') {
        setCurrentTab('record');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('showRecordDashboard'));
      }, 20);
    } else if (target === 'right') {
      if (currentTab !== 'record') {
        setCurrentTab('record');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('returnToRecordInput'));
      }, 20);
    }
  };

  const calculateHover = (clientX, clientY) => {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = centerY - clientY; // 上方向が正
    const dist = Math.hypot(dx, dy);

    // ボタン中心から少し（14px以上）動かしただけで左右どちらかを確実に判定
    if (dist >= 14 && dy > -45) {
      return dx < 0 ? 'left' : 'right';
    }
    return null;
  };

  const updateHover = (clientX, clientY) => {
    const nextHover = calculateHover(clientX, clientY);
    if (hoveredRef.current !== nextHover) {
      hoveredRef.current = nextHover;
      setHovered(nextHover);
      if (nextHover && typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(15); } catch (e) {}
      }
    }
  };

  const handlePointerStart = (clientX, clientY) => {
    if (!myInfo?.isTraining) return;
    if (tapSelectMode) return; // タップ選択モード中はメニュー側のクリックで処理

    isPressingRef.current = true;
    startPosRef.current = { x: clientX, y: clientY };
    lastPosRef.current = { x: clientX, y: clientY };
    clearPressTimer();

    pressTimer.current = setTimeout(() => {
      if (!isPressingRef.current) return;
      isOpenRef.current = true;
      setIsOpen(true);
      updateHover(lastPosRef.current.x, lastPosRef.current.y);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch (e) {}
      }
    }, 220);
  };

  useEffect(() => {
    if (!myInfo?.isTraining) {
      closeMenu();
      return;
    }

    const onWindowTouchMove = (e) => {
      if (!isPressingRef.current) return;
      const touch = e.touches && e.touches[0];
      if (!touch) return;
      lastPosRef.current = { x: touch.clientX, y: touch.clientY };

      if (isOpenRef.current) {
        if (e.cancelable) e.preventDefault();
        updateHover(touch.clientX, touch.clientY);
      } else {
        const moveDist = Math.hypot(
          touch.clientX - startPosRef.current.x,
          touch.clientY - startPosRef.current.y
        );
        // 長押し待機中に上方向・左右へドラッグを開始した場合は即座にメニューを開く
        if (moveDist > 18) {
          clearPressTimer();
          isOpenRef.current = true;
          setIsOpen(true);
          updateHover(touch.clientX, touch.clientY);
        }
      }
    };

    const onWindowMouseMove = (e) => {
      if (!isPressingRef.current) return;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      if (isOpenRef.current) {
        updateHover(e.clientX, e.clientY);
      }
    };

    const onWindowEnd = () => {
      if (!isPressingRef.current) return;
      isPressingRef.current = false;
      const hadTimer = !!pressTimer.current;
      clearPressTimer();

      // 短押し（長押しメニューが開く前に離した場合）：記録画面へ遷移
      if (!isOpenRef.current && hadTimer) {
        if (currentTab !== 'record') {
          setCurrentTab('record');
        }
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('returnToRecordInput'));
        }, 20);
        return;
      }

      if (isOpenRef.current) {
        updateHover(lastPosRef.current.x, lastPosRef.current.y);
        const finalSelected = hoveredRef.current;
        if (finalSelected === 'left' || finalSelected === 'right') {
          executeSelection(finalSelected);
        } else {
          // 指を動かさずに長押しして離した場合はメニューを開いたままにし、タップでも選べるようにする
          setTapSelectMode(true);
        }
      }
    };

    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowEnd);
    window.addEventListener('touchcancel', onWindowEnd);
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowEnd);

    return () => {
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowEnd);
      window.removeEventListener('touchcancel', onWindowEnd);
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowEnd);
    };
  }, [myInfo?.isTraining, currentTab, tapSelectMode]);

  return (
    <>
      {isOpen && tapSelectMode && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={closeMenu}
          onTouchStart={(e) => { e.stopPropagation(); closeMenu(); }}
        />
      )}
      <div 
        ref={wrapperRef}
        className={`relative flex flex-col items-center ${myInfo?.isTraining ? 'touch-none select-none z-50' : ''}`}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        onTouchStart={(e) => {
          if (!myInfo?.isTraining) return;
          if (e.touches && e.touches.length > 0) {
            handlePointerStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onMouseDown={(e) => {
          if (!myInfo?.isTraining || e.button !== 0) return;
          handlePointerStart(e.clientX, e.clientY);
        }}
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
            className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex transition-all duration-200 ${
              isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'
            } ${tapSelectMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{ transformOrigin: 'bottom center' }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); executeSelection('left'); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); executeSelection('left'); }}
              className={`relative w-28 h-28 bg-indigo-500/95 backdrop-blur-md rounded-tl-full flex items-center justify-center border-[3px] border-r-[1.5px] border-indigo-300 dark:border-indigo-700 transition-transform duration-150 ${
                hovered === 'left' ? 'scale-110 bg-indigo-500 z-10 shadow-[0_0_20px_rgba(99,102,241,0.65)]' : 'opacity-85 hover:opacity-100'
              } origin-bottom-right`}
            >
              <div className="flex flex-col items-center justify-center text-white mr-3 mt-5">
                <AlignLeft size={26} />
                <span className="text-[11px] font-bold mt-1 tracking-wider">プログラム</span>
              </div>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); executeSelection('right'); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); executeSelection('right'); }}
              className={`relative w-28 h-28 bg-emerald-500/95 backdrop-blur-md rounded-tr-full flex items-center justify-center border-[3px] border-l-[1.5px] border-emerald-300 dark:border-emerald-700 transition-transform duration-150 ${
                hovered === 'right' ? 'scale-110 bg-emerald-500 z-10 shadow-[0_0_20px_rgba(16,185,129,0.65)]' : 'opacity-85 hover:opacity-100'
              } origin-bottom-left`}
            >
              <div className="flex flex-col items-center justify-center text-white ml-3 mt-5">
                <Edit2 size={26} />
                <span className="text-[11px] font-bold mt-1 tracking-wider">記録画面</span>
              </div>
            </button>
          </div>
        )}

        <div
          className={`transition-transform duration-200 ${isOpen && myInfo?.isTraining ? 'scale-90 opacity-80' : 'scale-100'}`}
          onClick={() => {
            if (myInfo?.isTraining && tapSelectMode) {
              closeMenu();
            }
          }}
        >
          <div className={myInfo?.isTraining ? "pointer-events-none" : ""}>
            {children}
          </div>
        </div>
      </div>
    </>
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