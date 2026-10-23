// ==========================================
// App.js — メインアプリケーションコンポーネント
// ==========================================
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Activity, Bell, Heart, MessageCircle, UserPlus, LogOut, Flame, ChevronRight, ChevronLeft, MapPin, Clock, VolumeX, Volume2, X, Play, Lock, Home, Dumbbell, PlusCircle, Users, Settings, Calendar as CalendarIcon } from 'lucide-react';
import { GoogleAuthProvider, signInWithCredential, getRedirectResult, signInAnonymously, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { setDoc, doc, getDoc, deleteField, collection, onSnapshot, query, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { db, appId, auth, app } from './firebase';
import { generateId, generateFriendCode, calculateWorkoutTotals, getRelativeTime } from './utils';
import { useAutoScrollDisable, WithFitLogo, UserAvatar, renderUsernameWithBadge, TimerDisplay, NavButton, RecordWheelWrapper } from './CommonUI';
import { TimelineView, WorkoutCard } from './WorkoutCard';
import { EditWorkoutModal } from './WorkoutForm';
import { DataView } from './DataView';
import { RecordView } from './RecordView';
import { ExercisesView } from './ExercisesView';
import { FriendsView, FriendDetailModal } from './FriendsView';
import { LoginScreen, ProfileModal, UserProfileModal } from './ProfileModals';
import { CoachChatModal, SecretGame } from './CoachAndGame';

const VAPID_PUBLIC_KEY = 'BAty8GYk1zuoZVh-ZaSdcJsq_o-7vXJLXPNVNzlgsq9rd3wP-jQtclYEdu1MnnLN_0BnlmiKuoWH3X2YvOFl7aM';
const DEVICE_TOKEN_STORAGE_KEY = 'withfit_device_fcm_token';

export default function App() {
  useAutoScrollDisable();

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const pendingPushToken = useRef(null);
  const hasRefreshedTokenForUser = useRef(null);
  const mountTimeRef = useRef(Date.now());
  const shownToastIdsRef = useRef(new Set());
  const toastTimerRef = useRef(null);

  const [deviceFcmToken, setDeviceFcmToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY) || null;
    }
    return null;
  });
  const [isPushSupported, setIsPushSupported] = useState(true);
  const [activeToast, setActiveToast] = useState(null);

  const showInAppToast = useCallback((notifData) => {
    if (!notifData) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActiveToast(notifData);
    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 5000);
  }, []);

  // 端末トークンをユーザーのFirestoreドキュメント（fcmTokens配列 + fcmToken）へ安全に保存するヘルパー
  const saveTokenToUserAccount = useCallback(async (username, token) => {
    if (!username || !token || !db) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
      }
      setDeviceFcmToken(token);

      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username);
      const snap = await getDoc(userRef);
      const existingData = snap.exists() ? snap.data() : {};
      const existingTokens = Array.isArray(existingData.fcmTokens)
        ? existingData.fcmTokens
        : (existingData.fcmToken ? [existingData.fcmToken] : []);
      const mergedTokens = [...new Set([...existingTokens.filter(Boolean), token])].slice(-5);

      await setDoc(userRef, {
        fcmToken: token,
        fcmTokens: mergedTokens,
        fcmTokenUpdatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error('Failed to save FCM token:', e);
    }
  }, []);

  // 現在の端末のトークンのみをユーザーのFirestoreドキュメントから削除するヘルパー（他端末のトークンは壊さない）
  const removeDeviceTokenFromUserAccount = useCallback(async (username) => {
    if (!username || !db) return;
    const localToken = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY) : deviceFcmToken;
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const existingTokens = Array.isArray(data.fcmTokens)
          ? data.fcmTokens
          : (data.fcmToken ? [data.fcmToken] : []);
        const remainingTokens = localToken
          ? existingTokens.filter(t => t && t !== localToken)
          : [];
        const nextPrimary = remainingTokens.length > 0 ? remainingTokens[remainingTokens.length - 1] : deleteField();

        await setDoc(userRef, {
          fcmTokens: remainingTokens,
          fcmToken: nextPrimary,
          fcmTokenUpdatedAt: Date.now()
        }, { merge: true });
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
      }
      setDeviceFcmToken(null);
    } catch (e) {
      console.error('Failed to remove device FCM token:', e);
    }
  }, [deviceFcmToken]);

  // Service Workerを確実に登録し、FCMトークンを取得するコア関数
  const registerSwAndFetchToken = useCallback(async () => {
    if (typeof window === 'undefined' || !app) return null;
    try {
      const supported = await isSupported().catch(() => false);
      setIsPushSupported(supported);
      if (!supported) return null;

      let swReg = null;
      if ('serviceWorker' in navigator) {
        try {
          swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          await navigator.serviceWorker.ready;
        } catch (swErr) {
          console.warn('Service worker registration warning:', swErr);
          swReg = await navigator.serviceWorker.getRegistration();
        }
      }

      const messaging = getMessaging(app);
      const tokenOptions = { vapidKey: VAPID_PUBLIC_KEY };
      if (swReg) {
        tokenOptions.serviceWorkerRegistration = swReg;
      }
      const token = await getToken(messaging, tokenOptions);
      return token || null;
    } catch (err) {
      console.warn('registerSwAndFetchToken error:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (currentUser && pendingPushToken.current) {
      saveTokenToUserAccount(currentUser, pendingPushToken.current);
      pendingPushToken.current = null;
    }
  }, [currentUser, saveTokenToUserAccount]);

  useEffect(() => {
    const handleNativeMessage = (event) => {
      try {
        const rawData = event.data || (event.nativeEvent && event.nativeEvent.data);
        if (!rawData) return;
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        
        if (data.type === 'PUSH_TOKEN' && data.token) {
          if (currentUser) {
            saveTokenToUserAccount(currentUser, data.token);
          } else {
            pendingPushToken.current = data.token;
          }
        } else if (data.type === 'PUSH_PERMISSION_STATUS') {
          setOsPermission(prev => prev !== data.status ? data.status : prev);
        } else if (data.type === 'NATIVE_GOOGLE_LOGIN' && data.idToken) {
          const credential = GoogleAuthProvider.credential(data.idToken);
          signInWithCredential(auth, credential).catch(err => console.error("Native login error:", err));
        } else if (data.type === 'NOTIFICATION_CLICK' && data.data) {
          const nData = data.data;
          if (nData.type === 'joint') {
            setCurrentTab('record');
          } else if (nData.type === 'request') {
            setCurrentTab('friends');
          } else if (nData.postId) {
            setCurrentTab('timeline');
            setScrollToPostId(nData.postId);
          }
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('message', handleNativeMessage);
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleNativeMessage);
    }
    return () => {
      window.removeEventListener('message', handleNativeMessage);
      document.removeEventListener('message', handleNativeMessage);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleNativeMessage);
      }
    };
  }, [currentUser, saveTokenToUserAccount]);

  // フォアグラウンドでのFCMプッシュ受信リスナー
  useEffect(() => {
    if (typeof window === 'undefined' || !app || !currentUser) return;
    let unsubscribeMsg = null;
    isSupported().then((supported) => {
      setIsPushSupported(supported);
      if (!supported) return;
      try {
        const messaging = getMessaging(app);
        unsubscribeMsg = onMessage(messaging, (payload) => {
          const title = payload?.notification?.title || payload?.data?.title || 'WithFit';
          const body = payload?.notification?.body || payload?.data?.body || '';
          const type = payload?.data?.type || 'general';
          const postId = payload?.data?.postId || null;
          if (body) {
            showInAppToast({
              id: `fcm_${Date.now()}`,
              title,
              message: body,
              type,
              postId,
              fromUser: payload?.data?.fromUser || 'system',
              timestamp: Date.now()
            });
          }
        });
      } catch (e) {}
    }).catch(() => {});

    return () => {
      if (unsubscribeMsg) unsubscribeMsg();
    };
  }, [currentUser, showInAppToast]);

  const [currentTab, setCurrentTab] = useState('timeline');
  const [isRecordManual, setIsRecordManual] = useState(false);
  const [importGymId, setImportGymId] = useState('');
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  useEffect(() => {
    const sessionStr = localStorage.getItem('withfit_login_session');
    if (sessionStr) {
       try {
          const session = JSON.parse(sessionStr);
          if (session.userId && session.lastActive && Date.now() - session.lastActive <= 7 * 24 * 60 * 60 * 1000) {
             setCurrentUser(session.userId);
          } else {
             localStorage.removeItem('withfit_login_session');
          }
       } catch(e) {}
    }
    setIsSessionChecked(true);
  }, []);
  
  const scrollPositions = useRef({});
  const prevTabRef = useRef('timeline');

  useEffect(() => {
    scrollPositions.current[prevTabRef.current] = window.scrollY;
    const targetPosition = scrollPositions.current[currentTab] || 0;
    
    const timer = setTimeout(() => {
      window.scrollTo(0, targetPosition);
    }, 0);

    prevTabRef.current = currentTab;
    return () => clearTimeout(timer);
  }, [currentTab]);
  
  const [posts, setPosts] = useState([]);
  const [accountsInfo, setAccountsInfo] = useState({});
  const [gyms, setGyms] = useState([]); 
  const [exercises, setExercises] = useState([]); 

  const [dataLoaded, setDataLoaded] = useState({ accounts: false, gyms: false, exercises: false, workouts: false });
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [draftWorkoutItems, setDraftWorkoutItems] = useState([]);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedFriendUser, setSelectedFriendUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [focusedPost, setFocusedPost] = useState(null);
  const [scrollToPostId, setScrollToPostId] = useState(null);
  const [redirectUser, setRedirectUser] = useState(null);
  const [targetFriendTab, setTargetFriendTab] = useState(null);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [pushPromptType, setPushPromptType] = useState('request');
  const [osPermission, setOsPermission] = useState('default');

  const [showCoachChat, setShowCoachChat] = useState(false);

  const [restDuration, setRestDuration] = useState(0);
  const [restTimerStart, setRestTimerStart] = useState(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [selectedRestMinute, setSelectedRestMinute] = useState(1);

  const [timerState, setTimerState] = useState({ x: 'center', y: 'top', hidden: false });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isTimerDragging, setIsTimerDragging] = useState(false);
  const timerDragInfo = useRef({ startX: 0, startY: 0, lastX: 0, velocityX: 0, startTime: 0, initRect: null });
  const timerCardRef = useRef(null);
  const [screenSize, setScreenSize] = useState({ w: 0, h: 0 });

  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const alarmAudio = useRef(null);

  const [timerVolume, setTimerVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('withfit_timer_volume');
      return saved !== null ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });

  const [headerSecretTapCount, setHeaderSecretTapCount] = useState(0);
  const [showSecretGame, setShowSecretGame] = useState(false);

  const handleHeaderOnlineTap = () => {
    const newCount = headerSecretTapCount + 1;
    setHeaderSecretTapCount(newCount);
    if (newCount >= 10) {
      setShowSecretGame(true);
      setHeaderSecretTapCount(0);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
       alarmAudio.current = new Audio('alarm.mp3');
       alarmAudio.current.loop = true;
       alarmAudio.current.volume = timerVolume;
       alarmAudio.current.muted = timerVolume === 0;
    }
  }, []);

  useEffect(() => {
    if (alarmAudio.current) {
      alarmAudio.current.volume = timerVolume;
      alarmAudio.current.muted = timerVolume === 0;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('withfit_timer_volume', timerVolume.toString());
    }
  }, [timerVolume]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
       setScreenSize({ w: window.innerWidth, h: window.innerHeight });
       const handleResize = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
       window.addEventListener('resize', handleResize);
       return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    if (!restTimerStart) return;
    if (isAlarmRinging) return;
    const interval = setInterval(() => {
       const elapsed = Math.floor((Date.now() - restTimerStart) / 1000);
       if (restDuration === 0) {
          setRestTimeLeft(elapsed);
       } else {
          const left = restDuration - elapsed;
          if (left <= 0) {
             setRestTimeLeft(0);
             setIsAlarmRinging(true);
             if (alarmAudio.current) alarmAudio.current.play().catch(e=>console.log(e));
             if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
             if (typeof window !== 'undefined' && window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VIBRATE' })); }
             clearInterval(interval);
          } else {
             setRestTimeLeft(left);
          }
       }
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimerStart, restDuration, isAlarmRinging]);

  const startRestTimer = (minutes) => {
    if (alarmAudio.current) {
        alarmAudio.current.muted = true;
        alarmAudio.current.play().then(() => {
            alarmAudio.current.pause();
            alarmAudio.current.currentTime = 0;
            alarmAudio.current.muted = timerVolume === 0;
        }).catch(() => {
            alarmAudio.current.muted = timerVolume === 0;
        });
    }
    setRestDuration(minutes * 60);
    setRestTimeLeft(minutes === 0 ? 0 : minutes * 60);
    setRestTimerStart(Date.now());
    setShowTimerMenu(false);
  };

  const stopAlarm = () => {
    setIsAlarmRinging(false);
    if (alarmAudio.current) {
       alarmAudio.current.pause();
       alarmAudio.current.currentTime = 0;
    }
    setRestTimerStart(null);
    setRestDuration(0);
    setRestTimeLeft(0);
  };

  const handleTimerTouchStart = (e) => {
    if (e.target.closest('button, select')) return;
    const touch = e.touches ? e.touches[0] : e;
    timerDragInfo.current = { 
      startX: touch.clientX, 
      startY: touch.clientY, 
      lastX: touch.clientX,
      velocityX: 0,
      startTime: Date.now(),
      initRect: timerCardRef.current?.getBoundingClientRect()
    };
    setIsTimerDragging(true);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTimerTouchMove = (e) => {
    if (!isTimerDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - timerDragInfo.current.startX;
    const dy = touch.clientY - timerDragInfo.current.startY;
    
    const dt = Date.now() - timerDragInfo.current.startTime;
    timerDragInfo.current.velocityX = (touch.clientX - timerDragInfo.current.lastX) / (dt || 1);
    timerDragInfo.current.lastX = touch.clientX;
    timerDragInfo.current.startTime = Date.now();

    setDragOffset({ x: dx, y: dy });
  };

  const handleTimerTouchEnd = () => {
    if (!isTimerDragging) return;
    setIsTimerDragging(false);

    const { velocityX, initRect } = timerDragInfo.current;
    if (!initRect) return;
    
    const currentX = initRect.left + dragOffset.x;
    const currentY = initRect.top + dragOffset.y;
    const screenW = screenSize.w || window.innerWidth;
    const screenH = screenSize.h || window.innerHeight;

    const isLeft = currentX + initRect.width / 2 < screenW / 2;
    const isTop = currentY + initRect.height / 2 < screenH / 2;

    let nextX = isLeft ? 'left' : 'right';
    let nextY = isTop ? 'top' : 'bottom';
    let nextHidden = false;

    if (velocityX < -1.0 || (isLeft && currentX < -initRect.width / 4)) {
       nextX = 'left';
       nextHidden = true;
    } else if (velocityX > 1.0 || (!isLeft && currentX + initRect.width > screenW + initRect.width / 4)) {
       nextX = 'right';
       nextHidden = true;
    }

    setTimerState({ x: nextX, y: nextY, hidden: nextHidden });
    setDragOffset({ x: 0, y: 0 });
  };

  const restoreTimerCard = () => {
    if (timerState.hidden) setTimerState(prev => ({ ...prev, hidden: false }));
  };

  let transformY = 0;
  let transformX = 0;
  
  if (isTimerDragging && timerDragInfo.current.initRect) {
     transformX = timerDragInfo.current.initRect.left + dragOffset.x;
     transformY = timerDragInfo.current.initRect.top + dragOffset.y;
  } else {
     const screenW = screenSize.w || (typeof window !== 'undefined' ? window.innerWidth : 400);
     const screenH = screenSize.h || (typeof window !== 'undefined' ? window.innerHeight : 800);
     const cardW = timerCardRef.current?.offsetWidth || Math.min(screenW - 32, 448);
     const cardH = timerCardRef.current?.offsetHeight || 64;
     
     if (timerState.hidden) {
        transformX = timerState.x === 'left' ? -cardW + 28 : screenW - 28;
     } else {
        if (timerState.x === 'center') transformX = (screenW - cardW) / 2;
        else if (timerState.x === 'left') transformX = 16;
        else transformX = screenW - cardW - 16;
     }
     
     if (timerState.y === 'top') {
        const hasActiveFriends = currentUser && accountsInfo[currentUser]?.friends?.some(f => accountsInfo[f]?.isTraining);
        transformY = hasActiveFriends ? 112 : 80;
     } else {
        transformY = screenH - cardH - 90;
     }
  }
  const isHidden = timerState.hidden;

  const cancelRestTimer = () => {
    stopAlarm();
    setShowTimerMenu(false);
  };

  const formatRestTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const checkPermission = async () => {
      if (typeof window === 'undefined') return;
      let current = 'default';
      
      if ('Notification' in window) {
        current = Notification.permission;
      }
      
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'notifications' });
          if (status && status.state) current = status.state === 'prompt' ? 'default' : status.state;
        } catch(e) {}
      }
      
      setOsPermission(prev => prev !== current ? current : prev);
    };

    checkPermission();

    let intervalId;
    if (typeof window !== 'undefined') {
       intervalId = setInterval(checkPermission, 2500);
       window.addEventListener('focus', checkPermission);
       window.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkPermission();
       });
    }

    return () => {
       if (typeof window !== 'undefined') {
          window.removeEventListener('focus', checkPermission);
          clearInterval(intervalId);
       }
    };
  }, []);

  // =========================================================
  // 新・統合通知配信エンジン (Firestoreリアルタイム通知 + 多端末WebPush)
  // =========================================================
  const sendNotification = useCallback(async (targetUsername, title, body, type = 'general', relatedPostId = null, options = {}) => {
    const { allowSelf = false, fromUserOverride = null } = options;
    if (!targetUsername || !db) return { inAppSuccess: false, pushSuccess: false };
    if (!allowSelf && targetUsername === currentUser) return { inAppSuccess: false, pushSuccess: false };

    // accountsInfoにまだ読み込まれていない相手（フレンドコード検索からの申請等）でも確実に届くようFirestoreから最新データを取得
    let targetUser = accountsInfo[targetUsername] || null;
    try {
      const targetDocSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', targetUsername));
      if (targetDocSnap.exists()) {
        targetUser = targetDocSnap.data();
      }
    } catch (e) {
      // オフライン等の場合はキャッシュされたaccountsInfoを使用
    }
    if (!targetUser) return { inAppSuccess: false, pushSuccess: false };

    // 受信側のカテゴリ別通知設定を判定
    if (type === 'post' && targetUser.notifyPost === false) return { inAppSuccess: false, pushSuccess: false };
    if (type === 'comment' && targetUser.notifyComment === false) return { inAppSuccess: false, pushSuccess: false };
    if (type === 'like' && targetUser.notifyLike === false) return { inAppSuccess: false, pushSuccess: false };

    const senderId = fromUserOverride || currentUser || 'system';
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let inAppSuccess = false;
    let pushSuccess = false;

    // 1. アプリ内通知ドキュメントをFirestoreへ保存
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', notifId), {
        targetUser: targetUsername,
        fromUser: senderId,
        type,
        title,
        message: body,
        postId: relatedPostId || null,
        read: false,
        timestamp: Date.now()
      });
      inAppSuccess = true;
    } catch (e) {
      console.error('Firestore notification write error:', e);
    }

    // 2. 登録されているすべての端末トークン（fcmTokens配列 + fcmToken）へFCMプッシュ通知を送信
    const targetTokens = [...new Set([
      ...(Array.isArray(targetUser.fcmTokens) ? targetUser.fcmTokens : []),
      targetUser.fcmToken
    ].filter(t => typeof t === 'string' && t.trim().length > 0))];

    if (targetTokens.length > 0) {
      try {
        const res = await fetch('/api/sendPush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetToken: targetTokens[targetTokens.length - 1],
            targetTokens,
            title,
            body,
            data: {
              type,
              postId: relatedPostId || '',
              fromUser: senderId,
              notifId,
              url: '/'
            }
          })
        });
        if (res.ok) {
          const resJson = await res.json().catch(() => ({}));
          pushSuccess = Boolean(resJson.success);
          // 無効化された古いトークンがあれば自動的にFirestoreからクリーンアップ
          if (Array.isArray(resJson.invalidTokens) && resJson.invalidTokens.length > 0) {
            const validTokens = targetTokens.filter(t => !resJson.invalidTokens.includes(t));
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', targetUsername), {
              fcmTokens: validTokens,
              fcmToken: validTokens.length > 0 ? validTokens[validTokens.length - 1] : deleteField()
            }, { merge: true }).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Push API call error:', e);
      }
    }

    return { inAppSuccess, pushSuccess, tokenCount: targetTokens.length };
  }, [accountsInfo, currentUser]);

  const handleAddComment = async (postId, text, parentId = null) => {
    if (!currentUser || !db || !text.trim()) return;
    const newComment = {
      id: generateId(),
      author: currentUser,
      text: text.trim(),
      timestamp: Date.now(),
      parentId: parentId || null
    };
    try {
      const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        const currentComments = postData.comments || [];
        await setDoc(postRef, { comments: [...currentComments, newComment] }, { merge: true });
        
        const authorName = accountsInfo[currentUser]?.displayName || currentUser;
        const targetUsers = new Set();
        
        if (postData.author !== currentUser) {
          targetUsers.add(postData.author);
        }
        
        const mentions = text.match(/@([a-zA-Z0-9_ぁ-んァ-ヶ一-龠]+)/g);
        if (mentions) {
          mentions.forEach(m => {
            const uname = m.substring(1);
            const targetInfo = Object.entries(accountsInfo).find(([k, v]) => k === uname || v.displayName === uname);
            if (targetInfo && targetInfo[0] !== currentUser) {
              targetUsers.add(targetInfo[0]);
            }
          });
        }
        
        let replyTargetUser = null;
        if (parentId) {
           const parentComment = currentComments.find(c => c.id === parentId);
           if (parentComment && parentComment.author !== currentUser) {
              replyTargetUser = parentComment.author;
              targetUsers.add(replyTargetUser);
           }
        }

        targetUsers.forEach(userId => {
          const isPostAuthor = userId === postData.author;
          const isReplyTarget = userId === replyTargetUser;
          const isMentioned = mentions && mentions.some(m => {
              const uname = m.substring(1);
              const tInfo = Object.entries(accountsInfo).find(([k, v]) => k === uname || v.displayName === uname);
              return tInfo && tInfo[0] === userId;
          });

          let title = '💬 コメント';
          let body = '';
          const targetGymText = postData.gymName ? `（${postData.gymName}）` : '';

          if (isReplyTarget || isMentioned) {
            title = '💬 返信';
            body = `${authorName}さんがコメントであなたに返信しました: 「${text.trim()}」`;
          } else if (isPostAuthor) {
            title = '💬 コメント';
            body = `${authorName}さんがあなたの投稿${targetGymText}にコメントしました: 「${text.trim()}」`;
          }
          if (body) {
             sendNotification(userId, title, body, 'comment', postId);
          }
        });
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!currentUser || !db) return;
    try {
      const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const currentComments = postSnap.data().comments || [];
        await setDoc(postRef, { comments: currentComments.filter(c => c.id !== commentId) }, { merge: true });
      }
    } catch (e) {}
  };

  const handleToggleCommentLike = async (postId, commentId) => {
    if (!currentUser || !db) return;
    try {
      const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        const currentComments = postData.comments || [];
        let targetComment = null;
        const updatedComments = currentComments.map(c => {
          if (c.id === commentId) {
            const likedUsers = c.likedUsers || [];
            const isLiked = likedUsers.includes(currentUser);
            const newLikedUsers = isLiked ? likedUsers.filter(u => u !== currentUser) : [...likedUsers, currentUser];
            targetComment = { ...c, likedUsers: newLikedUsers };
            return targetComment;
          }
          return c;
        });
        await setDoc(postRef, { comments: updatedComments }, { merge: true });
        
        if (targetComment && targetComment.likedUsers.includes(currentUser) && targetComment.author !== currentUser) {
            const authorName = accountsInfo[currentUser]?.displayName || currentUser;
            const shortComment = targetComment.text.length > 15 ? targetComment.text.substring(0, 15) + '...' : targetComment.text;
            sendNotification(targetComment.author, '👍 コメントにナイス！', `${authorName}さんがあなたのコメント「${shortComment}」にナイスしました！`, 'like', postId);
        }
      }
    } catch (e) { console.error(e); }
  };

  // セッション、基本データ、下書きの全ての読み込みが完了するまでローディングとする
  const isFullyLoaded = isSessionChecked && (Object.values(dataLoaded).every(Boolean) || loadTimeout) && (!currentUser || isDraftLoaded);

  useEffect(() => {
    if (redirectUser && dataLoaded.accounts) {
      handleGoogleLogin(redirectUser);
      setRedirectUser(null);
    }
  }, [redirectUser, dataLoaded.accounts]);

  useEffect(() => {
    if (firebaseUser && !firebaseUser.isAnonymous && dataLoaded.accounts && !currentUser) {
      handleGoogleLogin(firebaseUser);
    }
  }, [firebaseUser, dataLoaded.accounts, currentUser]);

  // 起動時・ログイン時にプッシュ通知トークンを安全に同期する（他端末のトークンを上書き消去しない）
  useEffect(() => {
    if (!currentUser) {
      hasRefreshedTokenForUser.current = null;
      return;
    }
    if (!dataLoaded.accounts || typeof window === 'undefined') return;

    const myData = accountsInfo[currentUser];
    if (!myData) return;

    if (window.ReactNativeWebView && hasRefreshedTokenForUser.current !== currentUser) {
      hasRefreshedTokenForUser.current = currentUser;
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_PUSH_TOKEN' }));
      } catch (e) {}
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        if (hasRefreshedTokenForUser.current !== currentUser) {
          hasRefreshedTokenForUser.current = currentUser;
          registerSwAndFetchToken().then((token) => {
            if (token) {
              saveTokenToUserAccount(currentUser, token);
            }
          });
        }
      } else {
        const hasPromptedThisSession = sessionStorage.getItem('withfit_push_prompted');
        if (!hasPromptedThisSession) {
          if (Notification.permission === 'default') {
            setPushPromptType('request');
            const timer = setTimeout(() => { setShowPushPrompt(true); sessionStorage.setItem('withfit_push_prompted', 'true'); }, 1500);
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [currentUser, dataLoaded.accounts, accountsInfo, registerSwAndFetchToken, saveTokenToUserAccount]);

  useEffect(() => {
    if (currentUser && db) {
      const loadDraft = async () => {
        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
          const docSnap = await getDoc(docRef);
          const savedDraft = localStorage.getItem(`withfit_draft_${currentUser}`);
          const savedCats = localStorage.getItem(`withfit_cats_${currentUser}`);
          const lsTimestamp = Number(localStorage.getItem(`withfit_draft_time_${currentUser}`)) || 0;
          const fsTimestamp = docSnap.exists() ? (docSnap.data().draftUpdatedAt || 0) : 0;

          if (savedDraft && (lsTimestamp >= fsTimestamp || !fsTimestamp)) {
             setDraftWorkoutItems(JSON.parse(savedDraft));
             if (savedCats) setSelectedCategories(JSON.parse(savedCats));
          } else if (docSnap.exists() && docSnap.data().currentWorkoutItems) {
             setDraftWorkoutItems(docSnap.data().currentWorkoutItems);
             setSelectedCategories(docSnap.data().currentSelectedCategories || []);
          } else if (savedDraft) {
             setDraftWorkoutItems(JSON.parse(savedDraft));
             if (savedCats) setSelectedCategories(JSON.parse(savedCats));
          }
        } catch (e) {
          console.error("Failed to load draft", e);
        } finally {
          setIsDraftLoaded(true);
        }
      };
      loadDraft();
    } else {
      setIsDraftLoaded(false);
    }
  }, [currentUser, db]);

  useEffect(() => {
    const myAcc = accountsInfo[currentUser];
    if (myAcc && myAcc.jointPartnerId && myAcc.currentWorkoutItems && myAcc.lastUpdater !== currentUser) {
       setDraftWorkoutItems(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(myAcc.currentWorkoutItems)) {
             return myAcc.currentWorkoutItems;
          }
          return prev;
       });
    }
  }, [accountsInfo[currentUser]?.currentWorkoutItems, accountsInfo[currentUser]?.lastUpdater, currentUser]);

  useEffect(() => {
    if (currentUser && db && isDraftLoaded) {
      try {
        if (draftWorkoutItems.length > 0 || selectedCategories.length > 0) {
          const now = Date.now();
          localStorage.setItem(`withfit_draft_${currentUser}`, JSON.stringify(draftWorkoutItems));
          localStorage.setItem(`withfit_cats_${currentUser}`, JSON.stringify(selectedCategories));
          localStorage.setItem(`withfit_draft_time_${currentUser}`, now.toString());
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
            currentWorkoutItems: draftWorkoutItems,
            currentSelectedCategories: selectedCategories,
            draftUpdatedAt: now,
            lastUpdater: currentUser
          }, { merge: true }).catch(()=>{});
        } else {
          localStorage.removeItem(`withfit_draft_${currentUser}`);
          localStorage.removeItem(`withfit_cats_${currentUser}`);
          localStorage.setItem(`withfit_draft_time_${currentUser}`, Date.now().toString());
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
            currentWorkoutItems: deleteField(),
            currentSelectedCategories: deleteField(),
            draftUpdatedAt: deleteField()
          }, { merge: true }).catch(()=>{});
        }
      } catch (e) {
        console.error("Failed to save draft", e);
      }
    }
  }, [draftWorkoutItems, selectedCategories, currentUser, db, isDraftLoaded]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoadTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!auth) return;
    
    getRedirectResult(auth).then((result) => {
      if (result && result.user) {
        setRedirectUser(result.user);
      }
    }).catch(console.error);

    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) {} };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsubscribe();
  }, []);

  const exercisesByChunkRef = useRef({});

  useEffect(() => {
    if (!db) return;
    if (!currentUser || !accountsInfo[currentUser]) {
      setDataLoaded(prev => ({ ...prev, gyms: true, exercises: true }));
      return;
    }

    const gymsRef = collection(db, 'artifacts', appId, 'public', 'data', 'gyms');
    const unsubGyms = onSnapshot(gymsRef, (snapshot) => {
      const gymsData = []; 
      snapshot.forEach(doc => { gymsData.push({ id: doc.id, ...doc.data() }); }); 
      gymsData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); 
      setGyms(gymsData); 
      setDataLoaded(prev => ({ ...prev, gyms: true }));
    }, (err) => {
      console.error(err);
      setDataLoaded(prev => ({ ...prev, gyms: true }));
    });

    const exercisesRef = collection(db, 'artifacts', appId, 'public', 'data', 'exercises');
    const unsubEx = onSnapshot(exercisesRef, (snapshot) => {
      const allExs = [];
      snapshot.forEach(doc => { allExs.push({ id: doc.id, ...doc.data() }); });
      allExs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setExercises(allExs);
      setDataLoaded(prev => ({ ...prev, exercises: true }));
    }, (err) => {
      console.error(err);
      setDataLoaded(prev => ({ ...prev, exercises: true }));
    });
    const unsubs = [unsubGyms, unsubEx];

    return () => {
      unsubs.forEach(unsub => unsub());
      exercisesByChunkRef.current = {};
    };
  }, [db, currentUser, accountsInfo[currentUser]?.joinedGyms?.join(','), (accountsInfo[currentUser]?.friends || []).map(f => accountsInfo[f]?.joinedGyms?.join(',')).join('|')]);

  const postsByChunkRef = useRef({});

  useEffect(() => {
    if (!db) return;
    if (!currentUser || !accountsInfo[currentUser]) {
      setDataLoaded(prev => ({ ...prev, workouts: true }));
      return;
    }
    
    const myFriends = accountsInfo[currentUser].friends || [];
    const targetUsers = [currentUser, ...myFriends];
    const chunks = [];
    for (let i = 0; i < targetUsers.length; i += 10) {
      chunks.push(targetUsers.slice(i, i + 10));
    }
    
    const workoutsRef = collection(db, 'artifacts', appId, 'public', 'data', 'workouts');
    const unsubs = chunks.map((chunk, index) => {
      const q = query(workoutsRef, where('author', 'in', chunk));
      return onSnapshot(q, (snapshot) => {
        const chunkData = []; 
        snapshot.forEach(doc => { chunkData.push({ id: doc.id, ...doc.data() }); });
        postsByChunkRef.current[index] = chunkData;
        
        const allPosts = Object.values(postsByChunkRef.current).flat();
        allPosts.sort((a, b) => b.timestamp - a.timestamp);
        
        setPosts(allPosts);
        setDataLoaded(prev => ({ ...prev, workouts: true }));
      }, (err) => {
        console.error(err);
        setDataLoaded(prev => ({ ...prev, workouts: true }));
      });
    });
    
    return () => {
       unsubs.forEach(unsub => unsub());
       postsByChunkRef.current = {};
    };
  }, [db, currentUser, accountsInfo[currentUser]?.friends?.join(',')]);

  useEffect(() => {
    if (!db) return;
    if (!currentUser) {
       setDataLoaded(prev => ({ ...prev, accounts: true }));
       return;
    }
    const meRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
    const unsub = onSnapshot(meRef, (docSnap) => {
       if (docSnap.exists()) {
          setAccountsInfo(prev => ({ ...prev, [currentUser]: docSnap.data() }));
          setDataLoaded(prev => ({ ...prev, accounts: true }));
       }
    }, (err) => {
       console.error(err);
       setDataLoaded(prev => ({ ...prev, accounts: true }));
    });
    return () => unsub();
  }, [db, currentUser]);

  useEffect(() => {
    if (!db || !currentUser || !accountsInfo[currentUser]) return;
    const myFriends = accountsInfo[currentUser].friends || [];
    const friendRequests = accountsInfo[currentUser].friendRequests || [];
    const partnerRequests = accountsInfo[currentUser].partnerRequests || [];
    const jointRequests = accountsInfo[currentUser].jointTrainingRequests || [];
    const targetUsers = [...new Set([...myFriends, ...friendRequests, ...partnerRequests, ...jointRequests])];
    
    const unsubs = [];
    targetUsers.forEach(fId => {
       const fRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', fId);
       unsubs.push(onSnapshot(fRef, (docSnap) => {
          if (docSnap.exists()) {
             setAccountsInfo(prev => ({ ...prev, [fId]: docSnap.data() }));
          }
       }));
    });
    return () => unsubs.forEach(u => u());
  }, [db, currentUser, accountsInfo[currentUser]?.friends?.join(','), accountsInfo[currentUser]?.friendRequests?.join(','), accountsInfo[currentUser]?.partnerRequests?.join(','), accountsInfo[currentUser]?.jointTrainingRequests?.join(',')]);

  useEffect(() => {
    if (!currentUser) return;
    
    let isActiveSession = true;
    
    const updatePresence = async (isVisible) => { 
      if (!isActiveSession) return;
      const now = Date.now();
      if (isVisible) {
         localStorage.setItem('withfit_login_session', JSON.stringify({ userId: currentUser, lastActive: now }));
      }
      if (!db || !isOnline) return;
      try { 
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        
        await setDoc(docRef, { lastActive: now, isAppOnline: isVisible }, { merge: true }); 
      } catch (e) {} 
    };
    
    updatePresence(true);
    const intervalId = setInterval(() => updatePresence(true), 15000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updatePresence(false);
      } else {
        updatePresence(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isActiveSession = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, isOnline]);

  const handleLogin = async (username, pin) => {
    if (!db) return false;
    let accountData = null;
    try {
      const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username));
      if (docSnap.exists()) accountData = docSnap.data();
    } catch(e) { return false; }
    const joinedGyms = accountData?.joinedGyms || ['common'];
    if (pin === 'google') {
      if (!accountData) {
        const accountsSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'accounts'));
        if (accountsSnap.size >= 10) { alert("ユーザー数が上限（10人）に達しているため、新規登録できません。"); return false; }
        try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { displayName: '新規ユーザー', friendCode: generateFriendCode(), isTraining: false, lastActive: Date.now(), isAppOnline: true, theme: 'light', friends: [], joinedGyms: ['common'] }, { merge: true }); setCurrentUser(username); } catch (e) { return false; }
      } else {
        setCurrentUser(username);
        try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true }); } catch (e) {}
      }
    } else {
      if (!accountData || !accountData.pin) {
        return false;
      } else if (accountData.pin === pin) {
        setCurrentUser(username);
        try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true }); } catch (e) {}
      } else { return false; }
    }
    return true;
  };

  const handleGoogleLogin = async (googleUser) => {
    if (!db) return false;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'accounts'), where('googleUid', '==', googleUser.uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const username = snap.docs[0].id;
        setCurrentUser(username);
        localStorage.setItem('withfit_login_session', JSON.stringify({ userId: username, lastActive: Date.now() }));
        const joinedGyms = snap.docs[0].data()?.joinedGyms || ['common'];
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true });
        return true;
      }
      
      let baseName = googleUser.displayName || (googleUser.email ? googleUser.email.split('@')[0] : 'user');
      const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', baseName));
      if (docSnap.exists() && !docSnap.data().googleUid && docSnap.data().friendCode) {
         const username = baseName;
         setCurrentUser(username);
         localStorage.setItem('withfit_login_session', JSON.stringify({ userId: username, lastActive: Date.now() }));
         const joinedGyms = docSnap.data()?.joinedGyms || ['common'];
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { googleUid: googleUser.uid, lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true });
         return true;
      }

      let username = baseName;
      let counter = 1;
      while (true) {
        const checkSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username));
        if (checkSnap.exists() && checkSnap.data().friendCode) {
          username = `${baseName}${counter}`;
          counter++;
        } else {
          break;
        }
      }
      
      const accountsSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'accounts'));
      if (accountsSnap.size >= 10) { alert("ユーザー数が上限（10人）に達しているため、新規登録できません。"); return false; }

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { displayName: username, googleUid: googleUser.uid, friendCode: generateFriendCode(), isTraining: false, lastActive: Date.now(), isAppOnline: true, theme: 'light', friends: [], joinedGyms: ['common'] }, { merge: true }); 
      setCurrentUser(username); 
      localStorage.setItem('withfit_login_session', JSON.stringify({ userId: username, lastActive: Date.now() }));
      return true;
    } catch (e) { return false; }
  };

  const handleLinkGoogle = async () => {
    if (!currentUser || !db || !auth) return;
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      alert('アプリ版からの新規Google連携はOSの制限により行えません。Safari等のブラウザからWeb版にアクセスして連携を行ってください。');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const existingUser = Object.entries(accountsInfo).find(([uname, data]) => data.googleUid === result.user.uid);
      if (existingUser && existingUser[0] !== currentUser) {
        alert('このGoogleアカウントは既に別のアカウントに紐づけられています。');
        return;
      }
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { googleUid: result.user.uid }, { merge: true });
      alert('Googleアカウントと連携しました。');
    } catch (e) {
      console.error(e);
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/cross-origin-opener-policy-failed') {
         alert('ポップアップがブロックされました。ブラウザの設定で許可するか、別のブラウザをお試しください。');
      } else {
         alert('連携に失敗しました。');
      }
    }
  };

  const handleSecretLogin = async (friendCode, birthDate) => {
    if (!db || !friendCode || !birthDate) return false;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'accounts'), where('friendCode', '==', friendCode), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        if (userData.birthDate === birthDate) {
          const username = snap.docs[0].id;
          setCurrentUser(username);
          localStorage.setItem('withfit_login_session', JSON.stringify({ userId: username, lastActive: Date.now() }));
          const joinedGyms = userData.joinedGyms || ['common'];
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true });
          return true;
        }
      }
      return false;
    } catch (e) { return false; }
  };

  const handleLogout = async () => { 
    if (!window.confirm("ログアウトしますか？")) return;
    if (currentUser && db) {
      try {
        await removeDeviceTokenFromUserAccount(currentUser);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isAppOnline: false, lastActive: Date.now() }, { merge: true });
      } catch (e) {}
    }
    localStorage.removeItem('withfit_login_session');
    setCurrentUser(null); setCurrentTab('timeline'); setEditingPost(null); 
  };

  const handleStartTraining = async (gymId) => {
    if (!currentUser || !db) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: true, trainingStartTime: Date.now(), currentGymId: gymId, currentExerciseName: '', lastActive: Date.now(), hasSentStartNotification: deleteField(), hasSentForgotNotification: deleteField() }, { merge: true }); } catch (e) {}
  };

  const handlePostWorkout = async (gymName, workoutItems, bodyWeight, bodyFat, manualStart, manualEnd, jointPartnerId = null, partnerItems = null) => {
    if (!currentUser || !db) return;
    if ((!workoutItems || workoutItems.length === 0) && !bodyWeight && !bodyFat) return;

    const myInfo = accountsInfo[currentUser];
    
    const startTime = manualStart || myInfo?.trainingStartTime || Date.now();
    const endTime = manualEnd || Date.now();
    const duration = Math.max(0, endTime - startTime) || 3600000;
    const timestamp = manualEnd || Date.now();
    const dateIso = new Date(timestamp).toISOString();
    
    const myPastPosts = posts.filter(p => p.author === currentUser);
    workoutItems.forEach(item => {
        let maxW = 0; let maxR = 0; let hasDone = false;
        myPastPosts.forEach(p => {
            p.items?.forEach(pi => {
                if (pi.exerciseName === item.exerciseName && pi.weightType !== 'cardio') {
                    hasDone = true;
                    pi.sets?.forEach(ps => {
                        const w = Number(ps.weight)||0; const r = Number(ps.reps)||0;
                        if (w > maxW) { maxW = w; maxR = r; }
                        else if (w === maxW && r > maxR) { maxR = r; }
                    });
                }
            });
        });
        if (hasDone && item.weightType !== 'cardio') {
            item.sets.forEach(set => {
                const w = Number(set.weight)||0; const r = Number(set.reps)||0;
                if (w > maxW && w > 0) { set.isWeightPR = true; maxW = w; maxR = r; } 
                else if (w === maxW && w > 0 && r > maxR) { set.isRepsPR = true; maxR = r; }
            });
        }
    });

    const { processedItems, totalVolume, totalCalories } = (!workoutItems || workoutItems.length === 0) 
        ? { processedItems: [], totalVolume: 0, totalCalories: 0 }
        : calculateWorkoutTotals(workoutItems, duration, bodyWeight || myInfo?.weight);
        
    const totalSets = processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);

    const newDocId = `workout_${generateId()}`;
    const cleanItems = JSON.parse(JSON.stringify(processedItems));
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', newDocId), {
        author: currentUser, gymName, items: cleanItems, timestamp: timestamp, startTime, endTime, duration, date: dateIso, likes: 0, likedByMe: false, bodyWeight: bodyWeight || null, bodyFat: bodyFat || null, volume: totalVolume, calories: totalCalories, totalSets: totalSets, jointWith: jointPartnerId || null
      });

      if (jointPartnerId && partnerItems) {
         const pInfo = accountsInfo[jointPartnerId];
         const pBaseWeight = Number(pInfo?.weight) || 60;
         const pCalc = calculateWorkoutTotals(partnerItems, duration, pBaseWeight);
         const pTotalSets = pCalc.processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);
         const pDocId = `workout_${generateId()}`;
         const pCleanItems = JSON.parse(JSON.stringify(pCalc.processedItems));
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', pDocId), {
            author: jointPartnerId, gymName, items: pCleanItems, timestamp: timestamp, startTime, endTime, duration, date: dateIso, likes: 0, likedByMe: false, bodyWeight: null, bodyFat: null, volume: pCalc.totalVolume, calories: pCalc.totalCalories, totalSets: pTotalSets, jointWith: currentUser
         });
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', jointPartnerId), { isTraining: false, trainingStartTime: null, currentGymId: null, currentExerciseName: '', lastActive: Date.now(), jointPartnerId: null, currentWorkoutItems: deleteField(), hasSentStartNotification: deleteField(), hasSentForgotNotification: deleteField() }, { merge: true });
      }

      if (!manualStart) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: false, trainingStartTime: null, currentGymId: null, currentExerciseName: '', lastActive: Date.now(), jointPartnerId: null, hasSentStartNotification: deleteField(), hasSentForgotNotification: deleteField() }, { merge: true });
      }
      setDraftWorkoutItems([]); setSelectedCategories([]); setCurrentTab('timeline');
      
      const myFriends = myInfo.friends || [];
      const authorName = myInfo.displayName || currentUser;
      myFriends.forEach(friendId => {
        let title = '🔥 トレーニング完了';
        let body = `${authorName}さんが${gymName || 'トレーニング'}でのトレーニングを完了しました！`;

        if (!workoutItems || workoutItems.length === 0) {
          title = '⚖️ 体組成を記録';
          body = `${authorName}さんが体組成データを記録しました！`;
        } else if (manualStart) {
          title = '📅 過去の記録を追加';
          body = `${authorName}さんが過去のトレーニング記録（${gymName || '不明なジム'}）を追加しました！`;
        }

        sendNotification(friendId, title, body, 'post', newDocId);
      });
    } catch (e) { console.error("Post error:", e); }
  };

  const handleUpdateWorkout = async (postId, updatedData) => {
    if (!currentUser || !db) return;
    const { processedItems, totalVolume, totalCalories } = calculateWorkoutTotals(updatedData.items, updatedData.duration, updatedData.bodyWeight);
    const totalSets = processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);
    const cleanItems = JSON.parse(JSON.stringify(processedItems));
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId), { ...updatedData, items: cleanItems, volume: totalVolume, calories: totalCalories, totalSets: totalSets }, { merge: true }); setEditingPost(null); } catch (e) { console.error("Update error:", e); }
  };

  const handleDeleteWorkout = async (postId) => {
    if (!currentUser || !db) return;
    if (!window.confirm("この記録を削除しますか？")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId)); } catch (e) {}
  };

  const handleRequestJointTraining = async (partnerId) => {
    if (!window.confirm(`${accountsInfo[partnerId]?.displayName || partnerId}さんに合トレを申請しますか？`)) return;
    const targetRequests = accountsInfo[partnerId]?.jointTrainingRequests || [];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', partnerId), { jointTrainingRequests: [...new Set([...targetRequests, currentUser])] }, { merge: true });
    const authorName = accountsInfo[currentUser]?.displayName || currentUser;
    sendNotification(partnerId, '🔥 合トレ申請', `${authorName}さんから合トレの申請が届きました！`, 'joint');
    alert('合トレ申請を送信しました。');
  };

  const handleAcceptJointTraining = async (requesterId) => {
    const pItems = accountsInfo[requesterId]?.currentWorkoutItems || [];
    let mItems = draftWorkoutItems;
    const maxLen = Math.max(mItems.length, pItems.length);
    const newMItems = [...mItems];
    const newPItems = [...pItems];
    for(let i=0; i<maxLen; i++) {
      if(!newMItems[i]) newMItems[i] = { id: generateId(), exerciseName: newPItems[i]?.exerciseName || '', weightType: newPItems[i]?.weightType || 'total', category: newPItems[i]?.category || 'その他', sets: [{id: generateId(), weight:'', reps:''}] };
      if(!newPItems[i]) newPItems[i] = { id: generateId(), exerciseName: newMItems[i]?.exerciseName || '', weightType: newMItems[i]?.weightType || 'total', category: newMItems[i]?.category || 'その他', sets: [{id: generateId(), weight:'', reps:''}] };
    }
    setDraftWorkoutItems(newMItems);
    const myRequests = myInfo.jointTrainingRequests || [];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { jointPartnerId: requesterId, currentWorkoutItems: newMItems, jointTrainingRequests: myRequests.filter(id => id !== requesterId) }, { merge: true });
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', requesterId), { jointPartnerId: currentUser, currentWorkoutItems: newPItems }, { merge: true });
    const authorName = accountsInfo[currentUser]?.displayName || currentUser;
    sendNotification(requesterId, '🔥 合トレ開始！', `${authorName}さんが合トレ申請を承諾しました！`, 'joint');
  };

  const handleRejectJointTraining = async (requesterId) => {
    const myRequests = myInfo.jointTrainingRequests || [];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { jointTrainingRequests: myRequests.filter(id => id !== requesterId) }, { merge: true });
  };

  const handleCancelJointTraining = async () => {
    if (!window.confirm("合トレを解除しますか？（現在の記録はそれぞれ保持されます）")) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { jointPartnerId: null }, { merge: true });
    if (myInfo.jointPartnerId) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', myInfo.jointPartnerId), { jointPartnerId: null }, { merge: true });
    }
  };

  const handleCancelTraining = async () => {
    if (!window.confirm("現在の記録を破棄して終了しますか？")) return;
    if (!currentUser || !db) return;
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: false, trainingStartTime: null, currentGymId: null, currentExerciseName: '', lastActive: Date.now(), jointPartnerId: null, currentWorkoutItems: deleteField(), hasSentStartNotification: deleteField(), hasSentForgotNotification: deleteField() }, { merge: true }); 
      if (myInfo.jointPartnerId) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', myInfo.jointPartnerId), { jointPartnerId: null }, { merge: true });
      }
      setDraftWorkoutItems([]); setSelectedCategories([]); setCurrentTab('timeline'); 
    } catch (e) {}
  };

  const handleSaveProfile = async (data, shouldClose = true) => {
    if (!currentUser || !db) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), data, { merge: true }); if (shouldClose) setShowProfileModal(false); } catch (e) {}
  };

  const toggleLike = async (postId, currentLikes, isCurrentlyLiked, likedUsers = []) => {
    if (!db || !currentUser) return;
    const newLikedUsers = isCurrentlyLiked 
      ? likedUsers.filter(u => u !== currentUser) 
      : [...new Set([...likedUsers, currentUser])];
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId), { likes: newLikedUsers.length, likedUsers: newLikedUsers }, { merge: true }); 
      
      if (!isCurrentlyLiked) {
         const targetPost = posts.find(p => p.id === postId);
         if (targetPost && targetPost.author !== currentUser) {
            const authorName = accountsInfo[currentUser]?.displayName || currentUser;
            const gymText = targetPost.gymName ? `（${targetPost.gymName}）` : '';
            sendNotification(targetPost.author, '👍 ナイス！', `${authorName}さんがあなたの投稿${gymText}にナイスしました！`, 'like', postId);
         }
      }
    } catch (e) {}
  };

  const myInfo = accountsInfo[currentUser] || {};
  const allGyms = useMemo(() => [{ id: 'common', name: 'フリーウェイト', createdAt: 0 }, ...gyms], [gyms]);

  useEffect(() => {
    if (!currentUser || !db || !myInfo?.isTraining || !myInfo?.trainingStartTime) return;
    if (myInfo.hasSentStartNotification) return;

    const elapsed = Date.now() - myInfo.trainingStartTime;
    const timeUntilNotify = (3 * 60 * 1000) - elapsed;

    const sendStartNotification = async () => {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { hasSentStartNotification: true }, { merge: true });
        const myFriends = myInfo.friends || [];
        const authorName = myInfo.displayName || currentUser;
        const gymName = allGyms.find(g => g.id === myInfo.currentGymId)?.name || 'ジム';
        myFriends.forEach(friendId => {
          sendNotification(friendId, '🔥 トレーニング開始！', `${authorName}さんが${gymName}でトレーニングを開始しました！`, 'post');
        });
      } catch (e) { console.error(e); }
    };

    if (timeUntilNotify <= 0) { sendStartNotification(); } 
    else { const timer = setTimeout(sendStartNotification, timeUntilNotify); return () => clearTimeout(timer); }
  }, [currentUser, db, myInfo?.isTraining, myInfo?.trainingStartTime, myInfo?.hasSentStartNotification, myInfo?.friends, myInfo?.displayName, myInfo?.currentGymId, allGyms, sendNotification]);

  useEffect(() => {
    if (!currentUser || !db || !myInfo?.isTraining || !myInfo?.trainingStartTime) return;
    if (myInfo.hasSentForgotNotification) return;

    const lastInteraction = Math.max(myInfo.trainingStartTime, myInfo.lastActive || myInfo.draftUpdatedAt || 0);
    const elapsed = Date.now() - lastInteraction;
    const timeUntilNotify = (30 * 60 * 1000) - elapsed;

    const sendForgotNotification = async () => {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { hasSentForgotNotification: true }, { merge: true });
        await sendNotification(
          currentUser,
          '⏳ 記録忘れはありませんか？',
          '開始または最後の記録から30分以上経過しています。終了する場合は記録を保存してください。',
          'reminder',
          null,
          { allowSelf: true, fromUserOverride: 'system' }
        );
      } catch (e) { console.error(e); }
    };

    if (timeUntilNotify <= 0) { sendForgotNotification(); } 
    else { const timer = setTimeout(sendForgotNotification, timeUntilNotify); return () => clearTimeout(timer); }
  }, [currentUser, db, myInfo?.isTraining, myInfo?.trainingStartTime, myInfo?.lastActive, myInfo?.draftUpdatedAt, myInfo?.hasSentForgotNotification, sendNotification]);

  // リアルタイム通知購読 ＆ 新着通知のトーストバナー/ローカルSW通知発火
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    if (!db || !currentUser) return;
    const notifsRef = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');
    const q = query(notifsRef, where('targetUser', '==', currentUser));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setNotifications(data.slice(0, 40));

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = { id: change.doc.id, ...change.doc.data() };
          if (
            notif.timestamp &&
            notif.timestamp > mountTimeRef.current &&
            !shownToastIdsRef.current.has(notif.id)
          ) {
            shownToastIdsRef.current.add(notif.id);
            showInAppToast(notif);

            // アプリがバックグラウンドにある場合はService Worker経由でローカルOS通知も補助表示（tagで重複排除）
            if (
              typeof document !== 'undefined' &&
              document.visibilityState === 'hidden' &&
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted' &&
              'serviceWorker' in navigator
            ) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(notif.title || 'WithFit', {
                  body: notif.message || '',
                  icon: '/logo192.png',
                  badge: '/logo192.png',
                  tag: notif.id,
                  data: {
                    type: notif.type || 'general',
                    postId: notif.postId || '',
                    url: '/'
                  }
                }).catch(() => {});
              }).catch(() => {});
            }
          }
        }
      });
    });
    return () => unsub();
  }, [db, currentUser, showInAppToast]);

  // 単一種目を過去データから現在の記録中メニューに追加するヘルパー
  const formatItemForImport = (item) => {
    return {
      ...item,
      id: generateId(),
      isConfirmed: false,
      sets: (item.sets || []).map(set => ({
        ...set,
        id: generateId(),
        targetReps: set.reps || set.targetReps || '',
        targetLReps: set.lReps || set.targetLReps || '',
        targetRReps: set.rReps || set.targetRReps || '',
        targetSuperReps: set.superReps || set.targetSuperReps || '',
        targetSuperLReps: set.superLReps || set.targetSuperLReps || '',
        targetSuperRReps: set.superRReps || set.targetSuperRReps || '',
        targetSuperReps3: set.superReps3 || set.targetSuperReps3 || '',
        targetSuperLReps3: set.superLReps3 || set.targetSuperLReps3 || '',
        targetSuperRReps3: set.superRReps3 || set.targetSuperRReps3 || '',
        reps: '', lReps: '', rReps: '',
        superReps: '', superLReps: '', superRReps: '',
        superReps3: '', superLReps3: '', superRReps3: '',
        isWeightPR: false,
        isRepsPR: false,
        dropSets: set.dropSets ? set.dropSets.map(ds => ({
          ...ds,
          id: generateId(),
          targetReps: ds.reps || ds.targetReps || '',
          targetLReps: ds.lReps || ds.targetLReps || '',
          targetRReps: ds.rReps || ds.targetRReps || '',
          targetSuperReps: ds.superReps || ds.targetSuperReps || '',
          targetSuperLReps: ds.superLReps || ds.targetSuperLReps || '',
          targetSuperRReps: ds.superRReps || ds.targetSuperRReps || '',
          targetSuperReps3: ds.superReps3 || ds.targetSuperReps3 || '',
          targetSuperLReps3: ds.superLReps3 || ds.targetSuperLReps3 || '',
          targetSuperRReps3: ds.superRReps3 || ds.targetSuperRReps3 || '',
          reps: '', lReps: '', rReps: '',
          superReps: '', superLReps: '', superRReps: '',
          superReps3: '', superLReps3: '', superRReps3: ''
        })) : undefined,
        superDropSets: set.superDropSets ? set.superDropSets.map(ds => ({
          ...ds,
          id: generateId(),
          targetSuperReps: ds.superReps || ds.targetSuperReps || '',
          targetSuperLReps: ds.superLReps || ds.targetSuperLReps || '',
          targetSuperRReps: ds.superRReps || ds.targetSuperRReps || '',
          superReps: '', superLReps: '', superRReps: ''
        })) : undefined,
        superDropSets3: set.superDropSets3 ? set.superDropSets3.map(ds => ({
          ...ds,
          id: generateId(),
          targetSuperReps3: ds.superReps3 || ds.targetSuperReps3 || '',
          targetSuperLReps3: ds.superLReps3 || ds.targetSuperLReps3 || '',
          targetSuperRReps3: ds.superRReps3 || ds.targetSuperRReps3 || '',
          superReps3: '', superLReps3: '', superRReps3: ''
        })) : undefined
      }))
    };
  };

  const handleImportExerciseItem = async (item, post = null) => {
    if (!item || !item.exerciseName) return;
    const newItem = formatItemForImport(item);

    if (newItem.category) {
      setSelectedCategories(prev => prev.includes(newItem.category) ? prev : [...prev, newItem.category]);
    }

    setDraftWorkoutItems(prev => {
      const hasOnlyBlank = prev.length === 1 && !prev[0].exerciseName && (!prev[0].sets || prev[0].sets.every(s => !s.weight && !s.reps && !s.distance && !s.time));
      const nextItems = hasOnlyBlank ? [newItem] : [...prev, newItem];

      if (myInfo?.jointPartnerId && db) {
        const partnerCurrent = accountsInfo[myInfo.jointPartnerId]?.currentWorkoutItems || [];
        const partnerNewItem = formatItemForImport(item);
        const partnerHasOnlyBlank = partnerCurrent.length === 1 && !partnerCurrent[0].exerciseName;
        const nextPartnerItems = partnerHasOnlyBlank ? [partnerNewItem] : [...partnerCurrent, partnerNewItem];
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', myInfo.jointPartnerId), {
          currentWorkoutItems: nextPartnerItems,
          lastUpdater: currentUser
        }, { merge: true }).catch(() => {});
      }

      return nextItems;
    });

    if (myInfo?.isTraining || isRecordManual) {
      alert(`「${item.exerciseName}」を現在の記録に追加しました！`);
    } else {
      const matchedGym = post?.gymName ? allGyms.find(g => g.name === post.gymName) : null;
      const fallbackGymId = matchedGym?.id || (myInfo.joinedGyms || []).find(id => id !== 'common') || '';
      if (fallbackGymId && window.confirm(`「${item.exerciseName}」をメニューに追加しました。\nこのままトレーニングを開始して記録画面を開きますか？`)) {
        await handleStartTraining(fallbackGymId);
        setCurrentTab('record');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('returnToRecordInput'));
        }, 50);
      } else {
        alert(`「${item.exerciseName}」を記録メニューに追加しました！`);
      }
    }
  };

  const handleImportWorkout = async (post, isManual) => {
    const gym = allGyms.find(g => g.name === post.gymName);
    const gymId = gym ? gym.id : '';

    if (!isManual && myInfo.isTraining && myInfo.currentGymId) {
       const currentGymName = gyms.find(g => g.id === myInfo.currentGymId)?.name;
       if (currentGymName !== post.gymName) {
          alert(`現在 ${currentGymName} でトレーニング中のため、他のジムのメニューはコピーできません。`);
          return;
       }
    }

    const newItems = (post.items || []).map(item => formatItemForImport(item));
    
    const importedCategories = Array.from(new Set(newItems.map(item => item.category).filter(Boolean)));
    setSelectedCategories(importedCategories);
    setDraftWorkoutItems(newItems);
    
    if (isManual) {
      setIsRecordManual(true);
      setImportGymId(gymId);
    } else {
      setIsRecordManual(false);
      setImportGymId('');
      if (!myInfo.isTraining) {
        if (gymId) await handleStartTraining(gymId);
      }
      if (newItems.length > 0 && newItems[0].exerciseName) {
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { currentExerciseName: newItems[0].exerciseName }, { merge: true }).catch(()=>{});
      }
    }
    
    setCurrentTab('record');
  };

  const handleActiveExerciseChange = (exerciseName) => {
    if (!exerciseName || !myInfo.isTraining || !db) return;
    if (exerciseName !== myInfo.currentExerciseName) {
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { currentExerciseName: exerciseName }, { merge: true }).catch(()=>{});
    }
  };

  const unreadNotifs = notifications.filter(n => !n.read && n.timestamp > (myInfo.lastNotificationCheck || 0));
  const unreadNotificationCount = unreadNotifs.length;

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && db && currentUser) {
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { lastNotificationCheck: Date.now() }, { merge: true }).catch(()=>{});
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!db || !currentUser) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { lastNotificationCheck: Date.now() }, { merge: true });
      const unreadDocs = notifications.filter(n => !n.read);
      await Promise.all(
        unreadDocs.map(n => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id), { read: true }, { merge: true }).catch(() => {}))
      );
    } catch (e) {}
  };

  const handleDeleteNotification = async (e, notifId) => {
    if (e) e.stopPropagation();
    if (!db || !notifId) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', notifId));
    } catch (err) {}
  };

  const handleClearAllNotifications = async () => {
    if (!db || !currentUser || notifications.length === 0) return;
    if (!window.confirm('通知履歴をすべて消去しますか？')) return;
    try {
      await Promise.all(
        notifications.map(n => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id)).catch(() => {}))
      );
    } catch (err) {}
  };

  const handleNotificationClick = (notif) => {
    if (!notif) return;
    setShowNotifications(false);
    setActiveToast(null);
    if (db && notif.id && !String(notif.id).startsWith('fcm_')) {
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', notif.id), { read: true }, { merge: true }).catch(() => {});
    }
    if (notif.type === 'joint' || notif.type === 'reminder') {
      setCurrentTab('record');
    } else if (notif.type === 'request') {
      setCurrentTab('friends');
      setTargetFriendTab(notif.title?.includes('パートナー') ? 'partner' : 'friends');
    } else if (notif.postId) {
      setCurrentTab('timeline');
      setScrollToPostId(notif.postId);
    }
  };

  const handleSendFriendRequest = async (friendCodeOrName) => {
    if (!currentUser || !db || !friendCodeOrName) return;
    let friendUsername = null;
    let friendData = null;
    try {
       const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', friendCodeOrName));
       if (docSnap.exists()) {
          friendUsername = friendCodeOrName;
          friendData = docSnap.data();
       } else {
          const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'accounts'), where('friendCode', '==', friendCodeOrName), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
             friendUsername = snap.docs[0].id;
             friendData = snap.docs[0].data();
          }
       }
    } catch(e) {}
    
    if (!friendUsername || !friendData) {
      alert("該当するフレンドコード（またはユーザー名）が見つかりません。");
      return;
    }

    if (friendUsername === currentUser) {
      alert("自分自身は追加できません。");
      return;
    }
    const currentFriends = myInfo.friends || [];
    if (currentFriends.includes(friendUsername)) {
      alert("既にフレンドです。");
      return;
    }
    const targetRequests = friendData.friendRequests || [];
    if (targetRequests.includes(currentUser)) {
      alert("既に申請済みです。");
      return;
    }

    if (!window.confirm(`${friendData.displayName || friendUsername}さんにフレンド申請を送りますか？`)) return;

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', friendUsername), { friendRequests: [...targetRequests, currentUser] }, { merge: true });
      const authorName = accountsInfo[currentUser]?.displayName || currentUser;
      await sendNotification(friendUsername, '🤝 フレンド申請', `${authorName}さんからフレンド申請が届きました`, 'request');
      alert(`${friendData.displayName || friendUsername}さんにフレンド申請を送信しました！`);
    } catch (e) {}
  };

  const handleSendPartnerRequest = async (friendCodeOrName) => {
    if (!currentUser || !db || !friendCodeOrName) return;
    let partnerUsername = null;
    let partnerData = null;
    try {
       const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', friendCodeOrName));
       if (docSnap.exists()) {
          partnerUsername = friendCodeOrName;
          partnerData = docSnap.data();
       } else {
          const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'accounts'), where('friendCode', '==', friendCodeOrName), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
             partnerUsername = snap.docs[0].id;
             partnerData = snap.docs[0].data();
          }
       }
    } catch(e) {}
    
    if (!partnerUsername || !partnerData) { alert("該当するフレンドコード（またはユーザー名）が見つかりません。"); return; }
    if (partnerUsername === currentUser) { alert("自分自身は追加できません。"); return; }
    if (myInfo.partnerId === partnerUsername) { alert("既にパートナーです。"); return; }
    if (partnerData.partnerId) { alert("相手は既に別のパートナーがいます。"); return; }
    const targetRequests = partnerData.partnerRequests || [];
    if (targetRequests.includes(currentUser)) { alert("既に申請済みです。"); return; }
    if (!window.confirm(`${partnerData.displayName || partnerUsername}さんにパートナー申請を送りますか？`)) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', partnerUsername), { partnerRequests: [...new Set([...targetRequests, currentUser])] }, { merge: true });
      const authorName = accountsInfo[currentUser]?.displayName || currentUser;
      await sendNotification(partnerUsername, '🤝 パートナー申請', `${authorName}さんからパートナー申請が届きました`, 'request');
      alert(`${partnerData.displayName || partnerUsername}さんにパートナー申請を送信しました！`);
    } catch (e) {}
  };

  const handleAcceptPartnerRequest = async (requesterUsername) => {
    if (!currentUser || !db) return;
    const myRequests = myInfo.partnerRequests || [];
    const currentMyPartner = myInfo.partnerId;
    const currentRequesterPartner = accountsInfo[requesterUsername]?.partnerId;
    try {
      if (currentMyPartner) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentMyPartner), { partnerId: null, enablePartner: false }, { merge: true });
      if (currentRequesterPartner) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentRequesterPartner), { partnerId: null, enablePartner: false }, { merge: true });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { partnerId: requesterUsername, enablePartner: true, partnerRequests: myRequests.filter(u => u !== requesterUsername) }, { merge: true });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', requesterUsername), { partnerId: currentUser, enablePartner: true, partnerRequests: (accountsInfo[requesterUsername]?.partnerRequests || []).filter(u => u !== currentUser) }, { merge: true });
      const authorName = accountsInfo[currentUser]?.displayName || currentUser;
      sendNotification(requesterUsername, '🤝 パートナー承認', `${authorName}さんがあなたのパートナー申請を承認しました！`, 'request');
    } catch(e) {}
  };

  const handleRejectPartnerRequest = async (requesterUsername) => {
     if (!currentUser || !db) return;
     const myRequests = myInfo.partnerRequests || [];
     try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { partnerRequests: myRequests.filter(u => u !== requesterUsername) }, { merge: true }); } catch(e) {}
  };

  const handleRemovePartner = async () => {
    if (!currentUser || !db || !myInfo.partnerId) return;
    if (!window.confirm(`パートナー (${accountsInfo[myInfo.partnerId]?.displayName || myInfo.partnerId}) を解除しますか？`)) return;
    const partnerId = myInfo.partnerId;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { partnerId: null, enablePartner: false }, { merge: true });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', partnerId), { partnerId: null, enablePartner: false }, { merge: true });
    } catch (e) {}
  };

  const handleAcceptFriendRequest = async (requesterUsername) => {
    if (!currentUser || !db) return;
    const myFriends = myInfo.friends || [];
    const myRequests = myInfo.friendRequests || [];
    const requesterSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', requesterUsername)).catch(() => null);
    const requesterFriends = (requesterSnap && requesterSnap.exists() ? requesterSnap.data().friends : accountsInfo[requesterUsername]?.friends) || [];
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        friends: [...new Set([...myFriends, requesterUsername])],
        friendRequests: myRequests.filter(u => u !== requesterUsername)
      }, { merge: true });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', requesterUsername), {
        friends: [...new Set([...requesterFriends, currentUser])]
      }, { merge: true });
      const authorName = accountsInfo[currentUser]?.displayName || currentUser;
      sendNotification(requesterUsername, '🤝 フレンド承認', `${authorName}さんがあなたのフレンド申請を承認しました！`, 'request');
    } catch(e) {}
  };

  const handleRejectFriendRequest = async (requesterUsername) => {
     if (!currentUser || !db) return;
     const myRequests = myInfo.friendRequests || [];
     try {
       await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
         friendRequests: myRequests.filter(u => u !== requesterUsername)
       }, { merge: true });
     } catch(e) {}
  };

  const handleGenerateFriendCode = async () => {
    if (!currentUser || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { friendCode: generateFriendCode() }, { merge: true });
    } catch (e) {}
  };

  const handleRemoveFriend = async (friendUsername) => {
    if (!currentUser || !db) return;
    if (!window.confirm(`${accountsInfo[friendUsername]?.displayName || friendUsername}さんをフレンドから削除しますか？`)) return;
    const currentFriends = myInfo.friends || [];
    const targetFriends = accountsInfo[friendUsername]?.friends || [];
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { friends: currentFriends.filter(f => f !== friendUsername) }, { merge: true });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', friendUsername), { friends: targetFriends.filter(f => f !== currentUser) }, { merge: true });
    } catch (e) {}
  };

  // プッシュ通知のON/OFF切り替え
  const handleTogglePushPermission = async (isCurrentlyOn) => {
    if (!currentUser || !db || !app) return;
    if (isCurrentlyOn) {
      await removeDeviceTokenFromUserAccount(currentUser);
      alert('この端末のプッシュ通知をオフにしました。');
      return;
    }

    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_PUSH_PERMISSION' }));
      setShowPushPrompt(false);
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('お使いのブラウザはWebプッシュ通知に対応していません。iPhoneの場合はSafariの「ホーム画面に追加」から開いてください。');
      setShowPushPrompt(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setOsPermission(permission);
      if (permission === 'granted') {
        const token = await registerSwAndFetchToken();
        if (token) {
          await saveTokenToUserAccount(currentUser, token);
          alert('プッシュ通知をオンにしました！');
        } else {
          alert('通知権限は許可されましたが、トークンの取得に失敗しました。通信環境をご確認のうえ再試行してください。');
        }
      } else {
        alert('通知が許可されませんでした。端末またはブラウザの設定から許可してください。');
      }
    } catch (error) {
      console.error('Push permission error:', error);
      alert('通知の設定中にエラーが発生しました。');
    } finally {
      setShowPushPrompt(false);
    }
  };

  const handleRefreshPushToken = async () => {
    if (!currentUser) return;
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_PUSH_TOKEN' }));
      alert('ネイティブ端末の通知トークンを再同期しました。');
      return;
    }
    const token = await registerSwAndFetchToken();
    if (token) {
      await saveTokenToUserAccount(currentUser, token);
      alert('通知トークンを最新の状態に再同期しました！');
    } else {
      alert('トークンの再取得に失敗しました。');
    }
  };

  const handleSendSelfTestPush = async () => {
    if (!currentUser) return;
    const res = await sendNotification(
      currentUser,
      '🔔 通知システムテスト',
      'WithFitの新しい通知システムが正常に稼働しています！',
      'general',
      null,
      { allowSelf: true }
    );
    if (res.pushSuccess) {
      alert('テスト通知（アプリ内＋プッシュ通知）を送信しました！');
    } else if (res.inAppSuccess) {
      alert('アプリ内テスト通知を送信しました！（※サーバー環境変数が未設定またはローカル環境のため、アプリ内バナーで表示されます）');
    } else {
      alert('テスト通知の送信に失敗しました。');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !db) return;
    if (!window.confirm("【最終確認】\n本当にアカウントを削除しますか？\nこの操作は取り消せません。")) return;

    try {
      const myPosts = posts.filter(p => p.author === currentUser);
      for (const p of myPosts) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', p.id));
      }

      for (const [uname, acc] of Object.entries(accountsInfo)) {
        if (uname === currentUser) continue;
        let needUpdate = false;
        const updatedFields = {};
        if (acc.friends && acc.friends.includes(currentUser)) {
          updatedFields.friends = acc.friends.filter(f => f !== currentUser);
          needUpdate = true;
        }
        if (acc.friendRequests && acc.friendRequests.includes(currentUser)) {
          updatedFields.friendRequests = acc.friendRequests.filter(r => r !== currentUser);
          needUpdate = true;
        }
        if (acc.partnerId === currentUser) {
          updatedFields.partnerId = null;
          updatedFields.enablePartner = false;
          needUpdate = true;
        }
        if (acc.partnerRequests && acc.partnerRequests.includes(currentUser)) {
          updatedFields.partnerRequests = acc.partnerRequests.filter(r => r !== currentUser);
          needUpdate = true;
        }
        if (needUpdate) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', uname), updatedFields, { merge: true });
        }
      }

      for (const gym of gyms) {
        if (gym.members && gym.members.includes(currentUser)) {
          const updatedMembers = gym.members.filter(m => m !== currentUser);
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gym.id), { members: updatedMembers }, { merge: true });
        }
      }

      const userIdToDelete = currentUser;
      setCurrentUser(null);
      localStorage.removeItem('withfit_login_session');
      setCurrentTab('timeline');
      setEditingPost(null);

      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', userIdToDelete));
      alert("アカウントが削除されました。");
    } catch (e) {
      console.error("Account deletion error:", e);
      alert("削除中にエラーが発生しました。");
    }
  };

  if (!isFullyLoaded) {
    let loadingProgress = 0;
    if (isSessionChecked) loadingProgress += 10;
    if (dataLoaded.accounts) loadingProgress += 20;
    if (dataLoaded.gyms) loadingProgress += 20;
    if (dataLoaded.exercises) loadingProgress += 20;
    if (dataLoaded.workouts) loadingProgress += 20;
    if (isDraftLoaded || (!currentUser && isSessionChecked)) loadingProgress += 10;
    if (loadTimeout) loadingProgress = 100;
    loadingProgress = Math.min(100, Math.round(loadingProgress));

    return (
      <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <Activity className="text-emerald-500 w-12 h-12 animate-pulse mb-6" />
        <p className="text-slate-500 dark:text-slate-400 font-bold mb-4">データを読み込み中...</p>
        <div className="w-64 max-w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
          <div 
            className="bg-emerald-500 h-3 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-4">{loadingProgress}%</p>
        <p className="text-slate-400 text-xs font-bold text-center">完了するまでしばらくお待ちください</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onSecretLogin={handleSecretLogin} isOnline={isOnline} />;
  }

  const myFriends = myInfo.friends || [];
  const activeFriends = myFriends.filter(f => accountsInfo[f]?.isTraining);
  
  const activeFriendsText = activeFriends.map(f => {
    const friendInfo = accountsInfo[f];
    const friendName = friendInfo?.displayName || f;
    const gymId = friendInfo?.currentGymId;
    const gymName = gymId ? allGyms.find(g => g.id === gymId)?.name : null;
    return gymName ? `${gymName}で ${friendName} ` : friendName;
  }).join('、');

  const isDarkMode = ['dark', 'ocean', 'mono'].includes(myInfo.theme);
  const themeContainerClass = myInfo.theme === 'ocean' ? 'theme-ocean' : myInfo.theme === 'pop' ? 'theme-pop' : '';
  
  const visiblePosts = posts.filter(p => p.author === currentUser || myFriends.includes(p.author));

  const userTokenList = Array.isArray(myInfo.fcmTokens)
    ? myInfo.fcmTokens
    : (myInfo.fcmToken ? [myInfo.fcmToken] : []);
  const isDeviceRegistered = Boolean(
    (deviceFcmToken && userTokenList.includes(deviceFcmToken)) ||
    (osPermission === 'granted' && userTokenList.length > 0)
  );
  const isIosNotStandalone = typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent || '') &&
    !window.navigator.standalone &&
    !window.matchMedia('(display-mode: standalone)').matches;

  const pushStatus = {
    permission: osPermission,
    isSupported: isPushSupported,
    isDeviceRegistered,
    isIosNotStandalone
  };

  return (
    <div className={`min-h-screen font-sans pb-32 overflow-x-hidden select-none transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} ${themeContainerClass}`}>
      <style>{`
        input, textarea, select { font-size: 16px !important; }
        .dark, .dark body { background-color: #0f172a !important; color: #f8fafc !important; }
        .dark .bg-slate-950 { background-color: #0f172a !important; }
        .dark .bg-slate-900 { background-color: #1e293b !important; }
        .dark .border-slate-800 { border-color: #334155 !important; }
      `}</style>
      {myInfo.theme === 'ocean' && (
        <style>{`
          .theme-ocean.dark, .theme-ocean .bg-slate-950 { background-color: #021526 !important; }
          .theme-ocean .bg-slate-900 { background-color: #032a4a !important; }
          .theme-ocean .border-slate-800 { border-color: #0c4a6e !important; }
          .theme-ocean .text-emerald-500, .theme-ocean .text-emerald-400 { color: #38bdf8 !important; }
          .theme-ocean .bg-emerald-500 { background-color: #0284c7 !important; }
          .theme-ocean .border-emerald-500 { border-color: #0284c7 !important; }
          .theme-ocean .ring-emerald-500 { --tw-ring-color: #0284c7 !important; }
          .theme-ocean .shadow-emerald-500\\/30 { --tw-shadow-color: rgba(2, 132, 199, 0.3) !important; --tw-shadow: var(--tw-shadow-colored) !important; }
          .theme-ocean .text-slate-400 { color: #7dd3fc !important; }
        `}</style>
      )}
      {myInfo.theme === 'pop' && (
        <style>{`
          .theme-pop, .theme-pop.dark, .theme-pop .bg-slate-950 {
            background-color: #fef9c3 !important;
          }
          .theme-pop .bg-white, .theme-pop .bg-slate-900 {
            background-color: #ffffff !important;
          }
          .theme-pop .border-slate-200, .theme-pop .border-slate-800, .theme-pop .border-slate-100 {
            border-color: #fbcfe8 !important;
          }
          .theme-pop .text-emerald-500, .theme-pop .text-emerald-400, .theme-pop .text-emerald-600 {
            color: #ec4899 !important;
          }
          .theme-pop .bg-emerald-500 {
            background-color: #ec4899 !important;
            color: white !important;
          }
          .theme-pop .border-emerald-500, .theme-pop .border-emerald-100 {
            border-color: #ec4899 !important;
          }
          .theme-pop .ring-emerald-500 {
            --tw-ring-color: #ec4899 !important;
          }
          .theme-pop .shadow-emerald-500\\/30 {
            --tw-shadow-color: rgba(236, 72, 153, 0.4) !important;
            --tw-shadow: var(--tw-shadow-colored) !important;
          }
          .theme-pop .text-slate-800, .theme-pop .text-slate-900 {
            color: #000000 !important;
          }
          .theme-pop .text-slate-500, .theme-pop .text-slate-400 {
            color: #0ea5e9 !important;
          }
          .theme-pop .bg-slate-100, .theme-pop .bg-slate-800, .theme-pop .bg-slate-50 {
            background-color: #e0f2fe !important;
          }
          .theme-pop .nav-primary-btn.inactive {
            background-color: #0ea5e9 !important;
            border-color: #ffffff !important;
          }
          .theme-pop .nav-primary-btn.active {
            background-color: #ec4899 !important;
            box-shadow: 0 10px 15px -3px rgba(236, 72, 153, 0.4) !important;
          }
          .theme-pop .nav-primary-label.active {
            color: #ec4899 !important;
          }
        `}</style>
      )}

      {/* リアルタイム新着通知フローティングトーストバナー */}
      {activeToast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-24px)] max-w-sm animate-in slide-in-from-top-5 fade-in duration-200">
          <div
            onClick={() => handleNotificationClick(activeToast)}
            className="bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl flex items-center gap-3 cursor-pointer"
          >
            <div className="relative shrink-0">
              {activeToast.fromUser && activeToast.fromUser !== 'system' ? (
                <UserAvatar userId={activeToast.fromUser} accountsInfo={accountsInfo} size={38} className="border-transparent" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Bell size={18} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {activeToast.title && (
                <p className="text-xs font-extrabold text-emerald-400 truncate">{activeToast.title}</p>
              )}
              <p className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug mt-0.5">
                {activeToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
              className="p-1.5 text-slate-400 hover:text-white rounded-full shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm flex flex-col transition-colors">
        <div className="p-4 flex justify-between items-center relative">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1">
            <WithFitLogo className="text-indigo-500" /><span>With<span className="text-indigo-500">Fit</span></span>
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={handleOpenNotifications} className="relative p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              <Bell size={20} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
            <div onClick={handleHeaderOnlineTap} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{isOnline ? 'オンライン' : 'オフライン'}</span>
            </div>
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <UserAvatar userId={currentUser} accountsInfo={accountsInfo} size={24} className="border-transparent" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">
                {renderUsernameWithBadge(currentUser, myInfo.displayName, accountsInfo, "font-bold text-slate-700 dark:text-slate-200")}
              </span>
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-full transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
        {activeFriends.length > 0 && (() => {
          const friendsInSameGym = activeFriends.filter(f => accountsInfo[f]?.currentGymId === myInfo?.currentGymId && myInfo?.currentGymId);
          const isSameGym = friendsInSameGym.length > 0;
          const marqueeBg = isSameGym ? "bg-gradient-to-r from-rose-600 via-orange-500 to-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "bg-gradient-to-r from-emerald-500 to-teal-500";
          return (
          <div className={`${marqueeBg} text-white py-2 flex items-center text-xs font-bold animate-in slide-in-from-top duration-300 overflow-hidden w-full`}>
            <style>{`
              @keyframes marquee {
                0% { transform: translateX(0%); }
                100% { transform: translateX(-50%); }
              }
              .animate-marquee {
                display: flex;
                white-space: nowrap;
                animation: marquee 20s linear infinite;
              }
            `}</style>
            <div className="animate-marquee min-w-max">
               <div className="flex items-center gap-2 px-8">
                 <Flame size={14} className="animate-pulse text-amber-300 shrink-0" />
                 <span>{activeFriendsText}さんがトレーニング中です！{isSameGym ? ' (同じジムにいます🔥)' : ''}</span>
               </div>
               <div className="flex items-center gap-2 px-8">
                 <Flame size={14} className="animate-pulse text-amber-300 shrink-0" />
                 <span>{activeFriendsText}さんがトレーニング中です！{isSameGym ? ' (同じジムにいます🔥)' : ''}</span>
               </div>
            </div>
          </div>
          );
        })()}
        {showNotifications && (
          <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
          <div className="absolute top-16 right-3 w-80 max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-700 dark:text-slate-300 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-emerald-500" />
                <span>通知センター</span>
                {unreadNotificationCount > 0 && (
                  <span className="text-[10px] bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 px-1.5 py-0.5 rounded-full">
                    {unreadNotificationCount}件未読
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {notifications.some(n => !n.read) && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsRead}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-1.5 py-0.5"
                  >
                    すべて既読
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllNotifications}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 px-1.5 py-0.5"
                    title="履歴をすべて消去"
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>

            {!isDeviceRegistered && osPermission !== 'denied' && (
              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/70 dark:border-amber-900/60 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  プッシュ通知がオフです
                </span>
                <button
                  type="button"
                  onClick={() => handleTogglePushPermission(false)}
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm transition-colors"
                >
                  オンにする
                </button>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
               {notifications.length === 0 ? (
                  <div className="text-center text-xs font-bold text-slate-400 py-8">通知はありません</div>
               ) : (
                  notifications.map(notif => {
                     const isUnread = !notif.read && notif.timestamp > (myInfo.lastNotificationCheck || 0);
                     return (
                       <div
                         key={notif.id}
                         onClick={() => handleNotificationClick(notif)}
                         className={`flex gap-3 items-start p-2.5 rounded-xl cursor-pointer transition-colors group ${
                           isUnread
                             ? 'bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50'
                             : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                         }`}
                       >
                          <div className="relative shrink-0 mt-0.5">
                             {notif.fromUser && notif.fromUser !== 'system' ? (
                               <UserAvatar userId={notif.fromUser} accountsInfo={accountsInfo} size={36} className="border-transparent" />
                             ) : (
                               <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-500 flex items-center justify-center">
                                 <Bell size={16} />
                               </div>
                             )}
                             {notif.type === 'like' && (
                                <div className="absolute -bottom-0.5 -right-0.5 bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white dark:border-slate-900 shadow-sm">
                                   <Heart size={8} fill="currentColor" />
                                </div>
                             )}
                             {notif.type === 'comment' && (
                                <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white dark:border-slate-900 shadow-sm">
                                   <MessageCircle size={8} fill="currentColor" />
                                </div>
                             )}
                             {(notif.type === 'request' || notif.type === 'joint') && (
                                <div className="absolute -bottom-0.5 -right-0.5 bg-indigo-500 text-white w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white dark:border-slate-900 shadow-sm">
                                   <UserPlus size={8} />
                                </div>
                             )}
                             {notif.type === 'post' && (
                                <div className="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white dark:border-slate-900 shadow-sm">
                                   <Flame size={8} fill="currentColor" />
                                </div>
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                             {notif.title && (
                               <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 truncate mb-0.5">
                                 {notif.title}
                               </p>
                             )}
                             <p className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap leading-snug">
                                {notif.message}
                             </p>
                             <p className="text-[10px] font-bold text-slate-400 mt-1">{getRelativeTime(notif.timestamp)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteNotification(e, notif.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 rounded-full transition-colors"
                              title="この通知を削除"
                            >
                              <X size={13} />
                            </button>
                            {isUnread && <div className="w-2 h-2 rounded-full bg-rose-500 mr-1"></div>}
                          </div>
                       </div>
                     );
                  })
               )}
            </div>
          </div>
          </>
        )}
      </header>

      {myInfo?.isTraining && (
        <div className="fixed inset-0 z-[25] pointer-events-none overflow-hidden" style={{ perspective: 1000 }}>
          <div 
            ref={timerCardRef}
            onClick={(e) => {
              restoreTimerCard();
              if (currentTab !== 'record' && !e.target.closest('button, select')) {
                setCurrentTab('record');
              }
              window.dispatchEvent(new CustomEvent('returnToRecordInput'));
            }}
            onTouchStart={handleTimerTouchStart}
            onTouchMove={handleTimerTouchMove}
            onTouchEnd={handleTimerTouchEnd}
            onTouchCancel={handleTimerTouchEnd}
            onMouseDown={handleTimerTouchStart}
            onMouseMove={handleTimerTouchMove}
            onMouseUp={handleTimerTouchEnd}
            onMouseLeave={handleTimerTouchEnd}
            className={`absolute top-0 left-0 w-[calc(100%-32px)] max-w-md pointer-events-auto ${isTimerDragging ? '' : 'transition-transform duration-300'} ${isHidden && !isTimerDragging ? 'opacity-90' : 'opacity-100'}`}
            style={{ 
               transform: `translate3d(${transformX}px, ${transformY}px, 0)`,
               transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
               cursor: isTimerDragging ? 'grabbing' : 'grab',
               touchAction: 'none'
            }}
          >
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 shadow-xl text-white flex justify-between items-center border border-slate-700 relative w-full">
              {isHidden && timerState.x === 'left' && (
                 <div className="absolute top-1/2 -translate-y-1/2 -right-6 bg-slate-900/90 text-slate-400 py-3 px-1 rounded-r-xl border border-l-0 border-slate-700 shadow-md flex items-center justify-center">
                   <ChevronRight size={18} />
                 </div>
              )}
              {isHidden && timerState.x === 'right' && (
                 <div className="absolute top-1/2 -translate-y-1/2 -left-6 bg-slate-900/90 text-slate-400 py-3 px-1 rounded-l-xl border border-r-0 border-slate-700 shadow-md flex items-center justify-center">
                   <ChevronLeft size={18} />
                 </div>
              )}

              <div className={`flex justify-between items-center w-full transition-opacity duration-300 ${isHidden && !isTimerDragging ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex flex-col items-start min-w-[70px] pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-bold mb-0.5 flex items-center gap-1"><MapPin size={10}/> {allGyms.find(g => g.id === myInfo.currentGymId)?.name || 'トレーニング中'}</span>
                  <div className="text-lg font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <Clock size={14} className="animate-pulse" /> 
                    <TimerDisplay startTime={myInfo.trainingStartTime} />
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="relative mr-2 pointer-events-auto">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const newVol = timerVolume === 0 ? 1 : 0; 
                        setTimerVolume(newVol); 
                      }} 
                      className="text-slate-400 hover:text-emerald-400 p-1 transition-colors"
                    >
                      {timerVolume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </div>
                  {!restTimerStart ? (
                    <div className="relative flex items-center">
                      <select 
                        value={selectedRestMinute}
                        onChange={(e) => setSelectedRestMinute(Number(e.target.value))} 
                        className="appearance-none bg-slate-800/80 text-slate-200 font-bold text-sm py-2 pl-3 pr-7 rounded-l-xl border border-slate-600 focus:outline-none h-[40px]"
                      >
                        <option value={0}>UP</option>
                        {[1,2,3,4,5].map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/80 flex items-center justify-center h-[40px] px-3 rounded-l-xl border border-slate-600 border-r-0 min-w-[70px]">
                       {isAlarmRinging ? (
                          <span className="text-sm font-bold text-rose-400 animate-pulse flex items-center gap-1"><Bell size={14} /> TIME UP!</span>
                       ) : (
                          <span className={`text-lg font-mono font-bold ${restDuration === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatRestTime(restTimeLeft)}</span>
                       )}
                    </div>
                  )}
                  <button 
                    onClick={() => isAlarmRinging ? stopAlarm() : restTimerStart ? cancelRestTimer() : startRestTimer(selectedRestMinute)} 
                    className={`flex items-center justify-center h-[40px] px-4 rounded-r-xl border transition-colors ${restTimerStart ? 'bg-rose-500/20 border-rose-500 text-rose-400 hover:bg-rose-500/30' : 'bg-slate-700/80 border-slate-600 text-emerald-400 hover:bg-slate-600 border-l-0'}`}
                  >
                     {restTimerStart ? <X size={18} /> : <Play size={18} fill="currentColor" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className={`px-4 pb-48 max-w-md mx-auto w-full ${myInfo?.isTraining && timerState.y === 'top' ? (activeFriends.length > 0 ? 'pt-52' : 'pt-44') : (activeFriends.length > 0 ? 'pt-32' : 'pt-24')}`}>
        {!myInfo?.googleUid && (
          <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 font-bold text-xs mb-6 flex justify-between items-center shadow-sm">
             <div className="flex items-center gap-1.5 min-w-0">
                <Lock size={14} className="shrink-0" />
                <span className="truncate">Google連携をしてアカウントを保護しましょう！</span>
             </div>
             <button onClick={handleLinkGoogle} className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg shrink-0 transition-colors">連携</button>
          </div>
        )}
        {currentTab === 'timeline' && <TimelineView posts={visiblePosts} onToggleLike={toggleLike} onImport={handleImportWorkout} onImportItem={handleImportExerciseItem} currentUser={currentUser} onDelete={handleDeleteWorkout} onEdit={setEditingPost} accountsInfo={accountsInfo} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} onToggleCommentLike={handleToggleCommentLike} onUserClick={setSelectedUserProfile} scrollToPostId={scrollToPostId} setScrollToPostId={setScrollToPostId} />}
        {currentTab === 'exercises' && <ExercisesView gyms={allGyms} exercises={exercises} posts={visiblePosts} accountsInfo={accountsInfo} currentUser={currentUser} myInfo={myInfo} setCurrentTab={setCurrentTab} onSendRequest={handleSendFriendRequest} onUserClick={setSelectedUserProfile} />}
        {currentTab === 'record' && <RecordView onStart={handleStartTraining} onPost={handlePostWorkout} onCancel={handleCancelTraining} onRequestJointTraining={handleRequestJointTraining} onAcceptJointTraining={handleAcceptJointTraining} onRejectJointTraining={handleRejectJointTraining} onCancelJointTraining={handleCancelJointTraining} onImportItem={handleImportExerciseItem} myInfo={myInfo} gyms={allGyms} exercises={exercises} workoutItems={draftWorkoutItems} setWorkoutItems={setDraftWorkoutItems} selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} posts={visiblePosts} currentUser={currentUser} isManual={isRecordManual} setIsManual={setIsRecordManual} onActiveExerciseChange={handleActiveExerciseChange} accountsInfo={accountsInfo} />}
        {currentTab === 'data' && <DataView posts={posts} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={setEditingPost} onDelete={handleDeleteWorkout} onImport={handleImportWorkout} onImportItem={handleImportExerciseItem} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} onToggleCommentLike={handleToggleCommentLike} onUserClick={setSelectedUserProfile} onOpenCoach={() => setShowCoachChat(true)} />}
        {currentTab === 'friends' && <FriendsView currentUser={currentUser} myInfo={myInfo} accountsInfo={accountsInfo} onSendRequest={handleSendFriendRequest} onAccept={handleAcceptFriendRequest} onReject={handleRejectFriendRequest} onRemoveFriend={handleRemoveFriend} onSendPartnerRequest={handleSendPartnerRequest} onAcceptPartnerRequest={handleAcceptPartnerRequest} onRejectPartnerRequest={handleRejectPartnerRequest} onRemovePartner={handleRemovePartner} onFriendClick={(u) => setSelectedFriendUser(u)} onGenerateFriendCode={handleGenerateFriendCode} posts={posts} targetFriendTab={targetFriendTab} setTargetFriendTab={setTargetFriendTab} onImport={handleImportWorkout} onImportItem={handleImportExerciseItem} onSendTestPush={async (targetUser, message) => {
          if (!db || !targetUser || !message) return;
          const res = await sendNotification(
            targetUser,
            '📣 管理者からのメッセージ',
            message,
            'general',
            null,
            { allowSelf: true }
          );
          if (res.pushSuccess) {
            alert(`${accountsInfo[targetUser]?.displayName || targetUser}さんへプッシュ通知とアプリ内通知を送信しました！`);
          } else if (res.inAppSuccess) {
            alert(`${accountsInfo[targetUser]?.displayName || targetUser}さんへアプリ内通知を送信しました！（※Push登録端末数: ${res.tokenCount || 0}台）`);
          } else {
            alert('通知の送信に失敗しました。');
          }
        }} />}
      </main>

      {editingPost && <EditWorkoutModal post={editingPost} gyms={allGyms} exercises={exercises} onClose={() => setEditingPost(null)} onSave={handleUpdateWorkout} myPastPosts={posts.filter(p => p.author === currentUser)} />}
      {selectedFriendUser && <FriendDetailModal friendUsername={selectedFriendUser} posts={posts} accountsInfo={accountsInfo} onClose={() => setSelectedFriendUser(null)} onToggleLike={toggleLike} onImport={handleImportWorkout} onImportItem={handleImportExerciseItem} currentUser={currentUser} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} onToggleCommentLike={handleToggleCommentLike} onUserClick={setSelectedUserProfile} />}
      
      {focusedPost && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setFocusedPost(null)}>
          <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-md max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">投稿詳細</h2>
                <button onClick={() => setFocusedPost(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
             </div>
             <div className="p-4 overflow-y-auto flex-1">
               <WorkoutCard post={focusedPost} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={setEditingPost} onDelete={handleDeleteWorkout} onToggleLike={toggleLike} onImport={handleImportWorkout} onImportItem={handleImportExerciseItem} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} onToggleCommentLike={handleToggleCommentLike} onUserClick={setSelectedUserProfile} />
             </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-1 pb-safe z-30 transition-colors" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div className="flex justify-around items-center p-2 max-w-md mx-auto">
          <NavButton icon={<Home size={22} />} label="ホーム" isActive={currentTab === 'timeline'} onClick={() => { if(currentTab === 'timeline') window.scrollTo({top:0, behavior:'smooth'}); else setCurrentTab('timeline'); }} />
          <NavButton icon={<Dumbbell size={22} />} label="種目" isActive={currentTab === 'exercises'} onClick={() => { if(currentTab === 'exercises') window.scrollTo({top:0, behavior:'smooth'}); else setCurrentTab('exercises'); }} />
          <RecordWheelWrapper myInfo={myInfo} currentTab={currentTab} setCurrentTab={setCurrentTab}>
            <NavButton icon={myInfo.isTraining ? <Clock className="animate-pulse" size={28}/> : <PlusCircle size={28} />} label={myInfo.isTraining ? "記録中" : "記録"} isActive={currentTab === 'record'} onClick={() => { if (!myInfo?.isTraining) { if(currentTab === 'record') { window.scrollTo({top:0, behavior:'smooth'}); window.dispatchEvent(new CustomEvent('showRecordDashboard')); } else { setCurrentTab('record'); window.dispatchEvent(new CustomEvent('showRecordDashboard')); } } }} isPrimary isTraining={myInfo.isTraining} />
          </RecordWheelWrapper>
          <NavButton icon={<CalendarIcon size={22} />} label="データ" isActive={currentTab === 'data'} onClick={() => { if(currentTab === 'data') window.scrollTo({top:0, behavior:'smooth'}); else setCurrentTab('data'); }} />
          <NavButton icon={<Users size={22} />} label="フレンド" isActive={currentTab === 'friends'} onClick={() => { if(currentTab === 'friends') window.scrollTo({top:0, behavior:'smooth'}); else setCurrentTab('friends'); }} />
        </div>
      </nav>

      {showPushPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-end sm:justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            {pushPromptType === 'warning' ? (
              <>
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 rounded-full flex items-center justify-center mb-4 text-rose-500">
                  <Settings size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">通知がブロックされています</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">端末またはブラウザの設定で通知がオフになっています。<br/>設定アプリから通知を許可してください。</p>
                <div className="w-full space-y-3">
                  <button onClick={() => setShowPushPrompt(false)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl transition-colors">
                    閉じる
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                  <Bell size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">プッシュ通知をオンにしませんか？</h3>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">フレンドのトレーニング開始・完了や、ナイス・コメント・合トレ申請をリアルタイムで受け取れます。</p>
                <div className="w-full space-y-3">
                  <button onClick={() => handleTogglePushPermission(false)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                    通知を許可する
                  </button>
                  <button onClick={() => setShowPushPrompt(false)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl transition-colors">
                    あとで設定する（プロフィール設定から可能）
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={myInfo}
        onSave={handleSaveProfile}
        currentUser={currentUser}
        onLinkGoogle={handleLinkGoogle}
        onDeleteAccount={handleDeleteAccount}
        onTogglePush={handleTogglePushPermission}
        onRefreshPush={handleRefreshPushToken}
        onSendSelfTestPush={handleSendSelfTestPush}
        pushStatus={pushStatus}
      />
      <UserProfileModal isOpen={!!selectedUserProfile} onClose={() => setSelectedUserProfile(null)} targetUser={selectedUserProfile} accountsInfo={accountsInfo} currentUser={currentUser} onSendRequest={handleSendFriendRequest} />
      <CoachChatModal isOpen={showCoachChat} onClose={() => setShowCoachChat(false)} currentUser={currentUser} accountsInfo={accountsInfo} posts={posts} appId={appId} />
      {showSecretGame && <SecretGame onClose={() => setShowSecretGame(false)} currentUser={currentUser} accountsInfo={accountsInfo} appId={appId} />}
    </div>
  );
}