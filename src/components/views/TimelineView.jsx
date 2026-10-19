// ============================================================================
// WithFit v2 - ホーム（タイムライン）画面 (TimelineView)
// すべて / 自分のみ / フレンド のフィルタリング＆通知からのスムーズスクロール対応
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Home, Dumbbell } from 'lucide-react';
import { PageHeader, SegmentedTabs, AdBanner } from '../common/UI';
import WorkoutCard from '../workout/WorkoutCard';

export default function TimelineView({
  posts,
  onToggleLike,
  onImport,
  currentUser,
  onDelete,
  onEdit,
  accountsInfo,
  onAddComment,
  onDeleteComment,
  onToggleCommentLike,
  onUserClick,
  scrollToPostId,
  setScrollToPostId
}) {
  const [displayLimit, setDisplayLimit] = useState(10);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'mine' | 'friends'

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (filterMode === 'mine') return posts.filter(p => p.author === currentUser);
    if (filterMode === 'friends') return posts.filter(p => p.author !== currentUser);
    return posts;
  }, [posts, filterMode, currentUser]);

  useEffect(() => {
    if (scrollToPostId) {
      setFilterMode('all');
      const postIndex = (posts || []).findIndex(p => p.id === scrollToPostId);
      if (postIndex !== -1 && postIndex >= displayLimit) {
        setDisplayLimit(postIndex + 5);
      }
      setTimeout(() => {
        const postEl = document.getElementById(`post-${scrollToPostId}`);
        if (postEl) {
          const headerOffset = 88;
          const elementPosition = postEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
        if (setScrollToPostId) setScrollToPostId(null);
      }, 250);
    }
  }, [scrollToPostId, posts, displayLimit, setScrollToPostId]);

  const displayedPosts = filteredPosts.slice(0, displayLimit);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <PageHeader
        icon={<Home size={18} />}
        title="タイムライン"
        subtitle="あなたとフレンドの最新トレーニング記録"
      />

      <SegmentedTabs
        tabs={[
          { id: 'all', label: 'すべて' },
          { id: 'mine', label: '自分の記録' },
          { id: 'friends', label: 'フレンド' }
        ]}
        activeTab={filterMode}
        onChange={(id) => { setFilterMode(id); setDisplayLimit(10); }}
      />

      {displayedPosts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center mt-6 shadow-sm">
          <Dumbbell className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
            該当するトレーニング記録がありません。<br />下の「記録」ボタンからワークアウトを始めましょう！
          </p>
        </div>
      ) : (
        <>
          {displayedPosts.map((post, index) => (
            <React.Fragment key={post.id}>
              <WorkoutCard
                post={post}
                currentUser={currentUser}
                accountsInfo={accountsInfo}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleLike={onToggleLike}
                onImport={onImport}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onToggleCommentLike={onToggleCommentLike}
                onUserClick={onUserClick}
              />
              {(index + 1) % 5 === 0 && <AdBanner />}
            </React.Fragment>
          ))}
          {filteredPosts.length > displayLimit && (
            <button
              type="button"
              onClick={() => setDisplayLimit(prev => prev + 10)}
              className="w-full py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-98 transition-all mt-4"
            >
              さらに表示する ({filteredPosts.length - displayLimit}件)
            </button>
          )}
        </>
      )}
    </div>
  );
}
