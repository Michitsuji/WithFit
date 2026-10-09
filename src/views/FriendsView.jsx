import React, { useState, useEffect, useMemo } from 'react';
import { Users, Trophy, Award, Copy, UserPlus, AlignLeft, Bell, Sparkles, Activity, Trash2, Flame, Circle } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { UserAvatar } from '../components/common/UserAvatar';
import { renderUsernameWithBadge } from '../components/common/renderUsernameWithBadge';
import { DataView } from './DataView';
import { ReportsModal } from '../components/modals/ReportsModal';
import { TimerDisplay } from '../components/common/TimerDisplay';
import { formatDateFromTimestamp } from '../utils/dateUtils';
import { MASTER_USER } from '../constants';

export function FriendsView({ currentUser, myInfo, accountsInfo, onSendRequest, onAccept, onReject, onRemoveFriend, onSendPartnerRequest, onAcceptPartnerRequest, onRejectPartnerRequest, onRemovePartner, onFriendClick, onGenerateFriendCode, posts, targetFriendTab, setTargetFriendTab, onSendTestPush }) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [reportsCount, setReportsCount] = useState(0);

  useEffect(() => {
    if (currentUser === MASTER_USER && db) {
      const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), (snap) => {
        setReportsCount(snap.size);
      });
      return () => unsub();
    }
  }, [currentUser]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchPartnerName, setSearchPartnerName] = useState('');
  const partnerName = myInfo?.partnerId;
  const partnerInfo = partnerName ? accountsInfo[partnerName] : null;
  const isPartnerEnabled = myInfo?.enablePartnerFeature || false;
  const [activeTab, setActiveTab] = useState(targetFriendTab || (isPartnerEnabled ? 'partner' : 'friends'));

  useEffect(() => {
    if (targetFriendTab) {
      setActiveTab(targetFriendTab);
      if (setTargetFriendTab) setTargetFriendTab(null);
    }
  }, [targetFriendTab, setTargetFriendTab]);
  const [rankingType, setRankingType] = useState('friends');
  const [isRankingExpanded, setIsRankingExpanded] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [testPushTarget, setTestPushTarget] = useState('');
  const [testPushMessage, setTestPushMessage] = useState('');

  const handlePartnerSearchSubmit = (e) => {
    e.preventDefault();
    onSendPartnerRequest(searchPartnerName.trim());
    setSearchPartnerName('');
  };

  const rankingData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const userVolumes = {};
    
    (posts || []).forEach(p => {
      const d = new Date(p.timestamp);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (userVolumes[p.author] === undefined) userVolumes[p.author] = 0;
        userVolumes[p.author] += Number(p.volume) || 0;
      }
    });

    if (userVolumes[currentUser] === undefined) userVolumes[currentUser] = 0;

    const myFriends = myInfo.friends || [];

    const allUsersArray = Object.entries(userVolumes)
      .map(([username, volume]) => ({
        username,
        volume,
        displayName: accountsInfo[username]?.displayName || username,
        photoUrl: accountsInfo[username]?.photoUrl || null
      }))
      .sort((a, b) => b.volume - a.volume);

    const friendRanking = allUsersArray.filter(u => u.username === currentUser || myFriends.includes(u.username));

    return { globalRanking: allUsersArray, friendRanking };
  }, [posts, currentUser, myInfo.friends, accountsInfo]);

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timerId);
  }, []);

  const getTimeAgo = (timestamp) => {
    if (!timestamp || timestamp === 0) return '不明';
    const diff = Math.max(0, currentTime - timestamp);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSendRequest(searchUsername.trim());
    setSearchUsername('');
  };

  const myFriends = myInfo.friends || [];

  let partnerPosts = [];
  let weightData = [];
  let fatData = [];
  let totalMonthVolume = 0;
  let myMonthVolume = 0;
  let partnerMonthVolume = 0;
  let myPercent = 0;
  let partnerPercent = 0;
  let partnerCompositionInfo = {};
  let partnerDailyCalories = 0;
  let dateLabel = '';
  let cardGradient = 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20'; 
  let iconBorder = 'border-slate-300';
  let badgeColor = 'bg-slate-400';
  let isPartnerTraining = false;
  let isPartnerOnline = false;
  let pLastActive = 0;

  if (partnerName && partnerInfo) {
      isPartnerTraining = partnerInfo.isTraining;
      pLastActive = partnerInfo.lastActive || 0;
      const pIsAppOnline = partnerInfo.isAppOnline !== false;
      isPartnerOnline = pIsAppOnline && pLastActive > 0 && (currentTime - pLastActive < 45000);

      if (isPartnerTraining) { cardGradient = 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/20'; iconBorder = 'border-orange-400'; badgeColor = isPartnerOnline ? 'bg-amber-400' : 'bg-slate-400'; } 
      else if (isPartnerOnline) { cardGradient = 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'; iconBorder = 'border-emerald-400'; badgeColor = 'bg-emerald-400'; }

      partnerPosts = posts ? posts.filter(p => p.author === partnerName) : [];
      weightData = partnerPosts.filter(p => p.bodyWeight && !isNaN(p.bodyWeight)).map(p => ({ date: p.date, value: Number(p.bodyWeight) })).reverse();
      fatData = partnerPosts.filter(p => p.bodyFat && !isNaN(p.bodyFat)).map(p => ({ date: p.date, value: Number(p.bodyFat) })).reverse();

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const currentMonthPosts = posts.filter(p => {
        const d = new Date(p.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      myMonthVolume = currentMonthPosts.filter(p => p.author === currentUser).reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
      partnerMonthVolume = currentMonthPosts.filter(p => p.author === partnerName).reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
      totalMonthVolume = myMonthVolume + partnerMonthVolume;
      const targetVolume = 500000; 
      
      myPercent = Math.min(100, (myMonthVolume / targetVolume) * 100);
      partnerPercent = Math.min(100 - myPercent, (partnerMonthVolume / targetVolume) * 100);

      const lastPartnerFat = partnerPosts.find(p => p.bodyFat);
      partnerCompositionInfo = { ...partnerInfo, lastFat: lastPartnerFat ? lastPartnerFat.bodyFat : null };

      const todayStr = formatDateFromTimestamp(Date.now());
      const todayPartnerPosts = partnerPosts.filter(p => formatDateFromTimestamp(p.timestamp) === todayStr);
      partnerDailyCalories = todayPartnerPosts.reduce((sum, p) => sum + (Number(p.calories) || 0), 0);
      dateLabel = todayStr.substring(5).replace('-', '/');
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">フレンド</h2>
      
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-6">
        {isPartnerEnabled && (
          <button onClick={() => setActiveTab('partner')} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${activeTab === 'partner' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>パートナー</button>
        )}
        <button onClick={() => setActiveTab('friends')} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${activeTab === 'friends' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>フレンド一覧</button>
        <button onClick={() => setActiveTab('add')} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${activeTab === 'add' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>フレンド追加</button>
      </div>

      {isPartnerEnabled && activeTab === 'partner' && (
        <div className="space-y-6 animate-in fade-in">
          {myInfo.partnerRequests && myInfo.partnerRequests.length > 0 && (
             <div className="mb-6 space-y-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">パートナー申請 承認待ち</h3>
                {myInfo.partnerRequests.map(reqUser => (
                   <div key={reqUser} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 overflow-hidden">
                            {accountsInfo[reqUser]?.photoUrl ? <img src={accountsInfo[reqUser].photoUrl} alt={reqUser} className="w-full h-full object-cover" /> : accountsInfo[reqUser]?.displayName ? accountsInfo[reqUser].displayName.charAt(0).toUpperCase() : reqUser.charAt(0).toUpperCase()}
                         </div>
                         {renderUsernameWithBadge(reqUser, accountsInfo[reqUser]?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100 text-sm")}
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => onAcceptPartnerRequest(reqUser)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors">承認</button>
                         <button onClick={() => onRejectPartnerRequest(reqUser)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors">拒否</button>
                      </div>
                   </div>
                ))}
             </div>
          )}

          {!partnerName && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                 <Users size={18} className="text-amber-500" /> パートナーを追加する
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-4">フレンドコードで検索するか、既存のフレンドからパートナー申請を送りましょう。パートナーは1人だけ設定できます。</p>
              
              <form onSubmit={handlePartnerSearchSubmit} className="flex gap-2 mb-6">
                <input type="text" value={searchPartnerName} onChange={e => setSearchPartnerName(e.target.value)} required placeholder="フレンドコードまたはユーザー名" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-amber-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
                <button type="submit" disabled={!searchPartnerName.trim()} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 rounded-xl transition-colors disabled:opacity-50 shadow-sm text-sm">申請</button>
              </form>

              {myFriends.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3">フレンドから選ぶ</h4>
                  <div className="space-y-2">
                    {myFriends.map(f => {
                       const fInfo = accountsInfo[f];
                       const hasRequested = (fInfo?.partnerRequests || []).includes(currentUser);
                       return (
                         <div key={f} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                           <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 overflow-hidden">
                                 {fInfo?.photoUrl ? <img src={fInfo.photoUrl} alt={f} className="w-full h-full object-cover" /> : fInfo?.displayName ? fInfo.displayName.charAt(0).toUpperCase() : f.charAt(0).toUpperCase()}
                              </div>
                              {renderUsernameWithBadge(f, fInfo?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-200 text-sm")}
                           </div>
                           {hasRequested ? (
                              <span className="text-[10px] font-bold text-slate-400 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg">申請済</span>
                           ) : (
                              <button onClick={() => onSendPartnerRequest(f)} className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">申請</button>
                           )}
                         </div>
                       )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {partnerName && partnerInfo && (
            <>
          <div className={`rounded-3xl p-6 relative overflow-hidden shadow-lg w-full text-white transition-colors duration-500 ${cardGradient}`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
            
            <div className="flex flex-col items-center justify-center text-center relative z-10 py-4">
              <div className="relative mb-4">
                <div className={`w-24 h-24 rounded-full bg-white border-4 ${iconBorder} shadow-xl flex items-center justify-center text-3xl font-bold overflow-hidden`}>
                  {partnerInfo.photoUrl ? <img src={partnerInfo.photoUrl} alt={partnerName} className="w-full h-full object-cover" /> : <span className="text-slate-800">{partnerName.charAt(0).toUpperCase()}</span>}
                </div>
                <div className={`absolute bottom-0 right-0 w-6 h-6 border-4 border-white rounded-full ${badgeColor} z-20`}></div>
              </div>
              <p className="font-bold text-2xl mb-1">{partnerInfo.displayName || partnerName}</p>
              
              {partnerInfo.goal && (
                 <div className="mt-2 bg-black/20 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm w-full max-w-[280px]">
                    <p className="text-white/80 text-xs mb-1">目標</p>
                    <p className="text-white break-words">{partnerInfo.goal}</p>
                 </div>
              )}

              {isPartnerTraining ? (
                <div className="mt-4 flex flex-col items-center gap-1.5 bg-black/30 px-4 py-2.5 rounded-2xl text-sm font-bold backdrop-blur-sm">
                    <div className="flex items-center gap-2"><Flame size={16} className={`${isPartnerOnline ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} /> トレーニング中 {isPartnerOnline ? '(オンライン)' : '(オフライン)'} <TimerDisplay startTime={partnerInfo.trainingStartTime} /></div>
                    {partnerInfo.currentExerciseName && <div className="text-[10px] text-amber-100 opacity-90 border-t border-white/20 pt-1 mt-1 w-full text-center">現在: {partnerInfo.currentExerciseName}</div>}
                </div>
              ) : isPartnerOnline ? (
                <div className="mt-4 inline-flex items-center gap-2 bg-black/30 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm"><Circle fill="currentColor" size={10} className="text-emerald-300 animate-pulse" /> オンライン</div>
              ) : (
                <div className="mt-4 inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm text-slate-200"><Circle fill="currentColor" size={10} className="text-slate-300" /> オフライン</div>
              )}
              {!isPartnerOnline && (
                <div className="mt-2 text-xs font-bold text-white/70">
                  最終アクセス: {getTimeAgo(pLastActive)}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="absolute top-2 right-2 text-white/20"><Trophy size={80}/></div>
             <div className="relative z-10">
               <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><Target size={20}/> 今月のふたりで500トンチャレンジ！</h3>
               <p className="text-xs text-indigo-100 font-bold mb-4">ふたりの合計総負荷量で500,000kgを目指そう！</p>
               
               <div className="flex justify-between items-end mb-2">
                  <span className="text-2xl font-bold">{totalMonthVolume.toLocaleString()} <span className="text-sm font-normal">kg</span></span>
                  <span className="text-sm font-bold text-indigo-200">/ 500,000 kg</span>
               </div>
               
               <div className="w-full h-4 bg-black/30 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${myPercent}%` }}></div>
                  <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: `${partnerPercent}%` }}></div>
               </div>
               
               <div className="flex justify-between items-center mt-3 text-xs font-bold">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400"></div>{currentUser}: {myMonthVolume.toLocaleString()}kg</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-400"></div>{partnerInfo.displayName || partnerName}: {partnerMonthVolume.toLocaleString()}kg</div>
               </div>
             </div>
          </div>
          

          <div className="mt-8 partner-data-view">
             <style>{`.partner-data-view > div > h2:first-child { display: none; }`}</style>
             <DataView 
               posts={posts} 
               currentUser={currentUser} 
               targetUser={partnerName} 
               accountsInfo={accountsInfo} 
               onToggleLike={() => {}} 
               onAddComment={() => {}} 
               onDeleteComment={() => {}} 
               onToggleCommentLike={() => {}} 
               onUserClick={onFriendClick} 
             />
          </div>

          <div className="mt-8 text-center pt-4 border-t border-slate-200 dark:border-slate-800">
             <button onClick={onRemovePartner} className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors">パートナーを解除する</button>
          </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">あなたのフレンドコード</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300 tracking-widest">{myInfo.friendCode || '未発行'}</p>
            </div>
            {myInfo.friendCode ? (
               <button onClick={() => { navigator.clipboard.writeText(myInfo.friendCode); alert('コピーしました'); }} className="p-2 bg-white dark:bg-slate-900 rounded-lg text-emerald-500 shadow-sm border border-emerald-100 dark:border-emerald-800 transition-colors hover:bg-emerald-100 dark:hover:bg-slate-800"><Copy size={18} /></button>
            ) : (
               <button onClick={onGenerateFriendCode} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-colors hover:bg-emerald-600">発行する</button>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
               <UserPlus size={18} className="text-emerald-500" /> フレンドコードで検索
            </h3>
            <div className="flex gap-2">
              <input type="text" value={searchUsername} onChange={e => setSearchUsername(e.target.value)} required placeholder="5桁のコードを入力" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
              <button type="submit" disabled={!searchUsername.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 rounded-xl transition-colors disabled:opacity-50 shadow-sm">追加</button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-bold">※追加したフレンドの記録はタイムラインやデータ画面に表示されます。</p>
          </form>

          {currentUser === MASTER_USER && (
            <>
              <button onClick={() => setShowReportsModal(true)} className="relative w-full py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center justify-center gap-2">
                <AlignLeft size={18} /> 【マスター限定】不具合報告一覧を見る
                {reportsCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    {reportsCount}
                  </div>
                )}
              </button>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-5 shadow-sm mt-4">
                <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                  <Bell size={18} /> 【マスター限定】プッシュ通知テスト
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">送信先フレンド</label>
                    <select 
                      value={testPushTarget} 
                      onChange={(e) => setTestPushTarget(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500 text-sm"
                    >
                      <option value="" disabled>送信先を選択</option>
                      {[currentUser, ...myFriends].map(f => (
                        <option key={f} value={f}>{accountsInfo[f]?.displayName || f}{f === currentUser ? ' (自分)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メッセージ内容</label>
                    <input 
                      type="text" 
                      value={testPushMessage} 
                      onChange={(e) => setTestPushMessage(e.target.value)} 
                      placeholder="テストメッセージを入力"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500 text-sm"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (onSendTestPush) onSendTestPush(testPushTarget, testPushMessage);
                      setTestPushMessage('');
                    }}
                    disabled={!testPushTarget || !testPushMessage.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 flex justify-center items-center"
                  >
                    通知を送信する
                  </button>
                </div>
              </div>
            </>
          )}

          {currentUser !== MASTER_USER && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!reportText.trim()) return;
              setIsSendingReport(true);
              const reportId = `report_${Date.now()}`;
              try {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', reportId), {
                  author: currentUser,
                  text: reportText.trim(),
                  timestamp: Date.now()
                });
                alert('不具合・ご要望を報告しました。ご協力ありがとうございます！');
                setReportText('');
              } catch (error) {
                console.error(error);
                alert('送信に失敗しました。');
              } finally {
                setIsSendingReport(false);
              }
            }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-500" /> 不具合・ご要望の報告
              </h3>
              <textarea 
                value={reportText} 
                onChange={e => setReportText(e.target.value)} 
                placeholder="不具合の動作や、追加してほしい機能などがあれば自由に入力してください。" 
                required 
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none" 
                rows={3} 
                style={{ fontSize: '14px' }}
              />
              <button 
                type="submit" 
                disabled={isSendingReport || !reportText.trim()} 
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
              >
                {isSendingReport ? <Activity size={16} className="animate-spin" /> : '報告を送信する'}
              </button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-5 text-white shadow-xl mb-6 overflow-hidden relative">
            <div className="absolute -right-6 -bottom-6 text-white/10 transform rotate-12 pointer-events-none">
              <Trophy size={140} />
            </div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Trophy className="text-amber-300 animate-bounce" size={18} />
                今月の総負荷ランキング
              </h3>
              <div className="flex bg-black/20 rounded-lg p-0.5">
                <button onClick={() => setRankingType('friends')} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${rankingType === 'friends' ? 'bg-white/20 text-white' : 'text-white/60'}`}>フレンド</button>
                <button onClick={() => setRankingType('global')} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${rankingType === 'global' ? 'bg-white/20 text-white' : 'text-white/60'}`}>全世界</button>
              </div>
            </div>
            <div className="space-y-2.5 relative z-10">
              {(rankingType === 'global' ? rankingData.globalRanking : rankingData.friendRanking).slice(0, isRankingExpanded ? 100 : 5).map((user, idx) => {
                const isMe = user.username === currentUser;
                let rankBadge = <span className="text-xs font-bold w-6 text-center text-white/70">{idx + 1}</span>;
                if (idx === 0) rankBadge = <Award className="text-amber-300 shrink-0" size={20} />;
                if (idx === 1) rankBadge = <Award className="text-slate-300 shrink-0" size={20} />;
                if (idx === 2) rankBadge = <Award className="text-amber-600 shrink-0" size={20} />;

                return (
                  <div key={user.username} className={`flex items-center justify-between p-2.5 rounded-2xl border backdrop-blur-md transition-all ${isMe ? 'bg-white/20 border-white/40 shadow-md' : 'bg-black/10 border-white/10 hover:bg-black/20'}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 flex justify-center items-center shrink-0">{rankBadge}</div>
                      <div className="w-7 h-7 rounded-full bg-white/20 border border-white/20 overflow-hidden flex items-center justify-center font-bold text-xs shrink-0">
                        {user.photoUrl ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" /> : user.displayName.charAt(0).toUpperCase()}
                      </div>
                      {renderUsernameWithBadge(user.username, user.displayName, accountsInfo, `text-xs font-bold truncate ${isMe ? 'text-amber-200' : ''}`)}
                    </div>
                    <span className="font-mono font-bold text-xs bg-black/20 px-2.5 py-1 rounded-full shrink-0">
                      {Math.round(user.volume).toLocaleString()}<span className="text-[9px] font-normal ml-0.5">kg</span>
                    </span>
                  </div>
                );
              })} 
              {(rankingType === 'global' ? rankingData.globalRanking : rankingData.friendRanking).length > 5 && (
                <button 
                  onClick={() => setIsRankingExpanded(!isRankingExpanded)} 
                  className="w-full mt-3 py-2.5 text-xs font-bold text-white/90 bg-black/20 hover:bg-black/30 rounded-xl transition-colors backdrop-blur-md border border-white/10 flex items-center justify-center gap-1"
                >
                  {isRankingExpanded ? <><ArrowUp size={14}/> 閉じる</> : <><ArrowDown size={14}/> もっと見る</>}
                </button>
              )}
            </div>
          </div>

          {myInfo.friendRequests && myInfo.friendRequests.length > 0 && (
             <div className="mb-6 space-y-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">承認待ち</h3>
                {myInfo.friendRequests.map(reqUser => (
                   <div key={reqUser} className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 overflow-hidden">
                            {accountsInfo[reqUser]?.photoUrl ? <img src={accountsInfo[reqUser].photoUrl} alt={reqUser} className="w-full h-full object-cover" /> : accountsInfo[reqUser]?.displayName ? accountsInfo[reqUser].displayName.charAt(0).toUpperCase() : reqUser.charAt(0).toUpperCase()}
                         </div>
                         {renderUsernameWithBadge(reqUser, accountsInfo[reqUser]?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100 text-sm")}
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => onAccept(reqUser)} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors">承認</button>
                         <button onClick={() => onReject(reqUser)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors">拒否</button>
                      </div>
                   </div>
                ))}
             </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg shrink-0 overflow-hidden" style={{ backgroundColor: myInfo?.userColor || '#10b981', border: `2px solid ${myInfo?.userColor || '#10b981'}` }}>
              {myInfo?.photoUrl ? <img src={myInfo.photoUrl} alt="" className="w-full h-full object-cover" /> : myInfo?.displayName ? myInfo.displayName.charAt(0).toUpperCase() : currentUser.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-base truncate">{myInfo?.displayName || currentUser}</span>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">あなた</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">{myInfo?.goal || '目標を設定してトレーニングを頑張りましょう'}</p>
            </div>
          </div>
          <div className="w-full h-px bg-slate-200 dark:bg-slate-800"></div>
          {myFriends.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
              <Users className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-bold">フレンドがいません。</p>
              <button onClick={() => setActiveTab('add')} className="mt-4 text-emerald-500 font-bold text-sm bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-900">フレンドを追加する</button>
            </div>
          ) : (
            myFriends.map(friendUsername => {
              const friendInfo = accountsInfo[friendUsername];
              if (!friendInfo) return null;
              
              const isTraining = friendInfo.isTraining;
              const lastActive = friendInfo.lastActive || 0;
              const isAppOnline = friendInfo.isAppOnline !== false;
              const isOnline = isAppOnline && lastActive > 0 && (currentTime - lastActive < 45000);

              return (
                <div key={friendUsername} onClick={() => onFriendClick && onFriendClick(friendUsername)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300 overflow-hidden">
                        {friendInfo.photoUrl ? <img src={friendInfo.photoUrl} alt={friendUsername} className="w-full h-full object-cover" /> : friendInfo.displayName ? friendInfo.displayName.charAt(0).toUpperCase() : friendUsername.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white dark:border-slate-900 rounded-full z-10 ${isTraining ? 'bg-amber-400' : isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
                    </div>
                    <div>
                      <h3>{renderUsernameWithBadge(friendUsername, friendInfo.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100")}</h3>
                      {isTraining ? (
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs text-amber-500 font-bold flex items-center gap-1"><Flame size={12}/>トレーニング中 {friendInfo.currentExerciseName ? `- ${friendInfo.currentExerciseName}` : ''}</p>
                          {!isOnline && <p className="text-[10px] text-slate-400 font-bold">最終アクセス: {getTimeAgo(lastActive)}</p>}
                        </div>
                      ) : isOnline ? (
                        <p className="text-xs text-emerald-500 font-bold">オンライン</p>
                      ) : (
                        <p className="text-xs text-slate-400 font-bold">最終アクセス: {getTimeAgo(lastActive)}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveFriend(friendUsername); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      <ReportsModal isOpen={showReportsModal} onClose={() => setShowReportsModal(false)} db={db} accountsInfo={accountsInfo} />

      <div className="mt-12 text-center pb-4 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">WithFit v1.0.0 (2026.10.7, 13:45, updated)</p>
      </div>
    </div>
  );
}

// --- フレンド詳細モーダル ---
