// ============================================================================
// WithFit v2 - Firebase & 環境設定ファイル
// 別プロジェクトへ移行・デプロイする際は、以下の設定値を書き換えてください。
// （環境変数 REACT_APP_* を設定するか、直接下記の文字列を変更できます）
// ============================================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// 1. Firebase プロジェクト設定 (Firebase Console > プロジェクト設定 > マイアプリ から取得)
export const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDQTfLhyuc8PEoMtw-FvEq4k9HShRJz_io",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "duofit-app-75cb2.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "duofit-app-75cb2",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "duofit-app-75cb2.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "949622687026",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:949622687026:web:bcc53a734a31fc1a2a432b",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-73S4GC5XQY"
};

export const FIREBASE_PROJECT_ID = FIREBASE_CONFIG.projectId;

// 2. Firestore のルートドキュメントID (artifacts/{APP_ID}/public/data/...)
export const APP_ID = process.env.REACT_APP_WITHFIT_APP_ID || 'withfit-app';

// 3. Web Push 通知用 VAPID キー (Firebase Console > Cloud Messaging > ウェブプッシュ証明書)
export const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || 'BAty8GYk1zuoZVh-ZaSdcJsq_o-7vXJLXPNVNzlgsq9rd3wP-jQtclYEdu1MnnLN_0BnlmiKuoWH3X2YvOFl7aM';

// 4. マスター管理者ユーザー名（公式バッジ表示・共通種目編集・不具合管理・Pushテスト権限）
export const MASTER_USER = process.env.REACT_APP_MASTER_USER || 'ゆうた';

// 5. 新規登録可能な最大アカウント数上限
export const MAX_ACCOUNTS_LIMIT = Number(process.env.REACT_APP_MAX_ACCOUNTS_LIMIT) || 20;

// 6. 将来のAI機能拡張用キー・設定（現在はAI機能を無効化しています）
export const AI_CONFIG = {
  enabled: false, // 将来AI機能を有効化する場合は true に変更
  apiKey: process.env.REACT_APP_GEMINI_API_KEY || '', // クライアント直接呼び出し用（通常はVercel環境変数 GEMINI_API_KEY を /api/gemini.js で使用）
  endpoint: '/api/gemini',
  model: 'gemini-2.5-flash'
};

// --- Firebase 初期化 ---
let app = null;
let auth = null;
let db = null;

try {
  app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);

  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Offline persistence notice:", err.code);
    });
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { app, auth, db };
