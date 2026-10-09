import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getAuth } from 'firebase/auth';
import { WithFitLogo } from '../components/common/アプリアイコン';
import { AdBanner } from '../components/common/広告バナー';

export function LoginScreen({ onLogin, onGoogleLogin, onSecretLogin, isOnline }) {
  const [agreed, setAgreed] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [showSecretLogin, setShowSecretLogin] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [secretBirthDate, setSecretBirthDate] = useState('');
  const [secretError, setSecretError] = useState('');
  const [isSecretSubmitting, setIsSecretSubmitting] = useState(false);
  
  const handleOnlineTap = () => {
    const newCount = secretTapCount + 1;
    setSecretTapCount(newCount);
    if (newCount >= 10) {
      setShowSecretLogin(true);
      setSecretTapCount(0);
    }
  };

  const handleSecretSubmit = async (e) => {
    e.preventDefault();
    setIsSecretSubmitting(true);
    setSecretError('');
    const success = await onSecretLogin(secretCode, secretBirthDate);
    if (!success) {
      setSecretError('フレンドコードまたは生年月日が正しくありません。');
    }
    setIsSecretSubmitting(false);
  };

  const termsText = `【WithFit 利用規約】
本アプリは「ゆうた」とその友人達でトレーニング記録を共有し、モチベーションを高め合うクローズドな個人開発アプリです。友達同士で安心して使えるよう、以下の内容をご確認ください。

1. Googleアカウント情報の取得と使用目的
・本アプリへの簡単ログイン、およびアカウント識別（UID、メールアドレス）に利用します。
・初回登録時に、Googleに登録されている「表示名」と「アイコン画像」を取得し、本アプリのプロフィール初期値として使用します（表示名や画像はログイン後、プロフィール設定からいつでも自由に変更・削除可能です）。
・取得した情報およびデータを外部に漏洩・提供することは一切ありません。

2. トレーニング・体重・体脂肪率データ
・登録された筋トレメニューや体重、体脂肪率などの数値は、フレンド間のタイムラインや月間ランキングに表示されます。
・体重・体脂肪率の体組成データは、プロフィール設定からいつでもフレンドに「非公開（ないしょ♡）」に設定可能です。

3. 免責事項
・本アプリは個人開発のサービスです。予期せぬシステムの不具合やデータの消失等が発生した場合、一切の責任を負いかねますので、あらかじめご了承ください。
・友達同士でマナーを守り、楽しくアプリを活用しましょう！`;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-6 relative overscroll-none touch-none">
      <div onClick={handleOnlineTap} className="absolute top-6 left-6 z-10 flex items-center gap-1.5 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm cursor-pointer select-none">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
        <span className="text-[10px] font-bold text-slate-500">{isOnline ? 'オンライン' : 'オフライン'}</span>
      </div>
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <WithFitLogo className="text-indigo-500 w-16 h-16 mb-2" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">WithFit</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">みんなで鍛える、記録アプリ</p>
        </div>
        <div className="w-full bg-white p-6 rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center">
           {!showSecretLogin ? (
             <>
               <div className="w-full mb-4">
                 <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3 h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text font-bold">
                   {termsText}
                 </div>
                 <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                   <input 
                     type="checkbox" 
                     checked={agreed} 
                     onChange={(e) => setAgreed(e.target.checked)} 
                     className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500" 
                   />
                   <span className="text-xs font-bold text-slate-600">利用規約に同意する</span>
                 </label>
                 <div className="mt-4">
                   <AdBanner />
                 </div>
               </div>
               <button 
                 disabled={!agreed}
                 onClick={() => { 
                   const isWebView = typeof window !== 'undefined' && window.ReactNativeWebView;
                   if (isWebView) {
                     window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_GOOGLE_LOGIN' }));
                   } else {
                     const provider = new GoogleAuthProvider(); 
                     provider.setCustomParameters({ prompt: 'select_account' }); 
                     if (navigator.userAgent.includes('Edg')) {
                       signInWithRedirect(getAuth(), provider);
                     } else {
                       signInWithPopup(getAuth(), provider).then((result) => { 
                         onGoogleLogin(result.user); 
                       }).catch((err) => {
                         console.error(err);
                         if (err.code !== 'auth/popup-closed-by-user') {
                           signInWithRedirect(getAuth(), provider);
                         }
                       }); 
                     }
                   }
                 }} 
                 className={`w-full font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors border ${agreed ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
               > 
                 Googleでログイン / 登録
               </button>
             </>
           ) : (
             <form onSubmit={handleSecretSubmit} className="w-full space-y-4">
               <h3 className="font-bold text-slate-800 text-center mb-2">直接ログイン</h3>
               {secretError && <p className="text-xs font-bold text-rose-500 bg-rose-50 p-2 rounded-lg text-center">{secretError}</p>}
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">フレンドコード</label>
                 <input type="text" value={secretCode} onChange={e => setSecretCode(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">生年月日</label>
                 <input type="date" value={secretBirthDate} onChange={e => setSecretBirthDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500" />
               </div>
               <button type="submit" disabled={isSecretSubmitting} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-sm transition-colors mt-2">
                 {isSecretSubmitting ? 'ログイン中...' : 'ログイン'}
               </button>
               <button type="button" onClick={() => setShowSecretLogin(false)} className="w-full text-slate-500 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors mt-2">
                 戻る
               </button>
             </form>
           )}
        </div>
      </div>
    </div>
  );
}

// --- 広告コンポーネント ---
