// ==========================================
// firebase.js — Firebase 初期化・設定モジュール
// ==========================================
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// --- Firebase 初期化 ---
let app, auth, db, appId = 'withfit-app';
const FIREBASE_PROJECT_ID = "duofit-app-75cb2";

try {
  const firebaseConfig = {
    apiKey: "AIzaSyDQTfLhyuc8PEoMtw-FvEq4k9HShRJz_io",
    authDomain: "duofit-app-75cb2.firebaseapp.com",
    projectId: "duofit-app-75cb2",
    storageBucket: "duofit-app-75cb2.firebasestorage.app",
    messagingSenderId: "949622687026",
    appId: "1:949622687026:web:bcc53a734a31fc1a2a432b",
    measurementId: "G-73S4GC5XQY"
  };
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Offline persistence error:", err.code);
    });
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export {
  app,
  auth,
  db,
  appId,
  FIREBASE_PROJECT_ID
};