// ==========================================
// WorkoutForm.js — ワークアウト入力フォーム・種目検索サジェスト・種目並び替え・編集モーダル
// ==========================================
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CheckCircle, Trash2, Clock, GripVertical, X, TrendingDown, Plus, Zap, Edit2, ArrowUp, ArrowDown, Settings, ListPlus, Copy, Search, Flame, ChevronDown } from 'lucide-react';
import { generateId, formatDateWithDay, formatDateFromTimestamp, formatTimeFromTimestamp, MASTER_USER, MUSCLE_CATEGORIES, getCategoryColor } from './utils';
import { FormInput, CategoryFilterGrid } from './CommonUI';

// ひらがなをカタカナに変換し、大文字小文字・全角半角スペースを正規化して検索しやすくするヘルパー
const normalizeSearchText = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s　]+/g, '');
};

const getEquipmentLabel = (ex) => {
  if (!ex) return '';
  if (ex.gymId !== 'common') return 'マシン';
  const fw = ex.freeWeightType || (ex.name?.includes('ダンベル') ? 'dumbbell' : ex.name?.includes('スミス') ? 'smith' : 'barbell');
  if (fw === 'dumbbell') return 'ダンベル';
  if (fw === 'smith') return 'スミス';
  return 'バーベル';
};

const getWeightTypeShortLabel = (wType) => {
  switch (wType) {
    case 'oneSide': return '片側kg';
    case 'plate': return 'プレート枚';
    case 'lr': return '左右別kg';
    case 'bodyWeight': return '自重';
    case 'cardio': return '有酸素';
    default: return '合計kg';
  }
};

