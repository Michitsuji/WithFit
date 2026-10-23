// ==========================================
// ExercisesView.js — 種目・ジム管理画面コンポーネント（よく使う順・一覧型フィルタ対応UI）
// ==========================================
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, UserPlus, Search, X, Edit2, Trash2, MapPin, EyeOff, Eye, TrendingUp, ChevronDown, ChevronUp, Award, Dumbbell, Filter } from 'lucide-react';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, appId } from './firebase';
import { MASTER_USER, calculateWorkoutTotals, MUSCLE_CATEGORIES, getCategoryColor, getCategoryTabColor } from './utils';
import { UserAvatar, renderUsernameWithBadge } from './CommonUI';
import { ExerciseChartModal } from './DataView';

// ひらがな・カタカナ・大文字小文字を正規化して検索しやすくするヘルパー
const normalizeText = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s　]+/g, '');
};

const getCategoryBorderAccent = (category) => {
  switch (category) {
    case '胸': return 'border-l-rose-500';
    case '背中': return 'border-l-blue-500';
    case '肩': return 'border-l-amber-500';
    case '腕': return 'border-l-purple-500';
    case '脚': return 'border-l-emerald-500';
    case '腹筋': return 'border-l-lime-500';
    case '有酸素': return 'border-l-cyan-500';
    default: return 'border-l-slate-400';
  }
};

const getCategoryDotColor = (category) => {
  switch (category) {
    case '胸': return 'bg-rose-500';
    case '背中': return 'bg-blue-500';
    case '肩': return 'bg-amber-500';
    case '腕': return 'bg-purple-500';
    case '脚': return 'bg-emerald-500';
    case '腹筋': return 'bg-lime-500';
    case '有酸素': return 'bg-cyan-500';
    default: return 'bg-slate-400';
  }
};

