import React, { useState } from 'react';
import { AlignLeft, Trash2, CheckCircle, ArrowUp, ArrowDown, Zap, Plus } from 'lucide-react';
import { PROG_INFO } from '../../constants';

export function ActiveProgramDisplay({ program, onApply, onToggleComplete, onDelete }) {
  const [expandedWeek, setExpandedWeek] = useState(() => {
    if (!program || !program.schedule) return 1;
    const maxWeek = PROG_INFO[program.type]?.weeks || 6;
    for (let w = 1; w <= maxWeek; w++) {
      const weekDays = program.schedule.filter(s => s.week === w);
      if (weekDays.length > 0 && weekDays.some(d => !d.completed)) {
        return w;
      }
    }
    return 1;
  });
  const [showInfo, setShowInfo] = useState(false);

  if (!program) return null;

  const info = PROG_INFO[program.type] || PROG_INFO.HPS;
  const maxWeek = info.weeks;
  const weeks = [];
  for (let i = 1; i <= maxWeek; i++) {
    weeks.push(program.schedule.filter(s => s.week === i));
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-4">
      <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-base">
              {program.exerciseName} 
              <span className="text-xs font-normal opacity-80 ml-1">{info.name}</span>
            </h3>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">
              基準1RM: {program.oneRM} kg <span className="mx-1">|</span> 目標: {Math.round(program.oneRM * info.mult)} kg
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowInfo(!showInfo)} className={`p-1.5 rounded-full transition-colors ${showInfo ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300' : 'text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900'}`} title="プログラムの説明">
              <AlignLeft size={16} />
            </button>
            <button onClick={() => onDelete(program.id)} className="p-1.5 text-indigo-400 hover:text-rose-500 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors" title="プログラムを終了">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {showInfo && (
          <div className="mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-800/50 animate-in fade-in">
            <p className="text-xs font-bold text-indigo-700/90 dark:text-indigo-300/90 leading-relaxed">
              {info.desc}
            </p>
          </div>
        )}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
        {weeks.map((weekDays, idx) => {
          const weekNum = idx + 1;
          const isExpanded = expandedWeek === weekNum;
          const isWeekCompleted = weekDays.every(d => d.completed);

          return (
            <div key={weekNum} className="flex flex-col">
              <button onClick={() => setExpandedWeek(isExpanded ? null : weekNum)} className={`p-3 flex justify-between items-center transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isWeekCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>第 {weekNum} 週</span>
                  {isWeekCompleted && <CheckCircle size={14} className="text-emerald-500" />}
                </div>
                <div className="text-slate-400">
                  {isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </div>
              </button>
              {isExpanded && (
                <div className="p-3 pt-0 space-y-2 bg-slate-50 dark:bg-slate-800/50">
                  {weekDays.map((dayData, dIdx) => (
                    <div key={dayData.id} className={`bg-white dark:bg-slate-900 border ${dayData.completed ? 'border-emerald-200 dark:border-emerald-800/50 opacity-60' : 'border-slate-200 dark:border-slate-700'} rounded-xl p-3 flex flex-col gap-2 transition-all`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <button onClick={() => onToggleComplete(dayData.id)} className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${dayData.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-400'}`}>
                            <CheckCircle size={12} fill="currentColor" />
                          </button>
                          <span className={`text-xs font-bold ${dayData.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                            Day {dIdx + 1}: {dayData.type}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold tracking-wide ${dayData.completed ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                            {dayData.weight}<span className="text-[10px] font-normal mx-0.5">kg</span> x {dayData.reps}<span className="text-[10px] font-normal mx-0.5">回</span> x {dayData.sets}<span className="text-[10px] font-normal ml-0.5">Set</span>
                          </span>
                          {dayData.isAmrap && <div className="text-[10px] font-bold text-amber-500 mt-0.5">最終セット限界まで!</div>}
                        </div>
                      </div>
                      {dayData.advice && !dayData.completed && (
                        <div className="mt-1 bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                          <p className="text-[10px] font-bold text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed flex gap-1 items-start">
                            <Zap size={12} className="shrink-0 mt-0.5 text-amber-500" />
                            <span>{dayData.advice}</span>
                          </p>
                        </div>
                      )}
                      {!dayData.completed && (
                        <div className="flex justify-end mt-1">
                          <button onClick={() => onApply(program, dayData)} className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors">
                            <Plus size={12}/> メニューに追加
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
