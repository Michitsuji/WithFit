import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, ChevronLeft } from 'lucide-react';
import { UserAvatar } from '../common/ユーザーアバター';

export function UserProfileModal({ isOpen, onClose, targetUser, accountsInfo, currentUser, onSendRequest }) {
  const [view, setView] = useState('profile');

  useEffect(() => {
    if (isOpen) setView('profile');
  }, [isOpen]);

  if (!isOpen || !targetUser) return null;

  const userInfo = accountsInfo[targetUser] || {};
  const friends = userInfo.friends || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[80] flex flex-col items-center justify-center animate-in fade-in duration-200 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {view === 'profile' ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">プロフィール</h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <UserAvatar userId={targetUser} accountsInfo={accountsInfo} size={128} className="border-4 shadow-sm" />
              <div className="text-center w-full">
                <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{userInfo.displayName || targetUser}</div>
                {userInfo.goal && (
                  <div className="mt-3">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">目標</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 break-words">{userInfo.goal}</div>
                  </div>
                )}
              </div>
              <button onClick={() => setView('friends')} className="mt-4 flex items-center justify-center gap-2 w-full bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <Users size={18} /> フレンド: {friends.length}人
              </button>
              {targetUser !== currentUser && !(accountsInfo[currentUser]?.friends || []).includes(targetUser) && !(accountsInfo[targetUser]?.friendRequests || []).includes(currentUser) && (
                <button onClick={() => onSendRequest(targetUser)} className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                  <UserPlus size={18} /> フレンド申請
                </button>
              )}
              {targetUser !== currentUser && (accountsInfo[targetUser]?.friendRequests || []).includes(currentUser) && (
                <div className="w-full mt-2 text-center text-sm font-bold text-slate-400 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl">フレンド申請済み</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setView('profile')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">フレンド一覧</h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {friends.length === 0 ? (
                <div className="text-center text-sm font-bold text-slate-400 py-8">フレンドがいません</div>
              ) : (
                friends.map(fId => {
                  const fInfo = accountsInfo[fId];
                  const isMe = fId === currentUser;
                  const isMyFriend = (accountsInfo[currentUser]?.friends || []).includes(fId);
                  const hasRequested = (fInfo?.friendRequests || []).includes(currentUser);

                  return (
                    <div key={fId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <UserAvatar userId={fId} accountsInfo={accountsInfo} size={40} />
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{fInfo?.displayName || fId}</span>
                      </div>
                      {!isMe && !isMyFriend && !hasRequested && (
                        <button onClick={() => onSendRequest(fId)} className="shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors">
                          申請
                        </button>
                      )}
                      {!isMe && !isMyFriend && hasRequested && (
                        <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">申請済</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
