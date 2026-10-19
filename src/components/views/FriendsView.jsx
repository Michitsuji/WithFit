// ============================================================================
// WithFit v2 - フレンド＆パートナー＆月間ランキング画面 (FriendsView)
// 全画面でUserAvatar・IconButton・タッチ挙動を完全統一
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  Users, UserPlus, Trophy, Award, Target, Flame, Circle, Copy,
  Trash2, ArrowUp, ArrowDown, Bell, AlignLeft, MessageSquarePlus, Activity
} from 'lucide-react';
import { db, APP_ID, MASTER_USER } from '../../config/firebase';
import {
  PageHeader, SegmentedTabs, UserAvatar, renderUsernameWithBadge,
  IconButton, TimerDisplay
} from '../common/UI';
import DataView from './DataView';
import { ReportsModal } from '../modals/ProfileModals';

export default function FriendsView({
  currentUser,
  myInfo,
  accountsInfo,
  onSendRequest,
  onAccept,
  onReject,
  onRemoveFriend,
  onSendPartnerRequest,
  onAcceptPartnerRequest,
  onRejectPartnerRequest,
  onRemovePartner,
  onFriendClick,
  onUserClick,
  onGenerateFriendCode,
  posts,
  targetFriendTab,
  setTargetFriendTab,
  onSendTestPush
}) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [reportsCount, setReportsCount] = useState(0);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchPartnerName, setSearchPartnerName] = useState('');

  const partnerName = myInfo?.partnerId;
  const partnerInfo = partnerName ? accountsInfo[partnerName] : null;
  const isPartnerEnabled = myInfo?.enablePartnerFeature || false;
  const [activeTab, setActiveTab] = useState(targetFriendTab || (isPartnerEnabled ? 'partner' : 'friends'));

  const [rankingType, setRankingType] = useState('friends');
  const [isRankingExpanded, setIsRankingExpanded] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [testPushTarget, setTestPushTarget] = useState('');
  const [testPushMessage, setTestPushMessage] = useState('');

  useEffect(() => {
    if (currentUser === MASTER_USER && db) {
      const unsub = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'), (snap) => {
        setReportsCount(snap.size);
      });
      return () => unsub();
    }
  }, [currentUser]);

  useEffect(() => {
    if (targetFriendTab) {
      setActiveTab(targetFriendTab);
      if (setTargetFriendTab) setTargetFriendTab(null);
    }
  }, [targetFriendTab, setTargetFriendTab]);

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
        displayName: accountsInfo[username]?.displayName || username
      }))
      .sort((a, b) => b.volume - a.volume);

    const friendRanking = allUsersArray.filter(u => u.username === currentUser || myFriends.includes(u.username));
    return { globalRanking: allUsersArray, friendRanking };
  }, [posts, currentUser, myInfo.friends, accountsInfo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSendRequest(searchUsername.trim());
    setSearchUsername('');
  };

  const handlePartnerSearchSubmit = (e) => {
    e.preventDefault();
    onSendPartnerRequest(searchPartnerName.trim());
    setSearchPartnerName('');
  };

  const myFriends = myInfo.friends || [];
  const pendingReqCount = (myInfo.friendRequests?.length || 0) + (myInfo.partnerRequests?.length || 0);

  let totalMonthVolume = 0;
  let myMonthVolume = 0;
  let partnerMonthVolume = 0;
  let myPercent = 0;
  let partnerPercent = 0;
  let cardGradient = 'bg-gradient-to-br from-slate-500 to-slate-600';
  let isPartnerTraining = false;
  let isPartnerOnline = false;
  let pLastActive = 0;

  if (partnerName && partnerInfo) {
    isPartnerTraining = partnerInfo.isTraining;
    pLastActive = partnerInfo.lastActive || 0;
    const pIsAppOnline = partnerInfo.isAppOnline !== false;
    isPartnerOnline = pIsAppOnline && pLastActive > 0 && (currentTime - pLastActive < 45000);

    if (isPartnerTraining) {
      cardGradient = 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/20';
    } else if (isPartnerOnline) {
      cardGradient = 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20';
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthPosts = (posts || []).filter(p => {
      const d = new Date(p.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    myMonthVolume = currentMonthPosts.filter(p => p.author === currentUser).reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
    partnerMonthVolume = currentMonthPosts.filter(p => p.author === partnerName).reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
    totalMonthVolume = myMonthVolume + partnerMonthVolume;
    const targetVolume = 500000;
    myPercent = Math.min(100, (myMonthVolume / targetVolume) * 100);
    partnerPercent = Math.min(100 - myPercent, (partnerMonthVolume / targetVolume) * 100);
  }

  const tabs = [
    ...(isPartnerEnabled ? [{ id: 'partner', label: 'パートナー', badge: myInfo.partnerRequests?.length || 0 }] : []),
    { id: 'friends', label: 'フレンド一覧', badge: myInfo.friendRequests?.length || 0 },
    { id: 'add', label: 'フレンド追加' }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <PageHeader
        icon={<Users size={18} />}
        title="フレンド・ランキング"
        subtitle="仲間とトレーニング状況をシェアしてモチベーションUP"
      />

      <SegmentedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* パートナー画面 */}
      {isPartnerEnabled && activeTab === 'partner' && (
        <div className="space-y-6 animate-in fade-in">
          {myInfo.partnerRequests && myInfo.partnerRequests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-amber-600 dark:text-amber-400 ml-1">パートナー申請 承認待ち</h3>
              {myInfo.partnerRequests.map(reqUser => (
                <div key={reqUser} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <UserAvatar userId={reqUser} accountsInfo={accountsInfo} size={40} onClick={onUserClick} />
                    {renderUsernameWithBadge(reqUser, accountsInfo[reqUser]?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100 text-sm")}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onAcceptPartnerRequest(reqUser)} className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl">承認</button>
                    <button type="button" onClick={() => onRejectPartnerRequest(reqUser)} className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl">拒否</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!partnerName && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                <Users size={18} className="text-amber-500" /> パートナーを設定する
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-4">
                フレンドコードまたは既存のフレンドから1人だけ特別パートナーを設定し、月間500トンチャレンジに挑戦できます。
              </p>

              <form onSubmit={handlePartnerSearchSubmit} className="flex gap-2 mb-5">
                <input
                  type="text"
                  value={searchPartnerName}
                  onChange={e => setSearchPartnerName(e.target.value)}
                  required
                  placeholder="フレンドコードまたはユーザー名"
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:border-amber-500 focus:outline-none text-base"
                  style={{ fontSize: '16px' }}
                />
                <button type="submit" disabled={!searchPartnerName.trim()} className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold px-5 rounded-xl transition-all disabled:opacity-50 text-sm">
                  申請
                </button>
              </form>

              {myFriends.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 mb-2.5">フレンドから選ぶ</h4>
                  <div className="space-y-2">
                    {myFriends.map(f => {
                      const fInfo = accountsInfo[f];
                      const hasRequested = (fInfo?.partnerRequests || []).includes(currentUser);
                      return (
                        <div key={f} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar userId={f} accountsInfo={accountsInfo} size={34} onClick={onUserClick} />
                            {renderUsernameWithBadge(f, fInfo?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-200 text-sm")}
                          </div>
                          {hasRequested ? (
                            <span className="text-[11px] font-bold text-slate-400 px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg">申請済</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSendPartnerRequest(f)}
                              className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3.5 py-1.5 rounded-xl active:scale-95"
                            >
                              申請する
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {partnerName && partnerInfo && (
            <>
              <div className={`rounded-3xl p-6 relative overflow-hidden shadow-lg w-full text-white transition-colors duration-500 ${cardGradient}`}>
                <div className="flex flex-col items-center justify-center text-center relative z-10 py-2">
                  <div className="mb-3">
                    <UserAvatar
                      userId={partnerName}
                      accountsInfo={accountsInfo}
                      size={88}
                      statusDot={isPartnerTraining ? 'training' : isPartnerOnline ? 'online' : 'offline'}
                      onClick={onFriendClick}
                    />
                  </div>
                  <p className="font-extrabold text-2xl mb-1">{partnerInfo.displayName || partnerName}</p>

                  {partnerInfo.goal && (
                    <div className="mt-2 bg-black/20 px-4 py-2 rounded-2xl text-xs font-bold backdrop-blur-sm w-full max-w-[280px]">
                      <p className="text-white/75 text-[10px] mb-0.5">目標</p>
                      <p className="text-white break-words">{partnerInfo.goal}</p>
                    </div>
                  )}

                  {isPartnerTraining ? (
                    <div className="mt-3 flex flex-col items-center gap-1 bg-black/30 px-4 py-2 rounded-2xl text-xs font-bold backdrop-blur-sm">
                      <div className="flex items-center gap-1.5">
                        <Flame size={15} className="text-amber-300 animate-pulse" />
                        トレーニング中 <TimerDisplay startTime={partnerInfo.trainingStartTime} />
                      </div>
                      {partnerInfo.currentExerciseName && (
                        <div className="text-[10px] text-amber-100">現在: {partnerInfo.currentExerciseName}</div>
                      )}
                    </div>
                  ) : isPartnerOnline ? (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-black/25 px-3.5 py-1 rounded-full text-xs font-bold">
                      <Circle fill="currentColor" size={8} className="text-emerald-300 animate-pulse" /> オンライン
                    </div>
                  ) : (
                    <div className="mt-3 text-xs font-bold text-white/80">
                      最終アクセス: {getTimeAgo(pLastActive)}
                    </div>
                  )}
                </div>
              </div>

              {/* 500トンチャレンジ */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-2 right-2 text-white/15"><Trophy size={72} /></div>
                <div className="relative z-10">
                  <h3 className="font-extrabold text-base flex items-center gap-2 mb-1">
                    <Target size={18} /> 今月のふたりで500トンチャレンジ！
                  </h3>
                  <p className="text-xs text-indigo-100 font-bold mb-3">ふたりの合計総負荷量で 500,000kg を目指そう</p>
                  <div className="flex justify-between items-end mb-2 font-mono">
                    <span className="text-2xl font-extrabold">{totalMonthVolume.toLocaleString()} <span className="text-xs font-normal">kg</span></span>
                    <span className="text-xs font-bold text-indigo-200">/ 500,000 kg</span>
                  </div>
                  <div className="w-full h-3.5 bg-black/30 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: `${myPercent}%` }} />
                    <div className="h-full bg-rose-400 transition-all duration-700" style={{ width: `${partnerPercent}%` }} />
                  </div>
                  <div className="flex justify-between items-center mt-2.5 text-xs font-bold">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />{accountsInfo[currentUser]?.displayName || currentUser}: {myMonthVolume.toLocaleString()}kg</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400" />{partnerInfo.displayName || partnerName}: {partnerMonthVolume.toLocaleString()}kg</div>
                  </div>
                </div>
              </div>

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
                hideHeader={true}
              />

              <div className="text-center pt-2">
                <button type="button" onClick={onRemovePartner} className="text-xs font-bold text-slate-400 hover:text-rose-500">
                  パートナーを解除する
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* フレンド追加画面 */}
      {activeTab === 'add' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-3xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">あなたのフレンドコード</p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300 tracking-widest font-mono">
                {myInfo.friendCode || '未発行'}
              </p>
            </div>
            {myInfo.friendCode ? (
              <IconButton
                icon={<Copy size={18} />}
                variant="emerald"
                onClick={() => { navigator.clipboard.writeText(myInfo.friendCode); window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: 'フレンドコードをコピーしました' } })); }}
                className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-sm"
                title="コピー"
              />
            ) : (
              <button
                type="button"
                onClick={onGenerateFriendCode}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm active:scale-95"
              >
                発行する
              </button>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <UserPlus size={18} className="text-emerald-500" /> フレンドコードで検索・申請
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchUsername}
                onChange={e => setSearchUsername(e.target.value)}
                required
                placeholder="5桁のコードまたはユーザー名"
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 font-bold focus:border-emerald-500 focus:outline-none text-base"
                style={{ fontSize: '16px' }}
              />
              <button
                type="submit"
                disabled={!searchUsername.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold px-5 rounded-xl transition-all disabled:opacity-50 shadow-sm text-sm"
              >
                申請
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2.5 font-bold">
              ※フレンドになるとタイムラインやランキングでお互いの記録が共有されます。
            </p>
          </form>

          {currentUser === MASTER_USER ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowReportsModal(true)}
                className="relative w-full py-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl shadow-sm hover:bg-indigo-100 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <AlignLeft size={18} /> 【マスター管理】ご要望・不具合報告一覧
                {reportsCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {reportsCount}
                  </span>
                )}
              </button>

              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-3xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <Bell size={18} /> 【マスター管理】プッシュ通知テスト送信
                </h3>
                <div className="space-y-3">
                  <select
                    value={testPushTarget}
                    onChange={(e) => setTestPushTarget(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none text-sm"
                  >
                    <option value="" disabled>送信先を選択</option>
                    {[currentUser, ...myFriends].map(f => (
                      <option key={f} value={f}>{accountsInfo[f]?.displayName || f}{f === currentUser ? ' (自分)' : ''}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={testPushMessage}
                    onChange={(e) => setTestPushMessage(e.target.value)}
                    placeholder="テストメッセージを入力"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (onSendTestPush) onSendTestPush(testPushTarget, testPushMessage);
                      setTestPushMessage('');
                    }}
                    disabled={!testPushTarget || !testPushMessage.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold py-3 rounded-xl text-sm shadow-sm transition-all disabled:opacity-50"
                  >
                    通知を送信する
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reportText.trim() || !db) return;
                setIsSendingReport(true);
                const reportId = `report_${Date.now()}`;
                try {
                  await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', reportId), {
                    author: currentUser,
                    text: reportText.trim(),
                    timestamp: Date.now()
                  });
                  window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: 'ご報告ありがとうございます！開発者に送信されました。' } }));
                  setReportText('');
                } catch (error) {
                  window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: '送信に失敗しました。' } }));
                } finally {
                  setIsSendingReport(false);
                }
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-2">
                <MessageSquarePlus size={16} className="text-indigo-500" /> 不具合・ご要望の送信
              </h3>
              <textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="改善してほしい点や追加してほしい機能があれば気軽に入力してください。"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none resize-none"
                rows={3}
                style={{ fontSize: '16px' }}
              />
              <button
                type="submit"
                disabled={isSendingReport || !reportText.trim()}
                className="w-full bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white font-bold py-3 rounded-xl text-sm shadow-sm transition-all disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
              >
                {isSendingReport ? <Activity size={16} className="animate-spin" /> : '報告を送信する'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* フレンド一覧＆月間ランキング */}
      {activeTab === 'friends' && (
        <div className="space-y-4 animate-in fade-in">
          {/* 月間総負荷ランキング */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl overflow-hidden relative border border-indigo-500/20">
            <div className="absolute -right-6 -bottom-6 text-white/5 transform rotate-12 pointer-events-none">
              <Trophy size={140} />
            </div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Trophy className="text-amber-400" size={18} />
                今月の総負荷量ランキング
              </h3>
              <div className="flex bg-white/10 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setRankingType('friends')}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${rankingType === 'friends' ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/60'}`}
                >
                  フレンド
                </button>
                <button
                  type="button"
                  onClick={() => setRankingType('global')}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${rankingType === 'global' ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/60'}`}
                >
                  全体
                </button>
              </div>
            </div>
            <div className="space-y-2 relative z-10">
              {(rankingType === 'global' ? rankingData.globalRanking : rankingData.friendRanking).slice(0, isRankingExpanded ? 100 : 5).map((user, idx) => {
                const isMe = user.username === currentUser;
                let rankBadge = <span className="text-xs font-extrabold w-6 text-center text-white/60 font-mono">{idx + 1}</span>;
                if (idx === 0) rankBadge = <Award className="text-amber-400 shrink-0" size={20} />;
                if (idx === 1) rankBadge = <Award className="text-slate-300 shrink-0" size={20} />;
                if (idx === 2) rankBadge = <Award className="text-amber-600 shrink-0" size={20} />;

                return (
                  <div
                    key={user.username}
                    onClick={() => onUserClick && onUserClick(user.username)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border backdrop-blur-md cursor-pointer active:scale-98 transition-all ${
                      isMe ? 'bg-emerald-500/20 border-emerald-400/50 shadow-sm' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 flex justify-center items-center shrink-0">{rankBadge}</div>
                      <UserAvatar userId={user.username} accountsInfo={accountsInfo} size={30} onClick={onUserClick} />
                      {renderUsernameWithBadge(user.username, user.displayName, accountsInfo, `text-xs font-bold truncate ${isMe ? 'text-emerald-300' : 'text-white'}`)}
                    </div>
                    <span className="font-mono font-extrabold text-xs bg-black/30 px-2.5 py-1 rounded-full shrink-0 text-emerald-300">
                      {Math.round(user.volume).toLocaleString()}<span className="text-[9px] font-normal ml-0.5 text-white/70">kg</span>
                    </span>
                  </div>
                );
              })}
              {(rankingType === 'global' ? rankingData.globalRanking : rankingData.friendRanking).length > 5 && (
                <button
                  type="button"
                  onClick={() => setIsRankingExpanded(!isRankingExpanded)}
                  className="w-full mt-2 py-2 text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  {isRankingExpanded ? <><ArrowUp size={14} /> 閉じる</> : <><ArrowDown size={14} /> すべて表示</>}
                </button>
              )}
            </div>
          </div>

          {/* フレンド承認待ち */}
          {myInfo.friendRequests && myInfo.friendRequests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 ml-1">フレンド申請 承認待ち</h3>
              {myInfo.friendRequests.map(reqUser => (
                <div key={reqUser} className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <UserAvatar userId={reqUser} accountsInfo={accountsInfo} size={40} onClick={onUserClick} />
                    {renderUsernameWithBadge(reqUser, accountsInfo[reqUser]?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100 text-sm")}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onAccept(reqUser)} className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl">承認</button>
                    <button type="button" onClick={() => onReject(reqUser)} className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl">拒否</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 自分のプロフィールカード */}
          <div
            onClick={() => onUserClick && onUserClick(currentUser)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center gap-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-99 transition-all"
          >
            <UserAvatar
              userId={currentUser}
              accountsInfo={accountsInfo}
              size={48}
              statusDot={myInfo?.isTraining ? 'training' : 'online'}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {renderUsernameWithBadge(currentUser, myInfo?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100 text-base truncate")}
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800 shrink-0">
                  あなた
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">
                {myInfo?.goal || '目標を設定してトレーニングを頑張りましょう'}
              </p>
            </div>
          </div>

          {/* フレンド一覧 */}
          {myFriends.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
              <Users className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">まだフレンドがいません</p>
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                className="mt-4 text-white font-bold text-xs bg-emerald-500 hover:bg-emerald-600 active:scale-95 px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                フレンドを追加する
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myFriends.map(friendUsername => {
                const friendInfo = accountsInfo[friendUsername];
                if (!friendInfo) return null;

                const isTraining = friendInfo.isTraining;
                const lastActive = friendInfo.lastActive || 0;
                const isAppOnline = friendInfo.isAppOnline !== false;
                const isOnline = isAppOnline && lastActive > 0 && (currentTime - lastActive < 45000);

                return (
                  <div
                    key={friendUsername}
                    onClick={() => onFriendClick && onFriendClick(friendUsername)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-99 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <UserAvatar
                        userId={friendUsername}
                        accountsInfo={accountsInfo}
                        size={48}
                        statusDot={isTraining ? 'training' : isOnline ? 'online' : 'offline'}
                        onClick={onUserClick}
                      />
                      <div className="min-w-0">
                        {renderUsernameWithBadge(friendUsername, friendInfo.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-100 text-base")}
                        {isTraining ? (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <p className="text-xs text-amber-500 font-bold flex items-center gap-1">
                              <Flame size={12} /> トレーニング中 {friendInfo.currentExerciseName ? `- ${friendInfo.currentExerciseName}` : ''}
                            </p>
                          </div>
                        ) : isOnline ? (
                          <p className="text-xs text-emerald-500 font-bold mt-0.5">オンライン</p>
                        ) : (
                          <p className="text-xs text-slate-400 font-bold mt-0.5">最終アクセス: {getTimeAgo(lastActive)}</p>
                        )}
                      </div>
                    </div>
                    <IconButton
                      icon={<Trash2 size={17} />}
                      variant="danger"
                      onClick={(e) => { e.stopPropagation(); onRemoveFriend(friendUsername); }}
                      title="フレンド解除"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ReportsModal isOpen={showReportsModal} onClose={() => setShowReportsModal(false)} db={db} accountsInfo={accountsInfo} onUserClick={onUserClick} />

      <div className="mt-10 text-center pb-4 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">WithFit v2.0.0 — Unified Design Edition</p>
      </div>
    </div>
  );
}
