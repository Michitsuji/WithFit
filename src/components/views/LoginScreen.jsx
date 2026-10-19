// ============================================================================
// WithFit v2 - ログイン・新規登録画面 (LoginScreen)
// ============================================================================

import React, { useState } from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { WithFitLogo, AdBanner } from '../common/UI';

export default function LoginScreen({ onLogin, onGoogleLogin, onSecretLogin, isOnline }) {
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
    <div className="min-h-screen w-screen overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6 relative select-none">
      <div
        onClick={handleOnlineTap}
        className="absolute top-6 left-6 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm cursor-pointer active:scale-95 transition-transform"
      >
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
        <span className="text-[10px] font-bold text-slate-500">{isOnline ? 'オンライン' : 'オフライン'}</span>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-3">
            <WithFitLogo size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            With<span className="text-emerald-500">Fit</span>
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">仲間と高め合う、スマートワークアウト記録</p>
        </div>

        <div className="w-full bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl flex flex-col items-center">
          {!showSecretLogin ? (
            <>
              <div className="w-full mb-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                  <ShieldCheck size={15} className="text-emerald-500" /> 利用規約の確認
                </div>
                <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/70 rounded-2xl p-3 h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text font-medium">
                  {termsText}
                </div>
                <label className="flex items-center gap-2.5 mt-3.5 cursor-pointer select-none p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">利用規約に同意してはじめる</span>
                </label>
                <div className="mt-3">
                  <AdBanner />
                </div>
              </div>
              <button
                type="button"
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
                      signInWithPopup(getAuth(), provider)
                        .then((result) => {
                          onGoogleLogin(result.user);
                        })
                        .catch((err) => {
                          console.error(err);
                          if (err.code !== 'auth/popup-closed-by-user') {
                            signInWithRedirect(getAuth(), provider);
                          }
                        });
                    }
                  }
                }}
                className={`w-full font-bold py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 border ${
                  agreed
                    ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Googleでログイン / 新規登録
              </button>
            </>
          ) : (
            <form onSubmit={handleSecretSubmit} className="w-full space-y-4">
              <h3 className="font-bold text-slate-800 text-center flex items-center justify-center gap-1.5">
                <KeyRound size={16} className="text-emerald-500" /> 直接ログイン
              </h3>
              {secretError && <p className="text-xs font-bold text-rose-500 bg-rose-50 p-2.5 rounded-xl text-center">{secretError}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">フレンドコード (5桁)</label>
                <input
                  type="text"
                  value={secretCode}
                  onChange={e => setSecretCode(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">生年月日</label>
                <input
                  type="date"
                  value={secretBirthDate}
                  onChange={e => setSecretBirthDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSecretSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold py-3 rounded-xl shadow-sm transition-all"
              >
                {isSecretSubmitting ? 'ログイン中...' : 'ログイン'}
              </button>
              <button
                type="button"
                onClick={() => setShowSecretLogin(false)}
                className="w-full text-slate-500 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
              >
                戻る
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
