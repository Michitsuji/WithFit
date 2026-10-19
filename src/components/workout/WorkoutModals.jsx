// ============================================================================
// WithFit v2 - ワークアウト関連モーダル群
// ReorderItemsModal / ProgramGeneratorModal / ActiveProgramDisplay / EditWorkoutModal
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUp, ArrowDown, GripVertical, X, Target, AlignLeft, Trash2,
  CheckCircle, Zap, Plus, Settings, ListPlus
} from 'lucide-react';
import { IconButton, FormInput, CategoryFilterGrid } from '../common/UI';
import WorkoutItemForm from './WorkoutItemForm';
import { PROG_INFO } from '../../constants';
import { MASTER_USER } from '../../config/firebase';
import { generateId, formatDateFromTimestamp, formatTimeFromTimestamp } from '../../utils/helpers';

export function ReorderItemsModal({ items, onClose, onSave }) {
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
      if (y > rect.top && y < rect.bottom) overIdx = idx;
    });
    if (overIdx !== null && overIdx !== dragOverIdx) setDragOverIdx(overIdx);
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
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ArrowUp size={18} className="text-emerald-500" /><ArrowDown size={18} className="-ml-2 text-emerald-500" /> 種目の並び替え
          </h3>
          <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={onClose} />
        </div>
        <div className="p-4 overflow-y-auto space-y-2 flex-1 relative">
          {localItems.map((item, idx) => {
            const isDragged = draggedIdx === idx;
            const isDragOver = dragOverIdx === idx && draggedIdx !== idx;
            return (
              <div
                key={item.id}
                ref={el => itemRefs.current[idx] = el}
                className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border transition-all relative ${
                  isDragged ? 'border-emerald-500 opacity-60 scale-[0.98]' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {isDragOver && (
                  <div className={`absolute left-0 w-full h-1 bg-emerald-500 rounded-full z-10 ${draggedIdx < dragOverIdx ? '-bottom-1' : '-top-1'}`} />
                )}
                <div
                  className={`cursor-grab active:cursor-grabbing p-1.5 -ml-1 touch-none ${isDragged ? 'text-emerald-500' : 'text-slate-400'}`}
                  onTouchStart={(e) => handleDragStart(e, idx)}
                  onTouchMove={handleDragMove}
                  onTouchEnd={handleDragEnd}
                  onTouchCancel={handleDragEnd}
                  onMouseDown={(e) => { e.preventDefault(); handleDragStart(e, idx); }}
                >
                  <GripVertical size={18} />
                </div>
                <div className="flex-1 font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                  {idx + 1}. {item.exerciseName || '未選択'}
                </div>
                <div className="flex gap-1">
                  <IconButton icon={<ArrowUp size={15} />} variant="default" size="sm" onClick={() => moveUp(idx)} disabled={idx === 0} className="bg-slate-200/70 dark:bg-slate-800" />
                  <IconButton icon={<ArrowDown size={15} />} variant="default" size="sm" onClick={() => moveDown(idx)} disabled={idx === localItems.length - 1} className="bg-slate-200/70 dark:bg-slate-800" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onSave(localItems)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold py-3 rounded-xl transition-all shadow-sm"
          >
            並び替えを適用
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProgramGeneratorModal({ isOpen, onClose, onGenerate }) {
  const [progType, setProgType] = useState('HPS');
  const [exName, setExName] = useState('ベンチプレス');
  const [oneRM, setOneRM] = useState('');

  if (!isOpen) return null;

  const big3Exercises = ['ベンチプレス', 'スクワット', 'デッドリフト'];
  const info = PROG_INFO[progType];
  const targetWeight = oneRM && !isNaN(oneRM) ? Math.round(Number(oneRM) * info.mult) : '-';

  const handleGenerate = () => {
    if (!oneRM || isNaN(oneRM)) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: '現在の1RM（最大重量）を入力してください' } }));
      return;
    }
    onGenerate(progType, exName, Number(oneRM));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target size={18} className="text-indigo-500" /> プログラム自動作成
          </h3>
          <IconButton icon={<X size={16} />} variant="close" size="sm" onClick={onClose} />
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">プログラムの種類</label>
            <div className="relative">
              <select value={progType} onChange={e => setProgType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-indigo-500 text-sm">
                <option value="HPS">HPSトレーニング (全6週・週3回)</option>
                <option value="SMOLOV">Smolov Jr. (全3週・週4回)</option>
                <option value="WENDLER">5/3/1プログラム (全4週・週1回)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
            </div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1.5">{info.name} とは？</h4>
            <p className="text-xs text-indigo-600/90 dark:text-indigo-300/90 leading-relaxed font-bold">{info.desc}</p>
            <div className="mt-3 pt-2.5 border-t border-indigo-200/50 dark:border-indigo-800/50 flex flex-col gap-1">
              <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex justify-between">
                <span>期待される向上率:</span> <span>{info.upRate}</span>
              </p>
              <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex justify-between">
                <span>完了時の目標重量:</span> <span>{targetWeight} kg</span>
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">対象の種目</label>
            <div className="relative">
              <select value={exName} onChange={e => setExName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-indigo-500 text-sm">
                {big3Exercises.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
            </div>
          </div>
          <FormInput label="現在の1RM (MAX重量)" type="number" value={oneRM} onChange={e => setOneRM(e.target.value)} placeholder="例: 100" unit="kg" />
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!oneRM}
            className="w-full bg-indigo-500 hover:bg-indigo-600 active:scale-98 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-md transition-all"
          >
            {info.weeks}週間のプログラムを作成
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActiveProgramDisplay({ program, onApply, onToggleComplete, onDelete }) {
  const [expandedWeek, setExpandedWeek] = useState(() => {
    if (!program || !program.schedule) return 1;
    const maxWeek = PROG_INFO[program.type]?.weeks || 6;
    for (let w = 1; w <= maxWeek; w++) {
      const weekDays = program.schedule.filter(s => s.week === w);
      if (weekDays.length > 0 && weekDays.some(d => !d.completed)) return w;
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
      <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-base">
              {program.exerciseName}
              <span className="text-xs font-normal opacity-80 ml-1.5">{info.name}</span>
            </h3>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              基準1RM: {program.oneRM} kg <span className="mx-1">|</span> 目標: {Math.round(program.oneRM * info.mult)} kg
            </p>
          </div>
          <div className="flex gap-1">
            <IconButton icon={<AlignLeft size={16} />} variant="indigo" size="sm" onClick={() => setShowInfo(!showInfo)} title="説明" />
            <IconButton icon={<Trash2 size={16} />} variant="danger" size="sm" onClick={() => onDelete(program.id)} title="削除" />
          </div>
        </div>
        {showInfo && (
          <div className="mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-800/50 animate-in fade-in">
            <p className="text-xs font-bold text-indigo-700/90 dark:text-indigo-300/90 leading-relaxed">{info.desc}</p>
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
              <button
                type="button"
                onClick={() => setExpandedWeek(isExpanded ? null : weekNum)}
                className={`p-3.5 flex justify-between items-center transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isWeekCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                    第 {weekNum} 週
                  </span>
                  {isWeekCompleted && <CheckCircle size={14} className="text-emerald-500" />}
                </div>
                <div className="text-slate-400">{isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}</div>
              </button>
              {isExpanded && (
                <div className="p-3 pt-0 space-y-2 bg-slate-50 dark:bg-slate-800/50">
                  {weekDays.map((dayData, dIdx) => (
                    <div key={dayData.id} className={`bg-white dark:bg-slate-900 border ${dayData.completed ? 'border-emerald-200 dark:border-emerald-800/50 opacity-60' : 'border-slate-200 dark:border-slate-700'} rounded-xl p-3 flex flex-col gap-2 transition-all`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleComplete(dayData.id)}
                            className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all active:scale-90 ${dayData.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-400'}`}
                          >
                            <CheckCircle size={12} fill="currentColor" />
                          </button>
                          <span className={`text-xs font-bold ${dayData.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                            Day {dIdx + 1}: {dayData.type}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-extrabold font-mono ${dayData.completed ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                            {dayData.weight}<span className="text-[10px] font-normal mx-0.5">kg</span> × {dayData.reps}<span className="text-[10px] font-normal mx-0.5">回</span> × {dayData.sets}<span className="text-[10px] font-normal ml-0.5">Set</span>
                          </span>
                          {dayData.isAmrap && <div className="text-[10px] font-bold text-amber-500 mt-0.5">最終セット限界まで!</div>}
                        </div>
                      </div>
                      {dayData.advice && !dayData.completed && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                          <p className="text-[10px] font-bold text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed flex gap-1 items-start">
                            <Zap size={12} className="shrink-0 mt-0.5 text-amber-500" />
                            <span>{dayData.advice}</span>
                          </p>
                        </div>
                      )}
                      {!dayData.completed && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => onApply(program, dayData)}
                            className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 active:scale-95 transition-all"
                          >
                            <Plus size={12} /> メニューに追加
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

export function EditWorkoutModal({ post, gyms, exercises, onClose, onSave, myPastPosts }) {
  const safeItems = post.items ? JSON.parse(JSON.stringify(post.items)) : [];
  const [workoutItems, setWorkoutItems] = useState(safeItems);
  const [showReorderModal, setShowReorderModal] = useState(false);

  const [editDate, setEditDate] = useState(formatDateFromTimestamp(post.startTime || post.timestamp));
  const [editStartTime, setEditStartTime] = useState(formatTimeFromTimestamp(post.startTime || post.timestamp));
  const [editEndTime, setEditEndTime] = useState(formatTimeFromTimestamp(post.endTime || post.timestamp));
  const [editBodyWeight, setEditBodyWeight] = useState(post.bodyWeight || '');
  const [editBodyFat, setEditBodyFat] = useState(post.bodyFat || '');
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const cats = new Set((post.items || []).map(i => i.category).filter(Boolean));
    return cats.size > 0 ? Array.from(cats) : ['胸', '背中', '肩', '腕', '脚', '腹筋'];
  });

  const toggleCategory = (cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const availableExercises = exercises.filter(ex => {
    const gym = gyms.find(g => g.name === post.gymName);
    const isGymMatch = gym ? (ex.gymId === gym.id || ex.gymId === 'common') : true;
    if (!isGymMatch) return false;
    if (selectedCategories.length === 0) return false;
    if (ex.gymId === 'common') {
      if (ex.author && ex.author !== post.author && ex.author !== MASTER_USER) return false;
    } else {
      const exGym = gyms.find(g => g.id === ex.gymId);
      if (exGym && ex.author && ex.author !== exGym.owner && ex.author !== post.author && ex.author !== MASTER_USER) return false;
    }
    return selectedCategories.includes(ex.category || 'その他');
  });

  const updateItem = (itemId, data) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, ...data } : item));

  const addExerciseItem = (insertAfterIndex = null) => {
    const defaultEx = availableExercises.length > 0 ? availableExercises[0] : { name: '', weightType: 'total', category: 'その他' };
    const newItem = {
      id: generateId(),
      exerciseName: defaultEx.name,
      weightType: defaultEx.weightType || 'total',
      category: defaultEx.category || 'その他',
      isSuperSet: false, isDropSet: false, isForcedReps: false, memo: '',
      sets: [{ id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]
    };
    if (insertAfterIndex !== null) {
      const newItems = [...workoutItems];
      newItems.splice(insertAfterIndex + 1, 0, newItem);
      setWorkoutItems(newItems);
    } else {
      setWorkoutItems([...workoutItems, newItem]);
    }
  };

  const removeExerciseItem = (itemId) => setWorkoutItems(workoutItems.filter(item => item.id !== itemId));
  const addSet = (itemId) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : { weight: '', reps: '', lReps: '', rReps: '' };
        return {
          ...item,
          sets: [...(item.sets || []), {
            id: generateId(),
            weight: lastSet.weight || '',
            reps: lastSet.reps || '',
            lReps: lastSet.lReps || '',
            rReps: lastSet.rReps || '',
            dropSets: lastSet.dropSets ? lastSet.dropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
            superDropSets: lastSet.superDropSets ? lastSet.superDropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
            superDropSets3: lastSet.superDropSets3 ? lastSet.superDropSets3.map(ds => ({ ...ds, id: generateId() })) : undefined
          }]
        };
      }
      return item;
    }));
  };
  const removeSet = (itemId, setId) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, sets: (item.sets || []).filter(set => set.id !== setId) } : item));
  const reorderSet = (itemId, dragIndex, dropIndex) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newSets = [...(item.sets || [])];
      const [dragged] = newSets.splice(dragIndex, 1);
      newSets.splice(dropIndex, 0, dragged);
      return { ...item, sets: newSets };
    }));
  };
  const updateSetField = (itemId, setId, field, value) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: (item.sets || []).map(set => set.id === setId ? { ...set, [field]: value } : set) };
    }));
  };
  const addDropSet = (itemId, parentSetId, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        sets: item.sets.map(set => set.id !== parentSetId ? set : {
          ...set,
          [targetArray]: [...(set[targetArray] || []), { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]
        })
      };
    }));
  };
  const removeDropSet = (itemId, parentSetId, dropId, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        sets: item.sets.map(set => set.id !== parentSetId ? set : {
          ...set,
          [targetArray]: (set[targetArray] || []).filter(ds => ds.id !== dropId)
        })
      };
    }));
  };
  const updateDropSetField = (itemId, parentSetId, dropId, field, value, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        sets: item.sets.map(set => set.id !== parentSetId ? set : {
          ...set,
          [targetArray]: (set[targetArray] || []).map(ds => ds.id === dropId ? { ...ds, [field]: value } : ds)
        })
      };
    }));
  };

  const handleSave = () => {
    const isValid = workoutItems.every(item => {
      if (!item.exerciseName || !item.sets || item.sets.length === 0) return false;
      if (item.weightType === 'cardio') return item.sets.every(set => set.distance !== '' || set.time !== '' || set.calories !== '');
      if (item.weightType === 'lr') return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.lReps !== '' || set.rReps !== ''));
      return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.reps !== '' || set.forcedReps));
    });
    if (!isValid && workoutItems.length > 0) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "種目を選択し、すべての重量と回数を入力してください。" } }));
      return;
    }

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
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">記録の編集</h2>
          <IconButton icon={<X size={20} />} variant="close" size="sm" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 max-w-md mx-auto w-full">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Settings size={16} className="text-emerald-500" /> 日時・体組成
            </h3>
            <FormInput label="日付" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            <div className="flex gap-3">
              <FormInput label="開始" type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="flex-1" />
              <FormInput label="終了" type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="flex-1" />
            </div>
            <div className="flex gap-3">
              <FormInput label="体重" type="number" value={editBodyWeight} onChange={e => setEditBodyWeight(e.target.value)} unit="kg" className="flex-1" />
              <FormInput label="体脂肪率" type="number" value={editBodyFat} onChange={e => setEditBodyFat(e.target.value)} unit="%" className="flex-1" />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white">種目とセット内容</h3>
            {workoutItems.length > 1 && (
              <button
                type="button"
                onClick={() => setShowReorderModal(true)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 active:scale-95 transition-all"
              >
                <ArrowUp size={14} /><ArrowDown size={14} className="-ml-2" /> 並び替え
              </button>
            )}
          </div>

          <CategoryFilterGrid selectedCategories={selectedCategories} toggleCategory={toggleCategory} />

          <div id="edit-workout-items-container" className="flex overflow-x-auto gap-3 pb-6 pt-2 -mx-4 px-4 hide-scrollbar items-start snap-x snap-mandatory">
            {workoutItems.length === 0 ? (
              <div className="snap-center shrink-0 w-[88%] sm:w-[320px] flex flex-col justify-center min-h-[180px]">
                <button
                  type="button"
                  onClick={() => addExerciseItem(null)}
                  className="w-full py-8 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-bold flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700"
                >
                  <ListPlus size={24} className="text-emerald-500" />
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
                  <button
                    type="button"
                    onClick={() => addExerciseItem(index)}
                    className="w-full py-3 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                  >
                    <ListPlus size={16} className="text-emerald-500" />
                    <span>この次に種目を追加</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSave}
            className="w-full max-w-md mx-auto block bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold py-4 rounded-2xl shadow-md shadow-emerald-500/25 transition-all"
          >
            変更を保存する
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
