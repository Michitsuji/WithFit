import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, PlusCircle, Trash2, Sun, Moon, Droplet, Sparkles, AlertTriangle, Settings } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { ToggleSwitch } from '../common/ToggleSwitch';

export function ProfileModal({ isOpen, onClose, userInfo, onSave, currentUser, onLinkGoogle, onDeleteAccount, onTogglePush }) {
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
      onSave({ displayName: displayName.trim() || currentUser, photoUrl, userColor, goal: goal.trim(), theme, birthDate, gender, height: Number(height)||null, weight: Number(weight)||null, hideBodyMetrics, enablePartnerFeature, notifyPost, notifyComment, notifyLike }, false);
    }, 500);
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
      if (typeof window !== 'undefined') {
        const checkModalPermission = async () => {
          let current = 'default';
          if ('Notification' in window) current = Notification.permission;
          if (navigator.permissions && navigator.permissions.query) {
            try { const status = await navigator.permissions.query({ name: 'notifications' }); if (status && status.state) current = status.state === 'prompt' ? 'default' : status.state; } catch(e) {}
          }
          if (navigator.serviceWorker) {
            try { const reg = await navigator.serviceWorker.getRegistration(); if (reg && reg.pushManager) { const pmState = await reg.pushManager.permissionState({ userVisibleOnly: true }); if (pmState) current = pmState === 'prompt' ? 'default' : pmState; } } catch(e) {}
          }
          setOsPermission(current);
        };
        checkModalPermission();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setPhotoUrl(canvas.toDataURL('image/jpeg', 0.8));
      setCropImageSrc(null);
      setImageObj(null);
      setIsUploading(false);
    }, 50);
  };

  const handleCropCancel = () => {
    setCropImageSrc(null);
    setImageObj(null);
  };

  const handleSave = () => {
    onSave({ displayName: displayName.trim() || currentUser, photoUrl, userColor, goal: goal.trim(), theme, birthDate, gender, height: Number(height)||null, weight: Number(weight)||null, hideBodyMetrics, enablePartnerFeature, notifyPost, notifyComment, notifyLike }, true);
  };

  if (cropImageSrc) {
    return (
      <div 
        className="fixed inset-0 bg-black z-[60] flex flex-col items-center justify-center touch-none overscroll-none"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="absolute inset-x-0 top-0 p-4 flex justify-between items-center z-10 pt-safe">
          <button onClick={handleCropCancel} className="text-white font-bold px-4 py-2 bg-black/50 rounded-full">キャンセル</button>
          <button onClick={handleCropConfirm} className="text-emerald-400 font-bold px-4 py-2 bg-black/50 rounded-full">完了</button>
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
           <div className="absolute w-[300px] h-[300px] border-2 border-white/80 rounded-full pointer-events-none" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}></div>
        </div>
        <p className="absolute bottom-12 text-white/70 text-sm font-bold pb-safe pointer-events-none">スワイプで移動・ピンチで拡大縮小</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">プロフィール設定</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">表示名 (ユーザー名)</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
        </div>
        <div className="mb-6 space-y-3">
          {userInfo?.googleUid ? (
             <p className="text-sm text-emerald-600 font-bold bg-emerald-50 p-3 rounded-xl text-center border border-emerald-200">✓ Googleアカウント連携済み</p>
          ) : (
             <button onClick={onLinkGoogle} className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                Googleアカウントと連携
             </button>
          )}
          
          
        </div>
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <UserAvatar 
              userId={currentUser} 
              size={96} 
              photoUrlOverride={photoUrl} 
              displayNameOverride={displayName} 
              colorOverride={userColor} 
              className="border-4" 
            />
            {isUploading && <div className="absolute inset-0 rounded-full bg-white/60 dark:bg-slate-900/60 flex items-center justify-center"><Activity className="animate-spin text-emerald-500" size={24} /></div>}
          </div>
          
          <div className="flex gap-2 w-full">
            <label className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer">
              <PlusCircle size={16} /> 画像変更
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
            </label>
            {photoUrl && (
              <button onClick={() => setPhotoUrl(null)} disabled={isUploading} className="flex-1 py-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors">
                <Trash2 size={16} /> 削除
              </button>
            )}
          </div>
          
          <div className="w-full mt-4">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">テーマカラー (アイコン枠・タイムライン左枠)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={userColor} onChange={e => setUserColor(e.target.value)} className="w-12 h-10 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer shrink-0" />
              <input type="text" value={userColor} onChange={e => setUserColor(e.target.value)} className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 uppercase font-mono" placeholder="#10B981" />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
             <div className="min-w-0 overflow-hidden">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">性別</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="w-full min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}>
                   <option value="male">男性</option>
                   <option value="female">女性</option>
                   <option value="other">その他</option>
                </select>
             </div>
             <div className="min-w-0 overflow-hidden">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">生年月日</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full min-w-0 min-h-[42px] block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
             <div className="min-w-0 overflow-hidden">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">身長 (cm)</label>
                <input type="number" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} className="w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" placeholder="例: 170" style={{ fontSize: '16px' }} />
             </div>
             <div className="min-w-0 overflow-hidden">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">基本体重 (kg)</label>
                <input type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" placeholder="記録時の初期値" style={{ fontSize: '16px' }} />
             </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
             <input type="checkbox" id="hideBodyMetrics" checked={hideBodyMetrics} onChange={e => setHideBodyMetrics(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500" />
             <label htmlFor="hideBodyMetrics" className="text-sm font-bold text-slate-700 dark:text-slate-300">フレンドに体組成を非公開にする</label>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
             <input type="checkbox" id="enablePartnerFeature" checked={enablePartnerFeature} onChange={e => setEnablePartnerFeature(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500" />
             <label htmlFor="enablePartnerFeature" className="text-sm font-bold text-slate-700 dark:text-slate-300">パートナー機能を利用する</label>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">目標 (100文字以内)</label>
            <textarea value={goal} maxLength={100} onChange={e => setGoal(e.target.value)} placeholder="例: ベンチプレス100kg達成！" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-none" style={{ fontSize: '16px' }} rows={2} />
            <div className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1">{goal.length} / 100</div>
          </div>
          
          <div>             
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">プッシュ通知設定</label>
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            {osPermission === 'denied' && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <Settings size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 font-bold leading-relaxed">端末の設定で通知がオフになっています。<br/>iPhoneの設定アプリからアプリの通知を許可してください。</p>
                </div>
              </div>
            )}
            {!isPushEnabled && osPermission === 'default' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-col gap-3">
                <p className="text-xs text-amber-700 font-bold leading-relaxed">通知が許可されていません。<br/>後日表示されるポップアップから許可を行ってください。</p>
              </div>
            )}
            
            <div className={`space-y-3 ${(osPermission === 'denied' || (!isPushEnabled && osPermission === 'default')) ? 'opacity-50 pointer-events-none' : ''}`}>
              <ToggleSwitch label="フレンドのトレーニング完了" checked={notifyPost} onChange={e => setNotifyPost(e.target.checked)} />
              <ToggleSwitch label="コメントの受信" checked={notifyComment} onChange={e => setNotifyComment(e.target.checked)} />
              <ToggleSwitch label="ナイス！の受信" checked={notifyLike} onChange={e => setNotifyLike(e.target.checked)} />
              <p className="text-[10px] text-slate-400 font-bold mt-2">※すべての通知を完全に停止する場合は、iPhoneの設定アプリから通知をオフにしてください。</p>
            </div>
          </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">テーマ設定</label>
             <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
               <button onClick={() => setTheme('light')} className={`flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Sun size={16}/> ライト</button>
               <button onClick={() => setTheme('dark')} className={`flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-900 dark:bg-slate-950 text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Moon size={16}/> ダーク</button>
               <button onClick={() => setTheme('ocean')} className={`flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors ${theme === 'ocean' ? 'bg-[#0a2e4a] text-[#38bdf8] shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Droplet size={16}/> オーシャン</button>
               <button onClick={() => setTheme('pop')} className={`flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-colors ${theme === 'pop' ? 'bg-pink-100 border-2 border-pink-300 text-pink-500 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Sparkles size={16}/> ポップ</button>
             </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
          ※設定項目は変更すると自動的に保存されます
        </div>
        
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
           {!showDeleteConfirm ? (
             <button onClick={() => setShowDeleteConfirm(true)} className="w-full bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 py-3 rounded-xl font-bold text-sm transition-colors">
                アカウントを削除する
             </button>
           ) : (
             <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200">
               <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={16}/> 本当に削除しますか？</h3>
               <p className="text-xs font-bold text-rose-600/80 dark:text-rose-400/80 leading-relaxed mb-4">
                 アカウントを削除すると、すべてのトレーニング記録、フレンド関係、画像データが完全に消去され、復元することはできません。
               </p>
               <label className="flex items-start gap-2 mb-4 cursor-pointer">
                 <input type="checkbox" checked={deleteAgreed} onChange={(e) => setDeleteAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500" />
                 <span className="text-xs font-bold text-rose-700 dark:text-rose-300">上記の内容を理解し、アカウントの完全削除に同意します。</span>
               </label>
               <div className="flex gap-2">
                 <button onClick={() => { setShowDeleteConfirm(false); setDeleteAgreed(false); }} className="flex-1 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">キャンセル</button>
                 <button onClick={() => { setShowDeleteConfirm(false); setDeleteAgreed(false); onDeleteAccount(); }} disabled={!deleteAgreed} className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm hover:bg-rose-700">削除を実行する</button>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

// --- ユーザープロフィールモーダル ---