// --- 検索＆サジェスト付き種目セレクター ---
function ExerciseSearchSelect({
  value,
  onChange,
  filteredExercises,
  allGymExercises = [],
  exerciseUsageCount = {},
  lastExerciseSummaryMap = {},
  disabled = false,
  placeholder = "種目を検索・選択...",
  isSuperSetSelect = false,
  excludeCardio = false,
  allowEmptyOption = false,
  emptyOptionLabel = "未選択（解除）"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // 外側タップでサジェストを閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen]);

  // 検索時は選択部位外の種目もヒットできるようにベースプールを決定
  const basePool = useMemo(() => {
    const primary = excludeCardio ? filteredExercises.filter(ex => ex.weightType !== 'cardio') : filteredExercises;
    const fallbackAll = excludeCardio ? allGymExercises.filter(ex => ex.weightType !== 'cardio') : allGymExercises;
    // 検索語入力中、または部位未選択時は全種目からもサジェスト可能にする
    if (query.trim().length > 0 || primary.length === 0 || subCategoryFilter !== 'all') {
      const mergedMap = new Map();
      primary.forEach(ex => mergedMap.set(ex.id || ex.name, { ...ex, _inSelectedCat: true }));
      fallbackAll.forEach(ex => {
        if (!mergedMap.has(ex.id || ex.name)) {
          mergedMap.set(ex.id || ex.name, { ...ex, _inSelectedCat: false });
        }
      });
      return Array.from(mergedMap.values());
    }
    return primary.map(ex => ({ ...ex, _inSelectedCat: true }));
  }, [filteredExercises, allGymExercises, query, excludeCardio, subCategoryFilter]);

  const suggestions = useMemo(() => {
    const normQ = normalizeSearchText(query);
    const list = basePool.filter(ex => {
      if (subCategoryFilter !== 'all' && (ex.category || 'その他') !== subCategoryFilter) return false;
      if (!normQ) return true;
      const targetStr = normalizeSearchText(`${ex.name || ''} ${ex.maker || ''} ${ex.category || ''} ${getEquipmentLabel(ex)}`);
      return targetStr.includes(normQ);
    });

    return list.sort((a, b) => {
      if (normQ) {
        const nameA = normalizeSearchText(a.name);
        const nameB = normalizeSearchText(b.name);
        const prefixA = nameA.startsWith(normQ) ? 1 : 0;
        const prefixB = nameB.startsWith(normQ) ? 1 : 0;
        if (prefixA !== prefixB) return prefixB - prefixA;
      }
      if (a._inSelectedCat !== b._inSelectedCat) return a._inSelectedCat ? -1 : 1;
      const countA = exerciseUsageCount[a.name] || 0;
      const countB = exerciseUsageCount[b.name] || 0;
      if (countA !== countB) return countB - countA;
      return (a.name || '').localeCompare(b.name || '', 'ja');
    });
  }, [basePool, query, subCategoryFilter, exerciseUsageCount]);

  // よく使う種目（クエリ未入力時のクイックサジェスト）
  const frequentSuggestions = useMemo(() => {
    if (query.trim()) return [];
    return suggestions.filter(ex => (exerciseUsageCount[ex.name] || 0) > 0).slice(0, 5);
  }, [suggestions, query, exerciseUsageCount]);

  const selectedExObj = useMemo(() => {
    if (!value) return null;
    return allGymExercises.find(ex => ex.name === value) || filteredExercises.find(ex => ex.name === value) || { name: value };
  }, [value, allGymExercises, filteredExercises]);

  const handleSelect = (exName) => {
    onChange(exName);
    setQuery('');
    setIsOpen(false);
  };

  const openSearch = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
  };

  const baseBorderClass = isSuperSetSelect
    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/40'
    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 閉じた状態の表示ボタン または 検索入力バー */}
      {!isOpen && value ? (
        <div
          onClick={openSearch}
          className={`w-full ${baseBorderClass} border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-all shadow-sm`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedExObj?.category && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${getCategoryColor(selectedExObj.category)}`}>
                {selectedExObj.category}
              </span>
            )}
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">
              {value}
            </span>
            {selectedExObj?.maker && (
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0 truncate max-w-[90px]">
                {selectedExObj.maker}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-200/70 dark:border-emerald-800/70 flex items-center gap-1">
              <Search size={11} /> 変更
            </span>
            {allowEmptyOption && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSelect(''); }}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-full"
                title="選択解除"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            placeholder={value ? `${value}（検索して変更...）` : placeholder}
            className={`w-full ${baseBorderClass} border rounded-xl pl-9 pr-16 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-base`}
            style={{ fontSize: '16px' }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-400 hover:text-emerald-500 rounded-full"
            >
              <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* サジェストパネル */}
      {isOpen && !disabled && (
        <div className="mt-1.5 w-full bg-white dark:bg-slate-900 border-2 border-emerald-500/70 dark:border-emerald-600/70 rounded-2xl shadow-xl overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-150">
          {/* サジェスト内・部位クイック絞り込みバー */}
          <div className="p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto hide-scrollbar">
            <button
              type="button"
              onClick={() => setSubCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                subCategoryFilter === 'all'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              すべて
            </button>
            {MUSCLE_CATEGORIES.filter(c => !excludeCardio || c !== '有酸素').map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSubCategoryFilter(prev => prev === cat ? 'all' : cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                  subCategoryFilter === cat
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {allowEmptyOption && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
              >
                <span>{emptyOptionLabel}</span>
              </button>
            )}

            {/* よく使う種目セクション（検索文字未入力時） */}
            {!query.trim() && frequentSuggestions.length > 0 && (
              <div className="p-2.5 bg-amber-50/40 dark:bg-amber-950/20">
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1 px-1">
                  <Flame size={12} fill="currentColor" /> よく使う種目（タップで即選択）
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {frequentSuggestions.map(ex => {
                    const isCurrent = ex.name === value;
                    return (
                      <button
                        key={`freq-${ex.id || ex.name}`}
                        type="button"
                        onClick={() => handleSelect(ex.name)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 max-w-full ${
                          isCurrent
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-amber-200/80 dark:border-amber-800/60 hover:border-emerald-400'
                        }`}
                      >
                        <span className="truncate">{ex.name}</span>
                        <span className={`text-[10px] px-1 rounded ${isCurrent ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
                          {exerciseUsageCount[ex.name]}回
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 種目サジェストリスト */}
            {suggestions.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                「{query}」に一致する種目が見つかりません
              </div>
            ) : (
              suggestions.map(ex => {
                const isSelected = ex.name === value;
                const count = exerciseUsageCount[ex.name] || 0;
                const lastSummary = lastExerciseSummaryMap[ex.name];
                const equipLabel = getEquipmentLabel(ex);
                const weightLabel = getWeightTypeShortLabel(ex.weightType);

                return (
                  <button
                    key={ex.id || ex.name}
                    type="button"
                    onClick={() => handleSelect(ex.name)}
                    className={`w-full px-3.5 py-2.5 text-left transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ex.category && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${getCategoryColor(ex.category)}`}>
                            {ex.category}
                          </span>
                        )}
                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {ex.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {equipLabel}
                        </span>
                        {ex.maker && (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {ex.maker}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          {weightLabel}
                        </span>
                        {lastSummary && (
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                            前回: {lastSummary}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {count > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60">
                          {count}回
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">選択中</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-400">
            <span>候補 {suggestions.length}件</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 dark:text-slate-300 hover:text-emerald-500 px-2 py-0.5 rounded"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 共通コンポーネント：ワークアウト入力フォーム ---
function WorkoutItemForm({ item, index, availableExercises, allGymExercises = [], onEnsureCategory, updateItem, removeItem, addSet, removeSet, updateSet, addDropSet, removeDropSet, updateDropSet, reorderSet, myPastPosts, onActive, isDragging, isAnyDragging, dragHandleProps, isJointPartner = false }) {
  const [localFilters, setLocalFilters] = useState([]);
  const [draggedSetIndex, setDraggedSetIndex] = useState(null);
  const [dragOverSetIndex, setDragOverSetIndex] = useState(null);
  const [draggableSetId, setDraggableSetId] = useState(null);
  const setRefs = useRef([]);

  const handleDragStart = (e, idx) => {
    setDraggedSetIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTouchStart = (e, idx) => {
    setDraggedSetIndex(idx);
    document.body.style.overflow = 'hidden';
  };
  const handleTouchMove = (e) => {
    if (draggedSetIndex === null) return;
    const y = e.touches[0].clientY;
    let hoverIndex = dragOverSetIndex;
    setRefs.current.forEach((el, idx) => {
       if (!el) return;
       const rect = el.getBoundingClientRect();
       if (y >= rect.top && y <= rect.bottom) hoverIndex = idx;
    });
    if (hoverIndex !== null && hoverIndex !== dragOverSetIndex) setDragOverSetIndex(hoverIndex);
  };
  const handleTouchEnd = () => {
    if (draggedSetIndex !== null && dragOverSetIndex !== null && draggedSetIndex !== dragOverSetIndex) {
       if (reorderSet) reorderSet(item.id, draggedSetIndex, dragOverSetIndex);
    }
    setDraggedSetIndex(null);
    setDragOverSetIndex(null);
    setDraggableSetId(null);
    document.body.style.overflow = '';
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSetIndex !== idx) setDragOverSetIndex(idx);
  };
  const handleDragLeave = () => setDragOverSetIndex(null);
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedSetIndex !== null && draggedSetIndex !== idx && reorderSet) reorderSet(item.id, draggedSetIndex, idx);
    setDraggedSetIndex(null);
    setDragOverSetIndex(null);
  };
  const handleDragEnd = () => {
    setDraggedSetIndex(null);
    setDragOverSetIndex(null);
    setDraggableSetId(null);
  };

  const exerciseHistoryMap = useMemo(() => {
    const history = {};
    if (!myPastPosts) return history;
    myPastPosts.forEach(p => {
      if (!p.items) return;
      p.items.forEach(i => {
        const checkAndAdd = (exName, type, sets, pDate) => {
          if (!exName) return;
          if (!history[exName]) history[exName] = [];
          sets?.forEach(s => {
             history[exName].push({ date: pDate, set: s, type });
             if (s.dropSets) s.dropSets.forEach(ds => history[exName].push({ date: pDate, set: ds, type }));
          });
        };
        checkAndAdd(i.exerciseName, 'main', i.sets, p.date);
        if (i.isSuperSet) {
           checkAndAdd(i.superExerciseName, 'super2', i.sets, p.date);
           checkAndAdd(i.superExerciseName3, 'super3', i.sets, p.date);
        }
      });
    });
    return history;
  }, [myPastPosts]);

  // 各目の前回代表セット文字列マップ（サジェスト表示用）
  const lastExerciseSummaryMap = useMemo(() => {
    const summary = {};
    if (!myPastPosts) return summary;
    myPastPosts.forEach(p => {
      (p.items || []).forEach(i => {
        if (!i.exerciseName || summary[i.exerciseName]) return;
        const firstSet = i.sets && i.sets[0];
        if (!firstSet) return;
        if (i.weightType === 'cardio') {
          summary[i.exerciseName] = `${firstSet.distance || 0}km/${firstSet.time || 0}分`;
        } else {
          const unit = i.weightType === 'plate' ? '枚' : 'kg';
          const reps = firstSet.reps || Math.max(firstSet.lReps || 0, firstSet.rReps || 0);
          summary[i.exerciseName] = `${firstSet.weight || 0}${unit}×${reps || 0}回`;
        }
      });
    });
    return summary;
  }, [myPastPosts]);

  const toggleFilter = (type) => {
    setLocalFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const exerciseUsageCount = useMemo(() => {
    const counts = {};
    if (!myPastPosts) return counts;
    myPastPosts.forEach(p => {
      if (!p.items) return;
      p.items.forEach(i => {
        if (i.exerciseName) counts[i.exerciseName] = (counts[i.exerciseName] || 0) + 1;
        if (i.isSuperSet) {
          if (i.superExerciseName) counts[i.superExerciseName] = (counts[i.superExerciseName] || 0) + 1;
          if (i.superExerciseName3) counts[i.superExerciseName3] = (counts[i.superExerciseName3] || 0) + 1;
        }
      });
    });
    return counts;
  }, [myPastPosts]);

  const applyLocalEquipmentFilter = (list) => {
    return list.filter(ex => {
      if (localFilters.length === 0) return true;
      const isCommon = ex.gymId === 'common';
      const fwType = ex.freeWeightType || (ex.name.includes('ダンベル') ? 'dumbbell' : ex.name.includes('スミス') ? 'smith' : 'barbell');
      const exFilterType = !isCommon ? 'gym' : fwType;
      return localFilters.includes(exFilterType);
    });
  };

  const filteredExercises = useMemo(() => {
    const filtered = applyLocalEquipmentFilter(availableExercises);
    return filtered.sort((a, b) => {
      const countA = exerciseUsageCount[a.name] || 0;
      const countB = exerciseUsageCount[b.name] || 0;
      return countB - countA;
    });
  }, [availableExercises, localFilters, exerciseUsageCount]);

  const filteredAllGymExercises = useMemo(() => {
    const base = allGymExercises && allGymExercises.length > 0 ? allGymExercises : availableExercises;
    return applyLocalEquipmentFilter(base);
  }, [allGymExercises, availableExercises, localFilters]);

  const updateExerciseName = (newName, superIndex = 0) => {
    const pool = (allGymExercises && allGymExercises.length > 0) ? allGymExercises : availableExercises;
    const exData = pool.find(ex => ex.name === newName) || availableExercises.find(ex => ex.name === newName);
    if (exData?.category && onEnsureCategory) {
      onEnsureCategory(exData.category);
    }
    if (superIndex === 2) {
      updateItem(item.id, { superExerciseName: newName, superWeightType: exData ? (exData.weightType || 'total') : 'total' });
    } else if (superIndex === 3) {
      updateItem(item.id, { superExerciseName3: newName, superWeightType3: exData ? (exData.weightType || 'total') : 'total' });
    } else {
      updateItem(item.id, { exerciseName: newName, weightType: exData ? (exData.weightType || 'total') : 'total', category: exData ? (exData.category || 'その他') : 'その他', maker: exData ? exData.maker : '' });
    }
  };

  const getWeightPlaceholder = (type) => {
    if (type === 'oneSide') return '片側kg';
    if (type === 'plate') return '枚数';
    if (type === 'bodyWeight') return '+加重/-アシストkg';
    return '重量kg';
  };

  const prevRecord = useMemo(() => {
    if (!item.exerciseName || !myPastPosts) return null;
    for (let p of myPastPosts) {
      const found = p.items?.find(i => i.exerciseName === item.exerciseName);
      if (found && found.sets?.length > 0) {
        return { date: p.date, sets: found.sets, weightType: found.weightType, fullItem: found };
      }
    }
    return null;
  }, [item.exerciseName, myPastPosts]);

  const handleCopyPrevRecord = () => {
    if (!prevRecord || !prevRecord.fullItem) return;
    const prevItem = prevRecord.fullItem;
    const newSets = prevItem.sets.map(s => {
      const clearReps = (ds) => ({
        ...ds,
        id: generateId(),
        targetReps: ds.reps || '',
        targetLReps: ds.lReps || '',
        targetRReps: ds.rReps || '',
        targetSuperReps: ds.superReps || '',
        targetSuperLReps: ds.superLReps || '',
        targetSuperRReps: ds.superRReps || '',
        targetSuperReps3: ds.superReps3 || '',
        targetSuperLReps3: ds.superLReps3 || '',
        targetSuperRReps3: ds.superRReps3 || '',
        reps: '', lReps: '', rReps: '', forcedReps: '',
        superReps: '', superLReps: '', superRReps: '', superForcedReps: '',
        superReps3: '', superLReps3: '', superRReps3: '', superForcedReps3: ''
      });
      return {
        ...s,
        id: generateId(),
        targetReps: s.reps || '',
        targetLReps: s.lReps || '',
        targetRReps: s.rReps || '',
        targetSuperReps: s.superReps || '',
        targetSuperLReps: s.superLReps || '',
        targetSuperRReps: s.superRReps || '',
        targetSuperReps3: s.superReps3 || '',
        targetSuperLReps3: s.superLReps3 || '',
        targetSuperRReps3: s.superRReps3 || '',
        reps: '', lReps: '', rReps: '', forcedReps: '', distance: '', time: '', calories: '',
        superReps: '', superLReps: '', superRReps: '', superForcedReps: '',
        superReps3: '', superLReps3: '', superRReps3: '', superForcedReps3: '',
        dropSets: s.dropSets ? s.dropSets.map(clearReps) : undefined,
        superDropSets: s.superDropSets ? s.superDropSets.map(clearReps) : undefined,
        superDropSets3: s.superDropSets3 ? s.superDropSets3.map(clearReps) : undefined,
      };
    });

    updateItem(item.id, {
      sets: newSets,
      isSuperSet: prevItem.isSuperSet || false,
      isDropSet: prevItem.isDropSet || false,
      isForcedReps: prevItem.isForcedReps || false,
      superExerciseName: prevItem.superExerciseName || '',
      superWeightType: prevItem.superWeightType || 'total',
      superExerciseName3: prevItem.superExerciseName3 || '',
      superWeightType3: prevItem.superWeightType3 || 'total'
    });
  };

  const renderInputRow = (setObj, wType, type, isDrop, dropId = null) => {
    const isLR = wType === 'lr';
    const isCardio = wType === 'cardio';
    
    const val = (f) => {
      let fieldName = f;
      if (type === 'super2') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1);
      if (type === 'super3') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1) + '3';
      return setObj[fieldName] || '';
    };

    const targetVal = (f) => {
      let fieldName = f;
      if (type === 'super2') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1);
      if (type === 'super3') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1) + '3';
      return setObj['target' + fieldName.charAt(0).toUpperCase() + fieldName.slice(1)];
    };
    
    const update = (f, v) => {
      let fieldName = f;
      if (type === 'super2') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1);
      if (type === 'super3') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1) + '3';

      if (isDrop) updateDropSet(item.id, setObj._parentId, dropId, fieldName, v, setObj._targetArray || 'dropSets');
      else updateSet(item.id, setObj.id, fieldName, v);
    };

    let prevRecordText = null;
    const currentWeight = val('weight');
    
    if (!isCardio && currentWeight !== '' && exerciseHistoryMap) {
       const targetExName = type === 'super2' ? item.superExerciseName : type === 'super3' ? item.superExerciseName3 : item.exerciseName;
       if (targetExName && exerciseHistoryMap[targetExName]) {
          const pastRecords = exerciseHistoryMap[targetExName];
          for (let record of pastRecords) {
             const checkS = record.set;
             const pastType = record.type;
             const w = pastType === 'super2' ? checkS.superWeight : pastType === 'super3' ? checkS.superWeight3 : checkS.weight;
             
             if (String(w) === String(currentWeight) && w !== '' && w !== undefined) {
                 const pDate = formatDateWithDay(record.date);
                 if (wType === 'lr') {
                    const l = pastType === 'super2' ? checkS.superLReps : pastType === 'super3' ? checkS.superLReps3 : checkS.lReps;
                    const r = pastType === 'super2' ? checkS.superRReps : pastType === 'super3' ? checkS.superRReps3 : checkS.rReps;
                    prevRecordText = `前回${pDate}: L${l||0}/R${r||0}回`;
                 } else {
                    const r = pastType === 'super2' ? checkS.superReps : pastType === 'super3' ? checkS.superReps3 : checkS.reps;
                    prevRecordText = `前回${pDate}: ${r||0}回`;
                 }
                 break;
             }
          }
       }
    }

    let inputContent = null;
    if (isCardio) {
      inputContent = (
        <div className="flex-1 flex gap-2 min-w-0">
           <input type="number" inputMode="decimal" value={val('distance')} onChange={(e) => update('distance', e.target.value)} placeholder="距離(km)" className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
           <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('time')} onChange={(e) => update('time', e.target.value)} placeholder="時間(分)" className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
           <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('calories')} onChange={(e) => update('calories', e.target.value)} placeholder="kcal" className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
        </div>
      );
    } else {
      const weightInputType = wType === 'bodyWeight' ? "text" : "number";
      const weightInputMode = wType === 'bodyWeight' ? "text" : "decimal";

      inputContent = (
        <div className="flex-1 flex gap-1.5 min-w-0">
          {isLR ? (
            <>
              <input type={weightInputType} inputMode={weightInputMode} value={val('weight')} onChange={(e) => update('weight', e.target.value)} placeholder={getWeightPlaceholder(wType)} className="w-[48px] sm:w-[60px] shrink-0 text-center text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-emerald-500 py-1.5 px-0" style={{ fontSize: '16px' }}/>
              <div className="flex flex-1 items-center gap-0.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded px-1 min-w-0">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">L:</span>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('lReps')} onChange={(e) => update('lReps', e.target.value)} placeholder={targetVal('lReps') || "0"} className="w-full text-center text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none min-w-0 px-0" style={{ fontSize: '16px' }}/>
              </div>
              <div className="flex flex-1 items-center gap-0.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded px-1 min-w-0">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">R:</span>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('rReps')} onChange={(e) => update('rReps', e.target.value)} placeholder={targetVal('rReps') || "0"} className="w-full text-center text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none min-w-0 px-0" style={{ fontSize: '16px' }}/>
              </div>
            </>
          ) : (
            <>
              <input type={weightInputType} inputMode={weightInputMode} value={val('weight')} onChange={(e) => update('weight', e.target.value)} placeholder={getWeightPlaceholder(wType)} className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-1.5 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-sm" style={{ fontSize: '16px' }}/>
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('reps')} onChange={(e) => update('reps', e.target.value)} placeholder={targetVal('reps') || "回数"} className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-1.5 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-sm" style={{ fontSize: '16px' }}/>
            </>
          )}
          {item.isForcedReps && (
            <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('forcedReps')} onChange={(e) => update('forcedReps', e.target.value)} placeholder="+補" className="w-10 shrink-0 text-center text-sm font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded focus:outline-none focus:border-rose-500 py-1.5 px-0" style={{ fontSize: '16px' }}/>
          )}
        </div>
      );
    }

    let rmText = null;
    if (!isCardio && currentWeight && wType !== 'bodyWeight') {
      const currentReps = isLR ? Math.max(Number(val('lReps'))||0, Number(val('rReps'))||0) : (Number(val('reps'))||0);
      const wNum = Number(currentWeight);
      if (wNum > 0 && currentReps > 0) {
        const rm = Math.round((wNum * (1 + currentReps / 40)) * 10) / 10;
        rmText = `推定1RM: ${rm}kg`;
      }
    }

    return (
      <div className="flex-1 flex flex-col min-w-0">
         {inputContent}
         {(prevRecordText || rmText) && (
            <div className="flex justify-between items-center mt-1 px-1">
               <div className="text-[10px] text-slate-400 font-bold">
                  {rmText}
               </div>
               <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-right ml-auto">
                  {prevRecordText}
               </div>
            </div>
         )}
      </div>
    );
  };

  const isConfirmed = item.isConfirmed;

  return (
    <div {...dragHandleProps} className={`${isConfirmed ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-2 border-emerald-400 dark:border-emerald-600' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'} rounded-2xl p-4 shadow-sm relative w-full overflow-visible mb-6 transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-auto'}`} onClickCapture={() => onActive && onActive(item.exerciseName)}>
      {isConfirmed && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl shadow-sm z-10 flex items-center gap-1">
          <CheckCircle size={12} /> 保存済み
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <div className={`flex flex-col flex-1 min-w-0 gap-2 ${isConfirmed ? 'pointer-events-none opacity-60' : ''}`}>
            {!isJointPartner && !isAnyDragging && (
              <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg gap-1">
                <button type="button" onClick={() => toggleFilter('gym')} disabled={isConfirmed} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilters.includes('gym') ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>マシン等</button>
                <button type="button" onClick={() => toggleFilter('barbell')} disabled={isConfirmed} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilters.includes('barbell') ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>バーベル</button>
                <button type="button" onClick={() => toggleFilter('dumbbell')} disabled={isConfirmed} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilters.includes('dumbbell') ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>ダンベル</button>
                <button type="button" onClick={() => toggleFilter('smith')} disabled={isConfirmed} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilters.includes('smith') ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>スミス</button>
              </div>
            )}
            {!isJointPartner ? (
              <ExerciseSearchSelect
                value={item.exerciseName || ''}
                onChange={(newName) => updateExerciseName(newName, 0)}
                filteredExercises={filteredExercises}
                allGymExercises={filteredAllGymExercises}
                exerciseUsageCount={exerciseUsageCount}
                lastExerciseSummaryMap={lastExerciseSummaryMap}
                disabled={isConfirmed}
                placeholder="種目名を検索・サジェストから選択..."
              />
            ) : (
              <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold text-base">
                {item.exerciseName || "種目未選択"}
              </div>
            )}
          </div>
        </div>
        {!isJointPartner && (
          <button onClick={() => removeItem(item.id)} disabled={isConfirmed} className={`ml-2 text-slate-400 hover:text-rose-500 p-2 flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors mt-2 ${isConfirmed ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}><Trash2 size={18} /></button>
        )}
      </div>

      <div className={`transition-all overflow-visible ${isAnyDragging ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'}`}>
        <div className={`transition-all duration-300 ${isConfirmed ? 'pointer-events-none opacity-60 select-none' : ''}`}>
      {prevRecord && !isJointPartner && (
        <div className="mb-4 pl-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Clock size={12}/>前回 ({formatDateWithDay(prevRecord.date)})</span>
            <button
              type="button"
              onClick={handleCopyPrevRecord}
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 transition-colors"
            >
              <Copy size={10} /> 前回セットを反映
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {prevRecord.sets.map((s, i) => (
               <span key={i} className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {prevRecord.weightType === 'cardio' ? 
                    `${s.distance||0}km / ${s.time||0}分` : 
                    `${s.weight||0}${prevRecord.weightType === 'plate' ? '枚' : 'kg'} x ${s.reps||Math.max(s.lReps||0, s.rReps||0)}回`
                  }
               </span>
            ))}
          </div>
        </div>
      )}

      {item.weightType !== 'cardio' && (
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide py-1 pl-8">
          <button onClick={() => updateItem(item.id, { isSuperSet: !item.isSuperSet })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isSuperSet ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>スーパー</button>
          <button onClick={() => updateItem(item.id, { isDropSet: !item.isDropSet })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isDropSet ? 'bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>ドロップ</button>
          <button onClick={() => updateItem(item.id, { isForcedReps: !item.isForcedReps })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isForcedReps ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>補助</button>
        </div>
      )}

      {item.isSuperSet && item.weightType !== 'cardio' && (
        <div className="mb-5 pl-6 border-l-2 border-indigo-300 dark:border-indigo-600 space-y-3">
          {!isJointPartner ? (
            <ExerciseSearchSelect
              value={item.superExerciseName || ''}
              onChange={(newName) => updateExerciseName(newName, 2)}
              filteredExercises={filteredExercises}
              allGymExercises={filteredAllGymExercises}
              exerciseUsageCount={exerciseUsageCount}
              lastExerciseSummaryMap={lastExerciseSummaryMap}
              placeholder="スーパーセット (2種目目) を検索..."
              isSuperSetSelect={true}
              excludeCardio={true}
            />
          ) : (
            <div className="w-full bg-indigo-50/30 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold text-base">
              {item.superExerciseName || "スーパーセット種目"}
            </div>
          )}
          
          {!isJointPartner ? (
            item.superExerciseName && (
              <ExerciseSearchSelect
                value={item.superExerciseName3 || ''}
                onChange={(newName) => updateExerciseName(newName, 3)}
                filteredExercises={filteredExercises}
                allGymExercises={filteredAllGymExercises}
                exerciseUsageCount={exerciseUsageCount}
                lastExerciseSummaryMap={lastExerciseSummaryMap}
                placeholder="ジャイアントセット (3種目目・任意) を検索..."
                isSuperSetSelect={true}
                excludeCardio={true}
                allowEmptyOption={true}
                emptyOptionLabel="3種目目を設定しない（解除）"
              />
            )
          ) : (
            item.superExerciseName3 && (
              <div className="w-full bg-indigo-50/30 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold text-base">
                {item.superExerciseName3}
              </div>
            )
          )}
        </div>
      )}

      <div className="space-y-2 mb-4 w-full pl-0">
        <div className="flex text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1 mb-1 pl-6">
          <div className="w-6 text-center shrink-0">Set</div>
          <div className="flex-1 text-center min-w-0">記録</div>
          <div className="w-6 shrink-0"></div>
        </div>
        
        {item.sets && Array.isArray(item.sets) && item.sets.map((set, sIndex) => (
          <div key={set.id} 
            ref={(el) => (setRefs.current[sIndex] = el)}
            draggable={draggableSetId === set.id}
            onDragStart={(e) => handleDragStart(e, sIndex)}
            onDragOver={(e) => handleDragOver(e, sIndex)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, sIndex)}
            onDragEnd={handleDragEnd}
            className={`bg-slate-50/50 dark:bg-slate-950/50 p-2 rounded-xl border transition-all relative ${draggedSetIndex === sIndex ? (dragOverSetIndex === sIndex ? 'opacity-70 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'opacity-40 border-dashed border-slate-300 dark:border-slate-600') : 'border-slate-100 dark:border-slate-800'} ${draggedSetIndex !== null ? 'space-y-0' : 'space-y-2'}`}
          >
            {dragOverSetIndex === sIndex && draggedSetIndex !== sIndex && <div className={`absolute left-0 w-full h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse ${draggedSetIndex < dragOverSetIndex ? '-bottom-1.5' : '-top-1.5'}`} />}
            <div className="flex items-center gap-1.5">
              <div 
                 className={`cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 p-1 -ml-1 shrink-0 touch-none ${isJointPartner ? 'hidden' : ''}`}
                 onMouseEnter={() => setDraggableSetId(set.id)}
                 onMouseLeave={() => setDraggableSetId(null)}
                 onTouchStart={(e) => handleTouchStart(e, sIndex)}
                 onTouchMove={handleTouchMove}
                 onTouchEnd={handleTouchEnd}
                 onTouchCancel={handleTouchEnd}
              >
                <GripVertical size={16} />
              </div>
              <div className="w-5 text-center text-slate-400 dark:text-slate-500 font-bold text-xs shrink-0">{sIndex + 1}</div>
              
              {draggedSetIndex !== null ? (
                <div className="flex-1 text-sm font-bold text-slate-500 dark:text-slate-400 py-1">SET {sIndex + 1}</div>
              ) : (
                <>
                  {renderInputRow(set, item.weightType, 'main', false)}
                  {!isJointPartner && <button onClick={() => removeSet(item.id, set.id)} disabled={item.sets.length === 1} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 disabled:opacity-30 flex justify-center"><X size={18} /></button>}
                </>
              )}
            </div>

            {draggedSetIndex === null && (
              <>
                {item.isDropSet && item.weightType !== 'cardio' && set.dropSets && set.dropSets.map(ds => (
                  <div key={ds.id} className="border-l-2 border-orange-200 dark:border-orange-800 pl-2 flex items-center gap-1.5 ml-3 mt-2">
                    <TrendingDown size={14} className="text-orange-400 flex-shrink-0" />
                    {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'dropSets' }, item.weightType, 'main', true, ds.id)}
                    <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'dropSets')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={16} /></button>
                  </div>
                ))}

                {item.isDropSet && item.weightType !== 'cardio' && (
                  <button onClick={() => addDropSet(item.id, set.id, 'dropSets')} className="ml-5 mt-2 text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1 w-max"><Plus size={10}/>ドロップ追加</button>
                )}

                {item.isSuperSet && item.superExerciseName && item.weightType !== 'cardio' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 pl-2 border-l-2 border-indigo-300 dark:border-indigo-700 ml-1">
                      <Zap size={14} className="text-indigo-400 flex-shrink-0" />
                      {renderInputRow(set, item.superWeightType || 'total', 'super2', false)}
                      <div className="w-6 shrink-0"></div>
                    </div>
                    
                    {item.isDropSet && set.dropSets && !set.superDropSets && set.dropSets.map(ds => (
                      ds.superWeight !== undefined ? (
                      <div key={`super2-old-ds-${ds.id}`} className="flex items-center gap-1.5 pl-4 border-l-2 border-orange-300 dark:border-orange-700 ml-4 mt-2">
                        <TrendingDown size={12} className="text-orange-400 flex-shrink-0" />
                        {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'dropSets' }, item.superWeightType || 'total', 'super2', true, ds.id)}
                        <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'dropSets')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={16} /></button>
                      </div>
                      ) : null
                    ))}
                    
                    {item.isDropSet && set.superDropSets && set.superDropSets.map(ds => (
                      <div key={`super2-ds-${ds.id}`} className="flex items-center gap-1.5 pl-4 border-l-2 border-orange-300 dark:border-orange-700 ml-4 mt-2">
                        <TrendingDown size={12} className="text-orange-400 flex-shrink-0" />
                        {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'superDropSets' }, item.superWeightType || 'total', 'super2', true, ds.id)}
                        <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'superDropSets')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={16} /></button>
                      </div>
                    ))}
                    
                    {item.isDropSet && (
                      <button onClick={() => addDropSet(item.id, set.id, 'superDropSets')} className="ml-8 mt-1 text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1 w-max"><Plus size={10}/>ドロップ追加</button>
                    )}
                  </div>
                )}
                
                {item.isSuperSet && item.superExerciseName3 && item.weightType !== 'cardio' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 pl-2 border-l-2 border-indigo-300 dark:border-indigo-700 ml-1">
                      <Zap size={14} className="text-indigo-400 flex-shrink-0" />
                      {renderInputRow(set, item.superWeightType3 || 'total', 'super3', false)}
                      <div className="w-6 shrink-0"></div>
                    </div>
                    
                    {item.isDropSet && set.dropSets && !set.superDropSets3 && set.dropSets.map(ds => (
                      ds.superWeight3 !== undefined ? (
                      <div key={`super3-old-ds-${ds.id}`} className="flex items-center gap-1.5 pl-4 border-l-2 border-orange-300 dark:border-orange-700 ml-4 mt-2">
                        <TrendingDown size={12} className="text-orange-400 flex-shrink-0" />
                        {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'dropSets' }, item.superWeightType3 || 'total', 'super3', true, ds.id)}
                        <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'dropSets')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={16} /></button>
                      </div>
                      ) : null
                    ))}
                    
                    {item.isDropSet && set.superDropSets3 && set.superDropSets3.map(ds => (
                      <div key={`super3-ds-${ds.id}`} className="flex items-center gap-1.5 pl-4 border-l-2 border-orange-300 dark:border-orange-700 ml-4 mt-2">
                        <TrendingDown size={12} className="text-orange-400 flex-shrink-0" />
                        {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'superDropSets3' }, item.superWeightType3 || 'total', 'super3', true, ds.id)}
                        <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'superDropSets3')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={16} /></button>
                      </div>
                    ))}
                    
                    {item.isDropSet && (
                      <button onClick={() => addDropSet(item.id, set.id, 'superDropSets3')} className="ml-8 mt-1 text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1 w-max"><Plus size={10}/>ドロップ追加</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {!isJointPartner && (
      <button onClick={() => addSet(item.id)} className="w-full py-3 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-4 bg-white dark:bg-slate-900">
        <Plus size={18} /> セットを追加
      </button>
      )}

      <div>
        <textarea value={item.memo || ''} onChange={(e) => updateItem(item.id, { memo: e.target.value })} placeholder="種目ごとのメモ（オプション）" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none" style={{ fontSize: '16px' }} rows={2} />
      </div>
      </div>
      
      {!isJointPartner && (
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            if (!item.isConfirmed) {
              if (!item.exerciseName) {
                alert("種目を選択してください。");
                return;
              }
              const isCardio = item.weightType === 'cardio';
              const isLR = item.weightType === 'lr';
              const isBodyWeight = item.weightType === 'bodyWeight';
              
              for (let i = 0; i < item.sets.length; i++) {
                const set = item.sets[i];
                if (isCardio) {
                  if (!set.distance && !set.time && !set.calories) {
                    alert(`セット${i + 1}の入力が不十分です（距離、時間、カロリーのいずれかを入力してください）。`);
                    return;
                  }
                } else if (isLR) {
                  if ((set.weight === '' && !isBodyWeight) || (set.lReps === '' && set.rReps === '')) {
                    alert(`セット${i + 1}の入力が不十分です（重量と左右どちらかの回数を入力してください）。`);
                    return;
                  }
                } else {
                  if ((set.weight === '' && !isBodyWeight) || set.reps === '') {
                    alert(`セット${i + 1}の入力が不十分です（重量と回数を入力してください）。`);
                    return;
                  }
                }
              }
            }
            updateItem(item.id, { isConfirmed: !item.isConfirmed });
          }}
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
            isConfirmed
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-800/60'
          }`}
        >
          {isConfirmed ? <><Edit2 size={18} /> 編集に戻す</> : <><CheckCircle size={18} /> この種目を確定する</>}
        </button>
      </div>
      )}

      </div>
    </div>
  );
}

// --- 種目並び替えモーダル ---
function ReorderItemsModal({ items, onClose, onSave }) {
  const [localItems, setLocalItems] = useState([...items]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const itemRefs = useRef([]);

  const moveUp = (idx) => {
    if (idx === 0) return;
    const newItems = [...localItems];
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    setLocalItems(newItems);
  };
  const moveDown = (idx) => {
    if (idx === localItems.length - 1) return;
    const newItems = [...localItems];
    [newItems[idx + 1], newItems[idx]] = [newItems[idx], newItems[idx + 1]];
    setLocalItems(newItems);
  };

  const handleDragStart = (e, idx) => {
    document.body.style.overflow = 'hidden';
    setDraggedIdx(idx);
    setDragOverIdx(idx);
  };
  
  const handleDragMove = (e) => {
    if (draggedIdx === null) return;
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (!y) return;
    let overIdx = dragOverIdx;
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (y > rect.top && y < rect.bottom) {
        overIdx = idx;
      }
    });
    if (overIdx !== null && overIdx !== dragOverIdx) {
      setDragOverIdx(overIdx);
    }
  };

  const handleDragEnd = () => {
    document.body.style.overflow = '';
    if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
      const newItems = [...localItems];
      const [dragged] = newItems.splice(draggedIdx, 1);
      newItems.splice(dragOverIdx, 0, dragged);
      setLocalItems(newItems);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  useEffect(() => {
    if (draggedIdx !== null) {
      const handleGlobalMouseMove = (e) => handleDragMove(e);
      const handleGlobalMouseUp = () => handleDragEnd();
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [draggedIdx, dragOverIdx, localItems]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><ArrowUp size={18}/><ArrowDown size={18} className="-ml-2"/> 種目の並び替え</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2 flex-1 relative">
          {localItems.map((item, idx) => {
            const isDragged = draggedIdx === idx;
            const isDragOver = dragOverIdx === idx && draggedIdx !== idx;
            return (
            <div key={item.id}
              ref={el => itemRefs.current[idx] = el}
              className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border transition-all relative ${isDragged ? 'border-emerald-500 opacity-60 scale-[0.98]' : 'border-slate-200 dark:border-slate-800'}`}
            >
               {isDragOver && <div className={`absolute left-0 w-full h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse ${draggedIdx < dragOverIdx ? '-bottom-1' : '-top-1'}`} />}
               <div 
                 className={`cursor-grab active:cursor-grabbing p-2 -ml-2 touch-none ${isDragged ? 'text-emerald-500' : 'text-slate-400'}`}
                 onTouchStart={(e) => handleDragStart(e, idx)}
                 onTouchMove={handleDragMove}
                 onTouchEnd={handleDragEnd}
                 onTouchCancel={handleDragEnd}
                 onMouseDown={(e) => { e.preventDefault(); handleDragStart(e, idx); }}
               >
                 <GripVertical size={18}/>
               </div>
               <div className="flex-1 font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{item.exerciseName || '未選択'}</div>
               <div className="flex gap-1">
                 <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-300 transition-colors"><ArrowUp size={16}/></button>
                 <button onClick={() => moveDown(idx)} disabled={idx === localItems.length - 1} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-300 transition-colors"><ArrowDown size={16}/></button>
               </div>
            </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
           <button onClick={() => onSave(localItems)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-sm">完了</button>
        </div>
      </div>
    </div>
  );
}

