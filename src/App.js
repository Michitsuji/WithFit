// ============================================================================
// WithFit v2 - メインアプリケーション (src/App.js)
// モジュラー分割構成・全画面デザイン統一・AI機能完全撤去版（設定キーのみ保持）
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart, Home, PlusCircle, Users, Dumbbell, LogOut, Activity, Flame,
  Lock, Settings, X, MapPin, Clock, Play, Calendar as CalendarIcon,
  UserPlus, Bell, MessageCircle, Volume2, VolumeX, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  signInAnonymously, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, getRedirectResult, signInWithCredential
} from 'firebase/auth';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, getDoc,
  deleteField, limit, query, getDocs, where
} from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

import { app, auth, db, APP_ID, VAPID_KEY, MAX_ACCOUNTS_LIMIT } from './config/firebase';
import {
  generateId, generateFriendCode, getRelativeTime, calculateWorkoutTotals
} from './utils/helpers';
import {
  WithFitLogo, UserAvatar, renderUsernameWithBadge, IconButton,
  TimerDisplay, RecordWheelWrapper, NavButton
} from './components/common/UI';
import WorkoutCard from './components/workout/WorkoutCard';
import { EditWorkoutModal } from './components/workout/WorkoutModals';
import LoginScreen from './components/views/LoginScreen';
import TimelineView from './components/views/TimelineView';
import RecordView from './components/views/RecordView';
import ExercisesView from './components/views/ExercisesView';
import DataView from './components/views/DataView';
import FriendsView from './components/views/FriendsView';
import { ProfileModal, UserProfileModal, FriendDetailModal } from './components/modals/ProfileModals';
import SecretGame from './components/game/SecretGame';

function useAutoScrollDisable() {
  useEffect(() => {
    const checkScroll = () => {
      if (document.documentElement.scrollHeight <= window.innerHeight) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };
    checkScroll();
    window.addEventListener('resize', checkScroll);
    const observer = new MutationObserver(checkScroll);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
      document.body.style.overflow = '';
    };
  }, []);
}

