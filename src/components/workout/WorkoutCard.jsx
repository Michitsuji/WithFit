// ============================================================================
// WithFit v2 - ワークアウト記録カード (WorkoutCard)
// タイムライン・データ画面・フレンド詳細で完全統一されたカードUI
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart, Dumbbell, Activity, Flame, Trash2, X, ListPlus, MapPin, Clock,
  Play, Edit2, AlignLeft, Scale, Calendar as CalendarIcon, Zap, Copy,
  ArrowUp, ArrowDown, MessageCircle, Send, MoreVertical, FileText
} from 'lucide-react';
import { UserAvatar, renderUsernameWithBadge, IconButton } from '../common/UI';
import { getCategoryColor } from '../../constants';
import {
  generateColor, getRelativeTime, formatDuration, formatShortDateTime,
  calculateWorkoutTotals, getVolumeMetaphor, exportWorkoutToText, calc1RM
} from '../../utils/helpers';

export default function WorkoutCard({
  post,
  currentUser,
  accountsInfo,
  onEdit,
  onDelete,
  onToggleLike,
  onImport,
  onAddComment,
  onDeleteComment,
  onToggleCommentLike,
  onUserClick
}) {
  const [localComments, setLocalComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState((post.comments || []).length > 0);
  const [commentText, setCommentText] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [replyingToId, setReplyingToId] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [activeCardIdx, setActiveCardIdx] = useState(0);

  const textareaRef = useRef(null);
  const commentsContainerRef = useRef(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    setLocalComments(post.comments || []);
  }, [post.comments]);

  useEffect(() => {
    if (showComments && commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
    }
  }, [showComments, localComments.length]);

  const isMyPost = post.author === currentUser;
  const likedUsers = post.likedUsers || [];
  const isCurrentlyLiked = likedUsers.includes(currentUser);
  const displayLikesCount = Math.max(post.likes || 0, likedUsers.length);
  const authorInfo = accountsInfo && accountsInfo[post.author];
  const hideMetrics = !isMyPost && authorInfo?.hideBodyMetrics;
  const authorColor = authorInfo?.userColor || (post.author ? generateColor(post.author) : '#10b981');

  const baseWeight = Number(post.bodyWeight) || Number(authorInfo?.weight) || 60;
  const { processedItems, totalVolume, totalCalories } = useMemo(() => {
    return calculateWorkoutTotals(post.items || [], post.duration, baseWeight);
  }, [post.items, post.duration, baseWeight]);

  const displayVolumeCalc = (!post.items || post.items.length === 0) ? 0 : ((post.volume && post.volume > 0) ? post.volume : totalVolume);
  const displayCalories = (!post.items || post.items.length === 0) ? 0 : ((post.calories && post.calories > 0) ? post.calories : totalCalories);
  const displaySets = post.totalSets || processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);

  const categoryCounts = {};
  processedItems.forEach(item => {
    if (item.category) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + (item.sets?.length || 0);
    }
  });
  const categories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

  const handleExportText = () => {
    const text = exportWorkoutToText(post, processedItems, displayVolumeCalc, displayCalories);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "トレーニング記録をクリップボードにコピーしました！" } }));
      }).catch(() => {
        window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "コピーに失敗しました。" } }));
      });
    }
    setShowPostMenu(false);
  };

  const scrollToExerciseCard = (idx) => {
    setActiveCardIdx(idx);
    if (carouselRef.current && carouselRef.current.children[idx]) {
      const child = carouselRef.current.children[idx];
      carouselRef.current.scrollTo({ left: child.offsetLeft - 12, behavior: 'smooth' });
    }
  };

  const handleReply = (username, parentId = null) => {
    if (parentId) {
      setReplyingToId(parentId);
      setExpandedThreads(prev => ({ ...prev, [parentId]: true }));
    }
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleDeleteLocalComment = (commentId) => {
    if (window.confirm("このコメントを削除しますか？")) {
      setLocalComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
      if (onDeleteComment) onDeleteComment(post.id, commentId);
    }
  };

  const toggleThread = (threadId) => {
    setExpandedThreads(prev => ({ ...prev, [threadId]: !prev[threadId] }));
  };

  const handleCommentChange = (e) => {
    const text = e.target.value;
    setCommentText(text);
    const match = text.match(/@([a-zA-Z0-9_ぁ-んァ-ヶ一-龠]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (username) => {
    const newText = commentText.replace(/@([a-zA-Z0-9_ぁ-んァ-ヶ一-龠]*)$/, `@${username} `);
    setCommentText(newText);
    setMentionQuery(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: 'temp_' + Date.now(),
      author: currentUser,
      text: commentText.trim(),
      timestamp: Date.now(),
      likedUsers: [],
      parentId: replyingToId || null
    };
    setLocalComments(prev => [...prev, newComment]);

    if (onAddComment) {
      onAddComment(post.id, commentText, replyingToId || null);
      if (replyingToId) {
        setExpandedThreads(prev => ({ ...prev, [replyingToId]: true }));
      }
      setCommentText('');
      setMentionQuery(null);
      setReplyingToId(null);
    }
  };

  const handleCommentLike = (commentId) => {
    setLocalComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const cLikes = c.likedUsers || [];
        const isLiked = cLikes.includes(currentUser);
        return { ...c, likedUsers: isLiked ? cLikes.filter(u => u !== currentUser) : [...cLikes, currentUser] };
      }
      return c;
    }));
    if (onToggleCommentLike) onToggleCommentLike(post.id, commentId);
  };

  const myFriendsList = accountsInfo[currentUser]?.friends || [];
  const mentionCandidates = mentionQuery !== null ? Object.entries(accountsInfo).filter(([uname, data]) =>
    myFriendsList.includes(uname) && (uname.includes(mentionQuery) || (data.displayName && data.displayName.includes(mentionQuery)))
  ) : [];

  const renderCommentText = (text) => {
    const parts = (text || '').split(/(@[a-zA-Z0-9_ぁ-んァ-ヶ一-龠]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.substring(1);
        const userExists = Object.keys(accountsInfo).includes(username) || Object.values(accountsInfo).some(u => u.displayName === username);
        if (userExists) {
          return <span key={i} className="text-emerald-500 font-bold">{part}</span>;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderSetRow = (setObj, wType, type, isDrop, label) => {
    const isLR = wType === 'lr';
    const isPlate = wType === 'plate';
    const isBodyWeight = wType === 'bodyWeight';
    const isCardio = wType === 'cardio';

    const val = (f) => {
      let fieldName = f;
      if (type === 'super2') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1);
      if (type === 'super3') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1) + '3';
      return setObj[fieldName] || '';
    };

    if (isCardio) {
      const distance = val('distance');
      const time = val('time');
      const calories = val('calories');
      if (!distance && !time && !calories) return null;
      return (
        <div className={`flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 py-1.5 last:border-0 ${isDrop ? 'pl-6' : ''}`}>
          <span className="font-bold w-14 text-xs shrink-0 text-slate-400">{label}</span>
          <div className="flex-1 flex flex-wrap justify-end items-center px-1 gap-2.5">
            {distance && <span className="font-bold text-slate-800 dark:text-slate-100">{distance}<span className="text-[11px] font-normal text-slate-400 ml-0.5">km</span></span>}
            {time && <span className="font-bold text-slate-800 dark:text-slate-100">{time}<span className="text-[11px] font-normal text-slate-400 ml-0.5">分</span></span>}
            {calories && <span className="font-bold text-slate-800 dark:text-slate-100">{calories}<span className="text-[11px] font-normal text-slate-400 ml-0.5">kcal</span></span>}
          </div>
        </div>
      );
    }

    const weight = val('weight');
    const reps = val('reps');
    const lReps = val('lReps');
    const rReps = val('rReps');
    const forcedReps = val('forcedReps');

    if (!weight && !reps && !lReps && !rReps) return null;

    const forced = forcedReps ? <span className="text-rose-500 text-[11px] font-bold ml-1">(+補助{forcedReps})</span> : null;
    const prBadgeWeight = setObj.isWeightPR && type === 'main' ? <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-bold whitespace-nowrap">🏆重量更新</span> : null;
    const prBadgeReps = setObj.isRepsPR && type === 'main' ? <span className="ml-1 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 font-bold whitespace-nowrap">🎖️回数更新</span> : null;

    let displayWeight = weight || 0;
    let weightLabel = 'kg';
    if (isPlate) weightLabel = '枚';
    else if (wType === 'oneSide') weightLabel = 'kg(片)';
    else if (isBodyWeight) {
      if (Number(weight) < 0) { displayWeight = weight; weightLabel = 'kg'; }
      else if (Number(weight) > 0) { displayWeight = `+${weight}`; weightLabel = 'kg'; }
      else { displayWeight = '自重'; weightLabel = ''; }
    }

    let labelColorClass = 'text-slate-400 dark:text-slate-500';
    if (isDrop) labelColorClass = 'text-orange-500';
    else if (type !== 'main') labelColorClass = 'text-indigo-500 dark:text-indigo-400 pl-3';

    let rmTextNode = null;
    if (!isCardio && weight && wType !== 'bodyWeight') {
      const currentReps = isLR ? Math.max(Number(lReps) || 0, Number(rReps) || 0) : (Number(reps) || 0);
      const rm = calc1RM(weight, currentReps);
      if (rm > 0) {
        rmTextNode = <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono ml-auto">1RM {rm}kg</span>;
      }
    }

    return (
      <div className={`flex flex-col border-b border-slate-200/50 dark:border-slate-800/50 py-1.5 last:border-0 ${isDrop ? 'pl-4' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`font-bold text-xs shrink-0 ${labelColorClass}`}>{label}</span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="font-extrabold text-sm sm:text-[15px] text-slate-800 dark:text-slate-100 font-mono">
              {displayWeight}<span className="text-[10px] font-normal text-slate-400 ml-0.5">{weightLabel}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600 font-bold text-xs">×</span>
            {isLR ? (
              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 font-mono">
                L:{lReps || 0} / R:{rReps || 0}<span className="text-[10px] font-normal text-slate-400 ml-0.5">回</span>
              </span>
            ) : (
              <span className="font-extrabold text-sm sm:text-[15px] text-slate-800 dark:text-slate-100 font-mono">
                {reps || 0}<span className="text-[10px] font-normal text-slate-400 ml-0.5">回</span>
              </span>
            )}
            {forced}
          </div>
        </div>
        {(prBadgeWeight || prBadgeReps || rmTextNode) && (
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-1">{prBadgeWeight}{prBadgeReps}</div>
            {rmTextNode}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id={`post-${post.id}`} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm overflow-hidden relative mb-4 transition-all">
      {/* ユーザーテーマカラーの左アクセントライン */}
      <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: authorColor }} />

      {/* カードヘッダー */}
      <div className="flex justify-between items-start mb-3.5 pl-2.5">
        <div className="flex items-start gap-3 w-full overflow-hidden">
          {post.jointWith ? (
            <div className="relative w-12 h-10 shrink-0">
              <UserAvatar userId={post.author} accountsInfo={accountsInfo} size={32} className="absolute top-0 left-0 z-10" onClick={onUserClick} />
              <UserAvatar userId={post.jointWith} accountsInfo={accountsInfo} size={32} className="absolute bottom-0 right-0 z-0 ring-2 ring-white dark:ring-slate-900 rounded-full" onClick={onUserClick} />
            </div>
          ) : (
            <UserAvatar userId={post.author} accountsInfo={accountsInfo} size={42} onClick={onUserClick} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {renderUsernameWithBadge(post.author, authorInfo?.displayName, accountsInfo)}
              {post.jointWith && (
                <>
                  <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-950/60 px-1.5 py-0.5 rounded-full">🤝合トレ</span>
                  {renderUsernameWithBadge(post.jointWith, accountsInfo?.[post.jointWith]?.displayName, accountsInfo)}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">
              <span>{formatShortDateTime(post.timestamp)}</span>
              {post.duration && (
                <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                  <Clock size={11} /> {formatDuration(post.duration)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {post.gymName && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                  <MapPin size={10} /> {post.gymName}
                </span>
              )}
              {categories.map(cat => (
                <span key={cat} className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${getCategoryColor(cat)}`}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 投稿者メニュー（編集・削除・テキスト書き出し） */}
        {isMyPost && onEdit && onDelete && (
          <div className="flex items-center gap-0.5 shrink-0 ml-1 relative">
            <IconButton icon={<Edit2 size={16} />} variant="emerald" size="sm" onClick={() => onEdit(post)} title="編集" />
            <IconButton icon={<Trash2 size={16} />} variant="danger" size="sm" onClick={() => onDelete(post.id)} title="削除" />
            <IconButton icon={<MoreVertical size={16} />} variant="default" size="sm" onClick={() => setShowPostMenu(!showPostMenu)} title="その他" />
            {showPostMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 w-52 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={handleExportText}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <FileText size={15} className="text-emerald-500" />
                  テキスト形式でコピー
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* サマリーバッジバー＆構成コピー */}
      <div className="pl-2.5 mb-3 flex flex-wrap items-center gap-1.5">
        {(post.bodyWeight || post.bodyFat) && (
          <div className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
            <Scale size={13} />
            {hideMetrics ? 'ないしょ♡' : (
              <>
                {post.bodyWeight && `${post.bodyWeight}kg`}
                {post.bodyWeight && post.bodyFat && ' / '}
                {post.bodyFat && `${post.bodyFat}%`}
              </>
            )}
          </div>
        )}
        {displaySets > 0 && (
          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <ListPlus size={13} /> 計 {displaySets} Set
          </div>
        )}
        {displayVolumeCalc > 0 && (
          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-2.5 py-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <Dumbbell size={13} className="text-emerald-500" />
            {Number(displayVolumeCalc).toLocaleString()}kg
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">({getVolumeMetaphor(displayVolumeCalc)})</span>
          </div>
        )}
        {displayCalories > 0 && (
          <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
            <Flame size={13} className="text-amber-500" />
            {Number(displayCalories).toLocaleString()}kcal
          </div>
        )}

        {onImport && post.items && post.items.length > 0 && (
          <div className="relative ml-auto">
            {!showImportOptions ? (
              <button
                type="button"
                onClick={() => setShowImportOptions(true)}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/80 active:scale-95 transition-all border border-emerald-200/70 dark:border-emerald-800/70"
              >
                <Copy size={13} /> メニューコピー
              </button>
            ) : (
              <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => { setShowImportOptions(false); onImport(post, false); }}
                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-500 px-2.5 py-1.5 rounded-lg hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
                >
                  <Play size={10} fill="currentColor" /> 今から
                </button>
                <button
                  type="button"
                  onClick={() => { setShowImportOptions(false); onImport(post, true); }}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                >
                  <CalendarIcon size={10} /> 過去
                </button>
                <IconButton icon={<X size={14} />} variant="close" size="sm" onClick={() => setShowImportOptions(false)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 複数種目がある場合のクイックジャンプピル */}
      {processedItems.length > 1 && (
        <div className="pl-2.5 mb-2 flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {processedItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToExerciseCard(idx)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all active:scale-95 border ${
                activeCardIdx === idx
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {idx + 1}. {item.exerciseName}
            </button>
          ))}
        </div>
      )}

      {/* 種目カルーセル */}
      {processedItems.length > 0 && (
        <div
          ref={carouselRef}
          onScroll={(e) => {
            const scrollLeft = e.currentTarget.scrollLeft;
            const cardWidth = e.currentTarget.children[0]?.offsetWidth || 260;
            const idx = Math.round(scrollLeft / (cardWidth + 12));
            if (idx !== activeCardIdx && idx >= 0 && idx < processedItems.length) {
              setActiveCardIdx(idx);
            }
          }}
          className="pl-2.5 mb-3 flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 pr-2.5 hide-scrollbar"
        >
          {processedItems.map((item, idx) => (
            <div
              key={idx}
              className="snap-center shrink-0 w-[86%] sm:w-[290px] bg-slate-50/90 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800/80"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-extrabold text-slate-400 font-mono">#{idx + 1}</span>
                    {item.category === '有酸素' ? (
                      <Activity size={14} className="text-cyan-500 shrink-0" />
                    ) : (
                      <Dumbbell size={14} className="text-emerald-500 shrink-0" />
                    )}
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-[15px] truncate">
                      {item.exerciseName}
                    </span>
                    {item.category && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    )}
                    {item.itemVolume > 0 && (
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-auto shrink-0 font-mono">
                        {item.itemVolume.toLocaleString()}kg
                      </span>
                    )}
                  </div>
                  {item.isSuperSet && item.superExerciseName && (
                    <div className="flex items-center gap-1.5 pl-4">
                      <Zap size={12} className="text-indigo-500 shrink-0" />
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs truncate">{item.superExerciseName}</span>
                    </div>
                  )}
                  {item.isSuperSet && item.superExerciseName3 && (
                    <div className="flex items-center gap-1.5 pl-4">
                      <Zap size={12} className="text-indigo-500 shrink-0" />
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs truncate">{item.superExerciseName3}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {item.sets && Array.isArray(item.sets) && item.sets.map((set, sIdx) => (
                  <div key={sIdx} className="bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    {renderSetRow(set, item.weightType, 'main', false, `Set ${sIdx + 1}`)}
                    {item.isDropSet && set.dropSets && set.dropSets.map((ds, dsIdx) => (
                      <React.Fragment key={ds.id || dsIdx}>
                        {renderSetRow(ds, item.weightType, 'main', true, '↳ Drop')}
                      </React.Fragment>
                    ))}
                    {item.isSuperSet && item.superExerciseName && (
                      <>
                        {renderSetRow(set, item.superWeightType || 'total', 'super2', false, '↳ Sup2')}
                        {item.isDropSet && set.superDropSets && set.superDropSets.map((ds, dsIdx) => (
                          <React.Fragment key={ds.id || dsIdx}>
                            {renderSetRow(ds, item.superWeightType || 'total', 'super2', true, '↳ Drop2')}
                          </React.Fragment>
                        ))}
                      </>
                    )}
                    {item.isSuperSet && item.superExerciseName3 && (
                      <>
                        {renderSetRow(set, item.superWeightType3 || 'total', 'super3', false, '↳ Sup3')}
                        {item.isDropSet && set.superDropSets3 && set.superDropSets3.map((ds, dsIdx) => (
                          <React.Fragment key={ds.id || dsIdx}>
                            {renderSetRow(ds, item.superWeightType3 || 'total', 'super3', true, '↳ Drop3')}
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {item.memo && (
                <div className="mt-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <AlignLeft size={12} className="inline mr-1 text-slate-400" />
                  {item.memo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* アクションフッター（ナイス！＆コメント） */}
      <div className="flex items-center justify-between pl-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => !isMyPost && onToggleLike && onToggleLike(post.id, displayLikesCount, isCurrentlyLiked, likedUsers)}
            disabled={isMyPost}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-90 ${
              isCurrentlyLiked
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 hover:text-rose-500'
            } ${isMyPost ? 'cursor-default' : ''}`}
          >
            <Heart size={18} fill={isCurrentlyLiked ? "currentColor" : "none"} className={isCurrentlyLiked && !isMyPost ? "animate-pulse" : ""} />
            <span>ナイス!</span>
          </button>
          {displayLikesCount > 0 && (
            <button
              type="button"
              onClick={() => setShowLikesModal(true)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-500 active:scale-95 transition-all px-1.5 py-1"
            >
              {displayLikesCount}人
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (showComments) {
              setShowComments(false);
            } else {
              setShowComments(true);
              setTimeout(() => textareaRef.current?.focus(), 100);
            }
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-90 border ${
            showComments
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700'
          }`}
        >
          <MessageCircle size={17} />
          <span>コメント {localComments.length > 0 ? `(${localComments.length})` : ''}</span>
        </button>
      </div>

      {/* コメントスレッド領域 */}
      {showComments && (
        <div className="mt-3 pt-3 pl-2.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
          {(() => {
            const rootComments = localComments.filter(c => !c.parentId);
            const renderComment = (comment, isReply = false, rootId = null) => {
              const cInfo = accountsInfo[comment.author];
              const cLikedUsers = comment.likedUsers || [];
              const isCLiked = cLikedUsers.includes(currentUser);
              const cLikesCount = cLikedUsers.length;
              const currentRootId = rootId || comment.id;

              return (
                <div key={comment.id} className="flex gap-2.5">
                  <UserAvatar userId={comment.author} accountsInfo={accountsInfo} size={30} className="mt-0.5" onClick={onUserClick} />
                  <div className="flex-1 group min-w-0">
                    <div className="flex items-stretch gap-1.5">
                      <div className="bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-2xl rounded-tl-sm border border-slate-200/60 dark:border-slate-800 relative inline-block max-w-[86%]">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          {renderUsernameWithBadge(comment.author, cInfo?.displayName, accountsInfo, "font-bold text-xs text-slate-800 dark:text-slate-200")}
                          <span className="text-[10px] text-slate-400 shrink-0">{getRelativeTime(comment.timestamp)}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                          {renderCommentText(comment.text)}
                        </p>
                      </div>
                      <div className="flex flex-col justify-between py-0.5 shrink-0">
                        <div>
                          {(comment.author === currentUser || post.author === currentUser) && onDeleteComment && (
                            <IconButton icon={<Trash2 size={13} />} variant="danger" size="sm" onClick={() => handleDeleteLocalComment(comment.id)} />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCommentLike(comment.id)}
                          className={`flex items-center gap-0.5 text-[11px] font-bold transition-all active:scale-75 p-1 ${
                            isCLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                          }`}
                        >
                          <Heart size={13} fill={isCLiked ? "currentColor" : "none"} />
                          {cLikesCount > 0 && <span>{cLikesCount}</span>}
                        </button>
                      </div>
                    </div>
                    <div className="pl-2 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleReply(comment.author, currentRootId)}
                        className="text-[11px] font-bold text-slate-400 hover:text-emerald-500 active:scale-95 transition-all"
                      >
                        返信する
                      </button>
                    </div>
                  </div>
                </div>
              );
            };

            return rootComments.length > 0 && (
              <div ref={commentsContainerRef} className="space-y-3 mb-3 max-h-72 overflow-y-auto pr-1">
                {rootComments.map(rootComment => {
                  const replies = localComments.filter(c => c.parentId === rootComment.id);
                  const isExpanded = expandedThreads[rootComment.id];
                  return (
                    <div key={rootComment.id} className="space-y-2.5">
                      {renderComment(rootComment, false, rootComment.id)}
                      {replies.length > 0 && (
                        <div id={`thread-${rootComment.id}`} className="ml-9 space-y-2.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                          {!isExpanded ? (
                            <button
                              type="button"
                              onClick={() => toggleThread(rootComment.id)}
                              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline active:scale-95"
                            >
                              <ArrowDown size={12} /> {replies.length}件の返信を表示
                            </button>
                          ) : (
                            <>
                              {replies.map(reply => renderComment(reply, true, rootComment.id))}
                              <button
                                type="button"
                                onClick={() => toggleThread(rootComment.id)}
                                className="text-[11px] font-bold text-slate-400 flex items-center gap-1 hover:underline active:scale-95"
                              >
                                <ArrowUp size={12} /> 返信を閉じる
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* コメント入力バー */}
          <div className="relative flex gap-2 items-end">
            {mentionQuery !== null && mentionCandidates.length > 0 && (
              <div className="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg max-h-40 overflow-y-auto z-10">
                {mentionCandidates.map(([uname, data]) => (
                  <div
                    key={uname}
                    onClick={() => insertMention(uname)}
                    className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2"
                  >
                    <UserAvatar userId={uname} accountsInfo={accountsInfo} size={24} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{data.displayName || uname}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
              {replyingToId && (
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-t-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 border-b-0">
                  <span>
                    {(() => {
                      const parentComment = localComments.find(c => c.id === replyingToId);
                      const pUser = parentComment ? (accountsInfo[parentComment.author]?.displayName || parentComment.author) : '';
                      return pUser ? `${pUser} に返信中...` : '返信中...';
                    })()}
                  </span>
                  <button type="button" onClick={() => setReplyingToId(null)} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={handleCommentChange}
                placeholder={replyingToId ? "返信を入力..." : "コメントを追加... (@でメンション)"}
                className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2 px-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-none min-h-[40px] max-h-24 ${replyingToId ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}
                style={{ fontSize: '16px' }}
                rows={1}
              />
            </div>
            <button
              type="button"
              onClick={submitComment}
              disabled={!commentText.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-90 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white p-2.5 rounded-xl flex items-center justify-center transition-all h-10 w-10 shrink-0 shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ナイスしたユーザー一覧モーダル */}
      {showLikesModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setShowLikesModal(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Heart size={16} className="text-rose-500" fill="currentColor" /> ナイスしたユーザー
              </h3>
              <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={() => setShowLikesModal(false)} />
            </div>
            <div className="p-3 overflow-y-auto space-y-1.5">
              {likedUsers.length > 0 ? (
                likedUsers.map(u => {
                  const uInfo = accountsInfo && accountsInfo[u];
                  return (
                    <div
                      key={u}
                      onClick={() => { setShowLikesModal(false); if (onUserClick) onUserClick(u); }}
                      className="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl cursor-pointer active:scale-98 transition-all"
                    >
                      <UserAvatar userId={u} accountsInfo={accountsInfo} size={38} />
                      {renderUsernameWithBadge(u, uInfo?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-200 text-sm")}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-slate-400 text-sm font-bold">ナイスしたユーザーがいます</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
