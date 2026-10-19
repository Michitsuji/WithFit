// ============================================================================
// WithFit v2 - ワークアウト記録画面 (RecordView)
// ダッシュボード・リアルタイム記録・合トレ同期・過去記録・体組成記録・高速テキストインポート
// ※AI解析は廃止し、オフラインで瞬時に動作するルールベースパーサーを搭載
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import {
  Dumbbell, MapPin, Play, Calendar as CalendarIcon, Scale, Target,
  Flame, UserPlus, ArrowUp, ArrowDown, ListPlus, Activity, FileText, X, Plus
} from 'lucide-react';
import { db, APP_ID, MASTER_USER } from '../../config/firebase';
import { PROG_INFO } from '../../constants';
import {
  generateId, formatDateFromTimestamp, parseWorkoutFromText, buildProgramSchedule
} from '../../utils/helpers';
import { PageHeader, UserAvatar, IconButton, FormInput, CategoryFilterGrid } from '../common/UI';
import WorkoutItemForm from '../workout/WorkoutItemForm';
import { ReorderItemsModal, ProgramGeneratorModal, ActiveProgramDisplay } from '../workout/WorkoutModals';

let globalRecordHorizontalScroll = 0;

export default function RecordView({
  onStart,
  onPost,
  onCancel,
  onRequestJointTraining,
  onAcceptJointTraining,
  onRejectJointTraining,
  onCancelJointTraining,
  myInfo,
  gyms,
  exercises,
  workoutItems,
  setWorkoutItems,
  selectedCategories,
  setSelectedCategories,
  posts,
  currentUser,
  isManual,
  setIsManual,
  onActiveExerciseChange,
  accountsInfo
}) {
  const joinedGyms = myInfo.joinedGyms || ['common'];
  const jointPartnerId = myInfo.jointPartnerId;
  const partnerItems = jointPartnerId ? (accountsInfo[jointPartnerId]?.currentWorkoutItems || []) : [];

  const myPastPostsForSort = useMemo(() => (posts || []).filter(p => p.author === currentUser), [posts, currentUser]);
  const gymUsageCount = useMemo(() => {
    const counts = {};
    myPastPostsForSort.forEach(p => {
      if (p.gymName) counts[p.gymName] = (counts[p.gymName] || 0) + 1;
    });
    return counts;
  }, [myPastPostsForSort]);

  const sortedGyms = useMemo(() => {
    const joined = gyms.filter(g => joinedGyms.includes(g.id) && g.id !== 'common');
    return joined.sort((a, b) => (gymUsageCount[b.name] || 0) - (gymUsageCount[a.name] || 0));
  }, [gyms, joinedGyms, gymUsageCount]);

  const [selectedGymId, setSelectedGymId] = useState(myInfo.currentGymId || (sortedGyms[0]?.id || 'common'));
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bodyWeight, setBodyWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const [manualDate, setManualDate] = useState(formatDateFromTimestamp(Date.now()));
  const [manualStartTime, setManualStartTime] = useState("12:00");
  const [manualEndTime, setManualEndTime] = useState("13:00");

  const [isMetricsOnlyMode, setIsMetricsOnlyMode] = useState(false);
  const [showImportTextModal, setShowImportTextModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showDashboard, setShowDashboard] = useState(!myInfo?.isTraining && !isManual);
  const [activeItemIdx, setActiveItemIdx] = useState(0);

  useEffect(() => {
    if (!myInfo?.isTraining && !isManual) {
      setShowDashboard(true);
    }
  }, [myInfo?.isTraining, isManual]);

  useEffect(() => {
    const handleReturn = () => setShowDashboard(false);
    const handleShowDashboard = () => setShowDashboard(true);
    window.addEventListener('returnToRecordInput', handleReturn);
    window.addEventListener('showRecordDashboard', handleShowDashboard);
    return () => {
      window.removeEventListener('returnToRecordInput', handleReturn);
      window.removeEventListener('showRecordDashboard', handleShowDashboard);
    };
  }, []);

  const handleContainerRef = (node) => {
    if (node) {
      setTimeout(() => {
        node.scrollTo({ left: globalRecordHorizontalScroll, behavior: 'auto' });
      }, 50);
    }
  };

  const handleScroll = (e) => {
    globalRecordHorizontalScroll = e.target.scrollLeft;
    const cardW = e.currentTarget.children[0]?.offsetWidth || 300;
    const idx = Math.round(e.target.scrollLeft / (cardW + 14));
    if (idx !== activeItemIdx && idx >= 0) setActiveItemIdx(idx);
  };

  const scrollToCard = (idx) => {
    setActiveItemIdx(idx);
    const container = document.getElementById('workout-items-container');
    if (container && container.children[idx]) {
      container.scrollTo({ left: container.children[idx].offsetLeft - 16, behavior: 'smooth' });
    }
  };

  const activeProgramsList = myInfo.activePrograms || (myInfo.activeProgram ? [myInfo.activeProgram] : []);

  const mutedExercises = myInfo.mutedExercises || [];
  const availableExercises = exercises.filter(ex => {
    if (ex.gymId !== selectedGymId && ex.gymId !== 'common') return false;
    if (mutedExercises.includes(ex.name)) return false;
    if (selectedCategories.length === 0) return false;
    if (ex.gymId === 'common') {
      if (ex.author && ex.author !== currentUser && ex.author !== MASTER_USER) return false;
    } else {
      const gym = gyms.find(g => g.id === ex.gymId);
      if (gym && ex.author && ex.author !== gym.owner && ex.author !== currentUser && ex.author !== MASTER_USER) return false;
    }
    return selectedCategories.includes(ex.category || 'その他');
  });

  // ルールベース高速テキストインポート（AI不要）
  const handleTextImportSubmit = () => {
    if (!importText.trim()) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "テキストを入力してください。" } }));
      return;
    }
    const parsedItems = parseWorkoutFromText(importText, exercises);
    if (parsedItems.length === 0) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "種目とセットを認識できませんでした。\n例:\n■ 1. ベンチプレス [胸]\nSet 1: 60kg x 10回" } }));
      return;
    }
    const catsToSelect = new Set(selectedCategories);
    parsedItems.forEach(it => {
      if (it.category) catsToSelect.add(it.category);
    });
    setSelectedCategories(Array.from(catsToSelect));
    setWorkoutItems(prev => {
      const hasOnlyEmpty = prev.length === 1 && !prev[0].exerciseName && prev[0].sets.length === 1 && !prev[0].sets[0].weight && !prev[0].sets[0].reps;
      return hasOnlyEmpty ? parsedItems : [...prev, ...parsedItems];
    });
    setShowImportTextModal(false);
    setImportText('');
  };

  const handleGenerateProgram = async (progType, exerciseName, oneRM) => {
    const schedule = buildProgramSchedule(progType, oneRM);
    const newProgram = {
      id: generateId(),
      type: progType,
      exerciseName,
      oneRM,
      schedule,
      createdAt: Date.now()
    };
    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
          activePrograms: [...activeProgramsList, newProgram],
          activeProgram: deleteField()
        }, { merge: true });
      } catch (e) { console.error(e); }
    }
    setShowProgramModal(false);
  };

  const handleApplyProgramToMenu = (program, dayData) => {
    const targetEx = exercises.find(ex => ex.name === program.exerciseName) || { category: '胸', weightType: 'total' };
    if (!selectedCategories.includes(targetEx.category)) {
      setSelectedCategories(prev => [...prev, targetEx.category]);
    }
    const cleanReps = dayData.reps.toString().replace('+', '');
    const sets = Array.from({ length: dayData.sets }).map(() => ({
      id: generateId(),
      weight: dayData.weight.toString(),
      reps: '',
      targetReps: cleanReps,
      lReps: '',
      rReps: ''
    }));
    const memoText = `${PROG_INFO[program.type]?.name} W${dayData.week} - ${dayData.type}${dayData.isAmrap ? ' (最終セット限界まで!)' : ''}`;
    const newItem = {
      id: generateId(),
      exerciseName: program.exerciseName,
      category: targetEx.category,
      weightType: targetEx.weightType,
      isSuperSet: false, isDropSet: false, isForcedReps: false,
      memo: memoText,
      sets
    };
    setWorkoutItems(prev => {
      const hasOnlyEmpty = prev.length === 1 && !prev[0].exerciseName && prev[0].sets.length === 1 && !prev[0].sets[0].weight && !prev[0].sets[0].reps;
      return hasOnlyEmpty ? [newItem] : [...prev, newItem];
    });
    window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "今日のメニューに追加しました！そのままトレーニングを開始して記録できます。" } }));
  };

  const handleToggleProgramComplete = async (programId, scheduleId) => {
    const updatedPrograms = activeProgramsList.map(p => {
      if (p.id !== programId) return p;
      return {
        ...p,
        schedule: p.schedule.map(s => s.id === scheduleId ? { ...s, completed: !s.completed } : s)
      };
    });
    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
          activePrograms: updatedPrograms,
          activeProgram: deleteField()
        }, { merge: true });
      } catch (e) {}
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (!window.confirm("このプログラムを終了（削除）しますか？")) return;
    const updatedPrograms = activeProgramsList.filter(p => p.id !== programId);
    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
          activePrograms: updatedPrograms,
          activeProgram: deleteField()
        }, { merge: true });
      } catch (e) {}
    }
  };

  const myPastPosts = (posts || []).filter(p => p.author === currentUser);

  const handleStart = () => {
    const targetGym = selectedGymId || sortedGyms[0]?.id || 'common';
    onStart(targetGym);
    if (workoutItems.length === 0) {
      addExerciseItem(null);
    }
    setShowDashboard(false);
  };

  const updateItem = (itemId, data) => {
    setWorkoutItems(prev => {
      const index = prev.findIndex(item => item.id === itemId);
      if (index === -1) return prev;
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], ...data };

      const syncKeys = ['exerciseName', 'category', 'weightType', 'superExerciseName', 'superWeightType', 'superExerciseName3', 'superWeightType3'];
      let shouldSync = false;
      const syncData = {};
      for (const key of syncKeys) {
        if (data[key] !== undefined) {
          syncData[key] = data[key];
          shouldSync = true;
        }
      }
      if (jointPartnerId && shouldSync && db) {
        const newPItems = [...partnerItems];
        if (newPItems[index]) {
          newPItems[index] = { ...newPItems[index], ...syncData };
          setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems, lastUpdater: currentUser }, { merge: true });
        }
      }
      return newItems;
    });
  };

  const addExerciseItem = (insertAfterIndex = null, defaultName = '') => {
    const defaultEx = availableExercises.find(ex => ex.name === defaultName);
    const isCardio = defaultEx ? defaultEx.weightType === 'cardio' : false;
    const newItem = {
      id: generateId(),
      exerciseName: defaultEx ? defaultEx.name : '',
      weightType: defaultEx ? (defaultEx.weightType || 'total') : 'total',
      category: defaultEx ? (defaultEx.category || 'その他') : 'その他',
      isSuperSet: false, isDropSet: false, isForcedReps: false, memo: '',
      sets: [isCardio ? { id: generateId(), distance: '', time: '', calories: '' } : { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]
    };

    let newItems = [...workoutItems];
    if (insertAfterIndex !== null) {
      newItems.splice(insertAfterIndex + 1, 0, newItem);
    } else {
      newItems.push(newItem);
    }
    setWorkoutItems(newItems);

    if (jointPartnerId && db) {
      const newPItem = { ...newItem, id: generateId(), sets: [isCardio ? { id: generateId(), distance: '', time: '', calories: '' } : { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }] };
      const newPItems = [...partnerItems];
      if (insertAfterIndex !== null) newPItems.splice(insertAfterIndex + 1, 0, newPItem);
      else newPItems.push(newPItem);
      setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
    }

    const targetScrollIdx = insertAfterIndex !== null ? insertAfterIndex + 1 : newItems.length - 1;
    setTimeout(() => scrollToCard(targetScrollIdx), 100);
  };

  const removeExerciseItem = (itemId) => {
    const index = workoutItems.findIndex(item => item.id === itemId);
    setWorkoutItems(workoutItems.filter(item => item.id !== itemId));
    if (jointPartnerId && index !== -1 && db) {
      const newPItems = [...partnerItems];
      newPItems.splice(index, 1);
      setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
    }
  };

  const addSet = (itemId) => {
    setWorkoutItems(prev => {
      const index = prev.findIndex(item => item.id === itemId);
      if (index === -1) return prev;
      const newItems = [...prev];
      const item = newItems[index];
      const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : {};
      const newSet = item.weightType === 'cardio'
        ? { id: generateId(), distance: lastSet.distance || '', time: lastSet.time || '', calories: lastSet.calories || '' }
        : {
            id: generateId(),
            weight: lastSet.weight || '',
            reps: lastSet.reps || '',
            lReps: lastSet.lReps || '',
            rReps: lastSet.rReps || '',
            dropSets: lastSet.dropSets ? lastSet.dropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
            superDropSets: lastSet.superDropSets ? lastSet.superDropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
            superDropSets3: lastSet.superDropSets3 ? lastSet.superDropSets3.map(ds => ({ ...ds, id: generateId() })) : undefined
          };
      newItems[index] = { ...item, sets: [...(item.sets || []), newSet] };

      if (jointPartnerId && db) {
        const newPItems = [...partnerItems];
        if (newPItems[index]) {
          const pItem = newPItems[index];
          const pLastSet = (pItem.sets && pItem.sets.length > 0) ? pItem.sets[pItem.sets.length - 1] : {};
          const pNewSet = pItem.weightType === 'cardio'
            ? { id: generateId(), distance: pLastSet.distance || '', time: pLastSet.time || '', calories: pLastSet.calories || '' }
            : { id: generateId(), weight: pLastSet.weight || '', reps: pLastSet.reps || '', lReps: pLastSet.lReps || '', rReps: pLastSet.rReps || '' };
          newPItems[index] = { ...pItem, sets: [...(pItem.sets || []), pNewSet] };
          setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
        }
      }
      return newItems;
    });
  };

  const removeSet = (itemId, setId) => {
    setWorkoutItems(prev => {
      const index = prev.findIndex(item => item.id === itemId);
      if (index === -1) return prev;
      const newItems = [...prev];
      const item = newItems[index];
      const setIndex = item.sets.findIndex(s => s.id === setId);
      if (setIndex === -1) return prev;
      newItems[index] = { ...item, sets: item.sets.filter(s => s.id !== setId) };

      if (jointPartnerId && db) {
        const newPItems = [...partnerItems];
        if (newPItems[index]) {
          const pItem = newPItems[index];
          const newPSets = [...(pItem.sets || [])];
          if (setIndex < newPSets.length) {
            newPSets.splice(setIndex, 1);
            newPItems[index] = { ...pItem, sets: newPSets };
            setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
          }
        }
      }
      return newItems;
    });
  };

  const reorderSet = (itemId, dragIndex, dropIndex) => {
    setWorkoutItems(prev => {
      const index = prev.findIndex(item => item.id === itemId);
      if (index === -1) return prev;
      const newItems = [...prev];
      const item = newItems[index];
      const newSets = [...(item.sets || [])];
      const [dragged] = newSets.splice(dragIndex, 1);
      newSets.splice(dropIndex, 0, dragged);
      newItems[index] = { ...item, sets: newSets };
      return newItems;
    });
  };

  const updateSetField = (itemId, setId, field, value) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) };
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

  // 合トレパートナー用ハンドラ
  const updatePartnerItem = (itemId, data) => {
    if (!db) return;
    const newItems = partnerItems.map(item => item.id === itemId ? { ...item, ...data } : item);
    setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems, lastUpdater: currentUser }, { merge: true });
  };
  const addPartnerSet = (itemId) => {
    if (!db) return;
    const newItems = partnerItems.map(item => {
      if (item.id === itemId) {
        const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : {};
        return { ...item, sets: [...(item.sets || []), { id: generateId(), weight: lastSet.weight || '', reps: lastSet.reps || '', lReps: lastSet.lReps || '', rReps: lastSet.rReps || '' }] };
      }
      return item;
    });
    setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };
  const removePartnerSet = (itemId, setId) => {
    if (!db) return;
    const newItems = partnerItems.map(item => item.id === itemId ? { ...item, sets: item.sets.filter(s => s.id !== setId) } : item);
    setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };
  const updatePartnerSetField = (itemId, setId, field, value) => {
    if (!db) return;
    const newItems = partnerItems.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) };
    });
    setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };

  const handleSubmit = async () => {
    if (workoutItems.length > 0) {
      const isValid = workoutItems.every(item => {
        if (!item.exerciseName || !item.sets || item.sets.length === 0) return false;
        if (item.weightType === 'cardio') return item.sets.every(set => set.distance !== '' || set.time !== '' || set.calories !== '');
        if (item.weightType === 'lr') return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.lReps !== '' || set.rReps !== ''));
        return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.reps !== '' || set.forcedReps));
      });
      if (!isValid) {
        window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "種目を選択し、すべてのセットの重量・回数を入力してください。" } }));
        return;
      }
    } else if (!bodyWeight && !bodyFat) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "種目を追加するか、体重・体脂肪率を入力してください。" } }));
      return;
    }

    setIsSubmitting(true);
    const gym = gyms.find(g => g.id === selectedGymId);

    try {
      if (isManual) {
        const startTs = new Date(`${manualDate}T${manualStartTime}`).getTime();
        const endTs = new Date(`${manualDate}T${manualEndTime}`).getTime();
        await onPost(gym ? gym.name : 'フリーウェイト', workoutItems, Number(bodyWeight), Number(bodyFat), startTs, endTs);
        setIsManual(false);
      } else {
        await onPost(gym ? gym.name : 'フリーウェイト', workoutItems, Number(bodyWeight), Number(bodyFat), null, null, jointPartnerId, partnerItems);
      }
      globalRecordHorizontalScroll = 0;
    } finally {
      setBodyWeight('');
      setBodyFat('');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    globalRecordHorizontalScroll = 0;
    if (isManual) {
      setWorkoutItems([]);
      setSelectedCategories([]);
      setIsManual(false);
    } else {
      onCancel();
    }
  };

  const handleMetricsOnlySubmit = async () => {
    if (!bodyWeight && !bodyFat) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: '体重または体脂肪率を入力してください' } }));
      return;
    }
    setIsSubmitting(true);
    const startTs = new Date(`${manualDate}T${manualStartTime}`).getTime();
    await onPost('', [], Number(bodyWeight), Number(bodyFat), startTs, startTs);
    setIsSubmitting(false);
    setIsMetricsOnlyMode(false);
    setBodyWeight('');
    setBodyFat('');
  };

  const toggleCategory = (cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  if (isMetricsOnlyMode) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <PageHeader icon={<Scale size={18} />} title="体組成のみ記録" subtitle="日々の体重・体脂肪率を素早くグラフに記録" />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <FormInput label="日付" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
          <FormInput label="時間" type="time" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} />
          <div className="flex gap-3 pt-1">
            <FormInput label="体重" type="number" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="65.0" unit="kg" className="flex-1" />
            <FormInput label="体脂肪率" type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="15.0" unit="%" className="flex-1" />
          </div>
          <button
            type="button"
            onClick={handleMetricsOnlySubmit}
            disabled={isSubmitting || (!bodyWeight && !bodyFat)}
            className="w-full bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white font-bold py-3.5 rounded-2xl shadow-md mt-4 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : <><Scale size={18} /> 記録を保存する</>}
          </button>
          <button
            type="button"
            onClick={() => setIsMetricsOnlyMode(false)}
            className="w-full text-slate-500 dark:text-slate-400 font-bold py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (showDashboard) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <PageHeader
          icon={<Dumbbell size={18} />}
          title={myInfo?.isTraining ? 'ワークアウトメニュー' : 'ワークアウトを開始'}
          subtitle={myInfo?.isTraining ? '現在トレーニング計測中です' : 'ジムを選んでトレーニングを始めましょう'}
        />

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/70 rounded-2xl flex items-center justify-center mb-4">
            <MapPin size={28} className="text-emerald-500" />
          </div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 text-center">
            {myInfo?.isTraining ? '現在トレーニング中の場所' : '本日のトレーニング場所を選択'}
          </label>
          <div className="w-full relative mb-5">
            <select
              value={selectedGymId}
              onChange={(e) => setSelectedGymId(e.target.value)}
              disabled={myInfo?.isTraining}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base disabled:opacity-70"
              style={{ fontSize: '16px' }}
            >
              {sortedGyms.length === 0 && <option value="common">フリーウェイト / 自宅</option>}
              {sortedGyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
          </div>

          {myInfo?.isTraining ? (
            <button
              type="button"
              onClick={() => setShowDashboard(false)}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25"
            >
              <Dumbbell fill="currentColor" size={20} /> 記録入力画面に戻る
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStart}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25 mb-3.5"
              >
                <Play fill="currentColor" size={20} /> トレーニング開始
              </button>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => { setIsManual(true); setShowDashboard(false); if (workoutItems.length === 0) addExerciseItem(null); }}
                  className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex flex-col items-center justify-center gap-1.5 hover:bg-emerald-100 active:scale-95 transition-all"
                >
                  <CalendarIcon size={18} className="text-emerald-500" /> 過去の記録を追加
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setManualDate(formatDateFromTimestamp(d.getTime()));
                    setManualStartTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                    setIsMetricsOnlyMode(true);
                  }}
                  className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 flex flex-col items-center justify-center gap-1.5 hover:bg-indigo-100 active:scale-95 transition-all"
                >
                  <Scale size={18} className="text-indigo-500" /> 体組成のみ記録
                </button>
              </div>
            </>
          )}
        </div>

        {/* プログラム管理 */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-3 ml-1">
            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Target size={16} className="text-indigo-500" /> 強化プログラム管理
            </h3>
          </div>

          {activeProgramsList.map(prog => (
            <ActiveProgramDisplay
              key={prog.id}
              program={prog}
              onApply={handleApplyProgramToMenu}
              onToggleComplete={(sId) => handleToggleProgramComplete(prog.id, sId)}
              onDelete={() => handleDeleteProgram(prog.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => setShowProgramModal(true)}
            className="w-full py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-98 transition-all shadow-sm"
          >
            <div className="bg-indigo-50 dark:bg-indigo-950/50 p-3 rounded-2xl">
              <Target size={22} className="text-indigo-500" />
            </div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">新しい強化プログラムを作成 (HPS / Smolov / 5-3-1)</span>
          </button>
        </div>

        <ProgramGeneratorModal
          isOpen={showProgramModal}
          onClose={() => setShowProgramModal(false)}
          onGenerate={handleGenerateProgram}
          exercises={exercises}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {isManual && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarIcon size={18} className="text-emerald-500" /> 過去のワークアウト記録
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">ジムを選択</label>
            <div className="w-full relative">
              <select
                value={selectedGymId}
                onChange={(e) => setSelectedGymId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base"
                style={{ fontSize: '16px' }}
              >
                {sortedGyms.length === 0 && <option value="common">フリーウェイト / 自宅</option>}
                {sortedGyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
            </div>
          </div>
          <FormInput label="日付" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
          <div className="flex gap-3 w-full">
            <FormInput label="開始時間" type="time" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} className="flex-1" />
            <FormInput label="終了時間" type="time" value={manualEndTime} onChange={e => setManualEndTime(e.target.value)} className="flex-1" />
          </div>
        </div>
      )}

      {/* 合トレ申請・合トレ中バナー */}
      {(() => {
        const friendsInSameGym = (myInfo.friends || []).filter(f => accountsInfo[f]?.isTraining && accountsInfo[f]?.currentGymId === myInfo.currentGymId && myInfo.currentGymId);
        return (
          <>
            {friendsInSameGym.length > 0 && !jointPartnerId && !isManual && (
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
                  <Flame size={14} /> 同じジムでトレーニング中のフレンド
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {friendsInSameGym.map(f => {
                    const hasRequested = (accountsInfo[f]?.jointTrainingRequests || []).includes(currentUser);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => !hasRequested && onRequestJointTraining(f)}
                        disabled={hasRequested}
                        className={`flex items-center gap-1.5 bg-white dark:bg-slate-900 border text-xs font-bold px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-all shadow-sm ${
                          hasRequested ? 'border-slate-200 text-slate-400' : 'border-orange-200 text-orange-600 hover:bg-orange-100'
                        }`}
                      >
                        <UserAvatar userId={f} accountsInfo={accountsInfo} size={20} />
                        {accountsInfo[f]?.displayName || f} {hasRequested ? '申請済み' : 'に合トレ申請'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {myInfo.jointTrainingRequests && myInfo.jointTrainingRequests.length > 0 && !jointPartnerId && !isManual && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                  <UserPlus size={14} /> 合トレの申請が届いています
                </h3>
                <div className="space-y-2">
                  {myInfo.jointTrainingRequests.map(reqId => (
                    <div key={reqId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2">
                        <UserAvatar userId={reqId} accountsInfo={accountsInfo} size={26} />
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{accountsInfo[reqId]?.displayName || reqId}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => onAcceptJointTraining(reqId)} className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95">承諾</button>
                        <button type="button" onClick={() => onRejectJointTraining(reqId)} className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95">拒否</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {jointPartnerId && (
              <div className="flex flex-col gap-1.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white px-4 py-3 rounded-2xl shadow-lg shadow-orange-500/25">
                <div className="flex items-center justify-between font-bold text-sm">
                  <div className="flex items-center gap-2">
                    <Flame size={18} className="animate-pulse" /> {accountsInfo[jointPartnerId]?.displayName || jointPartnerId} と合トレ同期中！
                  </div>
                  <button type="button" onClick={onCancelJointTraining} className="text-[11px] bg-black/20 hover:bg-black/40 px-2.5 py-1 rounded-lg">解除</button>
                </div>
                <p className="text-[10px] text-orange-100 font-bold">種目選択がリアルタイム同期され、完了時に2人分の記録が保存されます。</p>
              </div>
            )}
          </>
        );
      })()}

      {/* セクション見出し＆並び替えボタン */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          {isManual ? '鍛えた部位と種目' : '本日の鍛える部位を選択'}
        </h2>
        <div className="flex items-center gap-2">
          {workoutItems.length > 1 && (
            <button
              type="button"
              onClick={() => setShowReorderModal(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <ArrowUp size={14} /><ArrowDown size={14} className="-ml-2" /> 並び替え
            </button>
          )}
        </div>
      </div>

      <CategoryFilterGrid selectedCategories={selectedCategories} toggleCategory={toggleCategory} />

      {/* クイックジャンプピルバー（種目が多い時も一目で把握・ワンタップ移動） */}
      {workoutItems.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {workoutItems.map((it, idx) => (
            <button
              key={it.id}
              type="button"
              onClick={() => scrollToCard(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 border flex items-center gap-1 ${
                activeItemIdx === idx
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{idx + 1}. {it.exerciseName || '未選択'}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => addExerciseItem(null)}
            className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 active:scale-95"
          >
            <Plus size={13} /> 種目追加
          </button>
        </div>
      )}

      {/* 種目入力カードカルーセル */}
      <div className="space-y-4">
        <div
          id="workout-items-container"
          ref={handleContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto gap-3.5 pb-4 pt-3 -mx-4 px-4 hide-scrollbar items-start snap-x snap-mandatory"
        >
          {workoutItems.length === 0 ? (
            <div className="snap-center shrink-0 w-[88%] sm:w-[330px] flex flex-col justify-center min-h-[200px]">
              <button
                type="button"
                onClick={() => addExerciseItem(null)}
                className="w-full py-10 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-3xl text-sm font-bold flex flex-col items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-98 transition-all border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-sm"
              >
                <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3.5 rounded-2xl">
                  <ListPlus size={26} className="text-emerald-500" />
                </div>
                <span>最初の種目を追加する</span>
              </button>
            </div>
          ) : (
            Array.from({ length: Math.max(workoutItems.length, partnerItems.length) }).map((_, index) => {
              const myItem = workoutItems[index];
              const pItem = partnerItems[index];
              return (
                <div key={myItem ? myItem.id : `p_${pItem?.id}`} className="snap-center shrink-0 w-[88%] sm:w-[330px] relative flex flex-col gap-3">
                  {myItem ? (
                    <div className="relative">
                      {jointPartnerId && (
                        <div className="absolute -top-2.5 left-4 z-10 bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-sm text-[10px] font-bold">
                          あなた
                        </div>
                      )}
                      <WorkoutItemForm
                        item={myItem}
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
                        onActive={onActiveExerciseChange}
                        isDragging={false}
                        isAnyDragging={false}
                        dragHandleProps={{}}
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-4 opacity-50 flex items-center justify-center min-h-[150px]">
                      <span className="text-xs font-bold">あなたの種目なし</span>
                    </div>
                  )}

                  {jointPartnerId && pItem && (
                    <div className="relative opacity-95 scale-[0.99]">
                      <div className="absolute -top-2.5 left-4 z-10 bg-orange-500 text-white px-2.5 py-0.5 rounded-full shadow-sm text-[10px] font-bold flex items-center gap-1">
                        <UserAvatar userId={jointPartnerId} accountsInfo={accountsInfo} size={14} />
                        {accountsInfo[jointPartnerId]?.displayName || jointPartnerId}
                      </div>
                      <WorkoutItemForm
                        item={pItem}
                        index={index}
                        availableExercises={availableExercises}
                        updateItem={updatePartnerItem}
                        removeItem={() => {}}
                        addSet={addPartnerSet}
                        removeSet={removePartnerSet}
                        updateSet={updatePartnerSetField}
                        addDropSet={() => {}}
                        removeDropSet={() => {}}
                        updateDropSet={() => {}}
                        reorderSet={() => {}}
                        myPastPosts={(posts || []).filter(p => p.author === jointPartnerId)}
                        onActive={() => {}}
                        isDragging={false}
                        isAnyDragging={false}
                        dragHandleProps={{}}
                        isJointPartner={true}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => addExerciseItem(index)}
                    className="w-full py-3 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 active:scale-98 transition-all shadow-sm -mt-2"
                  >
                    <ListPlus size={16} className="text-emerald-500" />
                    <span>この次に種目を追加</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* 本日の体組成入力 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Scale size={16} className="text-indigo-500" /> 本日の体組成（任意）
          </h3>
          <div className="flex gap-3">
            <FormInput type="number" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="体重" unit="kg" className="flex-1" />
            <FormInput type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="体脂肪率" unit="%" className="flex-1" />
          </div>
        </div>

        {/* 保存・テキストインポート・破棄ボタン */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || (workoutItems.length === 0 && !bodyWeight && !bodyFat)}
          className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 ${
            isSubmitting || (workoutItems.length === 0 && !bodyWeight && !bodyFat)
              ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25'
          }`}
        >
          {isSubmitting ? (
            <Activity className="animate-spin" size={20} />
          ) : isManual ? (
            <><CalendarIcon size={20} /> 過去の記録を保存する</>
          ) : (
            <><Flame size={20} /> トレーニングを完了して保存</>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowImportTextModal(true)}
          className="w-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-98 transition-all border border-slate-200 dark:border-slate-800 text-sm"
        >
          <FileText size={17} className="text-indigo-500" /> テキストから一括インポート
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="w-full text-rose-500 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-sm"
        >
          記録を破棄して終了
        </button>
      </div>

      {/* テキストインポートモーダル（AI不要・即時解析） */}
      {showImportTextModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-indigo-500" /> テキストから即時インポート
              </h3>
              <IconButton icon={<X size={16} />} variant="close" size="sm" onClick={() => setShowImportTextModal(false)} />
            </div>
            <div className="p-5 overflow-y-auto">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                カードからコピーしたトレーニング記録テキストを貼り付けると、瞬時にセット構成へ変換して追加します。
              </p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={"■ 1. ベンチプレス [胸]\n  Set 1: 60kg x 10回\n  Set 2: 60kg x 8回"}
                className="w-full h-56 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none font-mono"
              />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTextImportSubmit}
                disabled={!importText.trim()}
                className="w-full bg-indigo-500 hover:bg-indigo-600 active:scale-98 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ListPlus size={18} /> メニューに反映する
              </button>
            </div>
          </div>
        </div>
      )}

      {showReorderModal && (
        <ReorderItemsModal
          items={workoutItems}
          onClose={() => setShowReorderModal(false)}
          onSave={(newItems) => {
            const newOrderIndices = newItems.map(item => workoutItems.findIndex(i => i.id === item.id));
            setWorkoutItems(newItems);
            if (jointPartnerId && db) {
              const newPItems = newOrderIndices.map(idx => partnerItems[idx] || null).filter(Boolean);
              setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
            }
            setShowReorderModal(false);
          }}
        />
      )}
    </div>
  );
}