export default function App() {
  useAutoScrollDisable();

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const pendingPushToken = useRef(null);

  useEffect(() => {
    if (currentUser && pendingPushToken.current && db) {
      setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { fcmToken: pendingPushToken.current }, { merge: true }).catch(console.error);
      pendingPushToken.current = null;
    }
  }, [currentUser]);

  const [currentTab, setCurrentTab] = useState('timeline');
  const [isRecordManual, setIsRecordManual] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

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

  // インターバルタイマー状態
  const [restDuration, setRestDuration] = useState(0);
  const [restTimerStart, setRestTimerStart] = useState(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [selectedRestMinute, setSelectedRestMinute] = useState(2);

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
      try {
        const saved = localStorage.getItem('withfit_timer_volume');
        return saved !== null ? parseFloat(saved) : 1.0;
      } catch (e) {}
    }
    return 1.0;
  });

  const [headerSecretTapCount, setHeaderSecretTapCount] = useState(0);
  const [showSecretGame, setShowSecretGame] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const handleToast = (e) => {
      if (e.detail && e.detail.message) {
        setToastMessage(e.detail.message);
        setTimeout(() => setToastMessage(null), 3200);
      }
    };
    window.addEventListener('withfitToast', handleToast);
    return () => window.removeEventListener('withfitToast', handleToast);
  }, []);

  const handleHeaderOnlineTap = () => {
    const newCount = headerSecretTapCount + 1;
    setHeaderSecretTapCount(newCount);
    if (newCount >= 10) {
      setShowSecretGame(true);
      setHeaderSecretTapCount(0);
    }
  };

  useEffect(() => {
    const handleNativeMessage = (event) => {
      try {
        const rawData = event.data || (event.nativeEvent && event.nativeEvent.data);
        if (!rawData) return;
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        if (data.type === 'PUSH_TOKEN') {
          if (currentUser && db) {
            setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { fcmToken: data.token }, { merge: true });
          } else {
            pendingPushToken.current = data.token;
          }
        } else if (data.type === 'NATIVE_GOOGLE_LOGIN' && data.idToken && auth) {
          const credential = GoogleAuthProvider.credential(data.idToken);
          signInWithCredential(auth, credential).catch(err => console.error("Native login error:", err));
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('message', handleNativeMessage);
    return () => {
      window.removeEventListener('message', handleNativeMessage);
      document.removeEventListener('message', handleNativeMessage);
    };
  }, [currentUser]);

  useEffect(() => {
    try {
      const sessionStr = localStorage.getItem('withfit_login_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.userId && session.lastActive && Date.now() - session.lastActive <= 7 * 24 * 60 * 60 * 1000) {
          setCurrentUser(session.userId);
        } else {
          localStorage.removeItem('withfit_login_session');
        }
      }
    } catch (e) {}
    setIsSessionChecked(true);
  }, []);

  const scrollPositions = useRef({});
  const prevTabRef = useRef('timeline');

  useEffect(() => {
    scrollPositions.current[prevTabRef.current] = window.scrollY;
    const targetPosition = scrollPositions.current[currentTab] || 0;
    const timer = setTimeout(() => window.scrollTo(0, targetPosition), 0);
    prevTabRef.current = currentTab;
    return () => clearTimeout(timer);
  }, [currentTab]);

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
    try {
      localStorage.setItem('withfit_timer_volume', timerVolume.toString());
    } catch (e) {}
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
          if (alarmAudio.current) alarmAudio.current.play().catch(() => {});
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
          if (typeof window !== 'undefined' && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VIBRATE' }));
          }
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
    const sec = Math.round(minutes * 60);
    setRestDuration(sec);
    setRestTimeLeft(minutes === 0 ? 0 : sec);
    setRestTimerStart(Date.now());
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
      transformY = screenH - cardH - 92;
    }
  }
  const isHidden = timerState.hidden;

  const formatRestTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const sendNotification = async (targetUsername, title, body, type = 'general', relatedPostId = null) => {
    if (!targetUsername || targetUsername === currentUser || !db) return;
    const targetUser = accountsInfo[targetUsername];
    if (!targetUser) return;
    if (type === 'post' && targetUser.notifyPost === false) return;
    if (type === 'comment' && targetUser.notifyComment === false) return;
    if (type === 'like' && targetUser.notifyLike === false) return;

    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', notifId), {
        targetUser: targetUsername,
        fromUser: currentUser,
        type,
        title,
        message: body,
        postId: relatedPostId,
        timestamp: Date.now()
      });
    } catch (e) {}

    if (targetUser.fcmToken) {
      try {
        await fetch('/api/sendPush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetToken: targetUser.fcmToken, title, body })
        });
      } catch (e) {}
    }
  };

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
      const postRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        const currentComments = postData.comments || [];
        await setDoc(postRef, { comments: [...currentComments, newComment] }, { merge: true });

        const authorName = accountsInfo[currentUser]?.displayName || currentUser;
        const targetUsers = new Set();
        if (postData.author !== currentUser) targetUsers.add(postData.author);

        const mentions = text.match(/@([a-zA-Z0-9_ぁ-んァ-ヶ一-龠]+)/g);
        if (mentions) {
          mentions.forEach(m => {
            const uname = m.substring(1);
            const targetInfo = Object.entries(accountsInfo).find(([k, v]) => k === uname || v.displayName === uname);
            if (targetInfo && targetInfo[0] !== currentUser) targetUsers.add(targetInfo[0]);
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
          let title = '💬 コメント';
          let body = '';
          const targetGymText = postData.gymName ? `（${postData.gymName}）` : '';

          if (isReplyTarget) {
            title = '💬 返信';
            body = `${authorName}さんがコメントであなたに返信しました: 「${text.trim()}」`;
          } else if (isPostAuthor) {
            body = `${authorName}さんがあなたの投稿${targetGymText}にコメントしました: 「${text.trim()}」`;
          }
          if (body) sendNotification(userId, title, body, 'comment', postId);
        });
      }
    } catch (e) {}
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!currentUser || !db) return;
    try {
      const postRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', postId);
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
      const postRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', postId);
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
    } catch (e) {}
  };

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

  useEffect(() => {
    if (currentUser && dataLoaded.accounts && typeof window !== 'undefined' && 'Notification' in window && db) {
      const myData = accountsInfo[currentUser];
      if (myData) {
        if (Notification.permission === 'denied' && myData.fcmToken) {
          setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { fcmToken: deleteField() }, { merge: true }).catch(() => {});
        }
        if (Notification.permission === 'granted' && !myData.fcmToken) {
          const restoreToken = async () => {
            try {
              const messaging = getMessaging(app);
              const token = await getToken(messaging, { vapidKey: VAPID_KEY });
              if (token) await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { fcmToken: token }, { merge: true });
            } catch (e) {}
          };
          restoreToken();
        }
      }
    }
  }, [currentUser, dataLoaded.accounts, accountsInfo]);

  useEffect(() => {
    if (currentUser && db) {
      const loadDraft = async () => {
        try {
          const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser);
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
          }
        } catch (e) {} finally {
          setIsDraftLoaded(true);
        }
      };
      loadDraft();
    } else {
      setIsDraftLoaded(false);
    }
  }, [currentUser]);

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
          setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
            currentWorkoutItems: draftWorkoutItems,
            currentSelectedCategories: selectedCategories,
            draftUpdatedAt: now,
            lastUpdater: currentUser
          }, { merge: true }).catch(() => {});
        } else {
          localStorage.removeItem(`withfit_draft_${currentUser}`);
          localStorage.removeItem(`withfit_cats_${currentUser}`);
          localStorage.removeItem(`withfit_draft_time_${currentUser}`);
          setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
            currentWorkoutItems: deleteField(),
            currentSelectedCategories: deleteField(),
            draftUpdatedAt: deleteField()
          }, { merge: true }).catch(() => {});
        }
      } catch (e) {}
    }
  }, [draftWorkoutItems, selectedCategories, currentUser, isDraftLoaded]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoadTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).then((result) => {
      if (result && result.user) setRedirectUser(result.user);
    }).catch(() => {});
    signInAnonymously(auth).catch(() => {});
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

    const gymsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'gyms');
    const unsubGyms = onSnapshot(gymsRef, (snapshot) => {
      const gymsData = [];
      snapshot.forEach(docSnap => { gymsData.push({ id: docSnap.id, ...docSnap.data() }); });
      gymsData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setGyms(gymsData);
      setDataLoaded(prev => ({ ...prev, gyms: true }));
    }, () => setDataLoaded(prev => ({ ...prev, gyms: true })));

    const joinedGyms = accountsInfo[currentUser].joinedGyms || ['common'];
    const myFriends = accountsInfo[currentUser].friends || [];
    const friendGymIds = [];
    myFriends.forEach(f => {
      if (accountsInfo[f]?.joinedGyms) friendGymIds.push(...accountsInfo[f].joinedGyms);
    });
    const targetGymIds = [...new Set([...joinedGyms, 'common', ...friendGymIds])];
    const chunks = [];
    for (let i = 0; i < targetGymIds.length; i += 10) {
      chunks.push(targetGymIds.slice(i, i + 10));
    }

    const exercisesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'exercises');
    const unsubs = [unsubGyms];
    chunks.forEach((chunk, index) => {
      const exQuery = query(exercisesRef, where('gymId', 'in', chunk));
      unsubs.push(onSnapshot(exQuery, (snapshot) => {
        const chunkExs = [];
        snapshot.forEach(docSnap => { chunkExs.push({ id: docSnap.id, ...docSnap.data() }); });
        exercisesByChunkRef.current[index] = chunkExs;
        const allExs = Object.values(exercisesByChunkRef.current).flat();
        allExs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setExercises(allExs);
        setDataLoaded(prev => ({ ...prev, exercises: true }));
      }, () => setDataLoaded(prev => ({ ...prev, exercises: true }))));
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      exercisesByChunkRef.current = {};
    };
  }, [currentUser, accountsInfo[currentUser]?.joinedGyms?.join(','), (accountsInfo[currentUser]?.friends || []).map(f => accountsInfo[f]?.joinedGyms?.join(',')).join('|')]);

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

    const workoutsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'workouts');
    const unsubs = chunks.map((chunk, index) => {
      const q = query(workoutsRef, where('author', 'in', chunk));
      return onSnapshot(q, (snapshot) => {
        const chunkData = [];
        snapshot.forEach(docSnap => { chunkData.push({ id: docSnap.id, ...docSnap.data() }); });
        postsByChunkRef.current[index] = chunkData;
        const allPosts = Object.values(postsByChunkRef.current).flat();
        allPosts.sort((a, b) => b.timestamp - a.timestamp);
        setPosts(allPosts);
        setDataLoaded(prev => ({ ...prev, workouts: true }));
      }, () => setDataLoaded(prev => ({ ...prev, workouts: true })));
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      postsByChunkRef.current = {};
    };
  }, [currentUser, accountsInfo[currentUser]?.friends?.join(',')]);

  useEffect(() => {
    if (!db) return;
    if (!currentUser) {
      setDataLoaded(prev => ({ ...prev, accounts: true }));
      return;
    }
    const meRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser);
    const unsub = onSnapshot(meRef, (docSnap) => {
      if (docSnap.exists()) {
        setAccountsInfo(prev => ({ ...prev, [currentUser]: docSnap.data() }));
        setDataLoaded(prev => ({ ...prev, accounts: true }));
      }
    }, () => setDataLoaded(prev => ({ ...prev, accounts: true })));
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!db || !currentUser || !accountsInfo[currentUser]) return;
    const myFriends = accountsInfo[currentUser].friends || [];
    const friendRequests = accountsInfo[currentUser].friendRequests || [];
    const partnerRequests = accountsInfo[currentUser].partnerRequests || [];
    const targetUsers = [...new Set([...myFriends, ...friendRequests, ...partnerRequests])];

    const unsubs = [];
    targetUsers.forEach(fId => {
      const fRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', fId);
      unsubs.push(onSnapshot(fRef, (docSnap) => {
        if (docSnap.exists()) {
          setAccountsInfo(prev => ({ ...prev, [fId]: docSnap.data() }));
        }
      }));
    });
    return () => unsubs.forEach(u => u());
  }, [currentUser, accountsInfo[currentUser]?.friends?.join(','), accountsInfo[currentUser]?.friendRequests?.join(','), accountsInfo[currentUser]?.partnerRequests?.join(',')]);

  useEffect(() => {
    if (!currentUser) return;
    let isActiveSession = true;

    const updatePresence = async (isVisible) => {
      if (!isActiveSession) return;
      const now = Date.now();
      if (isVisible) {
        try {
          localStorage.setItem('withfit_login_session', JSON.stringify({ userId: currentUser, lastActive: now }));
        } catch (e) {}
      }
      if (!db || !isOnline) return;
      try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        await setDoc(docRef, { lastActive: now, isAppOnline: isVisible }, { merge: true });
      } catch (e) {}
    };

    updatePresence(true);
    const intervalId = setInterval(() => updatePresence(true), 15000);
    const handleVisibilityChange = () => updatePresence(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isActiveSession = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, isOnline]);

  const handleLogin = async (username, pin) => {
    if (!db) return false;
    try {
      const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', username));
      if (docSnap.exists() && docSnap.data().pin === pin) {
        setCurrentUser(username);
        return true;
      }
    } catch (e) {}
    return false;
  };

  const handleGoogleLogin = async (googleUser) => {
    if (!db) return false;
    try {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'accounts'), where('googleUid', '==', googleUser.uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const username = snap.docs[0].id;
        setCurrentUser(username);
        localStorage.setItem('withfit_login_session', JSON.stringify({ userId: username, lastActive: Date.now() }));
        const joinedGyms = snap.docs[0].data()?.joinedGyms || ['common'];
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true });
        return true;
      }

      let baseName = googleUser.displayName || (googleUser.email ? googleUser.email.split('@')[0] : 'user');
      const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', baseName));
      if (docSnap.exists() && !docSnap.data().googleUid && docSnap.data().friendCode) {
        const username = baseName;
        setCurrentUser(username);
        localStorage.setItem('withfit_login_session', JSON.stringify({ userId: username, lastActive: Date.now() }));
        const joinedGyms = docSnap.data()?.joinedGyms || ['common'];
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', username), { googleUid: googleUser.uid, lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true });
        return true;
      }

      let username = baseName;
      let counter = 1;
      while (true) {
        const checkSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', username));
        if (checkSnap.exists() && checkSnap.data().friendCode) {
          username = `${baseName}${counter}`;
          counter++;
        } else {
          break;
        }
      }

      const accountsSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'accounts'));
      if (accountsSnap.size >= MAX_ACCOUNTS_LIMIT) {
        window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: `ユーザー数が上限（${MAX_ACCOUNTS_LIMIT}人）に達しているため、新規登録できません。` } }));
        return false;
      }

      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', username), {
        displayName: username,
        googleUid: googleUser.uid,
        friendCode: generateFriendCode(),
        isTraining: false,
        lastActive: Date.now(),
        isAppOnline: true,
        theme: 'light',
        friends: [],
        joinedGyms: ['common']
      }, { merge: true });
      setCurrentUser(username);
      localStorage.setItem('withfit_login_session', JSON.stringify({ userId: username, lastActive: Date.now() }));
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleLinkGoogle = async () => {
    if (!currentUser || !db || !auth) return;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const existingUser = Object.entries(accountsInfo).find(([uname, data]) => data.googleUid === result.user.uid);
      if (existingUser && existingUser[0] !== currentUser) {
        window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: 'このGoogleアカウントは既に別のアカウントに紐づけられています。' } }));
        return;
      }
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { googleUid: result.user.uid }, { merge: true });
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: 'Googleアカウントと連携しました。' } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: '連携に失敗しました。' } }));
    }
  };

  const handleSecretLogin = async (friendCode, birthDate) => {
    if (!db || !friendCode || !birthDate) return false;
    try {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'accounts'), where('friendCode', '==', friendCode), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        if (userData.birthDate === birthDate) {
          const username = snap.docs[0].id;
          setCurrentUser(username);
          localStorage.setItem('withfit_login_session', JSON.stringify({ userId: username, lastActive: Date.now() }));
          const joinedGyms = userData.joinedGyms || ['common'];
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true });
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("ログアウトしますか？")) return;
    if (currentUser && db) {
      try {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { isAppOnline: false, lastActive: Date.now(), fcmToken: deleteField() }, { merge: true });
      } catch (e) {}
    }
    localStorage.removeItem('withfit_login_session');
    setCurrentUser(null);
    setCurrentTab('timeline');
    setEditingPost(null);
  };

  const handleStartTraining = async (gymId) => {
    if (!currentUser || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
        isTraining: true,
        trainingStartTime: Date.now(),
        currentGymId: gymId,
        currentExerciseName: '',
        lastActive: Date.now(),
        hasSentStartNotification: deleteField(),
        hasSentForgotNotification: deleteField()
      }, { merge: true });
    } catch (e) {}
  };

  const handlePostWorkout = async (gymName, workoutItems, bodyWeight, bodyFat, manualStart, manualEnd, jointPartnerId = null, partnerItems = null) => {
    if (!currentUser || !db) return;
    if ((!workoutItems || workoutItems.length === 0) && !bodyWeight && !bodyFat) return;

    const myInfo = accountsInfo[currentUser] || {};
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
              const w = Number(ps.weight) || 0; const r = Number(ps.reps) || 0;
              if (w > maxW) { maxW = w; maxR = r; }
              else if (w === maxW && r > maxR) { maxR = r; }
            });
          }
        });
      });
      if (hasDone && item.weightType !== 'cardio') {
        item.sets.forEach(set => {
          const w = Number(set.weight) || 0; const r = Number(set.reps) || 0;
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
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', newDocId), {
        author: currentUser,
        gymName,
        items: cleanItems,
        timestamp,
        startTime,
        endTime,
        duration,
        date: dateIso,
        likes: 0,
        likedByMe: false,
        bodyWeight: bodyWeight || null,
        bodyFat: bodyFat || null,
        volume: totalVolume,
        calories: totalCalories,
        totalSets,
        jointWith: jointPartnerId || null
      });

      if (jointPartnerId && partnerItems) {
        const pInfo = accountsInfo[jointPartnerId];
        const pBaseWeight = Number(pInfo?.weight) || 60;
        const pCalc = calculateWorkoutTotals(partnerItems, duration, pBaseWeight);
        const pTotalSets = pCalc.processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);
        const pDocId = `workout_${generateId()}`;
        const pCleanItems = JSON.parse(JSON.stringify(pCalc.processedItems));
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', pDocId), {
          author: jointPartnerId,
          gymName,
          items: pCleanItems,
          timestamp,
          startTime,
          endTime,
          duration,
          date: dateIso,
          likes: 0,
          likedByMe: false,
          bodyWeight: null,
          bodyFat: null,
          volume: pCalc.totalVolume,
          calories: pCalc.totalCalories,
          totalSets: pTotalSets,
          jointWith: currentUser
        });
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', jointPartnerId), {
          isTraining: false, trainingStartTime: null, currentGymId: null, currentExerciseName: '', lastActive: Date.now(), jointPartnerId: null, currentWorkoutItems: deleteField()
        }, { merge: true });
      }

      if (!manualStart) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
          isTraining: false, trainingStartTime: null, currentGymId: null, currentExerciseName: '', lastActive: Date.now(), jointPartnerId: null
        }, { merge: true });
      }
      setDraftWorkoutItems([]);
      setSelectedCategories([]);
      setCurrentTab('timeline');

      const myFriends = myInfo.friends || [];
      const authorName = myInfo.displayName || currentUser;
      myFriends.forEach(friendId => {
        let title = '🔥 トレーニング完了';
        let body = `${authorName}さんが${gymName || 'トレーニング'}でのワークアウトを完了しました！`;
        if (!workoutItems || workoutItems.length === 0) {
          title = '⚖️ 体組成を記録';
          body = `${authorName}さんが体組成データを記録しました！`;
        } else if (manualStart) {
          title = '📅 過去の記録を追加';
          body = `${authorName}さんが過去のトレーニング記録を追加しました！`;
        }
        sendNotification(friendId, title, body, 'post', newDocId);
      });
    } catch (e) {
      console.error("Post error:", e);
    }
  };

  const handleUpdateWorkout = async (postId, updatedData) => {
    if (!currentUser || !db) return;
    const { processedItems, totalVolume, totalCalories } = calculateWorkoutTotals(updatedData.items, updatedData.duration, updatedData.bodyWeight);
    const totalSets = processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);
    const cleanItems = JSON.parse(JSON.stringify(processedItems));
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', postId), {
        ...updatedData,
        items: cleanItems,
        volume: totalVolume,
        calories: totalCalories,
        totalSets
      }, { merge: true });
      setEditingPost(null);
    } catch (e) {}
  };

  const handleDeleteWorkout = async (postId) => {
    if (!currentUser || !db) return;
    if (!window.confirm("この記録を削除しますか？")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', postId));
    } catch (e) {}
  };

  const handleRequestJointTraining = async (partnerId) => {
    if (!window.confirm(`${accountsInfo[partnerId]?.displayName || partnerId}さんに合トレを申請しますか？`) || !db) return;
    const targetRequests = accountsInfo[partnerId]?.jointTrainingRequests || [];
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', partnerId), { jointTrainingRequests: [...new Set([...targetRequests, currentUser])] }, { merge: true });
    window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: '申請を送信しました。' } }));
  };

  const handleAcceptJointTraining = async (requesterId) => {
    if (!db) return;
    const pItems = accountsInfo[requesterId]?.currentWorkoutItems || [];
    let mItems = draftWorkoutItems;
    const maxLen = Math.max(mItems.length, pItems.length);
    const newMItems = [...mItems];
    const newPItems = [...pItems];
    for (let i = 0; i < maxLen; i++) {
      if (!newMItems[i]) newMItems[i] = { id: generateId(), exerciseName: newPItems[i]?.exerciseName || '', weightType: newPItems[i]?.weightType || 'total', category: newPItems[i]?.category || 'その他', sets: [{ id: generateId(), weight: '', reps: '' }] };
      if (!newPItems[i]) newPItems[i] = { id: generateId(), exerciseName: newMItems[i]?.exerciseName || '', weightType: newMItems[i]?.weightType || 'total', category: newMItems[i]?.category || 'その他', sets: [{ id: generateId(), weight: '', reps: '' }] };
    }
    setDraftWorkoutItems(newMItems);
    const myRequests = accountsInfo[currentUser]?.jointTrainingRequests || [];
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { jointPartnerId: requesterId, currentWorkoutItems: newMItems, jointTrainingRequests: myRequests.filter(id => id !== requesterId) }, { merge: true });
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', requesterId), { jointPartnerId: currentUser, currentWorkoutItems: newPItems }, { merge: true });
  };

  const handleRejectJointTraining = async (requesterId) => {
    if (!db) return;
    const myRequests = accountsInfo[currentUser]?.jointTrainingRequests || [];
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { jointTrainingRequests: myRequests.filter(id => id !== requesterId) }, { merge: true });
  };

  const handleCancelJointTraining = async () => {
    if (!window.confirm("合トレを解除しますか？") || !db) return;
    const partnerId = accountsInfo[currentUser]?.jointPartnerId;
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { jointPartnerId: null }, { merge: true });
    if (partnerId) {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', partnerId), { jointPartnerId: null }, { merge: true });
    }
  };

  const handleCancelTraining = async () => {
    if (!window.confirm("現在の記録を破棄して終了しますか？")) return;
    if (!currentUser || !db) return;
    try {
      const partnerId = accountsInfo[currentUser]?.jointPartnerId;
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
        isTraining: false, trainingStartTime: null, currentGymId: null, currentExerciseName: '', lastActive: Date.now(), jointPartnerId: null, currentWorkoutItems: deleteField()
      }, { merge: true });
      if (partnerId) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', partnerId), { jointPartnerId: null }, { merge: true });
      }
      setDraftWorkoutItems([]);
      setSelectedCategories([]);
      setCurrentTab('timeline');
    } catch (e) {}
  };

  const handleSaveProfile = async (data, shouldClose = true) => {
    if (!currentUser || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), data, { merge: true });
      if (shouldClose) setShowProfileModal(false);
    } catch (e) {}
  };

  const toggleLike = async (postId, currentLikes, isCurrentlyLiked, likedUsers = []) => {
    if (!db || !currentUser) return;
    const newLikedUsers = isCurrentlyLiked
      ? likedUsers.filter(u => u !== currentUser)
      : [...new Set([...likedUsers, currentUser])];
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', postId), { likes: newLikedUsers.length, likedUsers: newLikedUsers }, { merge: true });
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

  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    if (!db || !currentUser) return;
    const notifsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications');
    const q = query(notifsRef, where('targetUser', '==', currentUser));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() }));
      data.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(data.slice(0, 30));
    });
    return () => unsub();
  }, [currentUser]);

  const handleImportWorkout = async (post, isManual) => {
    const gym = allGyms.find(g => g.name === post.gymName);
    const gymId = gym ? gym.id : 'common';

    const newItems = (post.items || []).map(item => ({
      ...item,
      id: generateId(),
      sets: (item.sets || []).map(set => ({
        ...set,
        id: generateId(),
        targetReps: set.reps,
        targetLReps: set.lReps,
        targetRReps: set.rReps,
        reps: '', lReps: '', rReps: '',
        dropSets: set.dropSets ? set.dropSets.map(ds => ({
          ...ds, id: generateId(), targetReps: ds.reps, reps: '', lReps: '', rReps: ''
        })) : []
      }))
    }));

    const importedCategories = Array.from(new Set(newItems.map(item => item.category).filter(Boolean)));
    setSelectedCategories(importedCategories);
    setDraftWorkoutItems(newItems);

    if (isManual) {
      setIsRecordManual(true);
    } else {
      setIsRecordManual(false);
      if (!myInfo.isTraining) {
        await handleStartTraining(gymId);
      }
    }
    setCurrentTab('record');
  };

  const handleActiveExerciseChange = (exerciseName) => {
    if (!exerciseName || !myInfo.isTraining || !db) return;
    if (exerciseName !== myInfo.currentExerciseName) {
      setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { currentExerciseName: exerciseName }, { merge: true }).catch(() => {});
    }
  };

  const unreadNotifs = notifications.filter(n => n.timestamp > (myInfo.lastNotificationCheck || 0));
  const unreadNotificationCount = unreadNotifs.length;

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && db && currentUser) {
      setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { lastNotificationCheck: Date.now() }, { merge: true }).catch(() => {});
    }
  };

  const handleNotificationClick = (notif) => {
    setShowNotifications(false);
    if (notif.type === 'request') {
      setCurrentTab('friends');
      setTargetFriendTab(notif.title.includes('パートナー') ? 'partner' : 'friends');
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
      const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', friendCodeOrName));
      if (docSnap.exists()) {
        friendUsername = friendCodeOrName;
        friendData = docSnap.data();
      } else {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'accounts'), where('friendCode', '==', friendCodeOrName), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          friendUsername = snap.docs[0].id;
          friendData = snap.docs[0].data();
        }
      }
    } catch (e) {}

    if (!friendUsername || !friendData) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "該当するフレンドコード（またはユーザー名）が見つかりません。" } }));
      return;
    }
    if (friendUsername === currentUser) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "自分自身は追加できません。" } }));
      return;
    }
    const currentFriends = myInfo.friends || [];
    if (currentFriends.includes(friendUsername)) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "既にフレンドです。" } }));
      return;
    }
    const targetRequests = friendData.friendRequests || [];
    if (targetRequests.includes(currentUser)) {
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "既に申請済みです。" } }));
      return;
    }
    if (!window.confirm(`${friendData.displayName || friendUsername}さんにフレンド申請を送りますか？`)) return;

    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', friendUsername), { friendRequests: [...targetRequests, currentUser] }, { merge: true });
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: `${friendData.displayName || friendUsername}さんにフレンド申請を送信しました！` } }));
      const authorName = accountsInfo[currentUser]?.displayName || currentUser;
      sendNotification(friendUsername, '🤝 フレンド申請', `${authorName}さんからフレンド申請が届きました`, 'request');
    } catch (e) {}
  };

  const handleSendPartnerRequest = async (friendCodeOrName) => {
    if (!currentUser || !db || !friendCodeOrName) return;
    let partnerUsername = null;
    let partnerData = null;
    try {
      const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', friendCodeOrName));
      if (docSnap.exists()) {
        partnerUsername = friendCodeOrName;
        partnerData = docSnap.data();
      } else {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'accounts'), where('friendCode', '==', friendCodeOrName), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          partnerUsername = snap.docs[0].id;
          partnerData = snap.docs[0].data();
        }
      }
    } catch (e) {}

    if (!partnerUsername || !partnerData) { window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "該当するユーザーが見つかりません。" } })); return; }
    if (partnerUsername === currentUser) { window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "自分自身は追加できません。" } })); return; }
    const targetRequests = partnerData.partnerRequests || [];
    if (!window.confirm(`${partnerData.displayName || partnerUsername}さんにパートナー申請を送りますか？`)) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', partnerUsername), { partnerRequests: [...new Set([...targetRequests, currentUser])] }, { merge: true });
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: `パートナー申請を送信しました！` } }));
      const authorName = accountsInfo[currentUser]?.displayName || currentUser;
      sendNotification(partnerUsername, '🤝 パートナー申請', `${authorName}さんからパートナー申請が届きました`, 'request');
    } catch (e) {}
  };

  const handleAcceptPartnerRequest = async (requesterUsername) => {
    if (!currentUser || !db) return;
    const myRequests = myInfo.partnerRequests || [];
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { partnerId: requesterUsername, enablePartner: true, partnerRequests: myRequests.filter(u => u !== requesterUsername) }, { merge: true });
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', requesterUsername), { partnerId: currentUser, enablePartner: true, partnerRequests: (accountsInfo[requesterUsername]?.partnerRequests || []).filter(u => u !== currentUser) }, { merge: true });
    } catch (e) {}
  };

  const handleRejectPartnerRequest = async (requesterUsername) => {
    if (!currentUser || !db) return;
    const myRequests = myInfo.partnerRequests || [];
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { partnerRequests: myRequests.filter(u => u !== requesterUsername) }, { merge: true });
    } catch (e) {}
  };

  const handleRemovePartner = async () => {
    if (!currentUser || !db || !myInfo.partnerId) return;
    if (!window.confirm(`パートナーを解除しますか？`)) return;
    const partnerId = myInfo.partnerId;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { partnerId: null, enablePartner: false }, { merge: true });
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', partnerId), { partnerId: null, enablePartner: false }, { merge: true });
    } catch (e) {}
  };

  const handleAcceptFriendRequest = async (requesterUsername) => {
    if (!currentUser || !db) return;
    const myFriends = myInfo.friends || [];
    const myRequests = myInfo.friendRequests || [];
    const requesterFriends = accountsInfo[requesterUsername]?.friends || [];
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
        friends: [...new Set([...myFriends, requesterUsername])],
        friendRequests: myRequests.filter(u => u !== requesterUsername)
      }, { merge: true });
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', requesterUsername), {
        friends: [...new Set([...requesterFriends, currentUser])]
      }, { merge: true });
    } catch (e) {}
  };

  const handleRejectFriendRequest = async (requesterUsername) => {
    if (!currentUser || !db) return;
    const myRequests = myInfo.friendRequests || [];
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), {
        friendRequests: myRequests.filter(u => u !== requesterUsername)
      }, { merge: true });
    } catch (e) {}
  };

  const handleGenerateFriendCode = async () => {
    if (!currentUser || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { friendCode: generateFriendCode() }, { merge: true });
    } catch (e) {}
  };

  const handleRemoveFriend = async (friendUsername) => {
    if (!currentUser || !db) return;
    if (!window.confirm(`${accountsInfo[friendUsername]?.displayName || friendUsername}さんをフレンドから解除しますか？`)) return;
    const currentFriends = myInfo.friends || [];
    const targetFriends = accountsInfo[friendUsername]?.friends || [];
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', currentUser), { friends: currentFriends.filter(f => f !== friendUsername) }, { merge: true });
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', friendUsername), { friends: targetFriends.filter(f => f !== currentUser) }, { merge: true });
    } catch (e) {}
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !db) return;
    try {
      const myPosts = posts.filter(p => p.author === currentUser);
      for (const p of myPosts) {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workouts', p.id));
      }
      const userIdToDelete = currentUser;
      setCurrentUser(null);
      localStorage.removeItem('withfit_login_session');
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accounts', userIdToDelete));
      window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: "アカウントが削除されました。" } }));
    } catch (e) {}
  };

  if (!isFullyLoaded) {
    let loadingProgress = 20;
    if (dataLoaded.accounts) loadingProgress += 20;
    if (dataLoaded.gyms) loadingProgress += 20;
    if (dataLoaded.exercises) loadingProgress += 20;
    if (dataLoaded.workouts) loadingProgress += 20;
    return (
      <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-5 animate-pulse">
          <WithFitLogo size={30} />
        </div>
        <p className="text-slate-700 dark:text-slate-200 font-extrabold mb-3 text-sm">WithFit を読み込み中...</p>
        <div className="w-56 bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
        </div>
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
    return gymName ? `${gymName}で ${friendName}` : friendName;
  }).join('、');

  const isDarkMode = ['dark', 'ocean', 'mono'].includes(myInfo.theme);
  const themeContainerClass = myInfo.theme === 'ocean' ? 'theme-ocean' : myInfo.theme === 'pop' ? 'theme-pop' : '';
  const visiblePosts = posts.filter(p => p.author === currentUser || myFriends.includes(p.author));

  return (
    <div className={`min-h-screen font-sans pb-32 overflow-x-hidden select-none transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} ${themeContainerClass}`}>
      <style>{`
        input, textarea, select { font-size: 16px !important; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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
        `}</style>
      )}
      {myInfo.theme === 'pop' && (
        <style>{`
          .theme-pop, .theme-pop .bg-slate-50 { background-color: #fffbeb !important; }
          .theme-pop .border-slate-200 { border-color: #fbcfe8 !important; }
        `}</style>
      )}

      {/* 統一ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-30 shadow-sm flex flex-col">
        <div className="px-4 py-3 flex justify-between items-center max-w-md mx-auto w-full relative">
          <button
            type="button"
            onClick={() => setCurrentTab('timeline')}
            className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <WithFitLogo size={18} />
            </div>
            <span>With<span className="text-emerald-500">Fit</span></span>
          </button>

          <div className="flex items-center gap-1.5">
            <IconButton
              icon={<Bell size={19} />}
              variant="emerald"
              onClick={handleOpenNotifications}
              badge={unreadNotificationCount}
              title="通知"
            />
            <div
              onClick={handleHeaderOnlineTap}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-200/70 dark:border-slate-700 cursor-pointer active:scale-95 transition-transform"
            >
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 sm:pr-2.5 rounded-full border border-slate-200/70 dark:border-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
              title="プロフィール設定"
            >
              <UserAvatar userId={currentUser} accountsInfo={accountsInfo} size={26} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline max-w-[80px] truncate">
                {myInfo.displayName || currentUser}
              </span>
            </button>
            <IconButton icon={<LogOut size={18} />} variant="danger" size="sm" onClick={handleLogout} title="ログアウト" />
          </div>
        </div>

        {activeFriends.length > 0 && (() => {
          const friendsInSameGym = activeFriends.filter(f => accountsInfo[f]?.currentGymId === myInfo?.currentGymId && myInfo?.currentGymId);
          const isSameGym = friendsInSameGym.length > 0;
          const marqueeBg = isSameGym
            ? "bg-gradient-to-r from-rose-600 via-orange-500 to-rose-600"
            : "bg-gradient-to-r from-emerald-500 to-teal-500";
          return (
            <div className={`${marqueeBg} text-white py-1.5 px-4 flex items-center justify-center text-xs font-bold overflow-hidden w-full`}>
              <Flame size={13} className="animate-pulse text-amber-200 shrink-0 mr-1.5" />
              <span className="truncate">{activeFriendsText}さんがトレーニング中！{isSameGym ? ' (同じジム🔥)' : ''}</span>
            </div>
          );
        })()}

        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div className="absolute top-14 right-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-xs text-slate-700 dark:text-slate-300 flex justify-between items-center">
                <span>通知一覧</span>
                {unreadNotificationCount > 0 && <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full">{unreadNotificationCount}件の未読</span>}
              </div>
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 p-6 font-bold">通知はありません</div>
                ) : (
                  notifications.map(notif => {
                    const isUnread = notif.timestamp > (myInfo.lastNotificationCheck || 0);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex gap-2.5 items-center p-2.5 rounded-2xl cursor-pointer transition-all active:scale-98 ${
                          isUnread ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <UserAvatar userId={notif.fromUser} accountsInfo={accountsInfo} size={34} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{getRelativeTime(notif.timestamp)}</p>
                        </div>
                        {isUnread && <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </header>

      {/* フローティング・インターバルタイマーバー */}
      {myInfo?.isTraining && (
        <div className="fixed inset-0 z-[25] pointer-events-none overflow-hidden">
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
            className={`absolute top-0 left-0 w-[calc(100%-32px)] max-w-md pointer-events-auto ${isTimerDragging ? '' : 'transition-transform duration-300'}`}
            style={{
              transform: `translate3d(${transformX}px, ${transformY}px, 0)`,
              cursor: isTimerDragging ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 shadow-xl text-white flex justify-between items-center border border-slate-700/80 relative w-full">
              {isHidden && timerState.x === 'left' && (
                <div className="absolute top-1/2 -translate-y-1/2 -right-6 bg-slate-900 text-emerald-400 py-3 px-1 rounded-r-xl border border-l-0 border-slate-700 shadow-md">
                  <ChevronRight size={18} />
                </div>
              )}
              {isHidden && timerState.x === 'right' && (
                <div className="absolute top-1/2 -translate-y-1/2 -left-6 bg-slate-900 text-emerald-400 py-3 px-1 rounded-l-xl border border-r-0 border-slate-700 shadow-md">
                  <ChevronLeft size={18} />
                </div>
              )}

              <div className={`flex justify-between items-center w-full transition-opacity duration-300 ${isHidden && !isTimerDragging ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex flex-col items-start min-w-[70px] pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <MapPin size={10} className="text-emerald-400" /> {allGyms.find(g => g.id === myInfo.currentGymId)?.name || 'トレーニング中'}
                  </span>
                  <div className="text-base font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <Clock size={13} className="animate-pulse" />
                    <TimerDisplay startTime={myInfo.trainingStartTime} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTimerVolume(timerVolume === 0 ? 1 : 0);
                    }}
                    className="text-slate-400 hover:text-emerald-400 p-1.5 active:scale-90 transition-all"
                  >
                    {timerVolume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  </button>

                  {!restTimerStart ? (
                    <div className="relative flex items-center">
                      <select
                        value={selectedRestMinute}
                        onChange={(e) => setSelectedRestMinute(Number(e.target.value))}
                        className="appearance-none bg-slate-800 text-slate-100 font-bold text-xs py-2 pl-2.5 pr-6 rounded-l-xl border border-slate-600 focus:outline-none h-[38px]"
                      >
                        <option value={0}>UP計測</option>
                        <option value={1}>1分</option>
                        <option value={1.5}>1分30秒</option>
                        <option value={2}>2分</option>
                        <option value={3}>3分</option>
                        <option value={4}>4分</option>
                        <option value={5}>5分</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
                    </div>
                  ) : (
                    <div className="bg-slate-800 flex items-center justify-center h-[38px] px-3 rounded-l-xl border border-slate-600 border-r-0 min-w-[68px]">
                      {isAlarmRinging ? (
                        <span className="text-xs font-bold text-rose-400 animate-pulse flex items-center gap-1"><Bell size={13} /> TIME UP!</span>
                      ) : (
                        <span className={`text-base font-mono font-bold ${restDuration === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{formatRestTime(restTimeLeft)}</span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAlarmRinging || restTimerStart) stopAlarm();
                      else startRestTimer(selectedRestMinute);
                    }}
                    className={`flex items-center justify-center h-[38px] px-3.5 rounded-r-xl border active:scale-95 transition-all ${
                      restTimerStart ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-emerald-500 border-emerald-500 text-white'
                    }`}
                  >
                    {restTimerStart ? <X size={16} /> : <Play size={16} fill="currentColor" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className={`px-4 pb-44 max-w-md mx-auto w-full ${myInfo?.isTraining && timerState.y === 'top' ? (activeFriends.length > 0 ? 'pt-44' : 'pt-36') : (activeFriends.length > 0 ? 'pt-28' : 'pt-20')}`}>
        {!myInfo?.googleUid && (
          <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 font-bold text-xs mb-5 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <Lock size={14} className="shrink-0" />
              <span className="truncate">Google連携をしてアカウントを保護しましょう</span>
            </div>
            <button type="button" onClick={handleLinkGoogle} className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl shrink-0 active:scale-95">連携</button>
          </div>
        )}

        {currentTab === 'timeline' && (
          <TimelineView
            posts={visiblePosts}
            onToggleLike={toggleLike}
            onImport={handleImportWorkout}
            currentUser={currentUser}
            onDelete={handleDeleteWorkout}
            onEdit={setEditingPost}
            accountsInfo={accountsInfo}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onToggleCommentLike={handleToggleCommentLike}
            onUserClick={setSelectedUserProfile}
            scrollToPostId={scrollToPostId}
            setScrollToPostId={setScrollToPostId}
          />
        )}
        {currentTab === 'exercises' && (
          <ExercisesView
            gyms={allGyms}
            exercises={exercises}
            posts={visiblePosts}
            accountsInfo={accountsInfo}
            currentUser={currentUser}
            myInfo={myInfo}
            setCurrentTab={setCurrentTab}
            onSendRequest={handleSendFriendRequest}
            onUserClick={setSelectedUserProfile}
          />
        )}
        {currentTab === 'record' && (
          <RecordView
            onStart={handleStartTraining}
            onPost={handlePostWorkout}
            onCancel={handleCancelTraining}
            onRequestJointTraining={handleRequestJointTraining}
            onAcceptJointTraining={handleAcceptJointTraining}
            onRejectJointTraining={handleRejectJointTraining}
            onCancelJointTraining={handleCancelJointTraining}
            myInfo={myInfo}
            gyms={allGyms}
            exercises={exercises}
            workoutItems={draftWorkoutItems}
            setWorkoutItems={setDraftWorkoutItems}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            posts={visiblePosts}
            currentUser={currentUser}
            isManual={isRecordManual}
            setIsManual={setIsRecordManual}
            onActiveExerciseChange={handleActiveExerciseChange}
            accountsInfo={accountsInfo}
          />
        )}
        {currentTab === 'data' && (
          <DataView
            posts={posts}
            currentUser={currentUser}
            accountsInfo={accountsInfo}
            onEdit={setEditingPost}
            onDelete={handleDeleteWorkout}
            onImport={handleImportWorkout}
            onToggleLike={toggleLike}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onToggleCommentLike={handleToggleCommentLike}
            onUserClick={setSelectedUserProfile}
          />
        )}
        {currentTab === 'friends' && (
          <FriendsView
            currentUser={currentUser}
            myInfo={myInfo}
            accountsInfo={accountsInfo}
            onSendRequest={handleSendFriendRequest}
            onAccept={handleAcceptFriendRequest}
            onReject={handleRejectFriendRequest}
            onRemoveFriend={handleRemoveFriend}
            onSendPartnerRequest={handleSendPartnerRequest}
            onAcceptPartnerRequest={handleAcceptPartnerRequest}
            onRejectPartnerRequest={handleRejectPartnerRequest}
            onRemovePartner={handleRemovePartner}
            onFriendClick={(u) => setSelectedFriendUser(u)}
            onUserClick={setSelectedUserProfile}
            onGenerateFriendCode={handleGenerateFriendCode}
            posts={posts}
            targetFriendTab={targetFriendTab}
            setTargetFriendTab={setTargetFriendTab}
            onSendTestPush={async (targetUser, message) => {
              if (!db) return;
              const targetToken = accountsInfo[targetUser]?.fcmToken;
              if (!targetToken) {
                window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: '相手の端末でプッシュ通知がオンになっていません。' } }));
                return;
              }
              try {
                const res = await fetch('/api/sendPush', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ targetToken, title: '管理者からのメッセージ', body: message })
                });
                if (!res.ok) throw new Error('送信エラー');
                window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: 'プッシュ通知を送信しました！' } }));
              } catch (e) {
                window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message: '送信に失敗しました。' } }));
              }
            }}
          />
        )}
      </main>

      {/* 各種モーダル */}
      {editingPost && (
        <EditWorkoutModal
          post={editingPost}
          gyms={allGyms}
          exercises={exercises}
          onClose={() => setEditingPost(null)}
          onSave={handleUpdateWorkout}
          myPastPosts={posts.filter(p => p.author === currentUser)}
        />
      )}
      {selectedFriendUser && (
        <FriendDetailModal
          friendUsername={selectedFriendUser}
          posts={posts}
          accountsInfo={accountsInfo}
          onClose={() => setSelectedFriendUser(null)}
          onToggleLike={toggleLike}
          onImport={handleImportWorkout}
          currentUser={currentUser}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onToggleCommentLike={handleToggleCommentLike}
          onUserClick={setSelectedUserProfile}
        />
      )}

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pt-1 z-30" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="flex justify-around items-center px-2 py-1 max-w-md mx-auto">
          <NavButton icon={<Home size={22} />} label="ホーム" isActive={currentTab === 'timeline'} onClick={() => { if (currentTab === 'timeline') window.scrollTo({ top: 0, behavior: 'smooth' }); else setCurrentTab('timeline'); }} />
          <NavButton icon={<Dumbbell size={22} />} label="種目" isActive={currentTab === 'exercises'} onClick={() => { if (currentTab === 'exercises') window.scrollTo({ top: 0, behavior: 'smooth' }); else setCurrentTab('exercises'); }} />
          <RecordWheelWrapper myInfo={myInfo} currentTab={currentTab} setCurrentTab={setCurrentTab}>
            <NavButton
              icon={myInfo.isTraining ? <Clock className="animate-pulse" size={26} /> : <PlusCircle size={26} />}
              label={myInfo.isTraining ? "記録中" : "記録"}
              isActive={currentTab === 'record'}
              onClick={() => {
                if (!myInfo?.isTraining) {
                  if (currentTab === 'record') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    window.dispatchEvent(new CustomEvent('showRecordDashboard'));
                  } else {
                    setCurrentTab('record');
                    window.dispatchEvent(new CustomEvent('showRecordDashboard'));
                  }
                }
              }}
              isPrimary
              isTraining={myInfo.isTraining}
            />
          </RecordWheelWrapper>
          <NavButton icon={<CalendarIcon size={22} />} label="データ" isActive={currentTab === 'data'} onClick={() => { if (currentTab === 'data') window.scrollTo({ top: 0, behavior: 'smooth' }); else setCurrentTab('data'); }} />
          <NavButton icon={<Users size={22} />} label="フレンド" isActive={currentTab === 'friends'} onClick={() => { if (currentTab === 'friends') window.scrollTo({ top: 0, behavior: 'smooth' }); else setCurrentTab('friends'); }} />
        </div>
      </nav>

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={myInfo}
        onSave={handleSaveProfile}
        currentUser={currentUser}
        onLinkGoogle={handleLinkGoogle}
        onDeleteAccount={handleDeleteAccount}
      />
      <UserProfileModal
        isOpen={!!selectedUserProfile}
        onClose={() => setSelectedUserProfile(null)}
        targetUser={selectedUserProfile}
        accountsInfo={accountsInfo}
        currentUser={currentUser}
        onSendRequest={handleSendFriendRequest}
      />
      {showSecretGame && <SecretGame onClose={() => setShowSecretGame(false)} />}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 max-w-[90vw] animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}