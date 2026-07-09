import React, { useState, useEffect } from 'react';
import { Heart, Home, PlusCircle, Users, Dumbbell, LogOut, Activity, Flame, Lock, Settings, Trash2, Plus, X, ListPlus, MapPin, Clock, Play, Square, Circle, Edit2, KeyRound, AlignLeft, Sparkles, Scale } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';

// --- Firebase 初期化 ---
let app, auth, db, appId = 'duofit-app';
const FIREBASE_PROJECT_ID = "duofit-app-75cb2";

try {
  const firebaseConfig = {
    apiKey: "AIzaSyDQTfLhyuc8PEoMtw-FvEq4k9HShRJz_io",
    authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
    messagingSenderId: "949622687026",
    appId: "1:949622687026:web:cc870727ff41a2a22a432b",
    measurementId: "G-D6DFPL2THK"
  };
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Offline persistence error:", err.code);
  });
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const MUSCLE_CATEGORIES = ['胸', '背中', '肩', '腕', '脚', 'その他'];

// ストップウォッチ用コンポーネント
function TimerDisplay({ startTime, isStopped = false }) {
  const [elapsed, setElapsed] = useState(startTime ? Math.max(0, Date.now() - startTime) : 0);
  
  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }
    if (isStopped) return;

    setElapsed(Math.max(0, Date.now() - startTime));
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isStopped]);
  
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return (
    <span className="font-mono font-bold tracking-wider">
      {hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

const formatDuration = (ms) => {
  if (!ms) return '';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}時間 ${minutes}分`;
  }
  return minutes > 0 ? `${minutes}分` : '< 1分';
};

const formatTimeFromTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// 総負荷量の計算
const calculateTotalVolume = (items) => {
  let volume = 0;
  items.forEach(item => {
    item.sets.forEach(set => {
      if (item.weightType === 'lr') {
        volume += (Number(set.lWeight || 0) * Number(set.lReps || 0));
        volume += (Number(set.rWeight || 0) * Number(set.rReps || 0));
      } else if (item.weightType === 'oneSide') {
        volume += (Number(set.weight || 0) * Number(set.reps || 0)) * 2;
      } else if (item.weightType === 'plate') {
        volume += (Number(set.weight || 0) * Number(set.reps || 0) * 5); // プレート1枚=5kgとして概算
      } else {
        volume += (Number(set.weight || 0) * Number(set.reps || 0));
      }
    });
  });
  return volume;
};

const getVolumeMetaphor = (kg) => {
  if (kg <= 0) return '';
  if (kg < 500) return `原付バイク約${(kg / 100).toFixed(1)}台分`;
  if (kg < 2000) return `軽自動車約${(kg / 1000).toFixed(1)}台分`;
  if (kg < 5000) return `サイ約${(kg / 2000).toFixed(1)}頭分`;
  if (kg < 10000) return `アフリカゾウ約${(kg / 6000).toFixed(1)}頭分`;
  if (kg < 50000) return `中型トラック約${(kg / 8000).toFixed(1)}台分`;
  return `大型トレーラー級！`;
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [currentTab, setCurrentTab] = useState('timeline');
  
  const [posts, setPosts] = useState([]);
  const [accountsInfo, setAccountsInfo] = useState({});
  const [gyms, setGyms] = useState([]); 
  const [exercises, setExercises] = useState([]); 

  const [dataLoaded, setDataLoaded] = useState({
    accounts: false,
    gyms: false,
    exercises: false,
    workouts: false
  });
  const isFullyLoaded = Object.values(dataLoaded).every(Boolean);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [draftWorkoutItems, setDraftWorkoutItems] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
    if (!auth) return;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser || !db) return;

    const accountsRef = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
    const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
      const accData = {};
      snapshot.forEach(doc => { accData[doc.id] = doc.data(); });
      setAccountsInfo(accData);
      setDataLoaded(prev => ({ ...prev, accounts: true }));
    }, (error) => console.error("Accounts snapshot error", error));

    const gymsRef = collection(db, 'artifacts', appId, 'public', 'data', 'gyms');
    const unsubscribeGyms = onSnapshot(gymsRef, (snapshot) => {
      const gymsData = [];
      snapshot.forEach(doc => { gymsData.push({ id: doc.id, ...doc.data() }); });
      gymsData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setGyms(gymsData);
      setDataLoaded(prev => ({ ...prev, gyms: true }));
    }, (error) => console.error("Gyms snapshot error", error));

    const exercisesRef = collection(db, 'artifacts', appId, 'public', 'data', 'exercises');
    const unsubscribeExercises = onSnapshot(exercisesRef, (snapshot) => {
      const exData = [];
      snapshot.forEach(doc => { exData.push({ id: doc.id, ...doc.data() }); });
      exData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setExercises(exData);
      setDataLoaded(prev => ({ ...prev, exercises: true }));
    }, (error) => console.error("Exercises snapshot error", error));

    const workoutsRef = collection(db, 'artifacts', appId, 'public', 'data', 'workouts');
    const unsubscribeWorkouts = onSnapshot(workoutsRef, (snapshot) => {
      const workoutsData = [];
      snapshot.forEach(doc => { workoutsData.push({ id: doc.id, ...doc.data() }); });
      workoutsData.sort((a, b) => b.timestamp - a.timestamp);
      setPosts(workoutsData);
      setDataLoaded(prev => ({ ...prev, workouts: true }));
    }, (error) => console.error("Workouts snapshot error", error));

    return () => {
      unsubscribeAccounts();
      unsubscribeGyms();
      unsubscribeExercises();
      unsubscribeWorkouts();
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (!currentUser || !db || !isOnline) return;
    const updatePresence = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
        await setDoc(docRef, { lastActive: Date.now() }, { merge: true });
      } catch (error) {}
    };
    updatePresence();
    const intervalId = setInterval(updatePresence, 60000);
    return () => clearInterval(intervalId);
  }, [currentUser, isOnline]);

  const handleLogin = async (userId, pin) => {
    if (!firebaseUser || !db) return false;
    const accountData = accountsInfo[userId];
    if (!accountData || !accountData.pin) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', userId);
        await setDoc(docRef, { pin: pin, isTraining: false, lastActive: Date.now() });
        setCurrentUser(userId);
      } catch (error) {}
    } else if (accountData.pin === pin) {
      setCurrentUser(userId);
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', userId);
      await setDoc(docRef, { lastActive: Date.now() }, { merge: true });
    } else {
      return false;
    }
    return true;
  };

  const handleChangePin = async (userId, oldPin, newPin) => {
    if (!db) return false;
    const accountData = accountsInfo[userId];
    if (accountData && accountData.pin === oldPin) {
       const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', userId);
       await setDoc(docRef, { pin: newPin }, { merge: true });
       return true;
    }
    return false;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('timeline');
    setEditingPost(null);
  };

  const handleStartTraining = async (gymId) => {
    if (!firebaseUser || !currentUser || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
    await setDoc(docRef, { 
      isTraining: true, 
      trainingStartTime: Date.now(),
      currentGymId: gymId,
      lastActive: Date.now()
    }, { merge: true });
  };

  const handlePostWorkout = async (gymName, workoutItems, bodyWeight, bodyFat) => {
    if (!firebaseUser || !currentUser || workoutItems.length === 0 || !db) return;
    
    const myInfo = accountsInfo[currentUser];
    const startTime = myInfo?.trainingStartTime || Date.now();
    const endTime = Date.now();
    const duration = endTime - startTime;
    const volume = calculateTotalVolume(workoutItems);

    const newDocId = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'workouts', newDocId);
    
    try {
      await setDoc(docRef, {
        author: currentUser,
        gymName: gymName,
        items: workoutItems,
        timestamp: Date.now(),
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        date: new Date().toISOString(),
        likes: 0,
        likedByMe: false,
        bodyWeight: bodyWeight || null,
        bodyFat: bodyFat || null,
        volume: volume
      });

      const accRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
      await setDoc(accRef, { isTraining: false, trainingStartTime: null, currentGymId: null, lastActive: Date.now() }, { merge: true });
      
      setDraftWorkoutItems([]);
      setCurrentTab('timeline');
    } catch (error) {
      console.error("Error posting workout:", error);
    }
  };

  const handleUpdateWorkout = async (postId, workoutItems) => {
    if (!firebaseUser || !currentUser || workoutItems.length === 0 || !db) return;
    const volume = calculateTotalVolume(workoutItems);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId);
    try {
      await setDoc(docRef, { items: workoutItems, volume: volume }, { merge: true });
      setEditingPost(null);
    } catch (error) {}
  };

  const handleDeleteWorkout = async (postId) => {
    if (!firebaseUser || !currentUser || !db) return;
    if (!window.confirm("この記録を削除しますか？")) return;
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId);
    try {
      await deleteDoc(docRef);
    } catch (error) {}
  };

  const handleCancelTraining = async () => {
    if (!window.confirm("現在の記録を破棄してトレーニングを終了しますか？")) return;
    if (!firebaseUser || !currentUser || !db) return;
    
    const accRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
    await setDoc(accRef, { isTraining: false, trainingStartTime: null, currentGymId: null, lastActive: Date.now() }, { merge: true });
    setDraftWorkoutItems([]);
    setCurrentTab('timeline');
  };

  const handleSaveProfilePhoto = async (photoUrl) => {
    if (!firebaseUser || !currentUser || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
    try {
      if (photoUrl === null) {
        await setDoc(docRef, { photoUrl: null }, { merge: true });
      } else {
        await setDoc(docRef, { photoUrl }, { merge: true });
      }
      setShowProfileModal(false);
    } catch (error) {}
  };

  const toggleLike = async (postId, currentLikes, isCurrentlyLiked) => {
    if (!firebaseUser || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId);
    try {
      await setDoc(docRef, {
        likes: isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
        likedByMe: !isCurrentlyLiked
      }, { merge: true });
    } catch (error) {}
  };

  if (!firebaseUser || !isFullyLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Activity className="text-emerald-500 w-12 h-12 animate-pulse mb-4" />
        <p className="text-slate-500 font-bold mb-2">サーバーに接続中...</p>
        <p className="text-slate-400 text-xs font-bold text-center">
          データベースの準備が完了するまで<br/>しばらくお待ちください
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} accountsInfo={accountsInfo} onChangePin={handleChangePin} isOnline={isOnline} />;
  }

  const partnerName = currentUser === '勇太' ? '未来' : '勇太';
  const partnerInfo = accountsInfo[partnerName];
  const partnerIsTraining = partnerInfo?.isTraining;
  const myInfo = accountsInfo[currentUser] || {};

  const isSameGym = myInfo.isTraining && partnerIsTraining && myInfo.currentGymId && (myInfo.currentGymId === partnerInfo.currentGymId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32 overflow-x-hidden selection:bg-emerald-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm flex flex-col">
        {isSameGym && (
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-4 py-2 flex items-center justify-center gap-2 text-white text-xs font-bold animate-pulse shadow-inner">
            <Sparkles size={16} className="text-yellow-300" />
            パートナーと同じジムでトレーニング中！🔥
            <Sparkles size={16} className="text-yellow-300" />
          </div>
        )}
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-emerald-500" />
            Duo<span className="text-emerald-500">Fit</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-full border border-slate-200">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
              <span className="text-[10px] font-bold text-slate-500">
                {isOnline ? 'オンライン' : 'オフライン'}
              </span>
            </div>

            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs overflow-hidden border border-emerald-200">
                {myInfo.photoUrl ? (
                  <img src={myInfo.photoUrl} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  currentUser.charAt(0)
                )}
              </div>
              <span className="text-sm font-bold text-slate-700 hidden sm:inline">{currentUser}</span>
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {partnerIsTraining && !isSameGym && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold animate-in slide-in-from-top duration-300">
            <Flame size={16} className="animate-pulse text-amber-300" />
            {partnerName}さんがトレーニング中です！
            <TimerDisplay startTime={partnerInfo.trainingStartTime} />
          </div>
        )}
      </header>

      <main className="p-4 max-w-md mx-auto w-full">
        {currentTab === 'timeline' && (
          <TimelineView 
            posts={posts} 
            onToggleLike={toggleLike} 
            currentUser={currentUser} 
            onDelete={handleDeleteWorkout}
            onEdit={(post) => setEditingPost(post)}
            accountsInfo={accountsInfo}
          />
        )}
        {currentTab === 'record' && (
          <RecordView 
            onStart={handleStartTraining}
            onPost={handlePostWorkout} 
            onCancel={handleCancelTraining}
            myInfo={myInfo}
            gyms={gyms} 
            exercises={exercises} 
            workoutItems={draftWorkoutItems}
            setWorkoutItems={setDraftWorkoutItems}
          />
        )}
        {currentTab === 'friends' && <FriendsView partnerName={partnerName} partnerInfo={partnerInfo} />}
      </main>

      {/* 編集モーダル */}
      {editingPost && (
        <EditWorkoutModal 
          post={editingPost} 
          gyms={gyms}
          exercises={exercises}
          onClose={() => setEditingPost(null)} 
          onSave={handleUpdateWorkout} 
        />
      )}

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-30">
        <div className="flex justify-around items-center p-3 max-w-md mx-auto">
          <NavButton icon={<Home />} label="タイムライン" isActive={currentTab === 'timeline'} onClick={() => setCurrentTab('timeline')} />
          <NavButton 
            icon={myInfo.isTraining ? <Clock className="animate-pulse" size={32}/> : <PlusCircle size={32} />} 
            label={myInfo.isTraining ? "記録中" : "記録"} 
            isActive={currentTab === 'record'} 
            onClick={() => setCurrentTab('record')} 
            isPrimary 
            isTraining={myInfo.isTraining}
          />
          <NavButton icon={<Users />} label="パートナー" isActive={currentTab === 'friends'} onClick={() => setCurrentTab('friends')} />
        </div>
      </nav>

      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        currentPhotoUrl={myInfo.photoUrl} 
        onSave={handleSaveProfilePhoto} 
      />
    </div>
  );
}

// プロフィール画像変更モーダル
function ProfileModal({ isOpen, onClose, currentPhotoUrl, onSave }) {
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onSave(dataUrl);
        setIsUploading(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">プロフィール画像</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-slate-200 overflow-hidden flex items-center justify-center relative">
            {currentPhotoUrl ? (
              <img src={currentPhotoUrl} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <Users size={40} className="text-slate-300" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <Activity className="animate-spin text-emerald-500" size={24} />
              </div>
            )}
          </div>
          
          {currentPhotoUrl ? (
            <div className="flex gap-2 w-full">
              <label className="flex-1 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors cursor-pointer">
                <PlusCircle size={18} />
                変更
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
              </label>
              <button onClick={() => onSave(null)} disabled={isUploading} className="flex-1 py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                <Trash2 size={18} />
                削除
              </button>
            </div>
          ) : (
            <label className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors cursor-pointer">
              <PlusCircle size={18} />
              新しい画像を選択
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

// --- ログイン画面 ---
function LoginScreen({ onLogin, accountsInfo, onChangePin, isOnline }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [step, setStep] = useState(1);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const isRegistered = (userId) => accountsInfo[userId] && accountsInfo[userId].pin;
  
  const handlePinInput = (num) => { 
    if (pin.length < 4) { setPin(prev => prev + num); setError(''); } 
  };
  const handleBackspace = () => { setPin(prev => prev.slice(0, -1)); setError(''); };
  
  const handleSubmitLogin = async () => {
    if (pin.length !== 4) return;
    const success = await onLogin(selectedUser, pin);
    if (!success) { setError('パスワードが間違っています'); setPin(''); }
  };

  const handleSubmitChangePin = async () => {
     if (pin.length !== 4) return;
     if (step === 2) {
       if (accountsInfo[selectedUser].pin === pin) {
         setCurrentPin(pin);
         setPin('');
         setError('');
         setStep(3); 
       } else {
         setError('現在のパスワードが間違っています');
         setPin('');
       }
     } else if (step === 3) {
       setNewPin(pin);
       setPin('');
       setError('');
       setStep(4);
     } else if (step === 4) {
       if (newPin === pin) {
         const success = await onChangePin(selectedUser, currentPin, newPin);
         if (success) {
           alert("パスワードを変更しました");
           resetChangePinState();
         } else {
           setError('パスワードの変更に失敗しました');
           setPin('');
         }
       } else {
          setError('新しいパスワードが一致しません');
          setPin('');
       }
     }
  };

  useEffect(() => { 
    if (pin.length === 4) {
      if (isChangingPin) {
        handleSubmitChangePin();
      } else {
        handleSubmitLogin(); 
      }
    }
  }, [pin, isChangingPin]);

  const resetChangePinState = () => {
    setIsChangingPin(false);
    setSelectedUser(null);
    setPin('');
    setError('');
    setStep(1);
    setCurrentPin('');
    setNewPin('');
  }

  const OnlineBadge = () => (
    <div className="absolute top-6 left-6 z-10 flex items-center gap-1.5 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
      <span className="text-[10px] font-bold text-slate-500">
        {isOnline ? 'オンライン' : 'オフライン'}
      </span>
    </div>
  );

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
        <OnlineBadge />
        <button 
          onClick={() => setIsChangingPin(true)}
          className={`absolute top-6 right-6 text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${isChangingPin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
        >
          <KeyRound size={16} />
          {isChangingPin ? 'パスワード変更モード' : 'パスワード変更'}
        </button>
        {isChangingPin && (
          <div className="absolute top-16 right-6 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 shadow-sm">
            変更するユーザーを選択してください
          </div>
        )}

        <div className="w-full max-w-sm space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
          <div className="text-center">
            <Activity className="text-emerald-500 w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">ログイン</h1>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <button onClick={() => {setSelectedUser('勇太'); setStep(2);}} className="flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 p-6 rounded-2xl transition-all border border-slate-200 hover:border-emerald-300">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl mb-3 overflow-hidden border border-indigo-200">
                {accountsInfo['勇太']?.photoUrl ? <img src={accountsInfo['勇太'].photoUrl} alt="勇太" className="w-full h-full object-cover" /> : '勇'}
              </div>
              <span className="text-slate-800 font-bold">勇太</span>
            </button>
            <button onClick={() => {setSelectedUser('未来'); setStep(2);}} className="flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 p-6 rounded-2xl transition-all border border-slate-200 hover:border-emerald-300">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-2xl mb-3 overflow-hidden border border-rose-200">
                {accountsInfo['未来']?.photoUrl ? <img src={accountsInfo['未来'].photoUrl} alt="未来" className="w-full h-full object-cover" /> : '未'}
              </div>
              <span className="text-slate-800 font-bold">未来</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  let pinPrompt = isRegistered(selectedUser) ? 'PINコードを入力' : '初回のPINコード(4桁)を設定';
  if (isChangingPin) {
    if (step === 2) pinPrompt = '現在のPINコードを入力';
    else if (step === 3) pinPrompt = '新しいPINコード(4桁)を入力';
    else if (step === 4) pinPrompt = 'もう一度新しいPINコードを入力';
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
      <OnlineBadge />
      <div className="w-full max-w-sm flex flex-col items-center">
        <button onClick={() => isChangingPin ? resetChangePinState() : setSelectedUser(null)} className="text-slate-500 hover:text-slate-800 self-start mb-8 flex items-center gap-2 font-bold">
          &larr; 戻る
        </button>
        <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-800 font-bold text-3xl mb-4 shadow-sm overflow-hidden">
          {accountsInfo[selectedUser]?.photoUrl ? <img src={accountsInfo[selectedUser].photoUrl} alt={selectedUser} className="w-full h-full object-cover" /> : selectedUser.charAt(0)}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedUser} {isChangingPin && <span className="text-sm text-emerald-600 ml-2">(パスワード変更)</span>}</h2>
        <p className="text-slate-500 text-sm mb-8 flex items-center gap-2 font-bold">
          <Lock size={14} />
          {pinPrompt}
        </p>
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-200 ${i < pin.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-200'}`} />
          ))}
        </div>
        {error && <p className="text-rose-500 text-sm mb-4 font-bold">{error}</p>}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handlePinInput(num.toString())} className="h-16 rounded-full bg-white border border-slate-200 text-slate-800 text-2xl font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm">{num}</button>
          ))}
          <div />
          <button onClick={() => handlePinInput('0')} className="h-16 rounded-full bg-white border border-slate-200 text-slate-800 text-2xl font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm">0</button>
          <button onClick={handleBackspace} className="h-16 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 active:bg-slate-100 transition-colors">⌫</button>
        </div>
      </div>
    </div>
  );
}

