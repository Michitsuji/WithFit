import React, { useState, useMemo, useRef } from 'react';
import { GripVertical, Clock, TrendingDown, Zap, Plus, X, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { generateId } from '../../utils/便利関数';
import { formatDateWithDay } from '../../utils/日付ユーティリティ';

export function WorkoutItemForm({ item, index, availableExercises, updateItem, removeItem, addSet, removeSet, updateSet, addDropSet, removeDropSet, updateDropSet, reorderSet, myPastPosts, onActive, isDragging, isAnyDragging, dragHandleProps, isJointPartner = false, currentGymName = "" }) {
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
        // 【修正5】マシン種目は同じジムの記録のみを対象にする（フリーウェイトは全ジム共通）
        const exDef = availableExercises.find(ex => ex.name === i.exerciseName);
        const isFreeWeight = exDef ? exDef.gymId === 'common' : false;
        if (!isFreeWeight && currentGymName && p.gymName && p.gymName !== currentGymName) {
          return;
        }

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
  }, [myPastPosts, currentGymName, availableExercises]);

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

  const filteredExercises = useMemo(() => {
    const filtered = availableExercises.filter(ex => {
      if (localFilters.length === 0) return true;
      const isCommon = ex.gymId === 'common';
      const fwType = ex.freeWeightType || (ex.name.includes('ダンベル') ? 'dumbbell' : ex.name.includes('スミス') ? 'smith' : 'barbell');
      const exFilterType = !isCommon ? 'gym' : fwType;
      return localFilters.includes(exFilterType);
    });
    return filtered.sort((a, b) => {
      const countA = exerciseUsageCount[a.name] || 0;
      const countB = exerciseUsageCount[b.name] || 0;
      return countB - countA;
    });
  }, [availableExercises, localFilters, exerciseUsageCount]);

  const updateExerciseName = (newName, superIndex = 0) => {
    const exData = availableExercises.find(ex => ex.name === newName);
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
    const currentExDef = availableExercises.find(ex => ex.name === item.exerciseName);
    const isFreeWeight = currentExDef ? currentExDef.gymId === 'common' : false;

    for (let p of myPastPosts) {
      // 【修正5】マシン種目は同じジムの場合のみ表示
      if (!isFreeWeight && currentGymName && p.gymName && p.gymName !== currentGymName) {
        continue;
      }
      const found = p.items?.find(i => i.exerciseName === item.exerciseName);
      if (found && found.sets?.length > 0) {
        return { date: p.date, sets: found.sets, weightType: found.weightType, fullItem: found, gymName: p.gymName };
      }
    }
    return null;
  }, [item.exerciseName, myPastPosts, currentGymName, availableExercises]);

  const handleCopyPrevRecord = () => {
    if (!prevRecord || !prevRecord.fullItem) return;
    const prevItem = prevRecord.fullItem;
    const newSets = prevItem.sets.map(s => {
      const clearReps = (ds) => ({ ...ds, id: generateId(), reps: '', lReps: '', rReps: '', forcedReps: '', superReps: '', superLReps: '', superRReps: '', superForcedReps: '', superReps3: '', superLReps3: '', superRReps3: '', superForcedReps3: '' });
      return {
        ...s,
        id: generateId(),
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
    <div {...dragHandleProps} className={`${isConfirmed ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-2 border-emerald-400 dark:border-emerald-600' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'} rounded-2xl p-4 shadow-sm relative w-full overflow-hidden mb-6 transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-auto'}`} onClickCapture={() => onActive && onActive(item.exerciseName)}>
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
                <button onClick={() => toggleFilter('gym')} disabled={isConfirmed} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilters.includes('gym') ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>マシン等</button>
                <button onClick={() => toggleFilter('barbell')} disabled={isConfirmed} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilters.includes('barbell') ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>バーベル</button>
                <button onClick={() => toggleFilter('dumbbell')} disabled={isConfirmed} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilters.includes('dumbbell') ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>ダンベル</button>
                <button onClick={() => toggleFilter('smith')} disabled={isConfirmed} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilters.includes('smith') ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>スミス</button>
              </div>
            )}
            {!isJointPartner ? (
              <div className="relative w-full">
                <select value={item.exerciseName || ''} onChange={(e) => updateExerciseName(e.target.value, 0)} disabled={isConfirmed} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base pr-8" style={{ fontSize: '16px' }}>
                  <option value="" disabled>{filteredExercises.length === 0 ? (availableExercises.length === 0 ? "上の部位を選択してください" : "該当する種目がありません") : "種目を選択"}</option>
                  {item.exerciseName && !filteredExercises.some(ex => ex.name === item.exerciseName) && (
                    <option value={item.exerciseName}>{item.exerciseName}</option>
                  )}
                  {filteredExercises.map(ex => <option key={ex.id} value={ex.name}>{ex.name}{ex.maker ? `（${ex.maker}）` : ''}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
              </div>
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

      <div className={`transition-all overflow-hidden ${isAnyDragging ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
        <div className={`transition-all duration-300 ${isConfirmed ? 'pointer-events-none opacity-60 select-none' : ''}`}>
      {prevRecord && !isJointPartner && (
        <div className="mb-4 pl-8 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-emerald-600 dark:text-emerald-400 mr-2 flex items-center inline-flex gap-1"><Clock size={12}/>前回 ({formatDateWithDay(prevRecord.date)})</span>
          <div className="mt-1 flex flex-wrap gap-2">
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
        <div className="mb-5 pl-8 border-l-2 border-indigo-300 dark:border-indigo-600 space-y-3">
          {!isJointPartner ? (
            <div className="relative w-full">
              <select value={item.superExerciseName || ''} onChange={(e) => updateExerciseName(e.target.value, 2)} className="w-full bg-indigo-50/30 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold appearance-none focus:outline-none focus:border-indigo-500 text-base pr-8" style={{ fontSize: '16px' }}>
                <option value="" disabled>スーパーセットの種目 (2種目目)</option>
                {item.superExerciseName && !filteredExercises.some(ex => ex.name === item.superExerciseName) && (
                  <option value={item.superExerciseName}>{item.superExerciseName}</option>
                )}
                {filteredExercises.filter(ex => ex.weightType !== 'cardio').map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none text-xs">▼</div>
            </div>
          ) : (
            <div className="w-full bg-indigo-50/30 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold text-base">
              {item.superExerciseName || "スーパーセット種目"}
            </div>
          )}
          
          {!isJointPartner ? (
            item.superExerciseName && (
              <div className="relative w-full">
                <select value={item.superExerciseName3 || ''} onChange={(e) => updateExerciseName(e.target.value, 3)} className="w-full bg-indigo-50/30 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold appearance-none focus:outline-none focus:border-indigo-500 text-base pr-8" style={{ fontSize: '16px' }}>
                  <option value="">ジャイアントセット (3種目目・任意)</option>
                  {item.superExerciseName3 && !filteredExercises.some(ex => ex.name === item.superExerciseName3) && (
                    <option value={item.superExerciseName3}>{item.superExerciseName3}</option>
                  )}
                  {filteredExercises.filter(ex => ex.weightType !== 'cardio').map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none text-xs">▼</div>
              </div>
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
