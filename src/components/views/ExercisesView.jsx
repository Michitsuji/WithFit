// ============================================================================
// WithFit v2 - 種目・ジムグループ管理画面 (ExercisesView)
// 全画面統一のアイコンカラー・タッチアニメーション・1RM成長チャート連携
// ============================================================================

import React, { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  Dumbbell, Users, UserPlus, Search, X, MapPin, Edit2, Trash2,
  EyeOff, Plus, TrendingUp
} from 'lucide-react';
import { db, APP_ID, MASTER_USER } from '../../config/firebase';
import { MUSCLE_CATEGORIES, getCategoryColor, WEIGHT_TYPE_LABELS } from '../../constants';
import { calculateWorkoutTotals } from '../../utils/helpers';
import { PageHeader, SegmentedTabs, UserAvatar, renderUsernameWithBadge, IconButton } from '../common/UI';
import ExerciseChartModal from '../charts/ExerciseChartModal';

export default function ExercisesView({
  gyms,
  exercises,
  posts,
  accountsInfo,
  currentUser,
  myInfo,
  setCurrentTab,
  onSendRequest,
  onUserClick
}) {
  const isAdmin = currentUser === MASTER_USER;
  const joinedGyms = myInfo?.joinedGyms || ['common'];
  const mutedExercises = myInfo?.mutedExercises || [];

  const [activeTab, setActiveTab] = useState('exercises');
  const [gymSearchQuery, setGymSearchQuery] = useState('');
  const [newGymName, setNewGymName] = useState('');
  const [selectedGymId, setSelectedGymId] = useState(isAdmin ? 'common' : (joinedGyms.find(id => id !== 'common') || 'common'));
  const [filterGymId, setFilterGymId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
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

  const handleAddGym = async (e) => {
    e.preventDefault();
    if (!newGymName.trim() || !db) return;
    setIsAdding(true);
    const newDocId = `gym_${Date.now()}`;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'gyms', newDocId), {
        name: newGymName.trim(),
        createdAt: Date.now(),
        owner: currentUser,
        members: [currentUser]
      });
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
        joinedGyms: [...new Set([...joinedGyms, newDocId])]
      }, { merge: true });
      setNewGymName('');
      setSelectedGymId(newDocId);
    } catch (e) {}
    setIsAdding(false);
  };

  const handleUpdateGym = async (e, gymId) => {
    e.preventDefault();
    if (!editGymName.trim() || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'gyms', gymId), { name: editGymName.trim() }, { merge: true });
      setEditingGymId(null);
    } catch (e) {}
  };

  const handleJoinGym = async (gymId) => {
    if (joinedGyms.includes(gymId) || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
        joinedGyms: [...new Set([...joinedGyms, gymId])]
      }, { merge: true });
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym) {
        const members = targetGym.members || [];
        if (!members.includes(currentUser)) {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'gyms', gymId), {
            members: [...members, currentUser]
          }, { merge: true });
        }
      }
    } catch (e) {}
  };

  const handleLeaveGym = async (gymId) => {
    if (gymId === 'common') {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "フリーウェイト（共通）グループは退会できません。" } }));
      return;
    }
    if (!window.confirm("このジムグループから退会しますか？") || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
        joinedGyms: joinedGyms.filter(id => id !== gymId)
      }, { merge: true });
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym) {
        const members = targetGym.members || [];
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'gyms', gymId), {
          members: members.filter(m => m !== currentUser)
        }, { merge: true });
      }
    } catch (e) {}
  };

  const handleMuteExercise = async (exName) => {
    if (!db) return;
    const newMuted = mutedExercises.includes(exName)
      ? mutedExercises.filter(name => name !== exName)
      : [...mutedExercises, exName];
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
        mutedExercises: newMuted
      }, { merge: true });
    } catch (e) {}
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!newExName.trim() || !selectedGymId || !db) return;
    setIsAdding(true);
    const newDocId = `ex_${Date.now()}`;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'exercises', newDocId), {
        name: newExName.trim(),
        maker: newExMaker.trim(),
        gymId: selectedGymId,
        weightType: newExWeightType,
        category: newExCategory,
        freeWeightType: selectedGymId === 'common' ? newExFreeWeightType : null,
        createdAt: Date.now(),
        author: currentUser
      });
      setNewExName('');
      setNewExMaker('');
      setNewExWeightType('total');
      setNewExCategory('胸');
      setNewExFreeWeightType('barbell');
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
    setEditingExGymId(ex.gymId || 'common');
    setEditExFreeWeightType(ex.freeWeightType || (ex.name.includes('ダンベル') ? 'dumbbell' : ex.name.includes('スミス') ? 'smith' : 'barbell'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => {
    setEditingExId(null);
    setEditingExOldName('');
  };

  const handleUpdateExercise = async (e) => {
    e.preventDefault();
    if (!editExName.trim() || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'exercises', editingExId), {
        name: editExName.trim(),
        maker: editExMaker.trim(),
        weightType: editExWeightType,
        category: editExCategory,
        gymId: editingExGymId,
        freeWeightType: editingExGymId === 'common' ? editExFreeWeightType : null
      }, { merge: true });

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

            return setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', post.id), {
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
    if (!window.confirm(`${gymName}を削除しますか？`) || !db) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'gyms', gymId));
      const gymExs = exercises.filter(ex => ex.gymId === gymId);
      for (let ex of gymExs) {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'exercises', ex.id));
      }
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym && targetGym.members) {
        for (let mId of targetGym.members) {
          const mInfo = accountsInfo[mId];
          if (mInfo && mInfo.joinedGyms) {
            const nextJoined = mInfo.joinedGyms.filter(id => id !== gymId);
            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', mId), { joinedGyms: nextJoined }, { merge: true });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteExercise = async (id) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'exercises', id));
    } catch (e) {}
  };

  const myFriends = myInfo?.friends || [];
  const filteredGyms = gyms.filter(gym => {
    if (gym.id === 'common') return false;
    if (gymSearchQuery && !gym.name.toLowerCase().includes(gymSearchQuery.toLowerCase())) return false;
    return true;
  });

  const joinedGymsList = filteredGyms.filter(gym => joinedGyms.includes(gym.id));
  const friendGymsList = filteredGyms.filter(gym => {
    if (joinedGyms.includes(gym.id)) return false;
    return myFriends.some(f => (gym.members || []).includes(f) || gym.owner === f);
  });
  const otherGymsList = filteredGyms.filter(gym => {
    if (joinedGyms.includes(gym.id)) return false;
    if (myFriends.some(f => (gym.members || []).includes(f) || gym.owner === f)) return false;
    return true;
  });

  const renderDiscoverGymCard = (gym) => {
    const membersList = gym.members || [];
    const creatorName = accountsInfo[gym.owner]?.displayName || gym.owner || 'システム';
    const hasFriend = myFriends.some(f => membersList.includes(f) || gym.owner === f);
    return (
      <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden mb-3">
        {hasFriend && (
          <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[9px] font-bold px-2.5 py-0.5 rounded-bl-xl">
            フレンド参加中
          </div>
        )}
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">{gym.name}</h4>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5 truncate">
            作成者: {creatorName} ｜ メンバー: {membersList.length}名
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleJoinGym(gym.id)}
          className="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
        >
          <Plus size={14} /> 参加する
        </button>
      </div>
    );
  };

  const renderWeightTypeSelector = (value, onChange) => (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(WEIGHT_TYPE_LABELS).map(([wKey, wLabel]) => {
        const isSelected = value === wKey;
        const isCardio = wKey === 'cardio';
        return (
          <button
            key={wKey}
            type="button"
            onClick={() => onChange(wKey)}
            className={`text-center py-2 px-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
              isSelected
                ? (isCardio ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm' : 'bg-emerald-500 text-white border-emerald-500 shadow-sm')
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {wLabel}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <PageHeader
        icon={<Dumbbell size={18} />}
        title="種目・ジム管理"
        subtitle="種目をタップすると推定1RMの成長グラフを確認できます"
      />

      <SegmentedTabs
        tabs={[
          { id: 'exercises', label: '種目リスト' },
          { id: 'gyms', label: 'ジムグループ' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'gyms' && (
        <div className="space-y-5 animate-in fade-in">
          {myFriends.length === 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-3xl p-5 flex flex-col items-center text-center shadow-sm">
              <Users className="text-indigo-500 mb-2" size={26} />
              <p className="text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3">
                フレンドを追加して、同じジムのマシンや種目を共有しましょう！
              </p>
              <button
                type="button"
                onClick={() => setCurrentTab('friends')}
                className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                <UserPlus size={15} /> フレンドを追加する
              </button>
            </div>
          )}

          <form onSubmit={handleAddGym} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">新しいジムグループを作成</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGymName}
                onChange={e => setNewGymName(e.target.value)}
                required
                placeholder="例: エニタイム草津 / ゴールドジム"
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:border-emerald-500 focus:outline-none text-base"
                style={{ fontSize: '16px' }}
              />
              <button
                type="submit"
                disabled={isAdding || !newGymName.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-sm font-bold px-5 rounded-xl transition-all disabled:opacity-50 shadow-sm"
              >
                作成
              </button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={17} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={gymSearchQuery}
              onChange={e => setGymSearchQuery(e.target.value)}
              placeholder="ジムの名前で検索..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
              style={{ fontSize: '16px' }}
            />
            {gymSearchQuery && (
              <div className="absolute inset-y-0 right-1 flex items-center">
                <IconButton icon={<X size={16} />} variant="default" size="sm" onClick={() => setGymSearchQuery('')} />
              </div>
            )}
          </div>

          {joinedGymsList.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2.5 ml-1">参加中のジムグループ</h3>
              <div className="space-y-3">
                {joinedGymsList.map(gym => {
                  const isOwner = gym.owner === currentUser;
                  const membersList = gym.members || [];
                  const creatorName = accountsInfo[gym.owner]?.displayName || gym.owner || 'システム';
                  return (
                    <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{gym.name}</span>
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">作成者: {creatorName}</div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {gym.id !== 'common' && (
                            <button
                              type="button"
                              onClick={() => setShowMembersGymId(showMembersGymId === gym.id ? null : gym.id)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 active:scale-95 transition-all"
                            >
                              メンバー ({membersList.length})
                            </button>
                          )}
                          {gym.id !== 'common' && isOwner && (
                            <>
                              <IconButton icon={<Edit2 size={16} />} variant="emerald" size="sm" onClick={() => { setEditingGymId(gym.id); setEditGymName(gym.name); }} />
                              <IconButton icon={<Trash2 size={16} />} variant="danger" size="sm" onClick={() => handleDeleteGym(gym.id, gym.name)} />
                            </>
                          )}
                          {gym.id !== 'common' && !isOwner && (
                            <button
                              type="button"
                              onClick={() => handleLeaveGym(gym.id)}
                              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900 active:scale-95 transition-all"
                            >
                              退会
                            </button>
                          )}
                        </div>
                      </div>

                      {editingGymId === gym.id && (
                        <form onSubmit={(e) => handleUpdateGym(e, gym.id)} className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <input
                            type="text"
                            value={editGymName}
                            onChange={(e) => setEditGymName(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-800 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none text-base"
                            style={{ fontSize: '16px' }}
                            autoFocus
                          />
                          <button type="submit" className="text-xs bg-emerald-500 text-white px-3.5 rounded-xl font-bold active:scale-95">保存</button>
                          <button type="button" onClick={() => setEditingGymId(null)} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 rounded-xl font-bold">取消</button>
                        </form>
                      )}

                      {showMembersGymId === gym.id && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 animate-in fade-in">
                          <div className="text-xs font-bold text-slate-400 mb-2">参加中メンバー</div>
                          <div className="flex flex-wrap gap-2">
                            {membersList.map(mId => {
                              const mInfo = accountsInfo[mId];
                              const isMe = mId === currentUser;
                              const isFriend = (myInfo?.friends || []).includes(mId);
                              const hasRequested = (accountsInfo[mId]?.friendRequests || []).includes(currentUser);
                              return (
                                <div key={mId} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 pl-2 pr-2 py-1 rounded-full border border-slate-200/70 dark:border-slate-800">
                                  <UserAvatar userId={mId} accountsInfo={accountsInfo} size={22} onClick={onUserClick} />
                                  {renderUsernameWithBadge(mId, mInfo?.displayName, accountsInfo, "text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[90px]")}
                                  {!isMe && !isFriend && !hasRequested && (
                                    <IconButton icon={<UserPlus size={12} />} variant="emerald" size="sm" onClick={() => onSendRequest(mId)} title="フレンド申請" />
                                  )}
                                  {!isMe && !isFriend && hasRequested && (
                                    <span className="text-[9px] font-bold text-slate-400 pl-1">申請済</span>
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
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2.5 ml-1">フレンドが参加中のジム</h3>
              {friendGymsList.map(gym => renderDiscoverGymCard(gym))}
            </div>
          )}

          {otherGymsList.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2.5 ml-1">その他のジム</h3>
              {otherGymsList.map(gym => renderDiscoverGymCard(gym))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="space-y-5 animate-in fade-in">
          {editingExId ? (
            <form onSubmit={handleUpdateExercise} className="bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 rounded-3xl p-4 sm:p-5 shadow-sm relative">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Edit2 size={16} /> 種目の編集
                </h3>
                <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={cancelEdit} />
              </div>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">対象のジムグループ</label>
                  <div className="relative">
                    <select value={editingExGymId} onChange={e => setEditingExGymId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none text-base" style={{ fontSize: '16px' }}>
                      {gyms.filter(g => joinedGyms.includes(g.id)).map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                  </div>
                </div>
                {editingExGymId === 'common' && (
                  <div className="flex gap-2">
                    {[
                      { id: 'barbell', label: 'バーベル' },
                      { id: 'dumbbell', label: 'ダンベル' },
                      { id: 'smith', label: 'スミス' }
                    ].map(fw => (
                      <button
                        key={fw.id}
                        type="button"
                        onClick={() => setEditExFreeWeightType(fw.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                          editExFreeWeightType === fw.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {fw.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">部位カテゴリ</label>
                    <div className="relative">
                      <select value={editExCategory} onChange={e => setEditExCategory(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none text-base" style={{ fontSize: '16px' }}>
                        {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">メーカー (任意)</label>
                    <input type="text" value={editExMaker} onChange={e => setEditExMaker(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none text-base" style={{ fontSize: '16px' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">種目名</label>
                  <input type="text" value={editExName} onChange={e => setEditExName(e.target.value)} required className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none text-base" style={{ fontSize: '16px' }} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">重さの単位 / 記録方法</label>
                  {renderWeightTypeSelector(editExWeightType, setEditExWeightType)}
                </div>
                <button type="submit" disabled={!editExName.trim()} className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-sm font-bold py-3.5 rounded-2xl shadow-md transition-all">
                  変更を保存する（過去の記録名も自動更新）
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddExercise} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-3.5 flex items-center gap-1.5">
                <Plus size={16} className="text-emerald-500" /> 新しい種目を登録
              </h3>
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">登録先グループ</label>
                    <div className="relative">
                      <select value={selectedGymId} onChange={e => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-sm" style={{ fontSize: '16px' }}>
                        {gyms.filter(g => joinedGyms.includes(g.id)).map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">部位カテゴリ</label>
                    <div className="relative">
                      <select value={newExCategory} onChange={e => setNewExCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-sm" style={{ fontSize: '16px' }}>
                        {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                    </div>
                  </div>
                </div>

                {selectedGymId === 'common' && (
                  <div className="flex gap-2">
                    {[
                      { id: 'barbell', label: 'バーベル' },
                      { id: 'dumbbell', label: 'ダンベル' },
                      { id: 'smith', label: 'スミス' }
                    ].map(fw => (
                      <button
                        key={fw.id}
                        type="button"
                        onClick={() => setNewExFreeWeightType(fw.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                          newExFreeWeightType === fw.id ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {fw.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">種目名 *</label>
                    <input type="text" value={newExName} onChange={e => setNewExName(e.target.value)} required placeholder="例: インクラインベンチ" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-bold focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メーカー</label>
                    <input type="text" value={newExMaker} onChange={e => setNewExMaker(e.target.value)} placeholder="任意" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-slate-800 dark:text-slate-100 font-bold focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">重さの単位 / 記録方法</label>
                  {renderWeightTypeSelector(newExWeightType, setNewExWeightType)}
                </div>

                <button type="submit" disabled={isAdding || !newExName.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white text-sm font-bold py-3.5 rounded-2xl transition-all disabled:opacity-50 shadow-sm">
                  種目を登録する
                </button>
              </div>
            </form>
          )}

          {/* 検索・フィルタ・一覧 */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search size={17} className="text-slate-400" />
              </div>
              <input
                type="text"
                value={exerciseSearchQuery}
                onChange={e => setExerciseSearchQuery(e.target.value)}
                placeholder="種目名で検索..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
                style={{ fontSize: '16px' }}
              />
              {exerciseSearchQuery && (
                <div className="absolute inset-y-0 right-1 flex items-center">
                  <IconButton icon={<X size={16} />} variant="default" size="sm" onClick={() => setExerciseSearchQuery('')} />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <select value={filterGymId} onChange={e => setFilterGymId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 font-bold appearance-none focus:outline-none text-xs">
                  <option value="all">すべてのジム・器具</option>
                  {gyms.filter(g => joinedGyms.includes(g.id)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
              </div>
              <div className="relative flex-1">
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 font-bold appearance-none focus:outline-none text-xs">
                  <option value="all">すべての部位</option>
                  {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
              </div>
            </div>

            <div className="space-y-4">
              {gyms.filter(gym => joinedGyms.includes(gym.id) && (filterGymId === 'all' || gym.id === filterGymId)).map(gym => {
                const gymExercises = exercises.filter(ex => {
                  if (ex.gymId !== gym.id) return false;
                  if (filterCategory !== 'all' && ex.category !== filterCategory) return false;
                  if (exerciseSearchQuery && !ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase())) return false;
                  if (ex.gymId === 'common') {
                    if (ex.author && ex.author !== currentUser && ex.author !== MASTER_USER) return false;
                  } else {
                    if (ex.author && ex.author !== gym.owner && ex.author !== currentUser) return false;
                  }
                  return true;
                }).sort((a, b) => {
                  const idxA = MUSCLE_CATEGORIES.indexOf(a.category);
                  const idxB = MUSCLE_CATEGORIES.indexOf(b.category);
                  return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
                });
                if (gymExercises.length === 0) return null;

                return (
                  <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-500" /> {gym.name} ({gymExercises.length}種目)
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gymExercises.map(ex => {
                        const isMuted = mutedExercises.includes(ex.name);
                        const canEdit = ex.gymId === 'common' ? (currentUser === MASTER_USER || ex.author === currentUser) : (ex.author === currentUser || gym.owner === currentUser);

                        return (
                          <div
                            key={ex.id}
                            onClick={() => setSelectedExerciseForChart(ex)}
                            className={`p-3.5 flex justify-between items-center transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 ${
                              canEdit ? 'border-l-emerald-400' : 'border-l-slate-300 dark:border-l-slate-700'
                            } ${isMuted ? 'opacity-45' : ''}`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5 flex-wrap">
                                <span>{ex.name}</span>
                                {ex.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${getCategoryColor(ex.category)}`}>{ex.category}</span>}
                                {isMuted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-500">非表示中</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {ex.maker && <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{ex.maker}</span>}
                                {ex.weightType && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    {WEIGHT_TYPE_LABELS[ex.weightType] || '合計(kg)'}
                                  </span>
                                )}
                                <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-0.5">
                                  <TrendingUp size={10} /> 1RM推移
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              <IconButton
                                icon={<EyeOff size={15} />}
                                variant={isMuted ? 'indigo' : 'default'}
                                size="sm"
                                onClick={() => handleMuteExercise(ex.name)}
                                title={isMuted ? '再表示する' : '記録画面で非表示にする'}
                              />
                              {canEdit && (
                                <>
                                  <IconButton icon={<Edit2 size={15} />} variant="emerald" size="sm" onClick={() => startEdit(ex)} title="編集" />
                                  <IconButton
                                    icon={<Trash2 size={15} />}
                                    variant="danger"
                                    size="sm"
                                    onClick={() => { if (window.confirm(`${ex.name}を削除しますか？`)) handleDeleteExercise(ex.id); }}
                                    title="削除"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