// --- タイムライン画面 ---
function TimelineView({ posts, onToggleLike, currentUser, onDelete, onEdit, accountsInfo }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const timeStr = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 mb-6">アクティビティ</h2>
      {posts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center mt-10 shadow-sm">
          <Dumbbell className="mx-auto text-slate-300 w-12 h-12 mb-4" />
          <p className="text-slate-500 font-bold">まだ記録がありません。<br/>最初のトレーニングを記録しましょう！</p>
        </div>
      ) : (
        posts.map(post => {
          const isMyPost = post.author === currentUser;
          return (
            <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden relative mb-4">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${isMyPost ? 'bg-slate-300' : 'bg-emerald-400'}`}></div>
              
              <div className="flex justify-between items-start mb-4 pl-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden ${isMyPost ? 'bg-slate-600' : (post.author === '勇太' ? 'bg-indigo-500' : 'bg-rose-500')}`}>
                    {accountsInfo[post.author]?.photoUrl ? (
                      <img src={accountsInfo[post.author].photoUrl} alt={post.author} className="w-full h-full object-cover" />
                    ) : (
                      post.author.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{post.author}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold flex-wrap">
                      <span>{formatTime(post.timestamp)}</span>
                      {post.gymName && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><MapPin size={10}/> {post.gymName}</span>
                        </>
                      )}
                      {post.duration && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><Clock size={10}/> {formatDuration(post.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {isMyPost && (
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(post)} className="text-slate-400 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(post.id)} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* 体重・体脂肪率バッジ */}
              {(post.bodyWeight || post.bodyFat) && (
                <div className="pl-3 mb-3 flex gap-2">
                  <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-100">
                    <Scale size={14} />
                    {post.bodyWeight && `${post.bodyWeight}kg`}
                    {post.bodyWeight && post.bodyFat && ' / '}
                    {post.bodyFat && `${post.bodyFat}%`}
                  </div>
                </div>
              )}

              {/* 総負荷量バッジ */}
              {post.volume > 0 && (
                <div className="pl-3 mb-4">
                  <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200">
                    <Flame size={14} className="text-orange-500" />
                    総負荷量: {post.volume.toLocaleString()}kg
                    <span className="text-slate-400 font-normal">（{getVolumeMetaphor(post.volume)}）</span>
                  </div>
                </div>
              )}

              <div className="pl-3 space-y-3 mb-4">
                {post.items && post.items.map((item, idx) => {
                  const isLR = item.weightType === 'lr';
                  const isPlate = item.weightType === 'plate';
                  
                  return (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell size={14} className="text-emerald-500" />
                        <span className="font-bold text-slate-800 text-sm">{item.exerciseName}</span>
                        {item.category && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">{item.category}</span>}
                        {item.maker && <span className="text-[10px] text-slate-400 font-bold bg-slate-200 px-1.5 py-0.5 rounded">{item.maker}</span>}
                      </div>

                      <div className="space-y-1">
                        {item.sets.map((set, sIdx) => (
                          <div key={sIdx} className="flex justify-between text-sm items-center border-b border-slate-200/50 pb-1 last:border-0">
                            <span className="text-slate-500 font-bold w-10 text-xs">S {sIdx + 1}</span>
                            
                            {isLR ? (
                              <div className="flex-1 flex gap-2">
                                <div className="flex-1 flex justify-center items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50/50 rounded px-1">
                                  <span>L:</span>
                                  <span>{set.lWeight}kg</span>
                                  <span className="text-blue-300">×</span>
                                  <span>{set.lReps}回</span>
                                </div>
                                <div className="flex-1 flex justify-center items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50/50 rounded px-1">
                                  <span>R:</span>
                                  <span>{set.rWeight}kg</span>
                                  <span className="text-rose-300">×</span>
                                  <span>{set.rReps}回</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="font-bold text-slate-700 flex-1 text-center">
                                  {set.weight} 
                                  <span className="text-[10px] font-bold text-slate-400 ml-0.5">
                                    {isPlate ? '枚' : (item.weightType === 'oneSide' ? 'kg(片)' : 'kg')}
                                  </span>
                                </span>
                                <span className="font-bold text-slate-700 w-16 text-right">{set.reps} <span className="text-[10px] font-bold text-slate-400">回</span></span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {item.memo && (
                        <div className="mt-2 text-sm text-slate-600 bg-white p-2 rounded border border-slate-200">
                          <AlignLeft size={12} className="inline mr-1 text-slate-400"/>
                          {item.memo}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 pl-3">
                {isMyPost ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-400">
                    <Heart size={16} className={post.likes > 0 ? "text-rose-400" : ""} fill={post.likes > 0 ? "currentColor" : "none"} />
                    {post.likes > 0 ? 'ナイス！' : 'ナイス待ち'}
                  </div>
                ) : (
                  <button onClick={() => onToggleLike(post.id, post.likes || 0, post.likedByMe)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold ${post.likedByMe ? 'bg-rose-50 text-rose-500 border border-rose-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                    <Heart size={16} fill={post.likedByMe ? "currentColor" : "none"} className={post.likedByMe ? "animate-pulse" : ""} />
                    ナイス！
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// --- 編集モーダル ---
function EditWorkoutModal({ post, gyms, exercises, onClose, onSave }) {
  const [workoutItems, setWorkoutItems] = useState(JSON.parse(JSON.stringify(post.items)));
  const availableExercises = exercises.filter(ex => {
    const gym = gyms.find(g => g.name === post.gymName);
    return gym ? ex.gymId === gym.id : true;
  });

  const addExerciseItem = () => {
    const defaultEx = availableExercises.length > 0 ? availableExercises[0] : { name: '', weightType: 'total', category: 'その他' };
    setWorkoutItems([...workoutItems, { 
      id: Date.now().toString(), 
      exerciseName: defaultEx.name,
      weightType: defaultEx.weightType || 'total',
      category: defaultEx.category || 'その他',
      memo: '',
      sets: [{ id: Date.now().toString() + 's', weight: '', reps: '', lWeight: '', lReps: '', rWeight: '', rReps: '' }] 
    }]);
  };

  const removeExerciseItem = (itemId) => setWorkoutItems(workoutItems.filter(item => item.id !== itemId));
  
  const updateExerciseName = (itemId, newName) => {
     const exData = availableExercises.find(ex => ex.name === newName);
     setWorkoutItems(workoutItems.map(item => item.id === itemId ? { 
       ...item, 
       exerciseName: newName,
       weightType: exData ? (exData.weightType || 'total') : 'total',
       category: exData ? (exData.category || 'その他') : 'その他',
       maker: exData ? exData.maker : ''
     } : item));
  };

  const updateMemo = (itemId, memo) => {
    setWorkoutItems(workoutItems.map(item => item.id === itemId ? { ...item, memo } : item));
  }

  const addSet = (itemId) => {
    setWorkoutItems(workoutItems.map(item => {
      if (item.id === itemId) {
        const lastSet = item.sets[item.sets.length - 1] || { weight: '', reps: '', lWeight: '', lReps: '', rWeight: '', rReps: '' };
        return { ...item, sets: [...item.sets, { id: Date.now().toString(), ...lastSet }] };
      }
      return item;
    }));
  };

  const removeSet = (itemId, setId) => {
    setWorkoutItems(workoutItems.map(item => {
      if (item.id === itemId) return { ...item, sets: item.sets.filter(set => set.id !== setId) };
      return item;
    }));
  };

  const updateSet = (itemId, setId, field, value) => {
    setWorkoutItems(workoutItems.map(item => {
      if (item.id === itemId) {
        return { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) };
      }
      return item;
    }));
  };

  const handleSave = () => {
    const isValid = workoutItems.every(item => {
      if (!item.exerciseName || item.sets.length === 0) return false;
      if (item.weightType === 'lr') {
        return item.sets.every(set => set.lWeight !== '' && set.lReps !== '' && set.rWeight !== '' && set.rReps !== '');
      } else {
        return item.sets.every(set => set.weight !== '' && set.reps !== '');
      }
    });
    if (!isValid || workoutItems.length === 0) {
      alert("種目を選択し、すべての重量と回数を入力してください。");
      return;
    }
    onSave(post.id, workoutItems);
  };

  const getWeightPlaceholder = (type) => {
    switch(type) {
      case 'oneSide': return '片側kg';
      case 'plate': return '枚数';
      case 'total':
      default: return '合計kg';
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-slate-50 rounded-t-3xl flex flex-col h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white pt-safe sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800">記録の編集</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          {workoutItems.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative w-full overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div className="relative flex-1 min-w-0">
                  <select 
                    value={item.exerciseName}
                    onChange={(e) => updateExerciseName(item.id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base pr-8"
                  >
                    <option value="" disabled>種目を選択</option>
                    {availableExercises.map(ex => (
                      <option key={ex.id} value={ex.name}>
                        {ex.name}{ex.maker ? `（${ex.maker}）` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                </div>
                <button onClick={() => removeExerciseItem(item.id)} className="ml-2 text-slate-400 hover:text-rose-500 p-2 flex-shrink-0 bg-slate-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* セット入力 */}
              <div className="space-y-2 mb-3 w-full">
                <div className="flex text-xs text-slate-500 font-bold px-1">
                  <div className="w-8 text-center">Set</div>
                  {item.weightType === 'lr' ? (
                    <div className="flex-1 flex justify-between gap-2 px-1">
                      <span className="w-1/2 text-center text-[10px] text-blue-500">左 (kg/回)</span>
                      <span className="w-1/2 text-center text-[10px] text-rose-500">右 (kg/回)</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 text-center">{getWeightPlaceholder(item.weightType)}</div>
                      <div className="flex-1 text-center">Reps</div>
                    </>
                  )}
                  <div className="w-6"></div>
                </div>
                
                {item.sets.map((set, sIndex) => (
                  <div key={set.id} className="flex items-center gap-1.5">
                    <div className="w-8 text-center text-slate-400 font-bold text-sm">
                      {sIndex + 1}
                    </div>
                    {item.weightType === 'lr' ? (
                      <div className="flex flex-1 gap-1.5">
                        <div className="flex flex-1 items-center gap-0.5 border border-blue-200 bg-blue-50 rounded p-1">
                          <input type="number" value={set.lWeight} onChange={(e) => updateSet(item.id, set.id, 'lWeight', e.target.value)} placeholder="0" className="w-full text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none" style={{ fontSize: '16px' }}/>
                          <span className="text-[10px] text-blue-300">×</span>
                          <input type="number" value={set.lReps} onChange={(e) => updateSet(item.id, set.id, 'lReps', e.target.value)} placeholder="0" className="w-full text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none" style={{ fontSize: '16px' }}/>
                        </div>
                        <div className="flex flex-1 items-center gap-0.5 border border-rose-200 bg-rose-50 rounded p-1">
                          <input type="number" value={set.rWeight} onChange={(e) => updateSet(item.id, set.id, 'rWeight', e.target.value)} placeholder="0" className="w-full text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none" style={{ fontSize: '16px' }}/>
                          <span className="text-[10px] text-rose-300">×</span>
                          <input type="number" value={set.rReps} onChange={(e) => updateSet(item.id, set.id, 'rReps', e.target.value)} placeholder="0" className="w-full text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none" style={{ fontSize: '16px' }}/>
                        </div>
                      </div>
                    ) : (
                      <>
                        <input type="number" value={set.weight} onChange={(e) => updateSet(item.id, set.id, 'weight', e.target.value)} placeholder="0" className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg py-2 px-1 text-center text-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
                        <input type="number" value={set.reps} onChange={(e) => updateSet(item.id, set.id, 'reps', e.target.value)} placeholder="0" className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg py-2 px-1 text-center text-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
                      </>
                    )}
                    <button onClick={() => removeSet(item.id, set.id)} disabled={item.sets.length === 1} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 disabled:opacity-30 flex justify-center">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <textarea
                  value={item.memo || ''}
                  onChange={(e) => updateMemo(item.id, e.target.value)}
                  placeholder="種目ごとのメモ（オプション）"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-base text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
                  style={{ fontSize: '16px' }}
                  rows={2}
                />
              </div>

              <button onClick={() => addSet(item.id)} className="w-full py-2.5 border border-dashed border-slate-300 text-slate-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors mt-2 bg-white">
                <Plus size={16} /> セットを追加
              </button>
            </div>
          ))}

          <button onClick={addExerciseItem} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors border border-slate-200">
            <ListPlus size={18} /> 次の種目を追加
          </button>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 pb-safe">
          <button 
            onClick={handleSave}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-md transition-all shadow-emerald-500/30"
          >
            変更を保存
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 記録入力画面 ---
function RecordView({ onStart, onPost, onCancel, myInfo, gyms, exercises, workoutItems, setWorkoutItems }) {
  const [selectedGymId, setSelectedGymId] = useState(myInfo.currentGymId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExerciseManager, setShowExerciseManager] = useState(false);
  
  // カテゴリ絞り込み
  const [selectedCategories, setSelectedCategories] = useState([]);

  // 体重・体脂肪率
  const [bodyWeight, setBodyWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const isTraining = myInfo.isTraining;
  
  // 絞り込み適用済みの種目リスト
  const availableExercises = exercises.filter(ex => {
    if (ex.gymId !== selectedGymId) return false;
    if (selectedCategories.length === 0) return true; // 未選択なら全て表示
    return selectedCategories.includes(ex.category || 'その他');
  });

  const handleStart = () => {
    if (!selectedGymId) {
      alert("ジムを選択してください");
      return;
    }
    onStart(selectedGymId);
    if (workoutItems.length === 0 && availableExercises.length > 0) {
       const firstEx = availableExercises[0];
       setWorkoutItems([{ 
         id: Date.now().toString(), 
         exerciseName: firstEx.name, 
         weightType: firstEx.weightType || 'total',
         category: firstEx.category || 'その他',
         memo: '',
         sets: [{ id: Date.now().toString() + 's', weight: '', reps: '', lWeight: '', lReps: '', rWeight: '', rReps: '' }] 
       }]);
    }
  };

  const addExerciseItem = (defaultName = '') => {
    const defaultEx = availableExercises.find(ex => ex.name === defaultName) || (availableExercises.length > 0 ? availableExercises[0] : null);
    
    if (defaultEx) {
      setWorkoutItems([...workoutItems, { 
        id: Date.now().toString(), 
        exerciseName: defaultEx.name, 
        weightType: defaultEx.weightType || 'total',
        category: defaultEx.category || 'その他',
        memo: '',
        sets: [{ id: Date.now().toString() + 's', weight: '', reps: '', lWeight: '', lReps: '', rWeight: '', rReps: '' }] 
      }]);
    } else {
      setWorkoutItems([...workoutItems, { 
        id: Date.now().toString(), 
        exerciseName: '', 
        weightType: 'total',
        category: 'その他',
        memo: '',
        sets: [{ id: Date.now().toString() + 's', weight: '', reps: '', lWeight: '', lReps: '', rWeight: '', rReps: '' }] 
      }]);
    }
  };

  const removeExerciseItem = (itemId) => setWorkoutItems(workoutItems.filter(item => item.id !== itemId));
  
  const updateExerciseName = (itemId, newName) => {
    const exData = availableExercises.find(ex => ex.name === newName);
    setWorkoutItems(workoutItems.map(item => item.id === itemId ? { 
      ...item, 
      exerciseName: newName,
      weightType: exData ? (exData.weightType || 'total') : 'total',
      category: exData ? (exData.category || 'その他') : 'その他'
    } : item));
  };

  const updateMemo = (itemId, memo) => {
    setWorkoutItems(workoutItems.map(item => item.id === itemId ? { ...item, memo } : item));
  }

  const addSet = (itemId) => {
    setWorkoutItems(workoutItems.map(item => {
      if (item.id === itemId) {
        const lastSet = item.sets[item.sets.length - 1] || { weight: '', reps: '', lWeight: '', lReps: '', rWeight: '', rReps: '' };
        return { ...item, sets: [...item.sets, { id: Date.now().toString(), ...lastSet }] };
      }
      return item;
    }));
  };

  const removeSet = (itemId, setId) => {
    setWorkoutItems(workoutItems.map(item => {
      if (item.id === itemId) return { ...item, sets: item.sets.filter(set => set.id !== setId) };
      return item;
    }));
  };

  const updateSet = (itemId, setId, field, value) => {
    setWorkoutItems(workoutItems.map(item => {
      if (item.id === itemId) {
        return { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) };
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    const isValid = workoutItems.every(item => {
      if (!item.exerciseName || item.sets.length === 0) return false;
      if (item.weightType === 'lr') {
        return item.sets.every(set => set.lWeight !== '' && set.lReps !== '' && set.rWeight !== '' && set.rReps !== '');
      } else {
        return item.sets.every(set => set.weight !== '' && set.reps !== '');
      }
    });
    if (!isValid || workoutItems.length === 0) {
      alert("種目を選択し、すべての重量と回数を入力してください。");
      return;
    }
    setIsSubmitting(true);
    const gym = gyms.find(g => g.id === selectedGymId);
    const enrichedItems = workoutItems.map(item => {
      const exData = exercises.find(ex => ex.gymId === selectedGymId && ex.name === item.exerciseName);
      return { 
        ...item, 
        maker: exData ? exData.maker : '',
        weightType: exData ? (exData.weightType || 'total') : 'total',
        category: exData ? (exData.category || 'その他') : 'その他'
      };
    });
    await onPost(gym ? gym.name : '不明なジム', enrichedItems, Number(bodyWeight), Number(bodyFat));
    setBodyWeight('');
    setBodyFat('');
    setIsSubmitting(false);
  };

  const getWeightPlaceholder = (type) => {
    switch(type) {
      case 'oneSide': return '片側kg';
      case 'plate': return '枚数';
      case 'total':
      default: return '合計kg';
    }
  }

  const toggleCategory = (cat) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  if (showExerciseManager) {
    return <ExerciseManager onClose={() => setShowExerciseManager(false)} gyms={gyms} exercises={exercises} />;
  }

  if (!isTraining) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-slate-900">ワークアウトを開始</h2>
          <button onClick={() => setShowExerciseManager(true)} className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors font-bold border border-emerald-200">
            <Settings size={14} /> 種目管理
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <MapPin size={28} className="text-slate-400" />
          </div>
          <label className="block text-sm font-bold text-slate-700 mb-3 text-center">
            本日のトレーニング場所を選択してください
          </label>
          <div className="w-full relative mb-6">
            <select 
              value={selectedGymId}
              onChange={(e) => setSelectedGymId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold appearance-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-base"
              style={{ fontSize: '16px' }}
            >
              <option value="" disabled>ジムを選択</option>
              {gyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
          </div>
          <button 
            onClick={handleStart}
            disabled={!selectedGymId}
            className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md ${selectedGymId ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
          >
            <Play fill="currentColor" size={20} /> トレーニング開始
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 rounded-2xl p-4 shadow-lg text-white flex justify-between items-center sticky top-20 z-10">
        <div>
          <div className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1">
            <MapPin size={12}/> {gyms.find(g => g.id === selectedGymId)?.name || 'トレーニング中'}
          </div>
          <div className="text-2xl text-emerald-400 flex items-center gap-2">
            <Clock size={20} className={!isSubmitting ? "animate-pulse" : ""} />
            <TimerDisplay startTime={myInfo.trainingStartTime} isStopped={isSubmitting} />
          </div>
          <div className="text-xs text-slate-400 font-bold mt-1">
            {formatTimeFromTimestamp(myInfo.trainingStartTime)} から開始
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 mb-2">
        <h2 className="text-lg font-bold text-slate-900">ワークアウト中</h2>
        <button onClick={() => setShowExerciseManager(true)} className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors font-bold border border-emerald-200">
          <Settings size={14} /> 種目管理
        </button>
      </div>

      {/* カテゴリ絞り込みボタン群 */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {MUSCLE_CATEGORIES.map(cat => {
          const isSelected = selectedCategories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isSelected ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {availableExercises.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
          <p className="text-slate-500 mb-4 text-sm font-bold">該当する種目がありません。</p>
          <button onClick={() => setShowExerciseManager(true)} className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors">
            種目を追加する
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {workoutItems.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative w-full overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div className="relative flex-1 min-w-0">
                  <select 
                    value={item.exerciseName}
                    onChange={(e) => updateExerciseName(item.id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base pr-8"
                    style={{ fontSize: '16px' }}
                  >
                    <option value="" disabled>種目を選択</option>
                    {availableExercises.map(ex => (
                      <option key={ex.id} value={ex.name}>
                        {ex.name}{ex.maker ? `（${ex.maker}）` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                </div>
                <button onClick={() => removeExerciseItem(item.id)} className="ml-2 text-slate-400 hover:text-rose-500 p-2 flex-shrink-0 bg-slate-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* セット入力 */}
              <div className="space-y-2 mb-3 w-full">
                <div className="flex text-xs text-slate-500 font-bold px-1">
                  <div className="w-8 text-center">Set</div>
                  {item.weightType === 'lr' ? (
                    <div className="flex-1 flex justify-between gap-2 px-1">
                      <span className="w-1/2 text-center text-[10px] text-blue-500">左 (kg/回)</span>
                      <span className="w-1/2 text-center text-[10px] text-rose-500">右 (kg/回)</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 text-center">{getWeightPlaceholder(item.weightType)}</div>
                      <div className="flex-1 text-center">Reps</div>
                    </>
                  )}
                  <div className="w-6"></div>
                </div>
                
                {item.sets.map((set, sIndex) => (
                  <div key={set.id} className="flex items-center gap-1.5">
                    <div className="w-8 text-center text-slate-400 font-bold text-sm">
                      {sIndex + 1}
                    </div>
                    {item.weightType === 'lr' ? (
                      <div className="flex flex-1 gap-1.5">
                        <div className="flex flex-1 items-center gap-0.5 border border-blue-200 bg-blue-50 rounded p-1">
                          <input type="number" value={set.lWeight} onChange={(e) => updateSet(item.id, set.id, 'lWeight', e.target.value)} placeholder="0" className="w-full text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none" style={{ fontSize: '16px' }}/>
                          <span className="text-[10px] text-blue-300">×</span>
                          <input type="number" value={set.lReps} onChange={(e) => updateSet(item.id, set.id, 'lReps', e.target.value)} placeholder="0" className="w-full text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none" style={{ fontSize: '16px' }}/>
                        </div>
                        <div className="flex flex-1 items-center gap-0.5 border border-rose-200 bg-rose-50 rounded p-1">
                          <input type="number" value={set.rWeight} onChange={(e) => updateSet(item.id, set.id, 'rWeight', e.target.value)} placeholder="0" className="w-full text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none" style={{ fontSize: '16px' }}/>
                          <span className="text-[10px] text-rose-300">×</span>
                          <input type="number" value={set.rReps} onChange={(e) => updateSet(item.id, set.id, 'rReps', e.target.value)} placeholder="0" className="w-full text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none" style={{ fontSize: '16px' }}/>
                        </div>
                      </div>
                    ) : (
                      <>
                        <input type="number" value={set.weight} onChange={(e) => updateSet(item.id, set.id, 'weight', e.target.value)} placeholder="0" className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg py-2 px-1 text-center text-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
                        <input type="number" value={set.reps} onChange={(e) => updateSet(item.id, set.id, 'reps', e.target.value)} placeholder="0" className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg py-2 px-1 text-center text-slate-800 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
                      </>
                    )}
                    <button onClick={() => removeSet(item.id, set.id)} disabled={item.sets.length === 1} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 disabled:opacity-30 flex justify-center">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <textarea
                  value={item.memo || ''}
                  onChange={(e) => updateMemo(item.id, e.target.value)}
                  placeholder="種目ごとのメモ（オプション）"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-base text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
                  style={{ fontSize: '16px' }}
                  rows={2}
                />
              </div>

              <button onClick={() => addSet(item.id)} className="w-full py-2.5 border border-dashed border-slate-300 text-slate-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors mt-2 bg-white">
                <Plus size={16} /> セットを追加
              </button>
            </div>
          ))}

          <button onClick={() => addExerciseItem()} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors border border-slate-200">
            <ListPlus size={18} /> 次の種目を追加
          </button>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mt-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Scale size={16} /> 本日の体組成（任意）
            </h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input type="number" step="0.1" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="体重" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
              </div>
              <div className="flex-1 relative">
                <input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="体脂肪率" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || workoutItems.length === 0}
            className={`w-full text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 mt-6 mb-8 transition-all ${
              isSubmitting || workoutItems.length === 0 ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
            }`}
          >
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : <><Flame size={20} /> トレーニングを完了して保存</>}
          </button>
          
          <button 
             onClick={onCancel} 
             className="w-full text-slate-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2 mb-8 transition-all bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
          >
             記録を破棄して終了
          </button>
        </div>
      )}
    </div>
  );
}

// --- 種目管理モーダル ---
function ExerciseManager({ onClose, gyms, exercises }) {
  const [activeTab, setActiveTab] = useState('gyms');
  const [newGymName, setNewGymName] = useState('');
  const [selectedGymId, setSelectedGymId] = useState(gyms.length > 0 ? gyms[0].id : '');
  const [newExName, setNewExName] = useState('');
  const [newExMaker, setNewExMaker] = useState('');
  const [newExWeightType, setNewExWeightType] = useState('total'); // total, oneSide, plate, lr
  const [newExCategory, setNewExCategory] = useState('胸');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddGym = async (e) => {
    e.preventDefault();
    if (!newGymName.trim()) return;
    setIsAdding(true);
    const newDocId = `gym_${Date.now()}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'gyms', newDocId);
    try {
      await setDoc(docRef, { name: newGymName.trim(), createdAt: Date.now() });
      setNewGymName('');
      if (gyms.length === 0) setSelectedGymId(newDocId);
    } catch (error) {}
    setIsAdding(false);
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!newExName.trim() || !selectedGymId) return;
    setIsAdding(true);
    const newDocId = `ex_${Date.now()}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'exercises', newDocId);
    try {
      await setDoc(docRef, { 
        name: newExName.trim(), 
        maker: newExMaker.trim(), 
        gymId: selectedGymId, 
        weightType: newExWeightType,
        category: newExCategory,
        createdAt: Date.now() 
      });
      setNewExName('');
      setNewExMaker('');
      setNewExWeightType('total');
      setNewExCategory('胸');
    } catch (error) {}
    setIsAdding(false);
  };

  const handleDelete = async (collectionName, id) => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, id);
    try { await deleteDoc(docRef); } catch (error) {}
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col animate-in fade-in duration-200">
      <div className="flex-1 mt-10 bg-slate-50 rounded-t-3xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white pt-safe">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={18} className="text-emerald-500" /> 管理画面</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex border-b border-slate-200 bg-white">
          <button onClick={() => setActiveTab('gyms')} className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'gyms' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>1. ジムの登録</button>
          <button onClick={() => setActiveTab('exercises')} className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'exercises' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>2. 種目の登録</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {activeTab === 'gyms' && (
            <div className="space-y-6">
              <form onSubmit={handleAddGym} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-3">新しいジムを登録</h3>
                <div className="flex gap-2">
                  <input type="text" value={newGymName} onChange={e => setNewGymName(e.target.value)} required placeholder="例: エニタイム新宿" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
                  <button type="submit" disabled={isAdding || !newGymName.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 rounded-xl transition-colors disabled:opacity-50">追加</button>
                </div>
              </form>
              <div>
                <h3 className="text-sm font-bold text-slate-500 mb-3 ml-1">登録済みのジム</h3>
                <div className="space-y-2">
                  {gyms.map(gym => (
                    <div key={gym.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                      <span className="font-bold text-slate-700 text-sm">{gym.name}</span>
                      <button onClick={() => { if(window.confirm(`${gym.name}を削除しますか？`)) handleDelete('gyms', gym.id); }} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exercises' && (
            <div className="space-y-6">
              {gyms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm mb-4 font-bold">先に「ジムの登録」タブでジムを追加してください。</p>
                  <button onClick={() => setActiveTab('gyms')} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold">ジムを登録する</button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleAddExercise} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">新しい種目を登録</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">対象のジム <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select value={selectedGymId} onChange={e => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                            {gyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">部位カテゴリ <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select value={newExCategory} onChange={e => setNewExCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                            {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">種目名 <span className="text-rose-500">*</span></label>
                        <input type="text" value={newExName} onChange={e => setNewExName(e.target.value)} required placeholder="例: ベンチプレス" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">メーカー (任意)</label>
                        <input type="text" value={newExMaker} onChange={e => setNewExMaker(e.target.value)} placeholder="例: Hammer Strength" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">重さの単位/計算方法 <span className="text-rose-500">*</span></label>
                         <div className="grid grid-cols-2 gap-2">
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${newExWeightType === 'total' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                               <input type="radio" name="weightType" value="total" checked={newExWeightType === 'total'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>
                               合計 (kg)
                            </label>
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${newExWeightType === 'oneSide' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                               <input type="radio" name="weightType" value="oneSide" checked={newExWeightType === 'oneSide'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>
                               片側 (kg)
                            </label>
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${newExWeightType === 'plate' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                               <input type="radio" name="weightType" value="plate" checked={newExWeightType === 'plate'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>
                               プレート (枚)
                            </label>
                            <label className={`text-center py-2 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${newExWeightType === 'lr' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                               <input type="radio" name="weightType" value="lr" checked={newExWeightType === 'lr'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>
                               左右別 (独立枠)
                            </label>
                         </div>
                      </div>
                      <button type="submit" disabled={isAdding || !newExName.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-3 rounded-xl mt-2 transition-colors disabled:opacity-50">
                        {isAdding ? '保存中...' : 'リストに追加'}
                      </button>
                    </div>
                  </form>
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 mb-3 ml-1">登録済みの種目</h3>
                    <div className="space-y-4">
                      {gyms.map(gym => {
                        const gymExercises = exercises.filter(ex => ex.gymId === gym.id);
                        if (gymExercises.length === 0) return null;
                        return (
                          <div key={gym.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-bold text-slate-700 text-sm flex items-center gap-1">
                              <MapPin size={14} className="text-emerald-500"/> {gym.name}
                            </div>
                            <div className="divide-y divide-slate-100">
                              {gymExercises.map(ex => (
                                <div key={ex.id} className="p-3 flex justify-between items-center">
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                      {ex.name}
                                      {ex.category && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">{ex.category}</span>}
                                    </p>
                                    <div className="flex gap-2 mt-1">
                                      {ex.maker && <span className="text-xs text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{ex.maker}</span>}
                                      {ex.weightType && <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                        {ex.weightType === 'oneSide' ? '片側(kg)' : ex.weightType === 'plate' ? 'プレート(枚)' : ex.weightType === 'lr' ? '左右別' : '合計(kg)'}
                                      </span>}
                                    </div>
                                  </div>
                                  <button onClick={() => { if(window.confirm(`${ex.name}を削除しますか？`)) handleDelete('exercises', ex.id); }} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- パートナー画面 ---
function FriendsView({ partnerName, partnerInfo }) {
  const isTraining = partnerInfo?.isTraining;
  const lastActive = partnerInfo?.lastActive || 0;
  
  const isOnline = !isTraining && (Date.now() - lastActive < 300000);

  let cardGradient = 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20'; 
  let iconBorder = 'border-slate-300';
  let badgeColor = 'bg-slate-400';
  
  if (isTraining) {
    cardGradient = 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/20';
    iconBorder = 'border-orange-400';
    badgeColor = 'bg-orange-400';
  } else if (isOnline) {
    cardGradient = 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20';
    iconBorder = 'border-emerald-400';
    badgeColor = 'bg-emerald-400';
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">パートナー</h2>
      <div className={`rounded-3xl p-6 relative overflow-hidden shadow-lg w-full text-white transition-colors duration-500 ${cardGradient}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="flex flex-col items-center justify-center text-center relative z-10 py-4">
          <div className="relative mb-4">
            <div className={`w-24 h-24 rounded-full bg-white border-4 ${iconBorder} shadow-xl flex items-center justify-center text-3xl font-bold overflow-hidden`}>
              {partnerInfo?.photoUrl ? (
                <img src={partnerInfo.photoUrl} alt={partnerName} className="w-full h-full object-cover" />
              ) : (
                <span className={partnerName === '勇太' ? 'text-indigo-600' : 'text-rose-500'}>{partnerName.charAt(0)}</span>
              )}
            </div>
            <div className={`absolute bottom-0 right-0 w-6 h-6 border-4 border-white rounded-full ${badgeColor} z-20`}></div>
          </div>
          <p className="font-bold text-2xl mb-1">{partnerName}</p>
          
          {isTraining ? (
            <div className="mt-2 inline-flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm">
              <Flame size={16} className="text-amber-300 animate-pulse" />
              トレーニング中
              <TimerDisplay startTime={partnerInfo.trainingStartTime} />
            </div>
          ) : isOnline ? (
            <div className="mt-2 inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm">
              <Circle fill="currentColor" size={10} className="text-emerald-300 animate-pulse" />
              オンライン
            </div>
          ) : (
            <div className="mt-2 inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm text-slate-200">
              <Circle fill="currentColor" size={10} className="text-slate-300" />
              オフライン
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-4 shadow-sm">
        <h3 className="text-slate-700 font-bold mb-3 text-sm">システムステータス</h3>
        <ul className="space-y-3 text-sm font-bold">
          <li className="flex items-center justify-between">
            <span className="text-slate-500">ネットワーク接続</span>
            <span className="text-slate-700 flex items-center gap-1">
              {typeof navigator !== 'undefined' && navigator.onLine ? (
                <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md"><Activity size={14}/> 良好</span>
              ) : (
                <span className="text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md"><X size={14}/> オフライン</span>
              )}
            </span>
          </li>
          <li className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-slate-500">データ保存先</span>
            <a 
              href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/data`} 
              target="_blank" 
              rel="noreferrer" 
              className="text-emerald-600 hover:text-emerald-700 text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2 py-1 rounded-md transition-colors"
            >
              Firestore データを確認
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

// --- ナビゲーションボタン ---
function NavButton({ icon, label, isActive, onClick, isPrimary, isTraining }) {
  if (isPrimary) {
    return (
      <button onClick={onClick} className="flex flex-col items-center justify-center -mt-8 relative group">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 text-white ${
          isTraining ? 'bg-amber-500 shadow-amber-500/40 scale-110' :
          isActive ? 'bg-emerald-500 shadow-emerald-500/40 scale-110' : 'bg-slate-800 border-4 border-white group-hover:bg-slate-700'
        }`}>
          <div>{icon}</div>
        </div>
        <span className={`text-[10px] mt-1 font-bold transition-colors ${
          isTraining ? 'text-amber-500' :
          isActive ? 'text-emerald-600' : 'text-slate-500'
        }`}>{label}</span>
      </button>
    );
  }
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${isActive ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}>
      <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}