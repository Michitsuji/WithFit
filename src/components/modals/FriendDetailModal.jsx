import React from 'react';
import { X } from 'lucide-react';
import { renderUsernameWithBadge } from '../common/renderUsernameWithBadge';
import { DataView } from '../../views/DataView';

export function FriendDetailModal({ friendUsername, posts, accountsInfo, onClose, onToggleLike, onImport, currentUser, onAddComment, onDeleteComment, onToggleCommentLike }) {
  const friendInfo = accountsInfo[friendUsername] || {};

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center sm:items-center animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-slate-950 sm:rounded-3xl rounded-t-3xl flex flex-col h-[90vh] sm:h-[85vh] w-full sm:max-w-md overflow-hidden shadow-2xl relative">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 pt-safe">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-xs bg-slate-600 border border-slate-200 dark:border-slate-700">
                {friendInfo.photoUrl ? <img src={friendInfo.photoUrl} alt={friendUsername} className="w-full h-full object-cover" /> : friendInfo.displayName ? friendInfo.displayName.charAt(0).toUpperCase() : friendUsername.charAt(0).toUpperCase()}
             </div>
             <h2>{renderUsernameWithBadge(friendUsername, friendInfo.displayName, accountsInfo, "text-lg font-bold text-slate-800 dark:text-white")}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 sm:pb-4">
           {friendInfo.goal && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">目標</p>
                 <p className="text-sm text-slate-800 dark:text-slate-200 font-bold">{friendInfo.goal}</p>
              </div>
           )}

           <DataView posts={posts} currentUser={currentUser} targetUser={friendUsername} accountsInfo={accountsInfo} onImport={onImport} onToggleLike={onToggleLike} onAddComment={onAddComment} onDeleteComment={onDeleteComment} onToggleCommentLike={onToggleCommentLike} />
        </div>
      </div>
    </div>
  );
}

// --- 不具合・要望一覧モーダル ---
