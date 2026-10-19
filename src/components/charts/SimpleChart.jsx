// ============================================================================
// WithFit v2 - 高精度・重なり防止グラフコンポーネント (SimpleChart)
// ・同日データの自動集約（文字重なり解消）
// ・データ点ごとの固定最小間隔（連続記録でも数値や日付が絶対に重ならない）
// ・固定Y軸カラム分離（スクロール時にY軸ラベルと折れ線が重ならない）
// ・期間フィルタ（1ヶ月 / 3ヶ月 / 全期間）＆最新値・前回比・最小/最大サマリー
// ・データ点タップで詳細ツールチップ表示
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { formatDateFromTimestamp, formatDateWithDay } from '../../utils/helpers';

export default function SimpleChart({ data, color = '#10b981', title, unit = '' }) {
  const scrollRef = useRef(null);
  const [period, setPeriod] = useState('all'); // '30d' | '90d' | 'all'
  const [selectedIdx, setSelectedIdx] = useState(null);

  // 1. 日付(YYYY-MM-DD)ごとに最新値を1件に集約して昇順ソート（同日複数記録による完全な文字重なりを防止）
  const dailyData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const byDate = new Map();
    data.forEach(item => {
      const val = Number(item.value);
      if (isNaN(val) || val <= 0) return;
      const dStr = formatDateFromTimestamp(item.date) || String(item.date).substring(0, 10);
      if (!dStr) return;
      const ts = new Date(item.date).getTime() || new Date(dStr).getTime();
      if (!byDate.has(dStr) || ts >= byDate.get(dStr).ts) {
        byDate.set(dStr, { dateStr: dStr, ts, value: Math.round(val * 10) / 10 });
      }
    });
    return Array.from(byDate.values()).sort((a, b) => a.ts - b.ts);
  }, [data]);

  // 2. 期間フィルタ適用
  const filteredData = useMemo(() => {
    if (dailyData.length === 0) return [];
    if (period === 'all') return dailyData;
    const days = period === '30d' ? 30 : 90;
    const latestTs = dailyData[dailyData.length - 1].ts;
    const cutoff = latestTs - days * 24 * 60 * 60 * 1000;
    const res = dailyData.filter(d => d.ts >= cutoff);
    return res.length > 0 ? res : dailyData.slice(-Math.min(dailyData.length, 5));
  }, [dailyData, period]);

  // スクロール位置を右端（最新）へ自動移動
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
    setSelectedIdx(filteredData.length > 0 ? filteredData.length - 1 : null);
  }, [filteredData.length, period]);

  if (filteredData.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <Activity size={16} style={{ color }} /> {title}
        </h4>
        <div className="text-sm font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/60 p-6 rounded-xl text-center border border-slate-100 dark:border-slate-800/80">
          まだ記録データがありません
        </div>
      </div>
    );
  }

  const values = filteredData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const latestVal = values[values.length - 1];
  const prevVal = values.length >= 2 ? values[values.length - 2] : null;
  const diffFromPrev = prevVal !== null ? Math.round((latestVal - prevVal) * 10) / 10 : null;

  const rawRange = maxVal - minVal;
  const pad = rawRange === 0 ? Math.max(1, minVal * 0.05) : rawRange * 0.25;
  const min = Math.max(0, Math.floor((minVal - pad) * 10) / 10);
  const max = Math.ceil((maxVal + pad) * 10) / 10;
  const range = max - min === 0 ? 1 : max - min;

  // プロット領域サイズ（上下に十分な余白を取り、数値ラベルや日付ラベルの切れ・重なりを完全防止）
  const topPad = 28;
  const plotHeight = 110;
  const bottomPad = 32;
  const svgHeight = topPad + plotHeight + bottomPad;

  // 隣り合うデータ点同士の最小間隔を 56px 確保（日付が連続していても絶対に文字が重ならない）
  const POINT_GAP = 56;
  const horizontalPad = 32;
  const chartWidth = Math.max(280, (filteredData.length - 1) * POINT_GAP + horizontalPad * 2);

  const points = filteredData.map((d, i) => {
    const x = filteredData.length === 1
      ? chartWidth / 2
      : horizontalPad + (i / (filteredData.length - 1)) * (chartWidth - horizontalPad * 2);
    const y = topPad + plotHeight - ((d.value - min) / range) * plotHeight;
    const [, m, day] = d.dateStr.split('-');
    return {
      x,
      y,
      val: d.value,
      dateStr: d.dateStr,
      shortDate: `${Number(m)}/${Number(day)}`,
      fullDateLabel: formatDateWithDay(d.dateStr)
    };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0].x},${topPad + plotHeight} ${polylinePoints} ${points[points.length - 1].x},${topPad + plotHeight}`;
  const gradId = `chartGrad_${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  const activePoint = selectedIdx !== null && points[selectedIdx] ? points[selectedIdx] : points[points.length - 1];
  const activePrevPoint = selectedIdx !== null && selectedIdx > 0 ? points[selectedIdx - 1] : null;
  const activeDiff = activePoint && activePrevPoint ? Math.round((activePoint.val - activePrevPoint.val) * 10) / 10 : null;

  const yTicks = [1, 0.5, 0].map(t => ({
    ratio: t,
    y: topPad + plotHeight - t * plotHeight,
    label: (min + range * t).toFixed(1)
  }));

  return (
    <div className="w-full bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
      {/* ヘッダー＆期間切り替え */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          {title}
        </h4>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          {[
            { id: '30d', label: '1ヶ月' },
            { id: '90d', label: '3ヶ月' },
            { id: 'all', label: '全期間' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all active:scale-95 ${
                period === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* サマリーメトリクスバー */}
      <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
        <div>
          <p className="text-[10px] font-bold text-slate-400">最新値</p>
          <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
            {latestVal}<span className="text-[10px] font-bold text-slate-400 ml-0.5">{unit}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400">前回比</p>
          <p className={`text-sm font-extrabold flex items-center gap-0.5 ${
            diffFromPrev === null || diffFromPrev === 0
              ? 'text-slate-500'
              : diffFromPrev > 0
              ? 'text-rose-500'
              : 'text-emerald-500'
          }`}>
            {diffFromPrev === null ? '-' : `${diffFromPrev > 0 ? '+' : ''}${diffFromPrev}${unit}`}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400">最小 / 最大</p>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {minVal} <span className="text-slate-400">〜</span> {maxVal}<span className="text-[10px] text-slate-400 ml-0.5">{unit}</span>
          </p>
        </div>
      </div>

      {/* 選択中のデータポイント詳細ピル */}
      {activePoint && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>選択日: {activePoint.fullDateLabel}</span>
          <span className="flex items-center gap-2">
            <strong className="text-sm" style={{ color }}>{activePoint.val}{unit}</strong>
            {activeDiff !== null && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded ${activeDiff > 0 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : activeDiff < 0 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                {activeDiff > 0 ? `+${activeDiff}` : activeDiff}{unit}
              </span>
            )}
          </span>
        </div>
      )}

      {/* グラフ本体（左固定Y軸 + 右横スクロールキャンバス） */}
      <div className="flex items-stretch w-full select-none">
        {/* 固定Y軸（グラフと絶対に重ならない独立カラム） */}
        <div className="w-11 shrink-0 border-r border-slate-100 dark:border-slate-800 pr-1">
          <svg width="40" height={svgHeight} viewBox={`0 0 40 ${svgHeight}`} className="overflow-visible">
            {yTicks.map((t, idx) => (
              <text
                key={idx}
                x="36"
                y={t.y + 4}
                fontSize="10"
                textAnchor="end"
                fill="currentColor"
                className="text-slate-400 dark:text-slate-500 font-bold font-mono"
              >
                {t.label}
              </text>
            ))}
          </svg>
        </div>

        {/* 横スクロールプロット領域 */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto hide-scrollbar">
          <div style={{ width: `${chartWidth}px`, height: `${svgHeight}px` }}>
            <svg width={chartWidth} height={svgHeight} viewBox={`0 0 ${chartWidth} ${svgHeight}`} className="overflow-visible">
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.24" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* 水平グリッド線 */}
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

              {/* グラデーション面 */}
              {points.length > 1 && (
                <polygon points={areaPoints} fill={`url(#${gradId})`} />
              )}

              {/* 折れ線 */}
              {points.length > 1 && (
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 各データ点＆重ならない数値・日付ラベル */}
              {points.map((p, i) => {
                const isSelected = i === selectedIdx;
                // 次の点とY座標が近くても十分な横幅(56px)があり、さらに上下交互オフセットで視認性を高める
                const labelY = p.y - 11;
                return (
                  <g
                    key={p.dateStr}
                    className="cursor-pointer"
                    onClick={() => setSelectedIdx(i)}
                  >
                    {/* タップ判定を広げる透明サークル */}
                    <circle cx={p.x} cy={p.y} r="18" fill="transparent" />

                    {/* 選択時の縦ガイド線 */}
                    {isSelected && (
                      <line
                        x1={p.x}
                        y1={topPad}
                        x2={p.x}
                        y2={topPad + plotHeight}
                        stroke={color}
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        strokeOpacity="0.5"
                      />
                    )}

                    {/* データ点サークル */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 6 : 4.5}
                      fill="currentColor"
                      className="text-white dark:text-slate-900"
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2.5}
                    />

                    {/* 数値ラベル（背景ピル付きで線と重なってもくっきり読める） */}
                    <rect
                      x={p.x - 18}
                      y={labelY - 10}
                      width="36"
                      height="14"
                      rx="4"
                      fill="currentColor"
                      className={isSelected ? "text-slate-800 dark:text-white" : "text-white/90 dark:text-slate-900/90"}
                    />
                    <text
                      x={p.x}
                      y={labelY}
                      fontSize="10.5"
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : color}
                      className={`font-bold font-mono ${isSelected ? 'dark:fill-slate-900' : ''}`}
                    >
                      {p.val}
                    </text>

                    {/* X軸日付ラベル */}
                    <text
                      x={p.x}
                      y={topPad + plotHeight + 20}
                      fontSize="10"
                      textAnchor="middle"
                      fill="currentColor"
                      className={`font-bold ${isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
                    >
                      {p.shortDate}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