// --- 種目・ジム管理画面 ---
function ExercisesView({ gyms, exercises, posts, accountsInfo, currentUser, myInfo, setCurrentTab, onSendRequest, onUserClick }) {
  const isAdmin = currentUser === MASTER_USER;
  const joinedGyms = myInfo?.joinedGyms || ['common'];
  const mutedExercises = myInfo?.mutedExercises || [];

  const [activeTab, setActiveTab] = useState('exercises'); 
  const [gymSearchQuery, setGymSearchQuery] = useState('');
  const [newGymName, setNewGymName] = useState('');
  const [selectedGymId, setSelectedGymId] = useState(
    (myInfo?.isTraining && myInfo?.currentGymId)
      ? myInfo.currentGymId
      : (isAdmin ? 'common' : (joinedGyms.find(id => id !== 'common') || 'common'))
  );
  const [filterGymId, setFilterGymId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterEquipType, setFilterEquipType] = useState('all'); // 'all' | 'machine' | 'barbell' | 'dumbbell' | 'smith'
  const [showMuted, setShowMuted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingGymId, setEditingGymId] = useState(null);
  const [editGymName, setEditGymName] = useState('');
  const [newExName, setNewExName] = useState('');
  const [newExMaker, setNewExMaker] = useState('');
  const [newExWeightType, setNewExWeightType] = useState('total'); 
  const [newExCategory, setNewExCategory] = useState('胸');
  const [newExFreeWeightType, setNewExFreeWeightType] = useState('barbell');
  const [isAdding, setIsAdding] = useState(false);
  const [showMembersGymId, setShowMembersGymId] = useState(null);

  const [editingExId, setEditingExId] = useState(null);
  const [editingExOldName, setEditingExOldName] = useState('');
  const [editExName, setEditExName] = useState('');
  const [editExMaker, setEditExMaker] = useState('');
  const [editExWeightType, setEditExWeightType] = useState('total'); 
  const [editExCategory, setEditExCategory] = useState('胸');
  const [editingExGymId, setEditingExGymId] = useState('');
  const [editExFreeWeightType, setEditExFreeWeightType] = useState('barbell');
  
  const [selectedExerciseForChart, setSelectedExerciseForChart] = useState(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');

  // トレーニング中は現在いるジムを初期選択に反映
  useEffect(() => {
    if (myInfo?.isTraining && myInfo?.currentGymId) {
      setSelectedGymId(myInfo.currentGymId);
    }
  }, [myInfo?.isTraining, myInfo?.currentGymId]);

  // 自分の過去投稿から各種目の「実施回数」「自己ベスト」「最終実施日」および「ジム利用回数」を集計
  const { myExerciseStatsMap, myGymUsageMap } = useMemo(() => {
    const stats = {};
    const gymCounts = {};
    if (!posts) return { myExerciseStatsMap: stats, myGymUsageMap: gymCounts };
    const myPosts = posts.filter(p => p.author === currentUser);

    myPosts.forEach(p => {
      if (p.gymName) {
        gymCounts[p.gymName] = (gymCounts[p.gymName] || 0) + 1;
      }
      const time = new Date(p.date || p.timestamp).getTime();
      const dt = !isNaN(time) ? new Date(time) : null;
      const dateLabel = dt ? `${dt.getMonth() + 1}/${dt.getDate()}` : '';

      const recordHit = (exName, sets, wType) => {
        if (!exName) return;
        if (!stats[exName]) {
          stats[exName] = { count: 0, maxWeight: 0, max1RM: 0, bestSetStr: '', lastDate: '', lastTime: 0, isCardio: wType === 'cardio' };
        }
        const st = stats[exName];
        st.count += 1;
        if (time && time > st.lastTime) {
          st.lastTime = time;
          st.lastDate = dateLabel;
        }
        (sets || []).forEach(s => {
          if (wType === 'cardio') {
            const dist = Number(s.distance) || 0;
            const tm = Number(s.time) || 0;
            if (dist > st.maxWeight) {
              st.maxWeight = dist;
              st.bestSetStr = `${dist}km`;
            } else if (!st.bestSetStr && tm > 0) {
              st.bestSetStr = `${tm}分`;
            }
            return;
          }
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || Math.max(Number(s.lReps) || 0, Number(s.rReps) || 0);
          if (w > 0) {
            const rm = r > 0 ? Math.round(w * (1 + r / 40) * 10) / 10 : w;
            if (w > st.maxWeight || (w === st.maxWeight && rm > st.max1RM)) {
              st.maxWeight = w;
              const unit = wType === 'plate' ? '枚' : 'kg';
              st.bestSetStr = `${w}${unit}${r > 0 ? `×${r}` : ''}`;
            }
            if (rm > st.max1RM) st.max1RM = rm;
          }
        });
      };

      (p.items || []).forEach(item => {
        recordHit(item.exerciseName, item.sets, item.weightType);
        if (item.isSuperSet) {
          if (item.superExerciseName) {
            const superSets2 = (item.sets || []).map(s => ({ weight: s.superWeight, reps: s.superReps, lReps: s.superLReps, rReps: s.superRReps }));
            recordHit(item.superExerciseName, superSets2, item.superWeightType);
          }
          if (item.superExerciseName3) {
            const superSets3 = (item.sets || []).map(s => ({ weight: s.superWeight3, reps: s.superReps3, lReps: s.superLReps3, rReps: s.superRReps3 }));
            recordHit(item.superExerciseName3, superSets3, item.superWeightType3);
          }
        }
      });
    });

    return { myExerciseStatsMap: stats, myGymUsageMap: gymCounts };
  }, [posts, currentUser]);

  // 参加中ジムを「よく使う順」にソート（ジムでの記録回数 ＋ そのジム所属種目の合計実施回数）
  const sortedJoinedGyms = useMemo(() => {
    const list = gyms.filter(g => joinedGyms.includes(g.id));
    const getGymScore = (g) => {
      const postHits = myGymUsageMap[g.name] || 0;
      const exHits = exercises
        .filter(ex => ex.gymId === g.id)
        .reduce((sum, ex) => sum + (myExerciseStatsMap[ex.name]?.count || 0), 0);
      return postHits * 1000 + exHits;
    };
    return [...list].sort((a, b) => getGymScore(b) - getGymScore(a));
  }, [gyms, joinedGyms, myGymUsageMap, exercises, myExerciseStatsMap]);

  const handleAddGym = async (e) => {
    e.preventDefault();
    if (!newGymName.trim()) return;
    setIsAdding(true);
    const newDocId = `gym_${Date.now()}`;
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', newDocId), { 
        name: newGymName.trim(), 
        createdAt: Date.now(),
        owner: currentUser,
        members: [currentUser]
      }); 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        joinedGyms: [...new Set([...joinedGyms, newDocId])] 
      }, { merge: true });
      setNewGymName(''); 
      setSelectedGymId(newDocId); 
    } catch (e) {}
    setIsAdding(false);
  };

  const handleUpdateGym = async (e, gymId) => {
    e.preventDefault();
    if (!editGymName.trim()) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { name: editGymName.trim() }, { merge: true }); setEditingGymId(null); } catch (e) {}
  };

  const handleJoinGym = async (gymId) => {
    if (joinedGyms.includes(gymId)) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        joinedGyms: [...new Set([...joinedGyms, gymId])] 
      }, { merge: true });
      
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym) {
        const members = targetGym.members || [];
        if (!members.includes(currentUser)) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { 
            members: [...members, currentUser] 
          }, { merge: true });
        }
      }
    } catch (e) {}
  };

  const handleLeaveGym = async (gymId) => {
    if (gymId === 'common') {
      alert("フリーウェイト（共通）グループは退会できません。");
      return;
    }
    if (!window.confirm("このジムグループから退会しますか？登録されているマシンなどの種目が表示されなくなります。")) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        joinedGyms: joinedGyms.filter(id => id !== gymId) 
      }, { merge: true });
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym) {
        const members = targetGym.members || [];
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { 
          members: members.filter(m => m !== currentUser) 
        }, { merge: true });
      }
    } catch (e) {}
  };

  const handleMuteExercise = async (exName) => {
    const newMuted = mutedExercises.includes(exName) 
      ? mutedExercises.filter(name => name !== exName) 
      : [...mutedExercises, exName];
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        mutedExercises: newMuted 
      }, { merge: true });
    } catch (e) {}
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!newExName.trim() || !selectedGymId) return;
    setIsAdding(true);
    const newDocId = `ex_${Date.now()}`;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', newDocId), { name: newExName.trim(), maker: newExMaker.trim(), gymId: selectedGymId, weightType: newExWeightType, category: newExCategory, freeWeightType: selectedGymId === 'common' ? newExFreeWeightType : null, createdAt: Date.now(), author: currentUser });
      setNewExName(''); setNewExMaker(''); setNewExWeightType('total'); setNewExCategory('胸'); setNewExFreeWeightType('barbell');
      setShowAddForm(false);
    } catch (e) {}
    setIsAdding(false);
  };

  const startEdit = (ex) => {
    setEditingExId(ex.id);
    setEditingExOldName(ex.name);
    setEditExName(ex.name);
    setEditExMaker(ex.maker || '');
    setEditExWeightType(ex.weightType || 'total');
    setEditExCategory(ex.category || 'その他');
    setEditingExGymId(ex.gymId || '');
    setEditExFreeWeightType(ex.freeWeightType || (ex.name.includes('ダンベル') ? 'dumbbell' : ex.name.includes('スミス') ? 'smith' : 'barbell'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setEditingExId(null); setEditingExOldName(''); };

  const handleUpdateExercise = async (e) => {
    e.preventDefault();
    if (!editExName.trim()) return;
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', editingExId), { name: editExName.trim(), maker: editExMaker.trim(), weightType: editExWeightType, category: editExCategory, gymId: editingExGymId, freeWeightType: editingExGymId === 'common' ? editExFreeWeightType : null }, { merge: true }); 

      if (posts && posts.length > 0) {
        const postsToUpdate = posts.filter(post => {
          if (!post.items) return false;
          return post.items.some(item => 
            item.exerciseName === editingExOldName || 
            item.superExerciseName === editingExOldName || 
            item.superExerciseName3 === editingExOldName
          );
        });

        if (postsToUpdate.length > 0) {
          const updatePromises = postsToUpdate.map(async (post) => {
            const updatedItems = post.items.map(item => {
              let newItem = { ...item };
              if (newItem.exerciseName === editingExOldName) {
                newItem.exerciseName = editExName.trim();
                newItem.category = editExCategory;
                newItem.weightType = editExWeightType;
              }
              if (newItem.isSuperSet && newItem.superExerciseName === editingExOldName) {
                newItem.superExerciseName = editExName.trim();
                newItem.superWeightType = editExWeightType;
              }
              if (newItem.isSuperSet && newItem.superExerciseName3 === editingExOldName) {
                newItem.superExerciseName3 = editExName.trim();
                newItem.superWeightType3 = editExWeightType;
              }
              return newItem;
            });

            const baseWeight = Number(post.bodyWeight) || Number(accountsInfo[post.author]?.weight) || 60;
            const { processedItems, totalVolume, totalCalories } = calculateWorkoutTotals(updatedItems, post.duration, baseWeight);
            const totalSets = processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);

            return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', post.id), {
              items: processedItems,
              volume: totalVolume,
              calories: totalCalories,
              totalSets: totalSets
            }, { merge: true });
          });
          
          await Promise.all(updatePromises);
        }
      }

      setEditingExId(null); 
      setEditingExOldName(''); 
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGym = async (gymId, gymName) => {
    if (!window.confirm(`${gymName}を削除しますか？登録されている種目や他の参加メンバーの所属情報も削除されます。`)) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId));
      const gymExs = exercises.filter(ex => ex.gymId === gymId);
      for (let ex of gymExs) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', ex.id));
      }
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym && targetGym.members) {
        for (let mId of targetGym.members) {
          const mInfo = accountsInfo[mId];
          if (mInfo && mInfo.joinedGyms) {
            const nextJoined = mInfo.joinedGyms.filter(id => id !== gymId);
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', mId), { joinedGyms: nextJoined }, { merge: true });
          } 
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteExercise = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', id)); } catch (e) {}
  };

  const myFriends = myInfo?.friends || [];
  
  const filteredGyms = gyms.filter(gym => {
    if (gym.id === 'common') return false;
    if (gymSearchQuery && !gym.name.toLowerCase().includes(gymSearchQuery.toLowerCase())) return false;
    return true;
  });

  const joinedGymsList = filteredGyms
    .filter(gym => joinedGyms.includes(gym.id))
    .sort((a, b) => (myGymUsageMap[b.name] || 0) - (myGymUsageMap[a.name] || 0));
  
  const friendGymsList = filteredGyms.filter(gym => {
    if (joinedGyms.includes(gym.id)) return false;
    return myFriends.some(f => (gym.members || []).includes(f) || gym.owner === f);
  });
  
  const otherGymsList = filteredGyms.filter(gym => {
    if (joinedGyms.includes(gym.id)) return false;
    if (myFriends.some(f => (gym.members || []).includes(f) || gym.owner === f)) return false;
    return true;
  });

  // 参加中ジムに属する有効な種目一覧
  const accessibleExercises = useMemo(() => {
    const joinedGymObjects = gyms.filter(g => joinedGyms.includes(g.id));
    const gymMap = new Map(joinedGymObjects.map(g => [g.id, g]));
    return exercises.filter(ex => {
      const gym = gymMap.get(ex.gymId);
      if (!gym) return false;
      if (ex.gymId === 'common') {
        if (ex.author && ex.author !== currentUser && ex.author !== MASTER_USER) return false;
      } else {
        if (ex.author && ex.author !== gym.owner && ex.author !== currentUser) return false;
      }
      return true;
    });
  }, [exercises, gyms, joinedGyms, currentUser]);

  const getExEquipmentType = (ex) => {
    if (ex.gymId !== 'common') return 'machine';
    return ex.freeWeightType || (ex.name?.includes('ダンベル') ? 'dumbbell' : ex.name?.includes('スミス') ? 'smith' : 'barbell');
  };

  const getExEquipmentBadge = (ex) => {
    const t = getExEquipmentType(ex);
    if (t === 'dumbbell') return { label: 'ダンベル', cls: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border-sky-200/70 dark:border-sky-800/70' };
    if (t === 'smith') return { label: 'スミス', cls: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/70 dark:border-purple-800/70' };
    if (t === 'barbell') return { label: 'バーベル', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/70' };
    return { label: 'マシン・器具', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  };

  // 部位別件数（現在のジムフィルタ・検索条件考慮）
  const categoryCounts = useMemo(() => {
    const counts = { all: 0 };
    MUSCLE_CATEGORIES.forEach(c => { counts[c] = 0; });
    const normQ = normalizeText(exerciseSearchQuery);

    accessibleExercises.forEach(ex => {
      if (filterGymId !== 'all' && ex.gymId !== filterGymId) return;
      if (!showMuted && mutedExercises.includes(ex.name)) return;
      if (filterEquipType !== 'all' && getExEquipmentType(ex) !== filterEquipType) return;
      if (normQ) {
        const hay = normalizeText(`${ex.name || ''} ${ex.maker || ''} ${ex.category || ''}`);
        if (!hay.includes(normQ)) return;
      }
      const cat = ex.category || 'その他';
      counts.all += 1;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [accessibleExercises, filterGymId, showMuted, mutedExercises, filterEquipType, exerciseSearchQuery]);

  const mutedCount = useMemo(() => {
    return accessibleExercises.filter(ex => mutedExercises.includes(ex.name)).length;
  }, [accessibleExercises, mutedExercises]);

  const renderDiscoverGymCard = (gym) => {
    const membersList = gym.members || [];
    const creatorName = accountsInfo[gym.owner]?.displayName || gym.owner || 'システム';
    const hasFriend = myFriends.some(f => membersList.includes(f) || gym.owner === f);
    return (
      <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden mb-3">
        {hasFriend && <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">フレンド参加中</div>}
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base truncate">{gym.name}</h4>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 truncate">作成者: {creatorName} ｜ メンバー: {membersList.length}名</div>
        </div>
        <button onClick={() => handleJoinGym(gym.id)} className="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1">
          <Plus size={14} /> 参加
        </button>
      </div>
    );
  };

  const renderExerciseCard = (ex, gym) => {
    const isMuted = mutedExercises.includes(ex.name);
    const canEdit = ex.gymId === 'common' ? (currentUser === MASTER_USER || ex.author === currentUser) : (ex.author === currentUser || gym.owner === currentUser);
    const stats = myExerciseStatsMap[ex.name];
    const equipBadge = getExEquipmentBadge(ex);
    const accentBorder = getCategoryBorderAccent(ex.category);

    const weightLabel = ex.weightType === 'oneSide'
      ? '片側(kg)'
      : ex.weightType === 'plate'
      ? 'プレート(枚)'
      : ex.weightType === 'lr'
      ? '左右別(kg)'
      : ex.weightType === 'bodyWeight'
      ? '自重(+/-kg)'
      : ex.weightType === 'cardio'
      ? '有酸素'
      : '合計(kg)';

    return (
      <div
        key={ex.id}
        onClick={() => setSelectedExerciseForChart(ex)}
        className={`p-3.5 flex justify-between items-center gap-3 group transition-all cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 border-l-4 ${accentBorder} ${isMuted ? 'opacity-45' : 'opacity-100'}`}
      >
        <div className="min-w-0 flex-1">
          {/* 1段目：種目名 ＋ 部位バッジ ＋ 編集可インジケーター */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-snug">
              {ex.name}
            </span>
            {ex.category && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(ex.category)}`}>
                {ex.category}
              </span>
            )}
            {canEdit && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="編集可能"></span>
            )}
            {isMuted && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                非表示中
              </span>
            )}
          </div>

          {/* 2段目：器具種別・メーカー・記録単位タグ */}
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${equipBadge.cls}`}>
              {equipBadge.label}
            </span>
            {ex.maker && (
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700/70">
                {ex.maker}
              </span>
            )}
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-900/60">
              {weightLabel}
            </span>
          </div>

          {/* 3段目：自分の実績サマリー（ベスト重量・1RM・実施回数・最終日） */}
          {stats && stats.count > 0 && (
            <div className="flex items-center flex-wrap gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/70 text-[11px] font-bold">
              {stats.bestSetStr && (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Award size={12} className="shrink-0" />
                  ベスト: {stats.bestSetStr}
                  {stats.max1RM > 0 && !stats.isCardio && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      (1RM {stats.max1RM}kg)
                    </span>
                  )}
                </span>
              )}
              <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                計{stats.count}回{stats.lastDate ? ` ・ 最終 ${stats.lastDate}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* 右側アクションボタン群 */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelectedExerciseForChart(ex); }}
            className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors"
            title="推移グラフを表示"
          >
            <TrendingUp size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleMuteExercise(ex.name); }}
            className={`p-2 rounded-xl transition-colors border ${
              isMuted
                ? 'text-indigo-500 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800'
                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700/70 hover:bg-slate-100'
            }`}
            title={isMuted ? 'リストに表示する' : 'リストから非表示にする'}
          >
            {isMuted ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          {((ex.gymId === 'common' && isAdmin) || ex.author === currentUser || (ex.gymId !== 'common' && gym.owner === currentUser)) && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startEdit(ex); }}
                className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200/70 dark:border-slate-700/70"
                title="種目を編集"
              >
                <Edit2 size={15} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (window.confirm(`${ex.name}を削除しますか？`)) handleDeleteExercise(ex.id); }}
                className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200/70 dark:border-slate-700/70"
                title="種目を削除"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">種目とジムの管理</h2>
      </div>
      
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
        <button onClick={() => setActiveTab('exercises')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'exercises' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
          種目リスト ({accessibleExercises.length})
        </button>
        <button onClick={() => setActiveTab('gyms')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'gyms' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
          ジムグループ ({joinedGymsList.length})
        </button>
      </div>

      {activeTab === 'gyms' && (
        <div className="space-y-6 animate-in fade-in">
          {myFriends.length === 0 && (
             <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-5 flex flex-col items-center text-center shadow-sm mb-6">
                <Users className="text-indigo-400 mb-2" size={28} />
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3">まずはフレンドを追加して、<br/>一緒にトレーニングを共有しましょう！</p>
                <button onClick={() => setCurrentTab('friends')} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2"><UserPlus size={16}/>フレンドを追加する</button>
             </div>
          )}

          <form onSubmit={handleAddGym} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">新しいジムグループを作成</h3>
            <div className="flex gap-2">
              <input type="text" value={newGymName} onChange={e => setNewGymName(e.target.value)} required placeholder="例: ビークイック八幡" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
              <button type="submit" disabled={isAdding || !newGymName.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 rounded-xl transition-colors disabled:opacity-50">作成</button>
            </div>
          </form>

          <div className="relative mb-6">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search size={18} className="text-slate-400" />
             </div>
             <input type="text" value={gymSearchQuery} onChange={e => setGymSearchQuery(e.target.value)} placeholder="ジムの名前で検索..." className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 shadow-sm" style={{ fontSize: '16px' }} />
             {gymSearchQuery && (
               <button onClick={() => setGymSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                 <X size={18} />
               </button>
             )}
          </div>

          {joinedGymsList.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 ml-1">参加中のジム</h3>
              <div className="space-y-3">
                {joinedGymsList.map(gym => {
                  const isOwner = gym.owner === currentUser;
                  const membersList = gym.members || [];
                  const creatorName = accountsInfo[gym.owner]?.displayName || gym.owner || 'システム';
                  return (
                    <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{gym.name}</span>
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">作成者: {creatorName}</div>
                        </div>
                        
                        <div className="flex gap-1">
                          {gym.id !== 'common' && (
                            <button onClick={() => setShowMembersGymId(showMembersGymId === gym.id ? null : gym.id)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                              メンバー ({membersList.length})
                            </button>
                          )}
                          {gym.id !== 'common' && isOwner && ( 
                            <>
                              <button onClick={() => { setEditingGymId(gym.id); setEditGymName(gym.name); }} className="p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteGym(gym.id, gym.name)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </>
                          )}
                          {gym.id !== 'common' && !isOwner && (
                            <button onClick={() => handleLeaveGym(gym.id)} className="px-3 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors">退会</button>
                          )}
                        </div>
                      </div>

                      {editingGymId === gym.id && (
                         <form onSubmit={(e) => handleUpdateGym(e, gym.id)} className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <input type="text" value={editGymName} onChange={(e) => setEditGymName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }} autoFocus />
                            <button type="submit" className="text-xs bg-emerald-500 text-white px-3 rounded-lg font-bold shadow-sm">保存</button>
                            <button type="button" onClick={() => setEditingGymId(null)} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 rounded-lg font-bold shadow-sm">キャンセル</button>
                         </form>
                      )}

                      {showMembersGymId === gym.id && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 animate-in fade-in">
                          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">参加中メンバー</div>
                          <div className="flex flex-wrap gap-3">
                            {membersList.map(mId => {
                              const mInfo = accountsInfo[mId];
                              const isMe = mId === currentUser;
                              const isFriend = (myInfo?.friends || []).includes(mId);
                              const hasRequested = (accountsInfo[mId]?.friendRequests || []).includes(currentUser);
                              
                              return (
                                <div key={mId} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 pl-2 pr-1.5 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                                  <UserAvatar userId={mId} accountsInfo={accountsInfo} size={20} className="border-transparent" onClick={onUserClick} />
                                  {renderUsernameWithBadge(mId, mInfo?.displayName, accountsInfo, "text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[80px]")}
                                  {!isMe && !isFriend && !hasRequested && (
                                    <button onClick={() => onSendRequest(mId)} className="ml-1 p-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors shrink-0" title="フレンド申請">
                                      <UserPlus size={12} />
                                    </button>
                                  )}
                                  {!isMe && !isFriend && hasRequested && (
                                     <span className="ml-1 text-[8px] font-bold text-slate-400 shrink-0 pr-1">申請済</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {friendGymsList.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 ml-1">フレンドが参加中のジム</h3>
              <div>
                {friendGymsList.map(gym => renderDiscoverGymCard(gym))}
              </div>
            </div>
          )}

          {otherGymsList.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 ml-1">その他のジム</h3>
              <div>
                {otherGymsList.map(gym => renderDiscoverGymCard(gym))}
              </div>
            </div>
          )}

          {joinedGymsList.length === 0 && friendGymsList.length === 0 && otherGymsList.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
              <MapPin className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">該当するジムが見つかりません。</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="space-y-4 animate-in fade-in">
          {sortedJoinedGyms.length === 0 ? (
            <div className="text-center py-8"><p className="text-slate-500 dark:text-slate-400 text-sm mb-4 font-bold">先に「ジムグループ」タブから所属するジムを決定してください。</p></div>
          ) : ( 
            <>
              {/* 種目編集フォーム または 折りたたみ式の新規種目登録フォーム */}
              {editingExId ? (
                <form onSubmit={handleUpdateExercise} className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 shadow-sm relative animate-in slide-in-from-top-4">
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2"><Edit2 size={16}/> 種目の編集</h3>
                  <button type="button" onClick={cancelEdit} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20}/></button>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">対象のジムグループ <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select value={editingExGymId} onChange={e => setEditingExGymId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                          {sortedJoinedGyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                      </div>
                    </div>
                    {editingExGymId === 'common' && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-2">
                         <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mb-2">
                           ※フリーウェイトとして登録できるのは「ダンベル」「バーベル（EZバー含む）」「スミス」のみです。
                         </p>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">フリーウェイトの種類 <span className="text-rose-500">*</span></label>
                         <div className="flex gap-2">
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExFreeWeightType === 'barbell' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="barbell" checked={editExFreeWeightType === 'barbell'} onChange={(e) => setEditExFreeWeightType(e.target.value)} className="hidden"/>バーベル</label>
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExFreeWeightType === 'dumbbell' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="dumbbell" checked={editExFreeWeightType === 'dumbbell'} onChange={(e) => setEditExFreeWeightType(e.target.value)} className="hidden"/>ダンベル</label>
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExFreeWeightType === 'smith' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="smith" checked={editExFreeWeightType === 'smith'} onChange={(e) => setEditExFreeWeightType(e.target.value)} className="hidden"/>スミス</label>
                         </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">部位カテゴリ</label>
                      <div className="relative">
                        <select value={editExCategory} onChange={e => setEditExCategory(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                          {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                      </div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">種目名 <span className="text-rose-500">*</span></label><input type="text" value={editExName} onChange={e => setEditExName(e.target.value)} required className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メーカー (任意)</label><input type="text" value={editExMaker} onChange={e => setEditExMaker(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">重さの単位/記録方法 <span className="text-rose-500">*</span></label>
                       <div className="grid grid-cols-2 gap-2">
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'total' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="total" checked={editExWeightType === 'total'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>合計 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'oneSide' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="oneSide" checked={editExWeightType === 'oneSide'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>片側 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'plate' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="plate" checked={editExWeightType === 'plate'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>プレートロード(枚)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'lr' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="lr" checked={editExWeightType === 'lr'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>片側種目 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'bodyWeight' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="bodyWeight" checked={editExWeightType === 'bodyWeight'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>自重種目(+kg,-kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'cardio' ? 'bg-cyan-500 text-white border-cyan-600' : 'bg-white dark:bg-slate-900 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-slate-300'}`}><input type="radio" value="cardio" checked={editExWeightType === 'cardio'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>有酸素(距離/時間/kcal)</label>
                       </div>
                    </div>
                    <button type="submit" disabled={!editExName.trim()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl mt-2 transition-colors disabled:opacity-50 shadow-md">更新して保存</button>
                  </div>
                </form>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(prev => !prev)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                        <Plus size={16} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">新しい種目を登録する</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">マシンやフリーウェイト種目を追加</span>
                      </div>
                    </div>
                    <div className="text-slate-400">
                      {showAddForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {showAddForm && (
                    <form onSubmit={handleAddExercise} className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          登録先のジムグループ <span className="text-rose-500">*</span>
                          {myInfo?.isTraining && myInfo?.currentGymId === selectedGymId && (
                            <span className="ml-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              現在トレーニング中のジム
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <select value={selectedGymId} onChange={e => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                            {sortedJoinedGyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                        </div>
                      </div>
                      {selectedGymId === 'common' && (
                        <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                           <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mb-2">
                             ※フリーウェイトとして登録できるのは「ダンベル」「バーベル（EZバー含む）」「スミス」のみです。
                           </p>
                           <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">フリーウェイトの種類 <span className="text-rose-500">*</span></label>
                           <div className="flex gap-2">
                             <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExFreeWeightType === 'barbell' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="barbell" checked={newExFreeWeightType === 'barbell'} onChange={(e) => setNewExFreeWeightType(e.target.value)} className="hidden"/>バーベル</label>
                             <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExFreeWeightType === 'dumbbell' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="dumbbell" checked={newExFreeWeightType === 'dumbbell'} onChange={(e) => setNewExFreeWeightType(e.target.value)} className="hidden"/>ダンベル</label>
                             <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExFreeWeightType === 'smith' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="smith" checked={newExFreeWeightType === 'smith'} onChange={(e) => setNewExFreeWeightType(e.target.value)} className="hidden"/>スミス</label>
                           </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">部位カテゴリ <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select value={newExCategory} onChange={e => setNewExCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                            {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                        </div>
                      </div>
                      <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">種目名 <span className="text-rose-500">*</span></label><input type="text" value={newExName} onChange={e => setNewExName(e.target.value)} required placeholder="例: ベンチプレス" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                      <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メーカー (任意)</label><input type="text" value={newExMaker} onChange={e => setNewExMaker(e.target.value)} placeholder="例: Hammer Strength" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">重さの単位/記録方法 <span className="text-rose-500">*</span></label>
                         <div className="grid grid-cols-2 gap-2">
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'total' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="total" checked={newExWeightType === 'total'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>合計 (kg)</label>
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'oneSide' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="oneSide" checked={newExWeightType === 'oneSide'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>片側 (kg)</label>
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'plate' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="plate" checked={newExWeightType === 'plate'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>プレートロード(枚)</label>
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'lr' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="lr" checked={newExWeightType === 'lr'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>片側種目 (kg)</label>
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'bodyWeight' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="bodyWeight" checked={newExWeightType === 'bodyWeight'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>自重種目(+kg,-kg)</label>
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'cardio' ? 'bg-cyan-50 dark:bg-cyan-950 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="cardio" checked={newExWeightType === 'cardio'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>有酸素(距離/時間/kcal)</label>
                         </div>
                      </div>
                      <button type="submit" disabled={isAdding || !newExName.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-3 rounded-xl mt-2 transition-colors disabled:opacity-50 shadow-sm">種目を登録</button>
                    </form>
                  )}
                </div>
              )}

              {/* 検索＆フィルタリングコントロールパネル（横スライドではなく一覧で並べて表示） */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-3.5">
                {/* 検索ボックス */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={17} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={exerciseSearchQuery}
                    onChange={e => setExerciseSearchQuery(e.target.value)}
                    placeholder="種目名・メーカー名で検索..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                    style={{ fontSize: '16px' }}
                  />
                  {exerciseSearchQuery && (
                    <button onClick={() => setExerciseSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* ジム・グループ選択ボタン（よく使う順・折り返し一覧表示） */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">ジム・器具グループ（よく使う順）</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterGymId('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        filterGymId === 'all'
                          ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      すべて
                    </button>
                    {sortedJoinedGyms.map(g => {
                      const active = filterGymId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setFilterGymId(active ? 'all' : g.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                            active
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                          }`}
                        >
                          {g.id === 'common' ? <Dumbbell size={12} /> : <MapPin size={12} />}
                          <span>{g.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 部位カテゴリ選択ボタン（横スライドではなくグリッド一覧で全表示） */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">部位カテゴリ</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterCategory('all')}
                      className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                        filterCategory === 'all'
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span>全部位</span>
                      <span className={`text-[10px] px-1 rounded-full ${filterCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'}`}>
                        {categoryCounts.all}
                      </span>
                    </button>
                    {MUSCLE_CATEGORIES.map(cat => {
                      const isSelected = filterCategory === cat;
                      const count = categoryCounts[cat] || 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFilterCategory(isSelected ? 'all' : cat)}
                          className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${getCategoryTabColor(cat, isSelected)}`}
                        >
                          {!isSelected && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getCategoryDotColor(cat)}`}></span>}
                          <span className="truncate">{cat}</span>
                          <span className={`text-[10px] px-1 rounded-full shrink-0 ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 器具タイプ ＆ 非表示種目切替バー（並び替えセレクターは廃止し常時よく使う順） */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { key: 'all', label: '全器具' },
                      { key: 'machine', label: 'マシン' },
                      { key: 'barbell', label: 'バーベル' },
                      { key: 'dumbbell', label: 'ダンベル' },
                      { key: 'smith', label: 'スミス' }
                    ].map(eq => (
                      <button
                        key={eq.key}
                        type="button"
                        onClick={() => setFilterEquipType(prev => prev === eq.key ? 'all' : eq.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          filterEquipType === eq.key
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {eq.label}
                      </button>
                    ))}
                  </div>

                  {mutedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowMuted(prev => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-colors ml-auto ${
                        showMuted
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <EyeOff size={11} /> 非表示({mutedCount})
                    </button>
                  )}
                </div>
              </div>

              {/* 種目一覧（よく使うジム順 × よく使う種目順） */}
              <div className="space-y-5">
                {(() => {
                  const normQ = normalizeText(exerciseSearchQuery);
                  const targetGyms = sortedJoinedGyms.filter(gym => filterGymId === 'all' || gym.id === filterGymId);
                  let totalRendered = 0;

                  const gymBlocks = targetGyms.map(gym => {
                    const gymExercises = accessibleExercises.filter(ex => {
                      if (ex.gymId !== gym.id) return false;
                      if (!showMuted && mutedExercises.includes(ex.name)) return false;
                      if (filterCategory !== 'all' && (ex.category || 'その他') !== filterCategory) return false;
                      if (filterEquipType !== 'all' && getExEquipmentType(ex) !== filterEquipType) return false;
                      if (normQ) {
                        const hay = normalizeText(`${ex.name || ''} ${ex.maker || ''} ${ex.category || ''}`);
                        if (!hay.includes(normQ)) return false;
                      }
                      return true;
                    });

                    if (gymExercises.length === 0) return null;
                    totalRendered += gymExercises.length;

                    // 常時「よく使う順」でソート（同数の場合は部位順 → 名前順）
                    const sortedList = [...gymExercises].sort((a, b) => {
                      const cA = myExerciseStatsMap[a.name]?.count || 0;
                      const cB = myExerciseStatsMap[b.name]?.count || 0;
                      if (cA !== cB) return cB - cA;
                      const idxA = MUSCLE_CATEGORIES.indexOf(a.category);
                      const idxB = MUSCLE_CATEGORIES.indexOf(b.category);
                      const catDiff = (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
                      if (catDiff !== 0) return catDiff;
                      return (a.name || '').localeCompare(b.name || '', 'ja');
                    });

                    return (
                      <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        {/* ジムヘッダー */}
                        <div className="bg-slate-100/80 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                            {gym.id === 'common' ? <Dumbbell size={15} className="text-emerald-500" /> : <MapPin size={15} className="text-emerald-500" />}
                            <span>{gym.name}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200/70 dark:border-slate-800">
                            {sortedList.length}種目
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {sortedList.map(ex => renderExerciseCard(ex, gym))}
                        </div>
                      </div>
                    );
                  });

                  if (totalRendered === 0) {
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
                        <Filter className="mx-auto text-slate-300 dark:text-slate-600 w-10 h-10 mb-2" />
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-3">条件に一致する種目がありません</p>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterGymId('all');
                            setFilterCategory('all');
                            setFilterEquipType('all');
                            setExerciseSearchQuery('');
                          }}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800"
                        >
                          フィルタをリセットする
                        </button>
                      </div>
                    );
                  }

                  return gymBlocks;
                })()}
              </div>
            </>
          )}
        </div>
      )}
      
      {selectedExerciseForChart && (
        <ExerciseChartModal
          exercise={selectedExerciseForChart}
          posts={posts}
          accountsInfo={accountsInfo}
          currentUser={currentUser}
          onClose={() => setSelectedExerciseForChart(null)}
        />
      )}
    </div>
  );
}

export {
  ExercisesView
};