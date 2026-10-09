import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

export function SimpleChart({ data, color, title }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

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

  const PIXELS_PER_DAY = 12;
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
    const dateStr = d.date ? d.date.slice(5, 10).replace('-', '/') : '';
    return { x, y, val: d.value, dateStr };
  });

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
                  {p.dateStr && <text x={p.x} y={height + 25} fontSize="10" fill="currentColor" textAnchor="middle" className="font-bold text-slate-400 dark:text-slate-500">{p.dateStr}</text>}
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 共通コンポーネント：ワークアウトカード ---
