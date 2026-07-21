importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDQTfLhyuc8PEoMtw-FvEq4k9HShRJz_io",
  authDomain: "duofit-app-75cb2.firebaseapp.com",
  projectId: "duofit-app-75cb2",
  storageBucket: "duofit-app-75cb2.firebasestorage.app",
  messagingSenderId: "949622687026",
  appId: "1:949622687026:web:bcc53a734a31fc1a2a432b",
});

// Firebaseを初期化するだけで、バックグラウンド時の通知の受信と表示は自動で行われます
const messaging = firebase.messaging();