// --- 編集モーダル ---
function EditWorkoutModal({ post, gyms, exercises, onClose, onSave, myPastPosts }) {
  const safeItems = post.items ? JSON.parse(JSON.stringify(post.items)) : [];
  const [workoutItems, setWorkoutItems] = useState(safeItems);
  const [showReorderModal, setShowReorderModal] = useState(false);
  
  const [editDate, setEditDate] = useState(formatDateFromTimestamp(post.startTime || post.timestamp));
  const [editStartTime, setEditStartTime] = useState(formatTimeFromTimestamp(post.startTime || post.timestamp));
  const [editEndTime, setEditEndTime] = useState(formatTimeFromTimestamp(post.endTime || post.timestamp));
  const [editBodyWeight, setEditBodyWeight] = useState(post.bodyWeight || '');
  const [editBodyFat, setEditBodyFat] = useState(post.bodyFat || '');
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const cats = new Set();
    safeItems.forEach(it => { if (it.category) cats.add(it.category); });
    return Array.from(cats);
  });

  const toggleCategory = (cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const ensureCategory = (cat) => {
    if (!cat) return;
    setSelectedCategories(prev => prev.includes(cat) ? prev : [...prev, cat]);
  };

  const allGymExercises = useMemo(() => {
    return exercises.filter(ex => {
      const gym = gyms.find(g => g.name === post.gymName);
      const isGymMatch = gym ? (ex.gymId === gym.id || ex.gymId === 'common') : true;
      if (!isGymMatch) return false;
      if (ex.gymId === 'common') {
        if (ex.author && ex.author !== post.author && ex.author !== MASTER_USER) return false;
      } else {
        const exGym = gyms.find(g => g.id === ex.gymId);
        if (exGym && ex.author && ex.author !== exGym.owner && ex.author !== post.author && ex.author !== MASTER_USER) return false;
      }
      return true;
    });
  }, [exercises, gyms, post.gymName, post.author]);

  const availableExercises = useMemo(() => {
    if (selectedCategories.length === 0) return allGymExercises;
    return allGymExercises.filter(ex => selectedCategories.includes(ex.category || 'その他'));
  }, [allGymExercises, selectedCategories]);

  const updateItem = (itemId, data) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, ...data } : item));
  
  const addExerciseItem = (insertAfterIndex = null) => {
    const newItem = { id: generateId(), exerciseName: '', weightType: 'total', category: selectedCategories[0] || 'その他', isSuperSet: false, isDropSet: false, isForcedReps: false, memo: '', sets: [{ id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }] };
    if (insertAfterIndex !== null) {
      const newItems = [...workoutItems];
      newItems.splice(insertAfterIndex + 1, 0, newItem);
      setWorkoutItems(newItems);
      setTimeout(() => {
         const container = document.getElementById('edit-workout-items-container');
         if (container) {
            const cardWidth = container.children[0].offsetWidth;
            container.scrollTo({ left: (insertAfterIndex + 1) * (cardWidth + 12), behavior: 'smooth' });
         }
      }, 100);
    } else {
      setWorkoutItems([...workoutItems, newItem]);
    }
  };
  const removeExerciseItem = (itemId) => setWorkoutItems(workoutItems.filter(item => item.id !== itemId));
  const addSet = (itemId) => { setWorkoutItems(prev => prev.map(item => { if (item.id === itemId) { const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : { weight: '', reps: '', lReps: '', rReps: '' }; return { ...item, sets: [...(item.sets || []), { id: generateId(), weight: lastSet.weight || '', reps: lastSet.reps || '', lReps: lastSet.lReps || '', rReps: lastSet.rReps || '', dropSets: lastSet.dropSets ? lastSet.dropSets.map(ds => ({...ds, id: generateId()})) : undefined, superDropSets: lastSet.superDropSets ? lastSet.superDropSets.map(ds => ({...ds, id: generateId()})) : undefined, superDropSets3: lastSet.superDropSets3 ? lastSet.superDropSets3.map(ds => ({...ds, id: generateId()})) : undefined }]}; } return item; })); };
  const removeSet = (itemId, setId) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, sets: (item.sets || []).filter(set => set.id !== setId) } : item));
  const reorderSet = (itemId, dragIndex, dropIndex) => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; const newSets = [...(item.sets || [])]; const [dragged] = newSets.splice(dragIndex, 1); newSets.splice(dropIndex, 0, dragged); return { ...item, sets: newSets }; })); };
  const updateSetField = (itemId, setId, field, value) => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: (item.sets || []).map(set => set.id === setId ? { ...set, [field]: value } : set) }; })); };

  const addDropSet = (itemId, parentSetId, targetArray = 'dropSets') => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, [targetArray]: [...(set[targetArray] || []), { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]}; })}; })); }
  const removeDropSet = (itemId, parentSetId, dropId, targetArray = 'dropSets') => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, [targetArray]: (set[targetArray] || []).filter(ds => ds.id !== dropId) }; })}; })); }
  const updateDropSetField = (itemId, parentSetId, dropId, field, value, targetArray = 'dropSets') => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, [targetArray]: (set[targetArray] || []).map(ds => ds.id === dropId ? { ...ds, [field]: value } : ds) }; })}; })); }


  const handleSave = () => {
    const isValid = workoutItems.every(item => {
      if (!item.exerciseName || !item.sets || item.sets.length === 0) return false;
      if (item.weightType === 'cardio') return item.sets.every(set => set.distance !== '' || set.time !== '' || set.calories !== '');
      if (item.weightType === 'lr') return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.lReps !== '' || set.rReps !== ''));
      return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.reps !== '' || set.forcedReps));
    });
    if (!isValid || workoutItems.length === 0) { alert("種目を選択し、すべての重量と回数を入力してください。"); return; }

    const newStartTimestamp = new Date(`${editDate}T${editStartTime}`).getTime();
    const newEndTimestamp = new Date(`${editDate}T${editEndTime}`).getTime();
    const duration = newEndTimestamp - newStartTimestamp;

    onSave(post.id, {
      items: workoutItems,
      bodyWeight: editBodyWeight ? Number(editBodyWeight) : null,
      bodyFat: editBodyFat ? Number(editBodyFat) : null,
      startTime: isNaN(newStartTimestamp) ? post.startTime : newStartTimestamp,
      endTime: isNaN(newEndTimestamp) ? post.endTime : newEndTimestamp,
      duration: (duration > 0 && !isNaN(duration)) ? duration : post.duration,
      timestamp: isNaN(newEndTimestamp) ? post.timestamp : newEndTimestamp,
      date: isNaN(newEndTimestamp) ? post.date : new Date(newEndTimestamp).toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-slate-950 rounded-t-3xl flex flex-col h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pt-safe sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">記録の編集</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div id="edit-modal-scroll-container" className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Settings size={16} className="text-slate-400" /> トレーニング情報
            </h3>
            
            <div className="space-y-4">
              <FormInput label="日付" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
              
              <div className="flex gap-2 sm:gap-3 w-full">
                <FormInput label="開始" type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="flex-1" />
                <FormInput label="終了" type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="flex-1" />
              </div>

              <div className="flex gap-2 sm:gap-3">
                <FormInput label="体重" type="number" value={editBodyWeight} onChange={e => setEditBodyWeight(e.target.value)} unit="kg" className="flex-1" />
                <FormInput label="体脂肪率" type="number" value={editBodyFat} onChange={e => setEditBodyFat(e.target.value)} unit="%" className="flex-1" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2 mt-4">
            <h3 className="font-bold text-slate-800 dark:text-white">記録内容</h3>
            {workoutItems.length > 1 && (
              <button onClick={() => setShowReorderModal(true)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-sm">
                <ArrowUp size={14} /><ArrowDown size={14} className="-ml-2" /> 並び替え
              </button>
            )}
          </div>
          <CategoryFilterGrid selectedCategories={selectedCategories} toggleCategory={toggleCategory} />

          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          <div id="edit-workout-items-container" className="flex overflow-x-auto gap-3 sm:gap-4 pb-6 pt-5 -mx-4 px-4 hide-scrollbar items-start snap-x snap-mandatory">
            {workoutItems.length === 0 ? (
              <div className="snap-center shrink-0 w-[88%] sm:w-[320px] flex flex-col justify-center h-full min-h-[200px]">
                <button onClick={() => addExerciseItem(null)} className="w-full py-8 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-bold flex flex-col items-center justify-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm"><ListPlus size={24} className="text-emerald-500" /></div>
                  <span>種目を追加</span>
                </button>
              </div>
            ) : (
              workoutItems.map((item, index) => (
                 <div key={item.id} className="snap-center shrink-0 w-[88%] sm:w-[320px] relative">
                    <WorkoutItemForm 
                      item={item} 
                      index={index}
                      availableExercises={availableExercises}
                      allGymExercises={allGymExercises}
                      onEnsureCategory={ensureCategory}
                      updateItem={updateItem} 
                      removeItem={removeExerciseItem}
                      addSet={addSet} 
                      removeSet={removeSet} 
                      updateSet={updateSetField} 
                      addDropSet={addDropSet} 
                      removeDropSet={removeDropSet} 
                      updateDropSet={updateDropSetField}
                      reorderSet={reorderSet}
                      myPastPosts={myPastPosts}
                      isDragging={false}
                      isAnyDragging={false}
                      dragHandleProps={{}}
                    />
                    <button onClick={() => addExerciseItem(index)} className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm -mt-2">
                      <ListPlus size={16} className="text-emerald-500" />
                      <span>この次に種目を追加</span>
                    </button>
                 </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
          <button onClick={handleSave} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-md transition-all shadow-emerald-500/30">
            変更を保存
          </button>
        </div>
      </div>
      {showReorderModal && (
        <ReorderItemsModal 
          items={workoutItems} 
          onClose={() => setShowReorderModal(false)} 
          onSave={(newItems) => { setWorkoutItems(newItems); setShowReorderModal(false); }}
        />
      )}
    </div>
  );
}

export {
  ExerciseSearchSelect,
  WorkoutItemForm,
  ReorderItemsModal,
  EditWorkoutModal
};