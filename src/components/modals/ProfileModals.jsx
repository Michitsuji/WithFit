// ============================================================================
// WithFit v2 - プロフィール・ユーザー詳細・フレンド詳細・要望一覧モーダル群
// 全画面で統一されたUserAvatar・IconButton・タッチ挙動
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  X, PlusCircle, Trash2, Settings, Sun, Moon, Droplet, Sparkles,
  AlertTriangle, Users, UserPlus, ChevronLeft, Activity
} from 'lucide-react';
import { APP_ID } from '../../config/firebase';
import { getRelativeTime } from '../../utils/helpers';
import { UserAvatar, renderUsernameWithBadge, IconButton, ToggleSwitch } from '../common/UI';
import DataView from '../views/DataView';

export function ProfileModal({ isOpen, onClose, userInfo, onSave, currentUser, onLinkGoogle, onDeleteAccount }) {
  const isPushEnabled = !!userInfo?.fcmToken;
  const [osPermission, setOsPermission] = useState('default');
  const [isUploading, setIsUploading] = useState(false);
  const [goal, setGoal] = useState(userInfo?.goal || '');
  const [theme, setTheme] = useState(userInfo?.theme || 'light');
  const [photoUrl, setPhotoUrl] = useState(userInfo?.photoUrl || null);
  const [userColor, setUserColor] = useState(userInfo?.userColor || '#10b981');

  const [birthDate, setBirthDate] = useState(userInfo?.birthDate || '');
  const [gender, setGender] = useState(userInfo?.gender || 'male');
  const [height, setHeight] = useState(userInfo?.height || '');
  const [weight, setWeight] = useState(userInfo?.weight || '');
  const [displayName, setDisplayName] = useState(userInfo?.displayName || currentUser);
  const [hideBodyMetrics, setHideBodyMetrics] = useState(userInfo?.hideBodyMetrics || false);
  const [enablePartnerFeature, setEnablePartnerFeature] = useState(userInfo?.enablePartnerFeature || false);

  const [notifyPost, setNotifyPost] = useState(userInfo?.notifyPost !== false);
  const [notifyComment, setNotifyComment] = useState(userInfo?.notifyComment !== false);
  const [notifyLike, setNotifyLike] = useState(userInfo?.notifyLike !== false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);

  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState(null);
  const touchRef = useRef({ startDist: 0, startScale: 1, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (!isOpen) {
      isFirstMount.current = true;
      return;
    }
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      onSave({
        displayName: (displayName || '').trim() || currentUser,
        photoUrl,
        userColor,
        goal: (goal || '').trim(),
        theme,
        birthDate,
        gender,
        height: Number(height) || null,
        weight: Number(weight) || null,
        hideBodyMetrics,
        enablePartnerFeature,
        notifyPost,
        notifyComment,
        notifyLike
      }, false);
    }, 450);
    return () => clearTimeout(timer);
  }, [displayName, photoUrl, userColor, goal, theme, birthDate, gender, height, weight, hideBodyMetrics, enablePartnerFeature, notifyPost, notifyComment, notifyLike, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setGoal(userInfo?.goal || '');
      setTheme(userInfo?.theme || 'light');
      setPhotoUrl(userInfo?.photoUrl || null);
      setUserColor(userInfo?.userColor || '#10b981');
      setBirthDate(userInfo?.birthDate || '');
      setGender(userInfo?.gender || 'male');
      setHeight(userInfo?.height || '');
      setWeight(userInfo?.weight || '');
      setDisplayName(userInfo?.displayName || currentUser);
      setHideBodyMetrics(userInfo?.hideBodyMetrics || false);
      setEnablePartnerFeature(userInfo?.enablePartnerFeature || false);
      setNotifyPost(userInfo?.notifyPost !== false);
      setNotifyComment(userInfo?.notifyComment !== false);
      setNotifyLike(userInfo?.notifyLike !== false);
      setCropImageSrc(null);
      setImageObj(null);
      setShowDeleteConfirm(false);
      setDeleteAgreed(false);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setOsPermission(Notification.permission);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImageObj(img);
        const CROP_SIZE = 300;
        const initialScale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
        setCropScale(initialScale);
        setCropPosition({ x: 0, y: 0 });
        setCropImageSrc(event.target.result);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touchRef.current.startDist = dist;
      touchRef.current.startScale = cropScale;
    } else if (e.touches.length === 1) {
      touchRef.current.startX = e.touches[0].clientX;
      touchRef.current.startY = e.touches[0].clientY;
      touchRef.current.lastX = cropPosition.x;
      touchRef.current.lastY = cropPosition.y;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const newScale = Math.max(0.1, touchRef.current.startScale * (dist / touchRef.current.startDist));
      setCropScale(newScale);
    } else if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchRef.current.startX;
      const dy = e.touches[0].clientY - touchRef.current.startY;
      setCropPosition({ x: touchRef.current.lastX + dx, y: touchRef.current.lastY + dy });
    }
  };

  const handleCropConfirm = () => {
    if (!imageObj) return;
    setIsUploading(true);
    setTimeout(() => {
      const FINAL_SIZE = 400;
      const ratio = FINAL_SIZE / 300;
      const canvas = document.createElement('canvas');
      canvas.width = FINAL_SIZE;
      canvas.height = FINAL_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, FINAL_SIZE, FINAL_SIZE);
      ctx.translate(FINAL_SIZE / 2, FINAL_SIZE / 2);
      ctx.translate(cropPosition.x * ratio, cropPosition.y * ratio);
      ctx.scale(cropScale * ratio, cropScale * ratio);
      ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
      setPhotoUrl(canvas.toDataURL('image/jpeg', 0.82));
      setCropImageSrc(null);
      setImageObj(null);
      setIsUploading(false);
    }, 50);
  };

  if (cropImageSrc) {
    return (
      <div
        className="fixed inset-0 bg-black z-[60] flex flex-col items-center justify-center touch-none overscroll-none"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="absolute inset-x-0 top-0 p-4 flex justify-between items-center z-10">
          <button type="button" onClick={() => { setCropImageSrc(null); setImageObj(null); }} className="text-white font-bold px-4 py-2 bg-black/50 rounded-full">キャンセル</button>
          <button type="button" onClick={handleCropConfirm} className="text-emerald-400 font-bold px-4 py-2 bg-black/50 rounded-full">完了</button>
        </div>
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={cropImageSrc}
            alt="crop"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${cropPosition.x}px), calc(-50% + ${cropPosition.y}px)) scale(${cropScale})`,
              transformOrigin: 'center',
              pointerEvents: 'none',
              maxWidth: 'none'
            }}
          />
          <div className="absolute w-[300px] h-[300px] border-2 border-white/80 rounded-full pointer-events-none" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }} />
        </div>
        <p className="absolute bottom-12 text-white/70 text-sm font-bold pointer-events-none">スワイプで移動・ピンチで拡大縮小</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-150 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">プロフィール・テーマ設定</h2>
          <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={onClose} />
        </div>

        <div className="flex flex-col items-center space-y-4 mb-5">
          <div className="relative">
            <UserAvatar
              userId={currentUser}
              size={88}
              photoUrlOverride={photoUrl}
              displayNameOverride={displayName}
              colorOverride={userColor}
            />
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-white/60 dark:bg-slate-900/60 flex items-center justify-center">
                <Activity className="animate-spin text-emerald-500" size={24} />
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full">
            <label className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer">
              <PlusCircle size={15} /> アイコン画像変更
              <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif" onChange={handleFileChange} className="hidden" disabled={isUploading} />
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl(null)}
                disabled={isUploading}
                className="py-2 px-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
              >
                <Trash2 size={14} /> 削除
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">表示名 (ニックネーム)</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            {userInfo?.googleUid ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-center border border-emerald-200 dark:border-emerald-800">
                ✓ Googleアカウント連携済み
              </p>
            ) : (
              <button
                type="button"
                onClick={onLinkGoogle}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 active:scale-98"
              >
                Googleアカウントと連携する
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">パーソナルカラー (アイコン枠・カード左ライン)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={userColor} onChange={e => setUserColor(e.target.value)} className="w-11 h-10 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer shrink-0" />
              <input type="text" value={userColor} onChange={e => setUserColor(e.target.value)} className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 font-mono font-bold uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">性別</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-sm text-slate-800 dark:text-slate-100 font-bold" style={{ fontSize: '16px' }}>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">生年月日</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-sm text-slate-800 dark:text-slate-100 font-bold" style={{ fontSize: '16px' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">身長 (cm)</label>
              <input type="number" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 font-bold" style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">基本体重 (kg)</label>
              <input type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="65.0" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 font-bold" style={{ fontSize: '16px' }} />
            </div>
          </div>

          <div className="space-y-2">
            <ToggleSwitch label="フレンドに体重・体脂肪率を非公開" checked={hideBodyMetrics} onChange={e => setHideBodyMetrics(e.target.checked)} />
            <ToggleSwitch label="パートナー機能を利用する" checked={enablePartnerFeature} onChange={e => setEnablePartnerFeature(e.target.checked)} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">目標 (100文字以内)</label>
            <textarea value={goal} maxLength={100} onChange={e => setGoal(e.target.value)} placeholder="例: ベンチプレス100kg達成！" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-none" style={{ fontSize: '16px' }} rows={2} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">アプリテーマ</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setTheme('light')} className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 ${theme === 'light' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}><Sun size={15} /> ライト</button>
              <button type="button" onClick={() => setTheme('dark')} className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 ${theme === 'dark' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'text-slate-500'}`}><Moon size={15} /> ダーク</button>
              <button type="button" onClick={() => setTheme('ocean')} className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 ${theme === 'ocean' ? 'bg-[#0a2e4a] text-[#38bdf8] shadow-sm' : 'text-slate-500'}`}><Droplet size={15} /> オーシャン</button>
              <button type="button" onClick={() => setTheme('pop')} className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 ${theme === 'pop' ? 'bg-pink-100 border border-pink-300 text-pink-600 shadow-sm' : 'text-slate-500'}`}><Sparkles size={15} /> ポップ</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">プッシュ通知の受信項目</label>
            <div className="space-y-2">
              <ToggleSwitch label="フレンドのトレーニング完了" checked={notifyPost} onChange={e => setNotifyPost(e.target.checked)} />
              <ToggleSwitch label="コメントの受信" checked={notifyComment} onChange={e => setNotifyComment(e.target.checked)} />
              <ToggleSwitch label="ナイス！の受信" checked={notifyLike} onChange={e => setNotifyLike(e.target.checked)} />
            </div>
          </div>
        </div>

        <div className="mt-5 text-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          ✓ 変更内容はリアルタイムで自動保存されます
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          {!showDeleteConfirm ? (
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 py-2.5 rounded-xl font-bold text-xs">
              アカウントを削除する
            </button>
          ) : (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={15} /> 本当にアカウントを削除しますか？
              </h3>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={deleteAgreed} onChange={(e) => setDeleteAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 text-rose-600 rounded" />
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">全記録・フレンドデータの完全消去に同意します</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteAgreed(false); }} className="flex-1 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold">キャンセル</button>
                <button type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteAgreed(false); onDeleteAccount(); }} disabled={!deleteAgreed} className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">完全削除</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UserProfileModal({ isOpen, onClose, targetUser, accountsInfo, currentUser, onSendRequest }) {
  const [view, setView] = useState('profile');
  useEffect(() => { if (isOpen) setView('profile'); }, [isOpen]);
  if (!isOpen || !targetUser) return null;

  const userInfo = accountsInfo[targetUser] || {};
  const friends = userInfo.friends || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[80] flex flex-col items-center justify-center animate-in fade-in duration-150 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {view === 'profile' ? (
          <>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">プロフィール</h2>
              <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={onClose} />
            </div>
            <div className="flex flex-col items-center space-y-4">
              <UserAvatar userId={targetUser} accountsInfo={accountsInfo} size={104} />
              <div className="text-center w-full">
                <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                  {renderUsernameWithBadge(targetUser, userInfo.displayName, accountsInfo, "text-xl font-extrabold text-slate-800 dark:text-slate-100")}
                </div>
                {userInfo.goal && (
                  <div className="mt-3">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">目標</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 break-words">
                      {userInfo.goal}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setView('friends')}
                className="flex items-center justify-center gap-2 w-full bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 active:scale-98 transition-all"
              >
                <Users size={16} /> フレンド一覧 ({friends.length}人)
              </button>
              {targetUser !== currentUser && !(accountsInfo[currentUser]?.friends || []).includes(targetUser) && !(accountsInfo[targetUser]?.friendRequests || []).includes(currentUser) && (
                <button
                  type="button"
                  onClick={() => onSendRequest(targetUser)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <UserPlus size={17} /> フレンド申請を送る
                </button>
              )}
              {targetUser !== currentUser && (accountsInfo[targetUser]?.friendRequests || []).includes(currentUser) && (
                <div className="w-full text-center text-xs font-bold text-slate-400 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  フレンド申請済み
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-5">
              <IconButton icon={<ChevronLeft size={18} />} variant="close" size="sm" onClick={() => setView('profile')} />
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white">フレンド一覧</h2>
              <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={onClose} />
            </div>
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {friends.length === 0 ? (
                <div className="text-center text-xs font-bold text-slate-400 py-8">フレンドがいません</div>
              ) : (
                friends.map(fId => {
                  const fInfo = accountsInfo[fId];
                  const isMe = fId === currentUser;
                  const isMyFriend = (accountsInfo[currentUser]?.friends || []).includes(fId);
                  const hasRequested = (fInfo?.friendRequests || []).includes(currentUser);
                  return (
                    <div key={fId} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar userId={fId} accountsInfo={accountsInfo} size={36} />
                        {renderUsernameWithBadge(fId, fInfo?.displayName, accountsInfo, "font-bold text-slate-800 dark:text-slate-200 text-xs truncate")}
                      </div>
                      {!isMe && !isMyFriend && !hasRequested && (
                        <button type="button" onClick={() => onSendRequest(fId)} className="shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 active:scale-95">
                          申請
                        </button>
                      )}
                      {!isMe && !isMyFriend && hasRequested && (
                        <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-lg">申請済</span>
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

export function FriendDetailModal({
  friendUsername,
  posts,
  accountsInfo,
  onClose,
  onToggleLike,
  onImport,
  currentUser,
  onAddComment,
  onDeleteComment,
  onToggleCommentLike,
  onUserClick
}) {
  const friendInfo = accountsInfo[friendUsername] || {};

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center sm:items-center animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-slate-50 dark:bg-slate-950 sm:rounded-3xl rounded-t-3xl flex flex-col h-[90vh] sm:h-[85vh] w-full sm:max-w-md overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <UserAvatar userId={friendUsername} accountsInfo={accountsInfo} size={34} onClick={onUserClick} />
            <h2>{renderUsernameWithBadge(friendUsername, friendInfo.displayName, accountsInfo, "text-base font-extrabold text-slate-800 dark:text-white")}</h2>
          </div>
          <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-24 sm:pb-6">
          {friendInfo.goal && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold mb-0.5">目標</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-bold">{friendInfo.goal}</p>
            </div>
          )}

          <DataView
            posts={posts}
            currentUser={currentUser}
            targetUser={friendUsername}
            accountsInfo={accountsInfo}
            onImport={onImport}
            onToggleLike={onToggleLike}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            onToggleCommentLike={onToggleCommentLike}
            onUserClick={onUserClick}
            hideHeader={true}
          />
        </div>
      </div>
    </div>
  );
}

export function ReportsModal({ isOpen, onClose, db, accountsInfo, onUserClick }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !db) return;
    const reportsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = [];
      snapshot.forEach(docSnap => {
        reportsData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setReports(reportsData);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [isOpen, db]);

  const handleDeleteReport = async (id) => {
    if (!window.confirm('この報告を削除しますか？') || !db) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', id));
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[75vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">ご要望・不具合一覧</h3>
          <IconButton icon={<X size={18} />} variant="close" size="sm" onClick={onClose} />
        </div>
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="text-center p-4 text-slate-400 font-bold text-xs">読み込み中...</div>
          ) : reports.length === 0 ? (
            <div className="text-center p-4 text-slate-400 font-bold text-xs">報告はありません</div>
          ) : (
            reports.map(report => {
              const uInfo = accountsInfo && accountsInfo[report.author];
              return (
                <div key={report.id} className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar userId={report.author} accountsInfo={accountsInfo} size={28} onClick={onUserClick} />
                      <div className="flex flex-col">
                        {renderUsernameWithBadge(report.author, uInfo?.displayName, accountsInfo, "text-xs font-bold text-slate-800 dark:text-slate-200")}
                        <span className="text-[9px] text-slate-400">{getRelativeTime(report.timestamp)}</span>
                      </div>
                    </div>
                    <IconButton icon={<Trash2 size={14} />} variant="danger" size="sm" onClick={() => handleDeleteReport(report.id)} />
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed pl-1">{report.text}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
