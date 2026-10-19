// ============================================================================
// WithFit v2 - 種目別 成長推移（推定1RM）チャートモーダル
// 文字重なり防止・固定Y軸・横スクロール対応
// ============================================================================

import React, { useRef, useEffect } from 'react';
import { TrendingUp, X } from 'lucide-react';
import { IconButton } from '../common/UI';
import { calc1RM } from '../../utils/helpers';

export default function ExerciseChartModal({ exercise, posts, accountsInfo, onClose, currentUser }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [exercise]);

  if (!exercise) return null;

  const chartDataMap = {};
  (posts || []).forEach(p => {
    if (!p.date) return;
    const dStr = p.date.substring(0, 10);
    let maxRM = 0;
    p.items?.forEach(item => {
      if (item.exerciseName === exercise.name) {
        item.sets?.forEach(set => {
          const w = Number(set.weight) || 0;
          const r = Number(set.reps) || Math.max(Number(set.lReps) || 0, Number(set.rReps) || 0);
          const rm = calc1RM(w, r);
          if (rm > maxRM) maxRM = rm;
        });
      }
    });
    if (maxRM > 0) {
      if (!chartDataMap[dStr]) chartDataMap[dStr] = {};
      if (!chartDataMap[dStr][p.author] || maxRM > chartDataMap[dStr][p.author]) {
        chartDataMap[dStr][p.author] = Math.round(maxRM * 10) / 10;
      }
    }
  });

  const dates = Object.keys(chartDataMap).sort();
  const authorsSet = new Set();
  dates.forEach(d => Object.keys(chartDataMap[d]).forEach(a => authorsSet.add(a)));
  const authors = Array.from(authorsSet);
  const palette = ['#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#06b6d4'];

  const renderMultiChart = () => {
    if (dates.length === 0) {
      return (
        <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-bold bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
          この種目の記録データがまだありません
        </div>
      );
    }

    let min = Infinity;
    let max = -Infinity;
    dates.forEach(d => {
      authors.forEach(a => {
        const v = chartDataMap[d][a];
        if (v) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });

    if (min === Infinity) {
      return <div className="p-6 text-center text-slate-400 font-bold">データがありません</div>;
    }

    const pad = (max - min) === 0 ? Math.max(2, min * 0.1) : (max - min) * 0.25;
    min = Math.max(0, Math.floor(min - pad));
    max = Math.ceil(max + pad);
    const range = max - min === 0 ? 1 : max - min;

    const topPad = 28;
    const plotHeight = 130;
    const bottomPad = 32;
    const svgHeight = topPad + plotHeight + bottomPad;
    const POINT_GAP = 58;
    const hPad = 32;
    const chartWidth = Math.max(280, (dates.length - 1) * POINT_GAP + hPad * 2);

    const yTicks = [1, 0.5, 0].map(t => ({
      y: topPad + plotHeight - t * plotHeight,
      label: Math.round(min + range * t)
    }));

    return (
      <div>
        <div className="flex items-stretch w-full select-none">
          {/* 固定Y軸 */}
          <div className="w-11 shrink-0 border-r border-slate-100 dark:border-slate-800 pr-1">
            <svg width="40" height={svgHeight} viewBox={`0 0 40 ${svgHeight}`}>
              {yTicks.map((t, idx) => (
                <text key={idx} x="36" y={t.y + 4} fontSize="10" textAnchor="end" fill="currentColor" className="text-slate-400 font-bold font-mono">
                  {t.label}
                </text>
              ))}
            </svg>
          </div>

          {/* スクロール可能なチャート領域 */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto hide-scrollbar">
            <div style={{ width: `${chartWidth}px`, height: `${svgHeight}px` }}>
              <svg width={chartWidth} height={svgHeight} viewBox={`0 0 ${chartWidth} ${svgHeight}`} className="overflow-visible">
                {yTicks.map((t, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={t.y}
                    x2={chartWidth}
                    y2={t.y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}

                {authors.map((author, aIdx) => {
                  const color = author === currentUser ? '#10b981' : palette[(aIdx + 1) % palette.length];
                  const pointsData = dates.map((d, i) => {
                    const val = chartDataMap[d][author];
                    if (!val) return null;
                    const x = dates.length === 1 ? chartWidth / 2 : hPad + (i / (dates.length - 1)) * (chartWidth - hPad * 2);
                    const y = topPad + plotHeight - ((val - min) / range) * plotHeight;
                    return { x, y, val, d };
                  }).filter(Boolean);

                  if (pointsData.length === 0) return null;
                  const pointsStr = pointsData.map(p => `${p.x},${p.y}`).join(' ');
                  const labelOffset = aIdx % 2 === 0 ? -11 : 18;

                  return (
                    <g key={author}>
                      {pointsData.length > 1 && (
                        <polyline points={pointsStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                      {pointsData.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="4.5" fill="currentColor" className="text-white dark:text-slate-900" stroke={color} strokeWidth="2.5" />
                          <text x={p.x} y={p.y + labelOffset} fontSize="10" fill={color} textAnchor="middle" className="font-bold font-mono">
                            {p.val}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })}

                {dates.map((d, i) => {
                  const x = dates.length === 1 ? chartWidth / 2 : hPad + (i / (dates.length - 1)) * (chartWidth - hPad * 2);
                  const [, m, day] = d.split('-');
                  return (
                    <text key={d} x={x} y={topPad + plotHeight + 20} fontSize="10" fill="currentColor" textAnchor="middle" className="font-bold text-slate-400 dark:text-slate-500">
                      {`${Number(m)}/${Number(day)}`}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center pt-3 border-t border-slate-100 dark:border-slate-800">
          {authors.map((author, aIdx) => {
            const color = author === currentUser ? '#10b981' : palette[(aIdx + 1) % palette.length];
            const displayName = accountsInfo[author]?.displayName || author;
            return (
              <div key={author} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/60 dark:bg-slate-950/40">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="text-emerald-500" size={18} /> 成長推移 (推定1RM)
          </h3>
          <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={onClose} />
        </div>
        <div className="p-5">
          <div className="text-center mb-4">
            <span className="inline-block text-sm font-extrabold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full">
              {exercise.name}
            </span>
          </div>
          {renderMultiChart()}
          <p className="text-[10px] text-slate-400 font-bold mt-4 text-center">
            ※推定1RM = 重量 × (1 + 回数 ÷ 40) で算出
          </p>
        </div>
      </div>
    </div>
  );
}
