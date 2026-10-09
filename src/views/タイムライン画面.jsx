import React, { useState, useEffect } from 'react';
import { Dumbbell } from 'lucide-react';
import { WorkoutCard } from '../components/workout/ワークアウトカード';
import { AdBanner } from '../components/common/広告バナー';

export function TimelineView({ posts, onToggleLike, onImport, currentUser, onDelete, onEdit, accountsInfo, onAddComment, onDeleteComment, onToggleCommentLike, onUserClick, scrollToPostId, setScrollToPostId }) {
  const [displayLimit, setDisplayLimit] = useState(10);

  useEffect(() => {
    if (scrollToPostId) {
       const postIndex = posts.findIndex(p => p.id === scrollToPostId);
       if (postIndex !== -1 && postIndex >= displayLimit) {
           setDisplayLimit(postIndex + 5);
       }
       setTimeout(() => {
         const postEl = document.getElementById(`post-${scrollToPostId}`);
         if (postEl) {
            const headerOffset = 80;
            const elementPosition = postEl.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
                 top: offsetPosition,
                 behavior: 'smooth'
            });
         }
         if (setScrollToPostId) setScrollToPostId(null);
       }, 300);
    }
  }, [scrollToPostId, posts, displayLimit, setScrollToPostId]);

  const displayedPosts = posts.slice(0, displayLimit);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">タイムライン</h2>
      {!posts || posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center mt-10 shadow-sm">
          <Dumbbell className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-bold">まだ記録がありません。<br/>最初のトレーニングを記録しましょう！</p>
        </div>
      ) : (
        <>
          {displayedPosts.map((post, index) => (
            <React.Fragment key={post.id}>
              <WorkoutCard post={post} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={onEdit} onDelete={onDelete} onToggleLike={onToggleLike} onImport={onImport} onAddComment={onAddComment} onDeleteComment={onDeleteComment} onToggleCommentLike={onToggleCommentLike} onUserClick={onUserClick} />
              {(index + 1) % 5 === 0 && <AdBanner />}
            </React.Fragment>
          ))}
          {posts.length > displayLimit && (
            <button onClick={() => setDisplayLimit(prev => prev + 10)} className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mt-4">
              もっと見る
            </button>
          )}
        </>
      )}
    </div>
  );
}

// --- 月間レポートコンポーネント ---
