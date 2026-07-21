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

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    // 必要に応じてアイコン画像のパスを指定してください
    icon: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});