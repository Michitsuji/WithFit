import React, { useState, useMemo } from 'react';
import { Search, X, Dumbbell, Activity, Plus, Clock, Sparkles } from 'lucide-react';
import { MUSCLE_CATEGORIES } from '../../constants/定数一覧';
import { getCategoryColor } from '../../utils/便利関数';

export function QuickAddExerciseModal({ isOpen, onClose, exercises, selectedGymId, onSelectExercise, myPastPosts }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // 直近よく使った種目
  const recentExercises = useMemo(() => {
    if (!myPastPosts) return [];
    const names = [];
    for (let p of myPastPosts.slice(0, 10)) {
      if (p.items) {
        for (let it of p.items) {
          if (it.exerciseName && !names.includes(it.exerciseName)) {
            names.push(it.exerciseName);
          }
        }
      }
    }
    return names.slice(0, 8);
  }, [myPastPosts]);

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      if (ex.gymId !== selectedGymId && ex.gymId !== 'common') return false;
      if (selectedCat !== 'all' && ex.category !== selectedCat) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = ex.name.toLowerCase().includes(q);
        const matchMaker = ex.maker ? ex.maker.toLowerCase().includes(q) : false;
        if (!matchName && !matchMaker) return false;
      }
      return true;
    });
  }, [exercises, selectedGymId, selectedCat, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Plus size={18} className="text-emerald-500" /> 種目をクイック追加
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 検索バー */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="種目名やメーカー名で検索..."
              className="w-full bg-slate-100 dark:bg-slate-800 pl-9 pr-9 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 最近の履歴クイックチップ */}
        {recentExercises.length > 0 && !searchQuery && selectedCat === 'all' && (
          <div className="px-4 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30">
            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
              <Clock size={12} /> 最近行った種目からすぐに追加
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              {recentExercises.map(name => (
                <button
                  key={name}
                  onClick={() => { onSelectExercise(name); onClose(); }}
                  className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 hover:border-emerald-400 hover:text-emerald-600 transition-colors shadow-sm"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 部位フィルタータブ */}
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto hide-scrollbar flex gap-1.5 shrink-0">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${selectedCat === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
          >
            すべて
          </button>
          {MUSCLE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${selectedCat === cat ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 種目リスト */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredExercises.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold text-xs">
              該当する種目が見つかりません
            </div>
          ) : (
            filteredExercises.map(ex => (
              <div
                key={ex.id}
                onClick={() => { onSelectExercise(ex.name); onClose(); }}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {ex.category === '有酸素' ? <Activity size={16} className="text-cyan-500 shrink-0"/> : <Dumbbell size={16} className="text-emerald-500 shrink-0" />}
                  <div className="truncate">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{ex.name}</span>
                    {ex.maker && <span className="text-xs text-slate-400 ml-1.5">（{ex.maker}）</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ex.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(ex.category)}`}>{ex.category}</span>}
                  <Plus size={16} className="text-slate-300 group-hover:text-emerald-500" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
