import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Dumbbell, Play, Calendar as CalendarIcon, Scale, Target, ArrowUp, ArrowDown, ListPlus, Flame, UserPlus, Sparkles, Activity, X } from 'lucide-react';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { FormInput } from '../components/common/FormInput';
import { CategoryFilterGrid } from '../components/common/CategoryFilterGrid';
import { WorkoutItemForm } from '../components/workout/WorkoutItemForm';
import { ReorderItemsModal } from '../components/workout/ReorderItemsModal';
import { ProgramGeneratorModal } from '../components/workout/ProgramGeneratorModal';
import { ActiveProgramDisplay } from '../components/workout/ActiveProgramDisplay';
import { UserAvatar } from '../components/common/UserAvatar';
import { generateId, globalScrollState } from '../utils/helpers';
import { formatDateFromTimestamp } from '../utils/dateUtils';
import { PROG_INFO, MASTER_USER } from '../constants';

export function RecordView({ onStart, onPost, onCancel, onRequestJointTraining, onAcceptJointTraining, onRejectJointTraining, onCancelJointTraining, myInfo, gyms, exercises, workoutItems, setWorkoutItems, selectedCategories, setSelectedCategories, posts, currentUser, isManual, setIsManual, onActiveExerciseChange, accountsInfo }) {
  const joinedGyms = myInfo.joinedGyms || ['common'];
  const jointPartnerId = myInfo.jointPartnerId;
  const partnerItems = jointPartnerId ? (accountsInfo[jointPartnerId]?.currentWorkoutItems || []) : [];

  const myPastPostsForSort = useMemo(() => posts.filter(p => p.author === currentUser), [posts, currentUser]);
  const gymUsageCount = useMemo(() => {
    const counts = {};
    myPastPostsForSort.forEach(p => {
      if (p.gymName) counts[p.gymName] = (counts[p.gymName] || 0) + 1;
    });
    return counts;
  }, [myPastPostsForSort]);

  const sortedGyms = useMemo(() => {
    const joined = gyms.filter(g => joinedGyms.includes(g.id) && g.id !== 'common');
    return joined.sort((a, b) => {
      const countA = gymUsageCount[a.name] || 0;
      const countB = gymUsageCount[b.name] || 0;
      return countB - countA;
    });
  }, [gyms, joinedGyms, gymUsageCount]);

  const [selectedGymId, setSelectedGymId] = useState(myInfo.currentGymId || (sortedGyms[0]?.id || ''));
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
  const [aiErrorMsg, setAiErrorMsg] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [showDashboard, setShowDashboard] = useState(!myInfo?.isTraining && !isManual);

  useEffect(() => {
    if (!myInfo?.isTraining && !isManual) {
      setShowDashboard(true);
    }
  }, [myInfo?.isTraining, isManual]);

  useEffect(() => {
    const handleReturn = () => {
      setShowDashboard(false);
    };
    const handleShowDashboard = () => {
      setShowDashboard(true);
    };
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
        node.scrollTo({ left: globalScrollState.recordHorizontalScroll, behavior: 'auto' });
      }, 50);
    }
  };

  const handleScroll = (e) => {
    globalScrollState.recordHorizontalScroll = e.target.scrollLeft;
  };

  const round25 = (val) => Math.round(val / 2.5) * 2.5;

  const activeProgramsList = myInfo.activePrograms || (myInfo.activeProgram ? [myInfo.activeProgram] : []);

  const handleTextImportSubmit = async () => {
    if (!importText.trim()) {
      alert("テキストを入力してください。");
      return;
    }
    setIsSubmitting(true);
    setImportProgress(0);
    
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) return 90;
        return Math.floor(prev + (90 - prev) * 0.15 + 1);
      });
    }, 800);

    try {
      const prompt = `以下のトレーニング記録テキストを解析し、JSON配列のみを出力してください。
フォーマット要件:
[
  {
    "exerciseName": "種目名",
    "category": "胸/背中/肩/腕/脚/腹筋/有酸素/その他のいずれか",
    "weightType": "total",
    "isSuperSet": false,
    "isDropSet": false,
    "isForcedReps": false,
    "superExerciseName": "スーパーセット種目名(あれば)",
    "superWeightType": "total",
    "superExerciseName3": "ジャイアントセット種目名(あれば)",
    "superWeightType3": "total",
    "memo": "アプリの項目で表現しきれない情報やメモがあれば記載",
    "sets": [
      {
        "weight": "重量(自重は0)", "reps": "通常の回数", "lReps": "片側の左の回数", "rReps": "片側の右の回数", "forcedReps": "補助回数",
        "distance": "有酸素距離", "time": "時間", "calories": "カロリー",
        "superWeight": "スーパーセット重量", "superReps": "回数", "superLReps": "左回数", "superRReps": "右回数", "superForcedReps": "",
        "superWeight3": "ジャイアントセット重量", "superReps3": "回数", "superLReps3": "左回数", "superRReps3": "右回数", "superForcedReps3": "",
        "dropSets": [
           { "weight": "ドロップ重量", "reps": "通常の回数", "lReps": "左の回数", "rReps": "右の回数", "forcedReps": "", "superWeight": "", "superReps": "", "superWeight3": "", "superReps3": "" }
        ]
      }
    ]
  }
]
※片側種目（ランジやワンアーム系など左右で回数を分ける種目）の場合は、必ず weightType を "lr" とし、reps ではなく lReps と rReps に回数を代入してください。
アプリで記録できる上記形式で可能な限り抽出し、表現しきれない部分はmemoにまとめてください。JSONのみ出力してください。
対象テキスト:
${importText}`;

      setAiErrorMsg(null);
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '解析リクエストに失敗しました');
      }
      let textResponse = data.candidates[0].content.parts[0].text;
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedItems = JSON.parse(textResponse);

      const newItems = parsedItems.map(item => {
        const matchedEx = availableExercises.find(ex => ex.name.includes(item.exerciseName) || (item.exerciseName && item.exerciseName.includes(ex.name)));
        if (matchedEx && !selectedCategories.includes(matchedEx.category)) {
           toggleCategory(matchedEx.category);
        }
        return {
          id: generateId(),
          exerciseName: matchedEx ? matchedEx.name : (item.exerciseName || ''),
          weightType: item.weightType === 'lr' ? 'lr' : (matchedEx ? (matchedEx.weightType || 'total') : (item.weightType || 'total')),
          category: matchedEx ? (matchedEx.category || 'その他') : (item.category || 'その他'),
          isSuperSet: item.isSuperSet || !!item.superExerciseName || false,
          isDropSet: item.isDropSet || (item.sets && item.sets.some(s => s.dropSets && s.dropSets.length > 0)) || false,
          isForcedReps: item.isForcedReps || (item.sets && item.sets.some(s => s.forcedReps || s.superForcedReps || s.superForcedReps3)) || false,
          superExerciseName: item.superExerciseName || '',
          superWeightType: item.superWeightType || 'total',
          superExerciseName3: item.superExerciseName3 || '',
          superWeightType3: item.superWeightType3 || 'total',
          memo: item.memo || '',
          sets: (item.sets || []).map(set => ({
            id: generateId(),
            weight: set.weight || '',
            reps: '', targetReps: set.reps || '',
            lReps: '', targetLReps: set.lReps || '',
            rReps: '', targetRReps: set.rReps || '',
            forcedReps: set.forcedReps || '',
            distance: set.distance || '',
            time: set.time || '',
            calories: set.calories || '',
            superWeight: set.superWeight || '',
            superReps: '', targetSuperReps: set.superReps || '',
            superLReps: '', targetSuperLReps: set.superLReps || '',
            superRReps: '', targetSuperRReps: set.superRReps || '',
            superForcedReps: set.superForcedReps || '',
            superWeight3: set.superWeight3 || '',
            superReps3: '', targetSuperReps3: set.superReps3 || '',
            superLReps3: '', targetSuperLReps3: set.superLReps3 || '',
            superRReps3: '', targetSuperRReps3: set.superRReps3 || '',
            superForcedReps3: set.superForcedReps3 || '',
            dropSets: (set.dropSets || []).map(ds => ({
                id: generateId(),
                weight: ds.weight || '',
                reps: '', targetReps: ds.reps || '',
                lReps: '', targetLReps: ds.lReps || '',
                rReps: '', targetRReps: ds.rReps || '',
                forcedReps: ds.forcedReps || '',
                superWeight: ds.superWeight,
                superReps: '', targetSuperReps: ds.superReps || '',
                superLReps: '', targetSuperLReps: ds.superLReps || '',
                superRReps: '', targetSuperRReps: ds.superRReps || '',
                superForcedReps: ds.superForcedReps,
                superWeight3: ds.superWeight3,
                superReps3: '', targetSuperReps3: ds.superReps3 || '',
                superLReps3: '', targetSuperLReps3: ds.superLReps3 || '',
                superRReps3: '', targetSuperRReps3: ds.superRReps3 || '',
                superForcedReps3: ds.superForcedReps3
            }))
          }))
        };
      });

      if (newItems.length > 0) {
         clearInterval(progressInterval);
         setImportProgress(100);
         setTimeout(() => {
           setWorkoutItems(prev => {
             const hasOnlyEmpty = prev.length === 1 && !prev[0].exerciseName && prev[0].sets.length === 1 && !prev[0].sets[0].weight && !prev[0].sets[0].reps;
             return hasOnlyEmpty ? newItems : [...prev, ...newItems];
           });
           alert(newItems.length + "種目をインポートしました！微調整を行ってください。");
           setShowImportTextModal(false);
           setImportText('');
           setImportProgress(0);
         }, 300);
      } else {
         clearInterval(progressInterval);
         setImportProgress(0);
         alert("トレーニング内容を解析できませんでした。");
      }
    } catch (error) {
      clearInterval(progressInterval);
      setImportProgress(0);
      console.error(error);
      setAiErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateProgram = async (progType, exerciseName, oneRM) => {
    let schedule = [];

    if (progType === 'HPS') {
      const percents = [
        { h: 0.7, p: 0.6, s: 0.8 },
        { h: 0.725, p: 0.6, s: 0.825 },
        { h: 0.75, p: 0.65, s: 0.85 },
        { h: 0.775, p: 0.65, s: 0.875 },
        { h: 0.8, p: 0.7, s: 0.9 },
        { h: 0.6, p: 0.5, s: 1.025 }
      ];
      const schemes = [
        { hR: 8, hS: 5, pR: 3, pS: 5, sR: 3, sS: 3 },
        { hR: 8, hS: 5, pR: 3, pS: 5, sR: 3, sS: 3 },
        { hR: 8, hS: 5, pR: 3, pS: 5, sR: 2, sS: 3 },
        { hR: 8, hS: 5, pR: 3, pS: 5, sR: 2, sS: 3 },
        { hR: 8, hS: 5, pR: 3, pS: 5, sR: 1, sS: 3 },
        { hR: 5, hS: 3, pR: 3, pS: 3, sR: 1, sS: 1 }
      ];
      const hAdvice = '丁寧なフォームでコントロールし、筋肉への負荷を意識。下ろす動作（ネガティブ）をゆっくりと。';
      const pAdvice = '挙上スピードをできるだけ爆発的に！重量は軽いですが全力で素早く挙げます（ボトムで止めない）。';
      const sAdvice = '高重量の日。セット間の休憩を長め（3〜5分）に取り、神経系を鍛える意識で全力挙上。';
      for (let w = 0; w < 6; w++) {
        schedule.push({ id: generateId(), week: w + 1, day: 1, type: 'Hypertrophy', weight: round25(oneRM * percents[w].h), reps: schemes[w].hR, sets: schemes[w].hS, advice: hAdvice, completed: false });
        schedule.push({ id: generateId(), week: w + 1, day: 2, type: 'Power', weight: round25(oneRM * percents[w].p), reps: schemes[w].pR, sets: schemes[w].pS, advice: pAdvice, completed: false });
        schedule.push({ id: generateId(), week: w + 1, day: 3, type: 'Strength', weight: round25(oneRM * percents[w].s), reps: schemes[w].sR, sets: schemes[w].sS, advice: sAdvice, completed: false });
      }
    } else if (progType === 'SMOLOV') {
      const base = [
        { w: 0.7, r: 6, s: 6, t: 'Day 1', a: '初日。まだ余裕がある重量ですが、全セットのフォームを統一する意識で。' },
        { w: 0.75, r: 5, s: 7, t: 'Day 2', a: 'セット数が多いです。休憩をしっかり取り、後半のフォーム崩れに注意。' },
        { w: 0.8, r: 4, s: 8, t: 'Day 3', a: '疲労が溜まってくる頃。無理に挙げ急がず、1レップずつ丁寧に。' },
        { w: 0.85, r: 3, s: 10, t: 'Day 4', a: '今週の山場。10セットと過酷ですが、気合いで乗り切りましょう！' }
      ];
      for (let w = 0; w < 3; w++) {
        const addKg = w * 2.5; 
        base.forEach((d, i) => {
           schedule.push({ id: generateId(), week: w + 1, day: i + 1, type: d.t, weight: round25(oneRM * d.w) + addKg, reps: d.r, sets: d.s, advice: d.a, completed: false });
        });
      }
    } else if (progType === 'WENDLER') {
      const tm = oneRM * 0.9;
      const wData = [
        { w: 0.85, r: '5+', s: 1, t: 'メインセット', a: '最終セットはフォームが崩れない範囲で限界まで反復（AMRAP）！' },
        { w: 0.90, r: '3+', s: 1, t: 'メインセット', a: '最終セットは限界まで。先週の記録を超える意識で。' },
        { w: 0.95, r: '1+', s: 1, t: 'メインセット', a: '自己ベスト更新のつもりで、限界まで反復！' },
        { w: 0.60, r: '5', s: 1, t: 'ディロード', a: '疲労を抜くための軽い週。フォームの確認に集中し、追い込みすぎないこと。' }
      ];
      for (let w = 0; w < 4; w++) {
        schedule.push({ id: generateId(), week: w + 1, day: 1, type: wData[w].t, weight: round25(tm * wData[w].w), reps: wData[w].r, sets: wData[w].s, advice: wData[w].a, completed: false, isAmrap: w !== 3 });
      }
    }

    const newProgram = {
       id: generateId(), type: progType, exerciseName, oneRM, schedule, createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), {
        activePrograms: [...activeProgramsList, newProgram],
        activeProgram: deleteField()
      }, { merge: true });
      setShowProgramModal(false);
    } catch (e) { console.error(e); }
  };

  const handleApplyProgramToMenu = (program, dayData) => {
    const targetEx = availableExercises.find(ex => ex.name === program.exerciseName) || { category: 'その他', weightType: 'total' };
    
    if (!selectedCategories.includes(targetEx.category)) {
      setSelectedCategories(prev => [...prev, targetEx.category]);
    }

    const cleanReps = dayData.reps.toString().replace('+', '');
    const sets = Array.from({ length: dayData.sets }).map(() => ({
       id: generateId(), weight: dayData.weight.toString(), reps: '', targetReps: cleanReps, lReps: '', rReps: ''
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
    alert("今日のメニューに追加しました！そのまま「トレーニング開始」を押して記録できます。");
  };

  const handleToggleProgramComplete = async (programId, scheduleId) => {
    const updatedPrograms = activeProgramsList.map(p => {
      if (p.id !== programId) return p;
      return {
        ...p,
        schedule: p.schedule.map(s => s.id === scheduleId ? { ...s, completed: !s.completed } : s)
      };
    });
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), {
        activePrograms: updatedPrograms,
        activeProgram: deleteField()
      }, { merge: true });
    } catch (e) {}
  };

  const handleDeleteProgram = async (programId) => {
    if (!window.confirm("このプログラムを終了（削除）しますか？")) return;
    const updatedPrograms = activeProgramsList.filter(p => p.id !== programId);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), {
        activePrograms: updatedPrograms,
        activeProgram: deleteField()
      }, { merge: true });
    } catch (e) {}
  };

  const isTraining = myInfo.isTraining;
  const myPastPosts = posts.filter(p => p.author === currentUser);

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


  const handleStart = () => {
    if (!selectedGymId) { alert("ジムを選択してください"); return; }
    onStart(selectedGymId);
    if (workoutItems.length === 0) {
       addExerciseItem('');
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

      if (jointPartnerId && shouldSync) {
         const newPItems = [...partnerItems];
         if (newPItems[index]) {
            newPItems[index] = { ...newPItems[index], ...syncData };
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems, lastUpdater: currentUser }, { merge: true });
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
      sets: [ isCardio ? { id: generateId(), distance: '', time: '', calories: '' } : { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' } ] 
    };
    
    let newItems = [...workoutItems];
    if (insertAfterIndex !== null) {
      newItems.splice(insertAfterIndex + 1, 0, newItem);
    } else {
      newItems.push(newItem);
    }
    setWorkoutItems(newItems);

    if (jointPartnerId) {
       const newPItem = { ...newItem, id: generateId(), sets: [ isCardio ? { id: generateId(), distance: '', time: '', calories: '' } : { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' } ] };
       const newPItems = [...partnerItems];
       if (insertAfterIndex !== null) {
         newPItems.splice(insertAfterIndex + 1, 0, newPItem);
       } else {
         newPItems.push(newPItem);
       }
       setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
    }

    if (insertAfterIndex !== null) {
      setTimeout(() => {
         const container = document.getElementById('workout-items-container');
         if (container) {
            const cardWidth = container.children[0].offsetWidth;
            container.scrollTo({ left: (insertAfterIndex + 1) * (cardWidth + 12), behavior: 'smooth' });
         }
      }, 100);
    }
  };

  const removeExerciseItem = (itemId) => {
    const index = workoutItems.findIndex(item => item.id === itemId);
    setWorkoutItems(workoutItems.filter(item => item.id !== itemId));
    if (jointPartnerId && index !== -1) {
       const newPItems = [...partnerItems];
       newPItems.splice(index, 1);
       setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
    }
  };
  
  const moveItemUp = (index) => {
    if (index === 0) return;
    const newItems = [...workoutItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setWorkoutItems(newItems);
  };
  const moveItemDown = (index) => {
    if (index === workoutItems.length - 1) return;
    const newItems = [...workoutItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setWorkoutItems(newItems);
  };

  const addSet = (itemId) => {
    setWorkoutItems(prev => {
      const index = prev.findIndex(item => item.id === itemId);
      if (index === -1) return prev;
      const newItems = [...prev];
      const item = newItems[index];
      const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : {};
      
      let newSet;
      if (item.weightType === 'cardio') {
         newSet = { id: generateId(), distance: lastSet.distance || '', time: lastSet.time || '', calories: lastSet.calories || '' };
      } else {
         newSet = { 
          id: generateId(), weight: lastSet.weight || '', reps: lastSet.reps || '', lReps: lastSet.lReps || '', rReps: lastSet.rReps || '',
          dropSets: lastSet.dropSets ? lastSet.dropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
          superDropSets: lastSet.superDropSets ? lastSet.superDropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
          superDropSets3: lastSet.superDropSets3 ? lastSet.superDropSets3.map(ds => ({ ...ds, id: generateId() })) : undefined
        };
      }
      newItems[index] = { ...item, sets: [...(item.sets || []), newSet] };

      if (jointPartnerId) {
         const newPItems = [...partnerItems];
         if (newPItems[index]) {
            const pItem = newPItems[index];
            const pLastSet = (pItem.sets && pItem.sets.length > 0) ? pItem.sets[pItem.sets.length - 1] : {};
            let pNewSet;
            if (pItem.weightType === 'cardio') {
               pNewSet = { id: generateId(), distance: pLastSet.distance || '', time: pLastSet.time || '', calories: pLastSet.calories || '' };
            } else {
               pNewSet = { 
                id: generateId(), weight: pLastSet.weight || '', reps: pLastSet.reps || '', lReps: pLastSet.lReps || '', rReps: pLastSet.rReps || '',
                dropSets: pLastSet.dropSets ? pLastSet.dropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
                superDropSets: pLastSet.superDropSets ? pLastSet.superDropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
                superDropSets3: pLastSet.superDropSets3 ? pLastSet.superDropSets3.map(ds => ({ ...ds, id: generateId() })) : undefined
              };
            }
            newPItems[index] = { ...pItem, sets: [...(pItem.sets || []), pNewSet] };
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
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

      if (jointPartnerId) {
         const newPItems = [...partnerItems];
         if (newPItems[index]) {
            const pItem = newPItems[index];
            const newPSets = [...(pItem.sets || [])];
            if (setIndex < newPSets.length) {
                newPSets.splice(setIndex, 1);
                newPItems[index] = { ...pItem, sets: newPSets };
                setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
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

      if (jointPartnerId) {
         const newPItems = [...partnerItems];
         if (newPItems[index]) {
            const pItem = newPItems[index];
            const pNewSets = [...(pItem.sets || [])];
            const [pDragged] = pNewSets.splice(dragIndex, 1);
            pNewSets.splice(dropIndex, 0, pDragged);
            newPItems[index] = { ...pItem, sets: pNewSets };
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
         }
      }
      return newItems;
    });
  };

  const updateSetField = (itemId, setId, field, value) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) };
    }));
  };

  const updatePartnerItem = (itemId, data) => {
    const newItems = partnerItems.map(item => item.id === itemId ? { ...item, ...data } : item);
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems, lastUpdater: currentUser }, { merge: true });
  };
  const addPartnerSet = (itemId) => {
    const newItems = partnerItems.map(item => {
      if (item.id === itemId) {
        const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : {};
        if (item.weightType === 'cardio') return { ...item, sets: [...(item.sets || []), { id: generateId(), distance: lastSet.distance || '', time: lastSet.time || '', calories: lastSet.calories || '' }]};
        return { ...item, sets: [...(item.sets || []), { id: generateId(), weight: lastSet.weight || '', reps: lastSet.reps || '', lReps: lastSet.lReps || '', rReps: lastSet.rReps || '', dropSets: lastSet.dropSets ? lastSet.dropSets.map(ds => ({...ds, id: generateId()})) : undefined, superDropSets: lastSet.superDropSets ? lastSet.superDropSets.map(ds => ({...ds, id: generateId()})) : undefined, superDropSets3: lastSet.superDropSets3 ? lastSet.superDropSets3.map(ds => ({...ds, id: generateId()})) : undefined }]};
      }
      return item;
    });
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };
  const removePartnerSet = (itemId, setId) => {
    const newItems = partnerItems.map(item => item.id === itemId ? { ...item, sets: item.sets.filter(s => s.id !== setId) } : item);
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };
  const updatePartnerSetField = (itemId, setId, field, value) => {
    const newItems = partnerItems.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) };
    });
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };
  const addPartnerDropSet = (itemId, parentSetId, targetArray = 'dropSets') => {
    const newItems = partnerItems.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: [...(set[targetArray] || []), { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]};
      })};
    });
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };
  const removePartnerDropSet = (itemId, parentSetId, dropId, targetArray = 'dropSets') => {
    const newItems = partnerItems.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: (set[targetArray] || []).filter(ds => ds.id !== dropId) };
      })};
    });
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };
  const updatePartnerDropSetField = (itemId, parentSetId, dropId, field, value, targetArray = 'dropSets') => {
    const newItems = partnerItems.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: (set[targetArray] || []).map(ds => ds.id === dropId ? { ...ds, [field]: value } : ds) };
      })};
    });
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };
  const reorderPartnerSet = (itemId, dragIndex, dropIndex) => {
    const newItems = partnerItems.map(item => {
      if (item.id !== itemId) return item;
      const newSets = [...(item.sets || [])];
      const [dragged] = newSets.splice(dragIndex, 1);
      newSets.splice(dropIndex, 0, dragged);
      return { ...item, sets: newSets };
    });
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newItems }, { merge: true });
  };



  const addDropSet = (itemId, parentSetId, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: [...(set[targetArray] || []), { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]};
      })};
    }));
  };
  const removeDropSet = (itemId, parentSetId, dropId, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: (set[targetArray] || []).filter(ds => ds.id !== dropId) };
      })};
    }));
  };
  const updateDropSetField = (itemId, parentSetId, dropId, field, value, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: (set[targetArray] || []).map(ds => ds.id === dropId ? { ...ds, [field]: value } : ds) };
      })};
    }));
  }

  const handleSubmit = async () => {
    if (workoutItems.length > 0) {
      const isValid = workoutItems.every(item => {
        if (!item.exerciseName || !item.sets || item.sets.length === 0) return false;
        if (item.weightType === 'cardio') return item.sets.every(set => set.distance !== '' || set.time !== '' || set.calories !== '');
        if (item.weightType === 'lr') return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.lReps !== '' || set.rReps !== ''));
        return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.reps !== '' || set.forcedReps));
      });
      if (!isValid) { alert("種目を選択し、すべての入力を完了してください。"); return; }
    } else if (!bodyWeight && !bodyFat) {
      alert("種目を追加するか、体重・体脂肪率を入力してください。"); return;
    }

    setIsSubmitting(true);
    const gym = gyms.find(g => g.id === selectedGymId);
    
    try {
      if (isManual) {
         const startTs = new Date(`${manualDate}T${manualStartTime}`).getTime();
         const endTs = new Date(`${manualDate}T${manualEndTime}`).getTime();
         await onPost(gym ? gym.name : '不明なジム', workoutItems, Number(bodyWeight), Number(bodyFat), startTs, endTs);
         setIsManual(false);
      } else {
         await onPost(gym ? gym.name : '不明なジム', workoutItems, Number(bodyWeight), Number(bodyFat), null, null, jointPartnerId, partnerItems);
      }
      globalScrollState.recordHorizontalScroll = 0;
    } finally {
      setBodyWeight(''); setBodyFat(''); setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
      globalScrollState.recordHorizontalScroll = 0;
      if (isManual) {
          setWorkoutItems([]);
          setSelectedCategories([]);
          setIsManual(false);
      } else {
          onCancel();
      }
  };

  const handleMetricsOnlySubmit = async () => {
      if (!bodyWeight && !bodyFat) { alert('体重または体脂肪率を入力してください'); return; }
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
       <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">体重・体脂肪率を記録</h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
             <FormInput label="日付" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
             <FormInput label="時間" type="time" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} />
             <div className="flex gap-4 pt-2">
               <FormInput type="number" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="体重" unit="kg" className="flex-1" />
               <FormInput type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="体脂肪率" unit="%" className="flex-1" />
             </div>
             <button onClick={handleMetricsOnlySubmit} disabled={isSubmitting || (!bodyWeight && !bodyFat)} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md mt-6 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
               {isSubmitting ? <Activity className="animate-spin" size={20} /> : <><Scale size={18} /> 記録を保存する</>}
             </button>
             <button onClick={() => setIsMetricsOnlyMode(false)} className="w-full text-slate-500 dark:text-slate-400 font-bold py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mt-2">キャンセル</button>
          </div>
       </div>
     );
  }

  if (showDashboard) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {myInfo?.isTraining ? 'メニュー' : 'ワークアウトを開始'}
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><MapPin size={28} className="text-slate-400 dark:text-slate-500" /></div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 text-center">
            {myInfo?.isTraining ? 'トレーニング中のジム' : '本日のトレーニング場所を選択してください'}
          </label>
          <div className="w-full relative mb-6">
            <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)} disabled={myInfo?.isTraining} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base disabled:opacity-70" style={{ fontSize: '16px' }}>
              <option value="" disabled>ジムを選択</option>
              {sortedGyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
          </div>
          
          {myInfo?.isTraining ? (
            <button onClick={() => setShowDashboard(false)} className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30 mb-3">
              <Dumbbell fill="currentColor" size={20} /> 記録画面に戻る
            </button>
          ) : (
            <>
              <button onClick={handleStart} className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 mb-3">
                <Play fill="currentColor" size={20} /> トレーニング開始
              </button>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => {setIsManual(true); if(workoutItems.length === 0) addExerciseItem('');}} className="w-full py-3 rounded-xl font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all">
                  <CalendarIcon size={18} /> 過去の記録を追加
                </button>
                <button onClick={() => { 
                   const d = new Date();
                   setManualDate(formatDateFromTimestamp(d.getTime()));
                   setManualStartTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
                   setIsMetricsOnlyMode(true); 
                }} className="w-full py-3 rounded-xl font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all">
                  <Scale size={18} /> 体組成のみ記録
                </button>
              </div>
            </>
          )}

        </div>
        
        {/* プログラム作成機能 */}
        <div className="mt-6 w-full">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
               <Target size={16} className="text-indigo-500" /> プログラム管理 (β版)
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

          <button onClick={() => setShowProgramModal(true)} className="w-full py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
            <div className="bg-indigo-50 dark:bg-indigo-950/50 p-3 rounded-full"><Target size={24} className="text-indigo-500" /></div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">新しいプログラムを作成</span>
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {isManual && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
           <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><CalendarIcon size={18} className="text-emerald-500"/> 過去の記録</h3>
           <div>
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ジムを選択</label>
             <div className="w-full relative">
               <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                 <option value="" disabled>ジムを選択</option>
                 {sortedGyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
             </div>
           </div>
           <FormInput label="日付" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
           <div className="flex gap-2 sm:gap-3 w-full">
             <FormInput label="開始時間" type="time" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} className="flex-1" />
             <FormInput label="終了時間" type="time" value={manualEndTime} onChange={e => setManualEndTime(e.target.value)} className="flex-1" />
           </div>
        </div>
      )}

      <div className="mt-6 mb-2">
        {(() => {
          const friendsInSameGym = (myInfo.friends || []).filter(f => accountsInfo[f]?.isTraining && accountsInfo[f]?.currentGymId === myInfo.currentGymId && myInfo.currentGymId);
          return (
            <>
              {friendsInSameGym.length > 0 && !jointPartnerId && !isManual && (
                <div className="mb-6 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1"><Flame size={14}/> 同じジムにいるフレンド</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {friendsInSameGym.map(f => {
                      const hasRequested = (accountsInfo[f]?.jointTrainingRequests || []).includes(currentUser);
                      return (
                      <button key={f} onClick={() => !hasRequested && onRequestJointTraining(f)} disabled={hasRequested} className={`flex items-center gap-1.5 bg-white dark:bg-slate-900 border text-xs font-bold px-3 py-2 rounded-xl shrink-0 transition-colors shadow-sm ${hasRequested ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-orange-200 text-orange-600 hover:bg-orange-100'}`}>
                        <UserAvatar userId={f} accountsInfo={accountsInfo} size={20} className="border-transparent" />
                        {accountsInfo[f]?.displayName || f} {hasRequested ? '申請済み' : 'に合トレ申請'}
                      </button>
                    )})}
                  </div>
                </div>
              )}
              {myInfo.jointTrainingRequests && myInfo.jointTrainingRequests.length > 0 && !jointPartnerId && !isManual && (
                 <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1"><UserPlus size={14}/> 合トレの申請が届いています</h3>
                    <div className="space-y-2">
                       {myInfo.jointTrainingRequests.map(reqId => (
                          <div key={reqId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 p-2 rounded-xl shadow-sm">
                             <div className="flex items-center gap-2">
                               <UserAvatar userId={reqId} accountsInfo={accountsInfo} size={24} className="border-transparent" />
                               <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{accountsInfo[reqId]?.displayName || reqId}</span>
                             </div>
                             <div className="flex gap-1">
                               <button onClick={() => onAcceptJointTraining(reqId)} className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">承諾</button>
                               <button onClick={() => onRejectJointTraining(reqId)} className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg">拒否</button>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              )}
              {jointPartnerId && (
                <div className="mb-6 flex flex-col gap-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white px-4 py-3 rounded-2xl shadow-lg shadow-orange-500/30">
                  <div className="flex items-center justify-between font-bold text-sm">
                    <div className="flex items-center gap-2">
                      <Flame size={18} className="animate-pulse"/> {accountsInfo[jointPartnerId]?.displayName || jointPartnerId} と合トレ中！
                    </div>
                    <button onClick={onCancelJointTraining} className="text-[10px] bg-black/20 hover:bg-black/40 px-2 py-1 rounded-lg transition-colors">解除</button>
                  </div>
                  <p className="text-[10px] text-orange-100 font-bold">相手のカードも編集可能です。完了時に二人分の投稿が作成されます。</p>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isManual ? '記録内容' : 'ワークアウト中'}</h2>
        <div className="flex items-center gap-2">
          {workoutItems.length > 1 && (
            <button onClick={() => setShowReorderModal(true)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-sm">
              <ArrowUp size={14} /><ArrowDown size={14} className="-ml-2" /> 並び替え
            </button>
          )}
        </div>
      </div>

      <CategoryFilterGrid selectedCategories={selectedCategories} toggleCategory={toggleCategory} />

      {selectedCategories.length > 0 && availableExercises.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm mb-4">
          <p className="text-slate-500 dark:text-slate-400 mb-2 text-sm font-bold">この部位に該当する種目がありません。</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">「種目」タブから追加してください。</p>
        </div>
      )}

      <div className="space-y-4">
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      <div id="workout-items-container" ref={handleContainerRef} onScroll={handleScroll} className="flex overflow-x-auto gap-3 sm:gap-4 pb-6 pt-5 -mx-4 px-4 hide-scrollbar items-start snap-x snap-mandatory">
        {workoutItems.length === 0 ? (
          <div className="snap-center shrink-0 w-[88%] sm:w-[320px] flex flex-col justify-center h-full min-h-[200px]">
            <button onClick={() => addExerciseItem(null)} className="w-full py-8 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-bold flex flex-col items-center justify-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm"><ListPlus size={24} className="text-emerald-500" /></div>
              <span>種目を追加</span>
            </button>
          </div>
        ) : (
          Array.from({ length: Math.max(workoutItems.length, partnerItems.length) }).map((_, index) => {
             const myItem = workoutItems[index];
             const pItem = partnerItems[index];
             return (
               <div key={myItem ? myItem.id : `p_${pItem?.id}`} className="snap-center shrink-0 w-[88%] sm:w-[320px] relative flex flex-col gap-3">
                 {/* 自分のカード */}
                 {myItem ? (
                   <div className="relative">
                     {jointPartnerId && <div className="absolute -top-3 left-4 z-10 bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm text-[10px] font-bold">あなた</div>}
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
                   <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 opacity-50 flex items-center justify-center min-h-[150px]"><span className="text-xs font-bold">あなたの種目なし</span></div>
                 )}
                 
                 {/* 相手のカード */}
                 {jointPartnerId && pItem ? (
                   <div className="relative opacity-90 scale-[0.98]">
                     <div className="absolute -top-3 left-4 z-10 bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm text-[10px] font-bold flex items-center gap-1">
                       <UserAvatar userId={jointPartnerId} accountsInfo={accountsInfo} size={16} className="border-transparent" />
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
                       addDropSet={addPartnerDropSet} 
                       removeDropSet={removePartnerDropSet} 
                       updateDropSet={updatePartnerDropSetField}
                       reorderSet={reorderPartnerSet}
                       myPastPosts={posts.filter(p => p.author === jointPartnerId)}
                       onActive={() => {}}
                       isDragging={false}
                       isAnyDragging={false}
                       dragHandleProps={{}}
                       isJointPartner={true}
                     />
                   </div>
                 ) : jointPartnerId && !pItem ? (
                   <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 opacity-50 flex items-center justify-center min-h-[150px]"><span className="text-xs font-bold text-slate-400">相手の種目なし</span></div>
                 ) : null}
                 
                 <button onClick={() => addExerciseItem(index)} className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm -mt-2">
                   <ListPlus size={16} className="text-emerald-500" />
                   <span>この次に種目を追加</span>
                 </button>
               </div>
             );
          })
        )}
        {jointPartnerId && (
           <div className="snap-center shrink-0 w-[88%] sm:w-[320px] flex flex-col justify-center h-full min-h-[200px] pb-6">
             <button onClick={() => addExerciseItem(null)} className="w-full py-8 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-bold flex flex-col items-center justify-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
               <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm"><ListPlus size={24} className="text-orange-500" /></div>
               <span>ふたりで種目を追加</span>
             </button>
           </div>
        )}
      </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mt-6">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Activity size={16} /> 本日の体組成（任意）</h3>
          <div className="flex gap-4">
            <FormInput type="number" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="体重" unit="kg" className="flex-1" />
            <FormInput type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="体脂肪率" unit="%" className="flex-1" />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting || (workoutItems.length === 0 && !bodyWeight && !bodyFat)} className={`w-full text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 mt-6 mb-4 transition-all ${isSubmitting || (workoutItems.length === 0 && !bodyWeight && !bodyFat) ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500 dark:text-slate-400' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
          {isSubmitting ? <Activity className="animate-spin" size={20} /> : (isManual ? <><CalendarIcon size={20} /> 過去の記録を保存</> : <><Flame size={20} /> トレーニングを完了して保存</>)}
        </button>

        <button onClick={() => setShowImportTextModal(true)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 mb-4 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
          <Sparkles size={18} className="text-indigo-500" /> テキストから一括インポート
        </button>
        
        <button onClick={handleCancel} className="w-full text-slate-500 dark:text-slate-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2 mb-8 transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-800">記録を破棄して終了</button>
      </div>

      {showImportTextModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-500"/> テキストからインポート
              </h3>
              <button onClick={() => setShowImportTextModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {aiErrorMsg && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                  AI解析に失敗しました。以下のエラーを確認してください：<br/>
                  <span className="font-normal opacity-80 break-all">{aiErrorMsg}</span>
                </div>
              )}
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                コピーしたトレーニング記録を貼り付けてください。AIが自動でアプリの形式に変換し、一覧に追加します。
              </p>
              <textarea
                value={importText}
                onChange={e => { setImportText(e.target.value); setAiErrorMsg(null); }}
                placeholder="例:&#10;■ 1. ベンチプレス [胸]&#10;Set 1: 50kg x 10回&#10;Set 2: 50kg x 8回"
                className="w-full h-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              {isSubmitting ? (
                <div className="w-full">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                    <span>AIが解析しています...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button onClick={handleTextImportSubmit} disabled={!importText.trim()} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                  <Sparkles size={18} /> 解析して入力
                </button>
              )}
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
            if (jointPartnerId) {
               const newPItems = newOrderIndices.map(idx => partnerItems[idx] || null).filter(Boolean);
               setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { currentWorkoutItems: newPItems }, { merge: true });
            }
            setShowReorderModal(false); 
          }}
        />
      )}
    </div>
  );
}

// --- 編集モーダル ---
