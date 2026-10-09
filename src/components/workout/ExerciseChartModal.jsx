import React from 'react';
import { TrendingDown, X } from 'lucide-react';

export function ExerciseChartModal({ exercise, posts, accountsInfo, onClose, currentUser }) {
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

// --- 種目・ジム管理画面 ---
