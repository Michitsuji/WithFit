import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Heart, Home, PlusCircle, Users, Dumbbell, LogOut, Activity, Flame, Lock, Settings, Trash2, Plus, X, ListPlus, MapPin, Clock, Play, Circle, Edit2, KeyRound, AlignLeft, Scale, Calendar as CalendarIcon, Zap, TrendingDown, Copy, Moon, Sun, Target, Trophy, ArrowUp, ArrowDown, Award, Droplet, Sparkles, GripVertical, UserPlus, EyeOff, Bell } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence, getDoc, deleteField, limit, query, orderBy } from 'firebase/firestore';

// --- カスタムアイコン ---
const WithFitLogo = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="7" cy="12" r="3" />
    <circle cx="17" cy="12" r="3" />
    <line x1="10" y1="12" x2="14" y2="12" />
    <path d="M4 12a8 8 0 0 1 16 0" strokeOpacity="0.5" />
  </svg>
);

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

const MUSCLE_CATEGORIES = ['胸', '背中', '肩', '腕', '脚', '腹筋', 'その他', '有酸素'];

// --- カラーユーティリティ ---
const getCategoryColor = (category) => {
  switch (category) {
    case '胸': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900';
    case '背中': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900';
    case '肩': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
    case '腕': return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-900';
    case '脚': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900';
    case '腹筋': return 'bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-400 border border-lime-200 dark:border-lime-900';
    case '有酸素': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
  }
};

const getCategoryTabColor = (category, isSelected) => {
  if (!isSelected) return 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800';
  switch (category) {
    case '胸': return 'bg-rose-500 text-white border-rose-500 shadow-sm';
    case '背中': return 'bg-blue-500 text-white border-blue-500 shadow-sm';
    case '肩': return 'bg-amber-500 text-white border-amber-500 shadow-sm';
    case '腕': return 'bg-purple-500 text-white border-purple-500 shadow-sm';
    case '脚': return 'bg-emerald-500 text-white border-emerald-500 shadow-sm';
    case '腹筋': return 'bg-lime-500 text-white border-lime-500 shadow-sm';
    case '有酸素': return 'bg-cyan-500 text-white border-cyan-500 shadow-sm';
    default: return 'bg-slate-600 text-white border-slate-600 shadow-sm';
  }
}

// --- 計算ユーティリティ ---
const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);
const generateFriendCode = () => Math.floor(10000 + Math.random() * 90000).toString();

const getRelativeTime = (timestamp) => {
  const diff = Math.max(0, Date.now() - timestamp);
  const m = Math.floor(diff / 60000);
  if (m === 0) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
};

const getAge = (birthDateStr) => {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const getBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return 0;
  if (gender === 'female') return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161);
  return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
};

const getFFMI = (weight, fat, height) => {
  if (!weight || !fat || !height) return 0;
  const leanWeight = weight * (1 - (fat / 100));
  const heightM = height / 100;
  const ffmi = leanWeight / (heightM * heightM);
  return ffmi + 6.1 * (1.8 - heightM);
};

const getFFMIEval = (ffmi, gender) => {
  if (gender === 'female') {
      if (ffmi < 14) return '低め';
      if (ffmi < 16) return '平均的';
      if (ffmi < 18) return '優秀';
      if (ffmi < 21) return '非常に優秀';
      return '限界レベル';
  } else {
      if (ffmi < 18) return '低め';
      if (ffmi < 20) return '平均的';
      if (ffmi < 22) return '優秀';
      if (ffmi < 25) return '非常に優秀';
      return '限界レベル';
  }
};

function TimerDisplay({ startTime, isStopped = false }) {
  const [elapsed, setElapsed] = useState(startTime ? Math.max(0, Date.now() - startTime) : 0);
  useEffect(() => {
    if (!startTime) { setElapsed(0); return; }
    if (isStopped) return;
    setElapsed(Math.max(0, Date.now() - startTime));
    const interval = setInterval(() => setElapsed(Math.max(0, Date.now() - startTime)), 1000);
    return () => clearInterval(interval);
  }, [startTime, isStopped]);
  
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return <span className="font-mono font-bold tracking-wider">{hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>;
}

const formatDuration = (ms) => {
  if (!ms) return '';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}時間 ${minutes}分`;
  return minutes > 0 ? `${minutes}分` : '< 1分';
};

const formatTimeFromTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatDateFromTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateWithDay = (timestampOrDateStr) => {
  if (!timestampOrDateStr) return '';
  const date = new Date(timestampOrDateStr);
  if (isNaN(date.getTime())) return '';
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
};

const formatShortDateTime = (timestamp) => {
  if (!timestamp || isNaN(new Date(timestamp).getTime())) return '';
  const date = new Date(timestamp);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]}) ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const calcSetVolume = (set, wType, userWeight) => {
  if (wType === 'cardio') return 0;
  let v = 0;
  const w = Number(set.weight) || 0;
  const l = Number(set.lReps) || 0;
  const rR = Number(set.rReps) || 0;
  const r = Number(set.reps) || Math.max(l, rR);
  const f = Number(set.forcedReps) || 0;

  if (wType === 'lr') {
    v += w * (l + rR + f * 2); 
  } else if (wType === 'oneSide') {
    v += w * (r + f) * 2;
  } else if (wType === 'plate') {
    v += w * (r + f) * 20; 
  } else if (wType === 'bodyWeight') {
    const effectiveWeight = (Number(userWeight) || 0) + w;
    if (effectiveWeight > 0) v += effectiveWeight * (r + f);
  } else {
    v += w * (r + f);
  }
  return v;
};

const calculateWorkoutTotals = (items, durationMs, bodyWeight) => {
  let totalVolume = 0;
  let cardioKcal = 0;
  let cardioTimeMin = 0;
  const baseWeight = Number(bodyWeight) || 60;

  let effectiveDuration = durationMs;
  if (!effectiveDuration || isNaN(effectiveDuration) || effectiveDuration <= 0) {
     let totalSets = 0;
     (items || []).forEach(i => totalSets += (i.sets?.length || 0));
     effectiveDuration = totalSets * 3 * 60000;
  }

  const processedItems = (items || []).map(item => {
    let itemVolume = 0;
    if (item.sets && Array.isArray(item.sets)) {
      item.sets.forEach(set => {
        if (item.category === '有酸素' || item.weightType === 'cardio') {
          cardioKcal += Number(set.calories) || 0;
          cardioTimeMin += Number(set.time) || 0;
        } else {
          itemVolume += calcSetVolume(set, item.weightType, baseWeight);
          if (item.isSuperSet) { 
            if (item.superExerciseName) itemVolume += calcSetVolume({weight: set.superWeight, reps: set.superReps, lReps: set.superLReps, rReps: set.superRReps, forcedReps: set.superForcedReps}, item.superWeightType, baseWeight); 
            if (item.superExerciseName3) itemVolume += calcSetVolume({weight: set.superWeight3, reps: set.superReps3, lReps: set.superLReps3, rReps: set.superRReps3, forcedReps: set.superForcedReps3}, item.superWeightType3, baseWeight); 
          }
          if (item.isDropSet) { 
            if (set.dropSets) {
              set.dropSets.forEach(ds => { 
                itemVolume += calcSetVolume(ds, item.weightType, baseWeight); 
                if (item.isSuperSet && !set.superDropSets && item.superExerciseName && ds.superWeight !== undefined) {
                   itemVolume += calcSetVolume({weight: ds.superWeight, reps: ds.superReps, lReps: ds.superLReps, rReps: ds.superRReps, forcedReps: ds.superForcedReps}, item.superWeightType, baseWeight); 
                }
                if (item.isSuperSet && !set.superDropSets3 && item.superExerciseName3 && ds.superWeight3 !== undefined) {
                   itemVolume += calcSetVolume({weight: ds.superWeight3, reps: ds.superReps3, lReps: ds.superLReps3, rReps: ds.superRReps3, forcedReps: ds.superForcedReps3}, item.superWeightType3, baseWeight); 
                }
              }); 
            }
            if (item.isSuperSet && item.superExerciseName && set.superDropSets) {
              set.superDropSets.forEach(ds => {
                itemVolume += calcSetVolume({weight: ds.superWeight, reps: ds.superReps, lReps: ds.superLReps, rReps: ds.superRReps, forcedReps: ds.superForcedReps}, item.superWeightType, baseWeight);
              });
            }
            if (item.isSuperSet && item.superExerciseName3 && set.superDropSets3) {
              set.superDropSets3.forEach(ds => {
                itemVolume += calcSetVolume({weight: ds.superWeight3, reps: ds.superReps3, lReps: ds.superLReps3, rReps: ds.superRReps3, forcedReps: ds.superForcedReps3}, item.superWeightType3, baseWeight);
              });
            }
          }
        }
      });
    }
    return { ...item, itemVolume };
  });

  processedItems.forEach(i => { totalVolume += (i.itemVolume || 0); });

  const weightliftingMs = Math.max(0, effectiveDuration - (cardioTimeMin * 60000));
  const weightliftingHrs = weightliftingMs / 3600000;
  const weightKcal = 6.0 * baseWeight * weightliftingHrs * 1.05;
  const totalCalories = Math.round(cardioKcal + weightKcal);

  return { processedItems, totalVolume, totalCalories };
};

const getVolumeMetaphor = (kg) => {
  if (!kg || isNaN(kg) || kg <= 0) return '';
  if (kg < 500) return `原付バイク約${(kg / 100).toFixed(1)}台分`;
  if (kg < 2000) return `軽自動車約${(kg / 1000).toFixed(1)}台分`;
  if (kg < 5000) return `サイ約${(kg / 2000).toFixed(1)}頭分`;
  if (kg < 10000) return `アフリカゾウ約${(kg / 6000).toFixed(1)}頭分`;
  if (kg < 50000) return `中型トラック約${(kg / 8000).toFixed(1)}台分`;
  return `大型トレーラー級！`;
};

// --- グラフコンポーネント ---
function SimpleChart({ data, color, title }) {
  if (!data || data.length === 0) return (
    <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 w-full flex items-center gap-2"><Activity size={16} className="text-slate-400"/> {title}</h4>
      <p className="text-sm font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl text-center border border-slate-100 dark:border-slate-800 w-full">データがありません</p>
    </div>
  );
  const values = data.map(d => d.value).filter(v => !isNaN(v));
  if (values.length === 0) return null;
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values) * 1.02;
  const range = max - min === 0 ? 1 : max - min;
  const width = 300, height = 100;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((d.value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2"><Activity size={16} className="text-slate-400"/> {title}</h4>
      <div className="relative h-40 w-full pt-4 pl-2 pr-2">
        <svg viewBox={`-10 -20 ${width + 20} ${height + 60}`} className="w-full h-full overflow-visible">
          <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * width;
            const y = height - ((d.value - min) / range) * height;
            const dateStr = d.date ? d.date.slice(5, 10).replace('-', '/') : '';
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="currentColor" className="text-white dark:text-slate-900" stroke={color} strokeWidth="2.5" />
                <text x={x} y={y - 12} fontSize="12" fill={color} textAnchor="middle" className="font-bold tracking-tighter">{d.value}</text>
                {dateStr && <text x={x} y={height + 25} fontSize="10" fill="currentColor" textAnchor="middle" className="font-bold text-slate-400 dark:text-slate-500">{dateStr}</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// --- 共通コンポーネント：ワークアウトカード ---
function WorkoutCard({ post, currentUser, accountsInfo, onEdit, onDelete, onToggleLike, onImport }) {
  const [showImportOptions, setShowImportOptions] = useState(false);
  const isMyPost = post.author === currentUser;
  const authorInfo = accountsInfo && accountsInfo[post.author];
  const hideMetrics = !isMyPost && authorInfo?.hideBodyMetrics;
  
  // 動的なカラー生成
  const generateColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };
  const userColorBg = isMyPost ? 'bg-slate-600 dark:bg-slate-500' : 'bg-emerald-500';
  const customBgStyle = isMyPost ? {} : { backgroundColor: post.author ? generateColor(post.author) : '#10b981' };

  const baseWeight = Number(post.bodyWeight) || Number(authorInfo?.weight) || 60;
  const { processedItems, totalVolume, totalCalories } = useMemo(() => {
      return calculateWorkoutTotals(post.items || [], post.duration, baseWeight);
  }, [post.items, post.duration, baseWeight]);

  const displayVolumeCalc = (!post.items || post.items.length === 0) ? 0 : ((post.volume && post.volume > 0) ? post.volume : totalVolume);
  const displayCalories = (!post.items || post.items.length === 0) ? 0 : ((post.calories && post.calories > 0) ? post.calories : totalCalories);
  const displaySets = post.totalSets || processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);
  
  const categoryCounts = {};
  processedItems.forEach(item => {
    if (item.category) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + (item.sets?.length || 0);
    }
  });
  const categories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

  const renderSetRow = (setObj, wType, type, isDrop, label) => {
    const isLR = wType === 'lr';
    const isPlate = wType === 'plate';
    const isBodyWeight = wType === 'bodyWeight';
    const isCardio = wType === 'cardio';
    
    const val = (f) => {
      let fieldName = f;
      if (type === 'super2') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1);
      if (type === 'super3') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1) + '3';
      return setObj[fieldName] || '';
    };

    if (isCardio) {
      const distance = val('distance');
      const time = val('time');
      const calories = val('calories');
      if (!distance && !time && !calories) return null;
      return (
        <div className={`flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-2 pt-2 last:border-0 ${isDrop ? 'pl-8' : ''}`}>
          <span className="font-bold w-16 text-sm shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
          <div className="flex-1 flex justify-end items-center px-1 gap-3 overflow-hidden">
             {distance && <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{distance}<span className="text-xs font-normal text-slate-400 ml-0.5">km</span></span>}
             {time && <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{time}<span className="text-xs font-normal text-slate-400 ml-0.5">分</span></span>}
             {calories && <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{calories}<span className="text-xs font-normal text-slate-400 ml-0.5">kcal</span></span>}
          </div>
        </div>
      );
    }

    const weight = val('weight');
    const reps = val('reps');
    const lReps = val('lReps');
    const rReps = val('rReps');
    const forcedReps = val('forcedReps');

    if (!weight && !reps && !lReps && !rReps) return null;

    const forced = forcedReps ? <span className="text-rose-500 text-xs ml-1">(+{forcedReps})</span> : null;
    const prBadgeWeight = setObj.isWeightPR && type === 'main' ? <span className="ml-1 text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-900 font-bold whitespace-nowrap">🏆重量更新</span> : null;
    const prBadgeReps = setObj.isRepsPR && type === 'main' ? <span className="ml-1 text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded border border-indigo-200 dark:border-indigo-900 font-bold whitespace-nowrap">🎖️回数更新</span> : null;

    let displayWeight = weight || 0;
    let weightLabel = 'kg';
    
    if (isPlate) weightLabel = '枚';
    else if (wType === 'oneSide') weightLabel = 'kg(片)';
    else if (isBodyWeight) {
      if (Number(weight) < 0) { displayWeight = weight; weightLabel = 'kg'; } 
      else if (Number(weight) > 0) { displayWeight = `+${weight}`; weightLabel = 'kg'; } 
      else { displayWeight = '自重'; weightLabel = ''; }
    }

    let labelColorClass = 'text-slate-500 dark:text-slate-400';
    if (isDrop) {
      labelColorClass = 'text-orange-500';
    } else if (type !== 'main') {
      labelColorClass = 'text-purple-500 dark:text-purple-400 pl-4';
    }

    return (
      <div className={`flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-2 pt-2 last:border-0 ${isDrop ? 'pl-8' : ''}`}>
        <span className={`font-bold w-16 text-sm shrink-0 flex flex-col ${labelColorClass}`}>
          {label}
        </span>
        {isLR ? (
           <div className="flex-1 flex justify-between items-center px-1 gap-2 min-w-0">
             <span className="font-bold text-base tracking-wide text-slate-800 dark:text-slate-100 flex-1 min-w-0 flex flex-col items-center">
               <span className="truncate w-full text-center">{displayWeight}{weightLabel && <span className="text-xs font-normal text-slate-400 ml-0.5">{weightLabel}</span>}</span>
               {prBadgeWeight}
             </span>
             <span className="font-bold text-sm sm:text-base tracking-wide text-slate-800 dark:text-slate-100 shrink-0 whitespace-nowrap flex flex-col items-end">
               <span>L:{lReps || 0} <span className="text-slate-300 dark:text-slate-600 font-normal mx-0.5">/</span> R:{rReps || 0}<span className="text-xs font-normal text-slate-400 ml-0.5">回</span>{forced}</span>
               {prBadgeReps}
               {Number(displayWeight) > 0 && Math.max(Number(lReps), Number(rReps)) > 0 && wType !== 'bodyWeight' && (
                 <span className="text-[10px] text-slate-400 font-normal mt-0.5">推定1RM: {Math.round(Number(displayWeight) * (1 + Math.max(Number(lReps), Number(rReps)) / 30))}kg</span>
               )}
             </span>
           </div>
        ) : (
           <div className="flex-1 flex justify-between items-center px-1 gap-2 min-w-0">
             <span className="font-bold text-base tracking-wide text-slate-800 dark:text-slate-100 flex-1 min-w-0 flex flex-col items-center">
               <span className="truncate w-full text-center">{displayWeight}{weightLabel && <span className="text-xs font-normal text-slate-400 ml-1">{weightLabel}</span>}</span>
               {prBadgeWeight}
             </span>
             <span className="font-bold text-base tracking-wide text-slate-800 dark:text-slate-100 shrink-0 whitespace-nowrap flex flex-col items-end">
               <span>{reps || 0} <span className="text-xs font-normal text-slate-400 ml-0.5">回</span>{forced}</span>
               {prBadgeReps}
               {Number(displayWeight) > 0 && Number(reps) > 0 && wType !== 'bodyWeight' && (
                 <span className="text-[10px] text-slate-400 font-normal mt-0.5">推定1RM: {Math.round(Number(displayWeight) * (1 + Number(reps) / 30))}kg</span>
               )}
             </span>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden relative mb-4">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${isMyPost ? 'bg-slate-300 dark:bg-slate-600' : ''}`} style={!isMyPost ? { backgroundColor: customBgStyle.backgroundColor } : {}}></div>
      <div className="flex justify-between items-start mb-4 pl-3">
        <div className="flex items-center gap-3 w-full overflow-hidden">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden shrink-0 ${userColorBg}`} style={customBgStyle}>
            {authorInfo?.photoUrl ? <img src={authorInfo.photoUrl} alt={post.author} className="w-full h-full object-cover" /> : post.author ? post.author.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{post.author || '不明'}</p>
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-bold">
                <span>{formatShortDateTime(post.timestamp)}</span>
                {post.duration && <span className="flex items-center gap-0.5"><Clock size={12}/> {formatDuration(post.duration)}</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {post.gymName && <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900"><MapPin size={10}/> {post.gymName}</span>}
                {categories.length > 0 && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">部位: {categories.join(', ')}</span>}
              </div>
            </div>
          </div>
        </div>
        {isMyPost && onEdit && onDelete && (
          <div className="flex gap-1 shrink-0 ml-2">
            <button onClick={() => onEdit(post)} className="text-slate-400 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><Edit2 size={16} /></button>
            <button onClick={() => onDelete(post.id)} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><Trash2 size={16} /></button>
          </div>
        )}
      </div>

      <div className="pl-3 mb-3 flex flex-wrap items-center gap-2">
        {(post.bodyWeight || post.bodyFat) && (
          <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900">
            <Scale size={14} />
            {hideMetrics ? 'ないしょ♡' : (
              <>
                {post.bodyWeight && `${post.bodyWeight}kg`}
                {post.bodyWeight && post.bodyFat && ' / '}
                {post.bodyFat && `${post.bodyFat}%`}
              </>
            )}
          </div>
        )}
        {displaySets > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
             <ListPlus size={14} /> 計 {displaySets} Set
          </div>
        )}
        {onImport && post.items && post.items.length > 0 && (
          <div className="relative ml-auto">
            {!showImportOptions ? (
              <button onClick={() => setShowImportOptions(true)} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-colors border border-emerald-100 dark:border-emerald-900">
                <Copy size={14} /> 構成をコピー
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={() => { setShowImportOptions(false); onImport(post, false); }} className="flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-500 px-2 py-1.5 rounded hover:bg-emerald-600 transition-colors shadow-sm">
                  <Play size={10} fill="currentColor" /> 今から
                </button>
                <button onClick={() => { setShowImportOptions(false); onImport(post, true); }} className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 transition-colors shadow-sm">
                  <CalendarIcon size={10} /> 過去
                </button>
                <button onClick={() => setShowImportOptions(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-full">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="pl-3 mb-4 flex flex-wrap gap-2">
        {(displayVolumeCalc > 0) ? (
          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Dumbbell size={14} className="text-slate-500" />
            総負荷量: {Number(displayVolumeCalc).toLocaleString()}kg
            <span className="text-slate-400 dark:text-slate-500 font-normal">（{getVolumeMetaphor(displayVolumeCalc)}）</span>
          </div>
        ) : null}
        {(displayCalories > 0) ? (
          <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900">
            <Flame size={14} className="text-amber-500" />
            総消費: {Number(displayCalories).toLocaleString()} kcal
          </div>
        ) : null}
      </div>

      <div className="pl-3 space-y-3 mb-4">
        {processedItems.map((item, idx) => (
          <div key={idx} className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.category === '有酸素' ? <Activity size={14} className="text-cyan-500 shrink-0"/> : <Dumbbell size={14} className="text-emerald-500 shrink-0" />}
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-[15px] truncate">{item.exerciseName}</span>
                  {item.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${getCategoryColor(item.category)}`}>{item.category}</span>}
                  {item.itemVolume > 0 && <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-auto shrink-0">{item.itemVolume.toLocaleString()}kg</span>}
                </div>
                {item.isSuperSet && item.superExerciseName && (
                  <div className="flex items-center gap-2 flex-wrap pl-5">
                    <Zap size={14} className="text-indigo-400 shrink-0"/>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm truncate">{item.superExerciseName}</span>
                  </div>
                )}
                {item.isSuperSet && item.superExerciseName3 && (
                  <div className="flex items-center gap-2 flex-wrap pl-5">
                    <Zap size={14} className="text-indigo-400 shrink-0"/>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm truncate">{item.superExerciseName3}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {item.sets && Array.isArray(item.sets) && item.sets.map((set, sIdx) => (
                <div key={sIdx} className="mb-4 last:mb-0 bg-white/40 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                  {renderSetRow(set, item.weightType, 'main', false, `set ${sIdx + 1}`)}
                  
                  {item.isDropSet && set.dropSets && set.dropSets.map((ds, dsIdx) => (
                    renderSetRow(ds, item.weightType, 'main', true, '↳ drop')
                  ))}
                  
                  {item.isSuperSet && item.superExerciseName && (
                    <>
                      {renderSetRow(set, item.superWeightType || 'total', 'super2', false, '↳ Sup2')}
                      {item.isDropSet && set.dropSets && !set.superDropSets && set.dropSets.map((ds, dsIdx) => (
                        ds.superWeight !== undefined ? renderSetRow(ds, item.superWeightType || 'total', 'super2', true, '↳ drop2') : null
                      ))}
                      {item.isDropSet && set.superDropSets && set.superDropSets.map((ds, dsIdx) => (
                        renderSetRow(ds, item.superWeightType || 'total', 'super2', true, '↳ drop2')
                      ))}
                    </>
                  )}

                  {item.isSuperSet && item.superExerciseName3 && (
                    <>
                      {renderSetRow(set, item.superWeightType3 || 'total', 'super3', false, '↳ Sup3')}
                      {item.isDropSet && set.dropSets && !set.superDropSets3 && set.dropSets.map((ds, dsIdx) => (
                        ds.superWeight3 !== undefined ? renderSetRow(ds, item.superWeightType3 || 'total', 'super3', true, '↳ drop3') : null
                      ))}
                      {item.isDropSet && set.superDropSets3 && set.superDropSets3.map((ds, dsIdx) => (
                        renderSetRow(ds, item.superWeightType3 || 'total', 'super3', true, '↳ drop3')
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>

            {item.memo && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                <AlignLeft size={12} className="inline mr-1 text-slate-400"/>{item.memo}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pl-3 mt-4">
        {isMyPost ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-400 dark:text-slate-500">
            <Heart size={16} className={post.likes > 0 ? "text-rose-400" : ""} fill={post.likes > 0 ? "currentColor" : "none"} />
            {post.likes > 0 ? 'ナイス！' : 'ナイス待ち'}
          </div>
        ) : (
          <button onClick={() => onToggleLike(post.id, post.likes || 0, post.likedByMe)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold ${post.likedByMe ? 'bg-rose-50 dark:bg-rose-950 text-rose-500 border border-rose-200 dark:border-rose-900' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}>
            <Heart size={16} fill={post.likedByMe ? "currentColor" : "none"} className={post.likedByMe ? "animate-pulse" : ""} />
            ナイス！
          </button>
        )}
      </div>
    </div>
  );
}

// --- 共通コンポーネント：ワークアウト入力フォーム ---
function WorkoutItemForm({ item, index, availableExercises, updateItem, removeItem, addSet, removeSet, updateSet, addDropSet, removeDropSet, updateDropSet, reorderSet, myPastPosts, onActive, isDragging, isAnyDragging, dragHandleProps }) {
  const [localFilter, setLocalFilter] = useState('barbell');
  const [draggedSetIndex, setDraggedSetIndex] = useState(null);
  const [dragOverSetIndex, setDragOverSetIndex] = useState(null);
  const [draggableSetId, setDraggableSetId] = useState(null);
  const setRefs = useRef([]);

  const adjustPosition = (idx) => {
    const el = setRefs.current[idx];
    if (!el) return;
    const container = document.getElementById('edit-modal-scroll-container') || window;
    const isWindow = container === window;
    const initialTop = el.getBoundingClientRect().top;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const currentEl = setRefs.current[idx];
        if (!currentEl) return;
        
        const currentTop = currentEl.getBoundingClientRect().top;
        container.scrollBy({ top: currentTop - initialTop, behavior: 'instant' });

        setTimeout(() => {
          const rect = currentEl.getBoundingClientRect();
          const totalItems = item.sets ? item.sets.length : 1;
          const ratio = totalItems > 1 ? idx / (totalItems - 1) : 0.5;
          
          if (isWindow) {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const absoluteTop = rect.top + scrollTop;
            const windowHeight = window.innerHeight;
            const targetViewportY = windowHeight * (0.15 + 0.7 * ratio);
            const targetScrollY = absoluteTop - targetViewportY + (rect.height / 2);
            window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
          } else {
            const containerRect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop;
            const absoluteTop = (rect.top - containerRect.top) + scrollTop;
            const containerHeight = container.clientHeight;
            const targetViewportY = containerHeight * (0.15 + 0.7 * ratio);
            const targetScrollY = absoluteTop - targetViewportY + (rect.height / 2);
            container.scrollTo({ top: targetScrollY, behavior: 'smooth' });
          }
        }, 50);
      }, 50);
    });
  };

  const handleDragStart = (e, idx) => {
    setDraggedSetIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    adjustPosition(idx);
  };

  const handleTouchStart = (e, idx) => {
    setDraggedSetIndex(idx);
    document.body.style.overflow = 'hidden';
    adjustPosition(idx);
  };
  const handleTouchMove = (e) => {
    if (draggedSetIndex === null) return;
    const y = e.touches[0].clientY;
    let hoverIndex = dragOverSetIndex;
    setRefs.current.forEach((el, idx) => {
       if (!el) return;
       const rect = el.getBoundingClientRect();
       if (y >= rect.top && y <= rect.bottom) hoverIndex = idx;
    });
    if (hoverIndex !== null && hoverIndex !== dragOverSetIndex) setDragOverSetIndex(hoverIndex);
  };
  const handleTouchEnd = () => {
    if (draggedSetIndex !== null && dragOverSetIndex !== null && draggedSetIndex !== dragOverSetIndex) {
       if (reorderSet) reorderSet(item.id, draggedSetIndex, dragOverSetIndex);
    }
    setDraggedSetIndex(null);
    setDragOverSetIndex(null);
    setDraggableSetId(null);
    document.body.style.overflow = '';
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSetIndex !== idx) setDragOverSetIndex(idx);
  };
  const handleDragLeave = () => setDragOverSetIndex(null);
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedSetIndex !== null && draggedSetIndex !== idx && reorderSet) reorderSet(item.id, draggedSetIndex, idx);
    setDraggedSetIndex(null);
    setDragOverSetIndex(null);
  };
  const handleDragEnd = () => {
    setDraggedSetIndex(null);
    setDragOverSetIndex(null);
    setDraggableSetId(null);
  };

  const exerciseHistoryMap = useMemo(() => {
    const history = {};
    if (!myPastPosts) return history;
    myPastPosts.forEach(p => {
      if (!p.items) return;
      p.items.forEach(i => {
        const checkAndAdd = (exName, type, sets, pDate) => {
          if (!exName) return;
          if (!history[exName]) history[exName] = [];
          sets?.forEach(s => {
             history[exName].push({ date: pDate, set: s, type });
             if (s.dropSets) s.dropSets.forEach(ds => history[exName].push({ date: pDate, set: ds, type }));
          });
        };
        checkAndAdd(i.exerciseName, 'main', i.sets, p.date);
        if (i.isSuperSet) {
           checkAndAdd(i.superExerciseName, 'super2', i.sets, p.date);
           checkAndAdd(i.superExerciseName3, 'super3', i.sets, p.date);
        }
      });
    });
    return history;
  }, [myPastPosts]);

  const filteredExercises = availableExercises.filter(ex => {
    const isCommon = ex.gymId === 'common';
    const fwType = ex.freeWeightType || (ex.name.includes('ダンベル') ? 'dumbbell' : ex.name.includes('スミス') ? 'smith' : 'barbell');
    if (localFilter === 'barbell' && (!isCommon || fwType !== 'barbell')) return false;
    if (localFilter === 'dumbbell' && (!isCommon || fwType !== 'dumbbell')) return false;
    if (localFilter === 'smith' && (!isCommon || fwType !== 'smith')) return false;
    if (localFilter === 'gym' && isCommon) return false;
    return true;
  });

  const updateExerciseName = (newName, superIndex = 0) => {
    const exData = availableExercises.find(ex => ex.name === newName);
    if (superIndex === 2) {
      updateItem(item.id, { superExerciseName: newName, superWeightType: exData ? (exData.weightType || 'total') : 'total' });
    } else if (superIndex === 3) {
      updateItem(item.id, { superExerciseName3: newName, superWeightType3: exData ? (exData.weightType || 'total') : 'total' });
    } else {
      updateItem(item.id, { exerciseName: newName, weightType: exData ? (exData.weightType || 'total') : 'total', category: exData ? (exData.category || 'その他') : 'その他', maker: exData ? exData.maker : '' });
    }
  };

  const getWeightPlaceholder = (type) => {
    if (type === 'oneSide') return '片側kg';
    if (type === 'plate') return '枚数';
    if (type === 'bodyWeight') return '+加重/-アシストkg';
    return '重量kg';
  };

  const prevRecord = useMemo(() => {
    if (!item.exerciseName || !myPastPosts) return null;
    for (let p of myPastPosts) {
      const found = p.items?.find(i => i.exerciseName === item.exerciseName);
      if (found && found.sets?.length > 0) {
        return { date: p.date, sets: found.sets, weightType: found.weightType, fullItem: found };
      }
    }
    return null;
  }, [item.exerciseName, myPastPosts]);

  const handleCopyPrevRecord = () => {
    if (!prevRecord || !prevRecord.fullItem) return;
    const prevItem = prevRecord.fullItem;
    const newSets = prevItem.sets.map(s => {
      const clearReps = (ds) => ({ ...ds, id: generateId(), reps: '', lReps: '', rReps: '', forcedReps: '', superReps: '', superLReps: '', superRReps: '', superForcedReps: '', superReps3: '', superLReps3: '', superRReps3: '', superForcedReps3: '' });
      return {
        ...s,
        id: generateId(),
        reps: '', lReps: '', rReps: '', forcedReps: '', distance: '', time: '', calories: '',
        superReps: '', superLReps: '', superRReps: '', superForcedReps: '',
        superReps3: '', superLReps3: '', superRReps3: '', superForcedReps3: '',
        dropSets: s.dropSets ? s.dropSets.map(clearReps) : undefined,
        superDropSets: s.superDropSets ? s.superDropSets.map(clearReps) : undefined,
        superDropSets3: s.superDropSets3 ? s.superDropSets3.map(clearReps) : undefined,
      };
    });

    updateItem(item.id, {
      sets: newSets,
      isSuperSet: prevItem.isSuperSet || false,
      isDropSet: prevItem.isDropSet || false,
      isForcedReps: prevItem.isForcedReps || false,
      superExerciseName: prevItem.superExerciseName || '',
      superWeightType: prevItem.superWeightType || 'total',
      superExerciseName3: prevItem.superExerciseName3 || '',
      superWeightType3: prevItem.superWeightType3 || 'total'
    });
  };

  const renderInputRow = (setObj, wType, type, isDrop, dropId = null) => {
    const isLR = wType === 'lr';
    const isCardio = wType === 'cardio';
    
    const val = (f) => {
      let fieldName = f;
      if (type === 'super2') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1);
      if (type === 'super3') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1) + '3';
      return setObj[fieldName] || '';
    };
    
    const update = (f, v) => {
      let fieldName = f;
      if (type === 'super2') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1);
      if (type === 'super3') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1) + '3';

      if (isDrop) updateDropSet(item.id, setObj._parentId, dropId, fieldName, v, setObj._targetArray || 'dropSets');
      else updateSet(item.id, setObj.id, fieldName, v);
    };

    let prevRecordText = null;
    const currentWeight = val('weight');
    
    if (!isCardio && currentWeight !== '' && exerciseHistoryMap) {
       const targetExName = type === 'super2' ? item.superExerciseName : type === 'super3' ? item.superExerciseName3 : item.exerciseName;
       if (targetExName && exerciseHistoryMap[targetExName]) {
          const pastRecords = exerciseHistoryMap[targetExName];
          for (let record of pastRecords) {
             const checkS = record.set;
             const pastType = record.type;
             const w = pastType === 'super2' ? checkS.superWeight : pastType === 'super3' ? checkS.superWeight3 : checkS.weight;
             
             if (String(w) === String(currentWeight) && w !== '' && w !== undefined) {
                 const pDate = formatDateWithDay(record.date);
                 if (wType === 'lr') {
                    const l = pastType === 'super2' ? checkS.superLReps : pastType === 'super3' ? checkS.superLReps3 : checkS.lReps;
                    const r = pastType === 'super2' ? checkS.superRReps : pastType === 'super3' ? checkS.superRReps3 : checkS.rReps;
                    prevRecordText = `前回${pDate}: L${l||0}/R${r||0}回`;
                 } else {
                    const r = pastType === 'super2' ? checkS.superReps : pastType === 'super3' ? checkS.superReps3 : checkS.reps;
                    prevRecordText = `前回${pDate}: ${r||0}回`;
                 }
                 break;
             }
          }
       }
    }

    let inputContent = null;
    if (isCardio) {
      inputContent = (
        <div className="flex-1 flex gap-2 min-w-0">
           <input type="number" inputMode="decimal" value={val('distance')} onChange={(e) => update('distance', e.target.value)} placeholder="距離(km)" className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
           <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('time')} onChange={(e) => update('time', e.target.value)} placeholder="時間(分)" className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
           <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('calories')} onChange={(e) => update('calories', e.target.value)} placeholder="kcal" className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
        </div>
      );
    } else {
      inputContent = (
        <div className="flex-1 flex gap-2 min-w-0">
          {isLR ? (
            <>
              <input type="number" inputMode="decimal" value={val('weight')} onChange={(e) => update('weight', e.target.value)} placeholder={getWeightPlaceholder(wType)} className="w-[64px] shrink-0 text-center text-base font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-emerald-500 py-2 px-0" style={{ fontSize: '16px' }}/>
              <div className="flex flex-1 items-center gap-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded px-2 min-w-0">
                <span className="text-xs text-slate-400 font-bold shrink-0">L:</span>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('lReps')} onChange={(e) => update('lReps', e.target.value)} placeholder="0" className="w-full text-center text-base font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none min-w-0" style={{ fontSize: '16px' }}/>
              </div>
              <div className="flex flex-1 items-center gap-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded px-2 min-w-0">
                <span className="text-xs text-slate-400 font-bold shrink-0">R:</span>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('rReps')} onChange={(e) => update('rReps', e.target.value)} placeholder="0" className="w-full text-center text-base font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none min-w-0" style={{ fontSize: '16px' }}/>
              </div>
            </>
          ) : (
            <>
              <input type="number" inputMode="decimal" value={val('weight')} onChange={(e) => update('weight', e.target.value)} placeholder={getWeightPlaceholder(wType)} className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('reps')} onChange={(e) => update('reps', e.target.value)} placeholder="回数" className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
            </>
          )}
          {item.isForcedReps && (
            <input type="number" inputMode="numeric" pattern="[0-9]*" value={val('forcedReps')} onChange={(e) => update('forcedReps', e.target.value)} placeholder="+補" className="w-12 shrink-0 text-center text-sm font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded focus:outline-none focus:border-rose-500 py-2 px-0" style={{ fontSize: '16px' }}/>
          )}
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col min-w-0">
         {inputContent}
         {prevRecordText && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1 mt-1 text-right">
               {prevRecordText}
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative w-full overflow-hidden mb-6 transition-all duration-200" onClickCapture={() => onActive && onActive(item.exerciseName)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <div 
            className="mt-2 p-1.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 rounded bg-slate-50 dark:bg-slate-800 touch-none shrink-0"
            {...dragHandleProps}
          >
            <GripVertical size={20}/>
          </div>
          <div className="flex flex-col flex-1 min-w-0 ml-1 gap-2">
            {!isAnyDragging && (
              <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg gap-1">
                <button onClick={() => setLocalFilter('barbell')} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilter === 'barbell' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>バーベル</button>
                <button onClick={() => setLocalFilter('dumbbell')} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilter === 'dumbbell' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>ダンベル</button>
                <button onClick={() => setLocalFilter('smith')} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilter === 'smith' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>スミス</button>
                <button onClick={() => setLocalFilter('gym')} className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold text-center rounded transition-colors ${localFilter === 'gym' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>マシン等</button>
              </div>
            )}
            <div className="relative w-full">
              <select value={item.exerciseName || ''} onChange={(e) => updateExerciseName(e.target.value, 0)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base pr-8" style={{ fontSize: '16px' }}>
                <option value="" disabled>{filteredExercises.length === 0 ? (availableExercises.length === 0 ? "上の部位を選択してください" : "該当する種目がありません") : "種目を選択"}</option>
                {item.exerciseName && !filteredExercises.some(ex => ex.name === item.exerciseName) && (
                  <option value={item.exerciseName}>{item.exerciseName}</option>
                )}
                {filteredExercises.map(ex => <option key={ex.id} value={ex.name}>{ex.name}{ex.maker ? `（${ex.maker}）` : ''}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
            </div>
          </div>
        </div>
        <button onClick={() => removeItem(item.id)} className="ml-2 text-slate-400 hover:text-rose-500 p-2 flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors mt-2"><Trash2 size={18} /></button>
      </div>

      <div className={`transition-all overflow-hidden ${isAnyDragging ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
      {prevRecord && (
        <div className="mb-4 pl-8 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-emerald-600 dark:text-emerald-400 mr-2 flex items-center inline-flex gap-1"><Clock size={12}/>前回 ({formatDateWithDay(prevRecord.date)})</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {prevRecord.sets.map((s, i) => (
               <span key={i} className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {prevRecord.weightType === 'cardio' ? 
                    `${s.distance||0}km / ${s.time||0}分` : 
                    `${s.weight||0}${prevRecord.weightType === 'plate' ? '枚' : 'kg'} x ${s.reps||Math.max(s.lReps||0, s.rReps||0)}回`
                  }
               </span>
            ))}
          </div>
        </div>
      )}

      {item.weightType !== 'cardio' && (
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide py-1 pl-8">
          <button onClick={() => updateItem(item.id, { isSuperSet: !item.isSuperSet })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isSuperSet ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>スーパー</button>
          <button onClick={() => updateItem(item.id, { isDropSet: !item.isDropSet })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isDropSet ? 'bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>ドロップ</button>
          <button onClick={() => updateItem(item.id, { isForcedReps: !item.isForcedReps })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isForcedReps ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>補助</button>
        </div>
      )}

      {item.isSuperSet && item.weightType !== 'cardio' && (
        <div className="mb-5 pl-8 border-l-2 border-indigo-300 dark:border-indigo-600 space-y-3">
          <div className="relative w-full">
            <select value={item.superExerciseName || ''} onChange={(e) => updateExerciseName(e.target.value, 2)} className="w-full bg-indigo-50/30 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold appearance-none focus:outline-none focus:border-indigo-500 text-base pr-8" style={{ fontSize: '16px' }}>
              <option value="" disabled>スーパーセットの種目 (2種目目)</option>
              {item.superExerciseName && !filteredExercises.some(ex => ex.name === item.superExerciseName) && (
                <option value={item.superExerciseName}>{item.superExerciseName}</option>
              )}
              {filteredExercises.filter(ex => ex.weightType !== 'cardio').map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none text-xs">▼</div>
          </div>
          {item.superExerciseName && (
            <div className="relative w-full">
              <select value={item.superExerciseName3 || ''} onChange={(e) => updateExerciseName(e.target.value, 3)} className="w-full bg-indigo-50/30 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold appearance-none focus:outline-none focus:border-indigo-500 text-base pr-8" style={{ fontSize: '16px' }}>
                <option value="">ジャイアントセット (3種目目・任意)</option>
                {item.superExerciseName3 && !filteredExercises.some(ex => ex.name === item.superExerciseName3) && (
                  <option value={item.superExerciseName3}>{item.superExerciseName3}</option>
                )}
                {filteredExercises.filter(ex => ex.weightType !== 'cardio').map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none text-xs">▼</div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 mb-5 w-full pl-2">
        <div className="flex text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1 mb-1 pl-6">
          <div className="w-6 text-center shrink-0">Set</div>
          <div className="flex-1 text-center min-w-0">記録</div>
          <div className="w-6 shrink-0"></div>
        </div>
        
        {item.sets && Array.isArray(item.sets) && item.sets.map((set, sIndex) => (
          <div key={set.id} 
            ref={(el) => (setRefs.current[sIndex] = el)}
            draggable={draggableSetId === set.id}
            onDragStart={(e) => handleDragStart(e, sIndex)}
            onDragOver={(e) => handleDragOver(e, sIndex)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, sIndex)}
            onDragEnd={handleDragEnd}
            className={`bg-slate-50/50 dark:bg-slate-950/50 p-2.5 rounded-xl border transition-all relative ${draggedSetIndex === sIndex ? (dragOverSetIndex === sIndex ? 'opacity-70 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'opacity-40 border-dashed border-slate-300 dark:border-slate-600') : 'border-slate-100 dark:border-slate-800'} ${draggedSetIndex !== null ? 'space-y-0' : 'space-y-3'}`}
          >
            {dragOverSetIndex === sIndex && draggedSetIndex !== sIndex && <div className={`absolute left-0 w-full h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse ${draggedSetIndex < dragOverSetIndex ? '-bottom-1.5' : '-top-1.5'}`} />}
            <div className="flex items-center gap-2">
              <div 
                 className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 p-1 -ml-1 shrink-0 touch-none"
                 onMouseEnter={() => setDraggableSetId(set.id)}
                 onMouseLeave={() => setDraggableSetId(null)}
                 onTouchStart={(e) => handleTouchStart(e, sIndex)}
                 onTouchMove={handleTouchMove}
                 onTouchEnd={handleTouchEnd}
                 onTouchCancel={handleTouchEnd}
              >
                <GripVertical size={16} />
              </div>
              <div className="w-6 text-center text-slate-400 dark:text-slate-500 font-bold text-sm shrink-0">{sIndex + 1}</div>
              
              {draggedSetIndex !== null ? (
                <div className="flex-1 text-sm font-bold text-slate-500 dark:text-slate-400 py-1">SET {sIndex + 1}</div>
              ) : (
                <>
                  {renderInputRow(set, item.weightType, 'main', false)}
                  <button onClick={() => removeSet(item.id, set.id)} disabled={item.sets.length === 1} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 disabled:opacity-30 flex justify-center"><X size={18} /></button>
                </>
              )}
            </div>

            {draggedSetIndex === null && (
              <>
                {item.isDropSet && item.weightType !== 'cardio' && set.dropSets && set.dropSets.map(ds => (
                  <div key={ds.id} className="border-l-2 border-orange-200 dark:border-orange-800 pl-3 flex items-center gap-2 ml-4">
                    <TrendingDown size={16} className="text-orange-400 flex-shrink-0" />
                    {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'dropSets' }, item.weightType, 'main', true, ds.id)}
                    <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'dropSets')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={18} /></button>
                  </div>
                ))}

                {item.isDropSet && item.weightType !== 'cardio' && (
                  <button onClick={() => addDropSet(item.id, set.id, 'dropSets')} className="ml-4 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded transition-colors font-bold flex items-center gap-1 w-max"><Plus size={12}/>ドロップ追加</button>
                )}

                {item.isSuperSet && item.superExerciseName && item.weightType !== 'cardio' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 pl-4 border-l-2 border-indigo-300 dark:border-indigo-700 ml-1">
                      <Zap size={16} className="text-indigo-400 flex-shrink-0" />
                      {renderInputRow(set, item.superWeightType || 'total', 'super2', false)}
                      <div className="w-6 shrink-0"></div>
                    </div>
                    
                    {item.isDropSet && set.dropSets && !set.superDropSets && set.dropSets.map(ds => (
                      ds.superWeight !== undefined ? (
                      <div key={`super2-old-ds-${ds.id}`} className="flex items-center gap-2 pl-8 border-l-2 border-orange-300 dark:border-orange-700 ml-5">
                        <TrendingDown size={14} className="text-orange-400 flex-shrink-0" />
                        {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'dropSets' }, item.superWeightType || 'total', 'super2', true, ds.id)}
                        <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'dropSets')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={18} /></button>
                      </div>
                      ) : null
                    ))}
                    
                    {item.isDropSet && set.superDropSets && set.superDropSets.map(ds => (
                      <div key={`super2-ds-${ds.id}`} className="flex items-center gap-2 pl-8 border-l-2 border-orange-300 dark:border-orange-700 ml-5">
                        <TrendingDown size={14} className="text-orange-400 flex-shrink-0" />
                        {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'superDropSets' }, item.superWeightType || 'total', 'super2', true, ds.id)}
                        <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'superDropSets')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={18} /></button>
                      </div>
                    ))}
                    
                    {item.isDropSet && (
                      <button onClick={() => addDropSet(item.id, set.id, 'superDropSets')} className="ml-12 mt-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded transition-colors font-bold flex items-center gap-1 w-max"><Plus size={12}/>ドロップ追加</button>
                    )}
                  </div>
                )}
                
                {item.isSuperSet && item.superExerciseName3 && item.weightType !== 'cardio' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 pl-4 border-l-2 border-indigo-300 dark:border-indigo-700 ml-1">
                      <Zap size={16} className="text-indigo-400 flex-shrink-0" />
                      {renderInputRow(set, item.superWeightType3 || 'total', 'super3', false)}
                      <div className="w-6 shrink-0"></div>
                    </div>
                    
                    {item.isDropSet && set.dropSets && !set.superDropSets3 && set.dropSets.map(ds => (
                      ds.superWeight3 !== undefined ? (
                      <div key={`super3-old-ds-${ds.id}`} className="flex items-center gap-2 pl-8 border-l-2 border-orange-300 dark:border-orange-700 ml-5">
                        <TrendingDown size={14} className="text-orange-400 flex-shrink-0" />
                        {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'dropSets' }, item.superWeightType3 || 'total', 'super3', true, ds.id)}
                        <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'dropSets')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={18} /></button>
                      </div>
                      ) : null
                    ))}
                    
                    {item.isDropSet && set.superDropSets3 && set.superDropSets3.map(ds => (
                      <div key={`super3-ds-${ds.id}`} className="flex items-center gap-2 pl-8 border-l-2 border-orange-300 dark:border-orange-700 ml-5">
                        <TrendingDown size={14} className="text-orange-400 flex-shrink-0" />
                        {renderInputRow({ ...ds, _parentId: set.id, _targetArray: 'superDropSets3' }, item.superWeightType3 || 'total', 'super3', true, ds.id)}
                        <button onClick={() => removeDropSet(item.id, set.id, ds.id, 'superDropSets3')} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={18} /></button>
                      </div>
                    ))}
                    
                    {item.isDropSet && (
                      <button onClick={() => addDropSet(item.id, set.id, 'superDropSets3')} className="ml-12 mt-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded transition-colors font-bold flex items-center gap-1 w-max"><Plus size={12}/>ドロップ追加</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => addSet(item.id)} className="w-full py-3 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-4 bg-white dark:bg-slate-900">
        <Plus size={18} /> セットを追加
      </button>

      <div>
        <textarea value={item.memo || ''} onChange={(e) => updateItem(item.id, { memo: e.target.value })} placeholder="種目ごとのメモ（オプション）" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none" style={{ fontSize: '16px' }} rows={2} />
      </div>
      </div>
    </div>
  );
}

// --- スクロール自動制御フック ---
function useDragAndDrop(items, setItems) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggableId, setDraggableId] = useState(null);
  const refs = useRef([]);

  const adjustPosition = (idx) => {
    const el = refs.current[idx];
    if (!el) return;
    const container = document.getElementById('edit-modal-scroll-container') || window;
    const isWindow = container === window;
    const initialTop = el.getBoundingClientRect().top;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const currentEl = refs.current[idx];
        if (!currentEl) return;
        
        const currentTop = currentEl.getBoundingClientRect().top;
        container.scrollBy({ top: currentTop - initialTop, behavior: 'instant' });

        setTimeout(() => {
          const rect = currentEl.getBoundingClientRect();
          const totalItems = items.length;
          
          const ratio = totalItems > 1 ? idx / (totalItems - 1) : 0.5;
          
          if (isWindow) {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const absoluteTop = rect.top + scrollTop;
            const windowHeight = window.innerHeight;
            const targetViewportY = windowHeight * (0.15 + 0.7 * ratio);
            const targetScrollY = absoluteTop - targetViewportY + (rect.height / 2);
            window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
          } else {
            const containerRect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop;
            const absoluteTop = (rect.top - containerRect.top) + scrollTop;
            const containerHeight = container.clientHeight;
            const targetViewportY = containerHeight * (0.15 + 0.7 * ratio);
            const targetScrollY = absoluteTop - targetViewportY + (rect.height / 2);
            container.scrollTo({ top: targetScrollY, behavior: 'smooth' });
          }
        }, 50);
      }, 50);
    });
  };

  const handleDragStart = (e, idx) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    adjustPosition(idx);
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== idx) setDragOverIndex(idx);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== idx) {
      setItems(prev => {
        const newItems = [...prev];
        const [dragged] = newItems.splice(draggedIndex, 1);
        newItems.splice(idx, 0, dragged);
        return newItems;
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggableId(null);
  };
  const handleTouchStart = (e, idx) => {
    setDraggedIndex(idx);
    document.body.style.overflow = 'hidden';
    adjustPosition(idx);
  };
  const handleTouchMove = (e) => {
    if (draggedIndex === null) return;
    const y = e.touches[0].clientY;
    let hoverIndex = dragOverIndex;
    refs.current.forEach((el, idx) => {
       if (!el) return;
       const rect = el.getBoundingClientRect();
       if (y >= rect.top && y <= rect.bottom) hoverIndex = idx;
    });
    if (hoverIndex !== null && hoverIndex !== dragOverIndex) setDragOverIndex(hoverIndex);
  };
  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      setItems(prev => {
        const newItems = [...prev];
        const [dragged] = newItems.splice(draggedIndex, 1);
        newItems.splice(dragOverIndex, 0, dragged);
        return newItems;
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggableId(null);
    document.body.style.overflow = '';
  };

  return {
    draggedIndex, dragOverIndex, draggableId, setDraggableId, refs,
    handlers: {
      onDragStart: handleDragStart, onDragOver: handleDragOver, onDragLeave: handleDragLeave,
      onDrop: handleDrop, onDragEnd: handleDragEnd, onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, onTouchCancel: handleTouchEnd
    }
  };
}

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

// === メインアプリケーション ===
export default function App() {
  useAutoScrollDisable();

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [currentTab, setCurrentTab] = useState('timeline');
  const [isRecordManual, setIsRecordManual] = useState(false);
  const [importGymId, setImportGymId] = useState('');

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
  const isFullyLoaded = Object.values(dataLoaded).every(Boolean) || loadTimeout;
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [draftWorkoutItems, setDraftWorkoutItems] = useState([]);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedFriendUser, setSelectedFriendUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (currentUser && db) {
      const loadDraft = async () => {
        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().currentWorkoutItems) {
             setDraftWorkoutItems(docSnap.data().currentWorkoutItems);
             setSelectedCategories(docSnap.data().currentSelectedCategories || []);
          } else {
             const savedDraft = localStorage.getItem(`withfit_draft_${currentUser}`);
             if (savedDraft) setDraftWorkoutItems(JSON.parse(savedDraft));
             const savedCats = localStorage.getItem(`withfit_cats_${currentUser}`);
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
    if (currentUser && db && isDraftLoaded) {
      try {
        if (draftWorkoutItems.length > 0) {
          localStorage.setItem(`withfit_draft_${currentUser}`, JSON.stringify(draftWorkoutItems));
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { currentWorkoutItems: draftWorkoutItems }, { merge: true }).catch(()=>{});
        } else {
          localStorage.removeItem(`withfit_draft_${currentUser}`);
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { currentWorkoutItems: deleteField() }, { merge: true }).catch(()=>{});
        }
      } catch (e) {
        console.error("Failed to save draft", e);
      }
    }
  }, [draftWorkoutItems, currentUser, db, isDraftLoaded]);

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
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) {} };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const accountsRef = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
    const u1 = onSnapshot(accountsRef, (snapshot) => {
      const accData = {}; snapshot.forEach(doc => { accData[doc.id] = doc.data(); }); setAccountsInfo(accData); setDataLoaded(prev => ({ ...prev, accounts: true }));
    }, () => setDataLoaded(prev => ({ ...prev, accounts: true })));

    const gymsRef = collection(db, 'artifacts', appId, 'public', 'data', 'gyms');
    const u2 = onSnapshot(gymsRef, (snapshot) => {
      const gymsData = []; snapshot.forEach(doc => { gymsData.push({ id: doc.id, ...doc.data() }); }); gymsData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); setGyms(gymsData); setDataLoaded(prev => ({ ...prev, gyms: true }));
    }, () => setDataLoaded(prev => ({ ...prev, gyms: true })));

    const exercisesRef = collection(db, 'artifacts', appId, 'public', 'data', 'exercises');
    const u3 = onSnapshot(exercisesRef, (snapshot) => {
      const exData = []; snapshot.forEach(doc => { exData.push({ id: doc.id, ...doc.data() }); }); exData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); setExercises(exData); setDataLoaded(prev => ({ ...prev, exercises: true }));
    }, () => setDataLoaded(prev => ({ ...prev, exercises: true })));

    const workoutsRef = collection(db, 'artifacts', appId, 'public', 'data', 'workouts');
    const workoutsQuery = query(workoutsRef, orderBy('timestamp', 'desc'), limit(100));
    const u4 = onSnapshot(workoutsQuery, (snapshot) => {
      const workoutsData = []; snapshot.forEach(doc => { workoutsData.push({ id: doc.id, ...doc.data() }); }); setPosts(workoutsData); setDataLoaded(prev => ({ ...prev, workouts: true }));
    }, () => setDataLoaded(prev => ({ ...prev, workouts: true })));

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const updatePresence = async (isVisible) => { 
      const now = Date.now();
      if (isVisible) {
         localStorage.setItem('withfit_login_session', JSON.stringify({ userId: currentUser, lastActive: now }));
      }
      if (!db || !isOnline) return;
      try { 
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { lastActive: now, isAppOnline: isVisible }, { merge: true }); 
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
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updatePresence(false);
    };
  }, [currentUser, isOnline]);

  const handleLogin = async (username, pin) => {
    if (!db) return false;
    const accountData = accountsInfo[username];
    const joinedGyms = accountData?.joinedGyms || ['common'];
    if (pin === 'google') {
      if (!accountData) {
        try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { displayName: '新規ユーザー', friendCode: generateFriendCode(), isTraining: false, lastActive: Date.now(), isAppOnline: true, theme: 'light', friends: [], joinedGyms: ['common'] }, { merge: true }); setCurrentUser(username); } catch (e) { return false; }
      } else {
        setCurrentUser(username);
        try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true }); } catch (e) {}
      }
    } else {
      if (!accountData || !accountData.pin) {
        try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { pin: pin, displayName: username, friendCode: generateFriendCode(), isTraining: false, lastActive: Date.now(), isAppOnline: true, theme: 'light', friends: [], joinedGyms: ['common'] }, { merge: true }); setCurrentUser(username); } catch (e) { return false; }
      } else if (accountData.pin === pin) {
        setCurrentUser(username);
        try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true }); } catch (e) {}
      } else { return false; }
    }
    return true;
  };

  const handleGoogleLogin = async (googleUser) => {
    if (!db) return false;
    const existingUser = Object.entries(accountsInfo).find(([uname, data]) => data.googleUid === googleUser.uid);
    if (existingUser) {
      const username = existingUser[0];
      setCurrentUser(username);
      const joinedGyms = existingUser[1]?.joinedGyms || ['common'];
      try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { lastActive: Date.now(), isAppOnline: true, joinedGyms }, { merge: true }); } catch (e) {}
      return true;
    } else {
      let baseName = googleUser.displayName || (googleUser.email ? googleUser.email.split('@')[0] : 'user');
      let username = baseName;
      let counter = 1;
      while (accountsInfo[username]) {
        username = `${baseName}${counter}`;
        counter++;
      }
      try { 
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', username), { displayName: username, googleUid: googleUser.uid, friendCode: generateFriendCode(), isTraining: false, lastActive: Date.now(), isAppOnline: true, theme: 'light', friends: [], joinedGyms: ['common'] }, { merge: true }); 
        setCurrentUser(username); 
        return true;
      } catch (e) { return false; }
    }
  };

  const handleLinkGoogle = async () => {
    if (!currentUser || !db || !auth) return;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { googleUid: result.user.uid }, { merge: true });
      alert('Googleアカウントと連携しました。');
    } catch (e) {
      console.error(e);
      alert('連携に失敗しました。');
    }
  };

  const handleLogout = async () => { 
    if (currentUser && db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isAppOnline: false, lastActive: Date.now() }, { merge: true });
      } catch (e) {}
    }
    localStorage.removeItem('withfit_login_session');
    setCurrentUser(null); setCurrentTab('timeline'); setEditingPost(null); 
  };

  const handleStartTraining = async (gymId) => {
    if (!currentUser || !db) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: true, trainingStartTime: Date.now(), currentGymId: gymId, currentExerciseName: '', lastActive: Date.now() }, { merge: true }); } catch (e) {}
  };

  const handlePostWorkout = async (gymName, workoutItems, bodyWeight, bodyFat, manualStart, manualEnd) => {
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
        author: currentUser, gymName, items: cleanItems, timestamp: timestamp, startTime, endTime, duration, date: dateIso, likes: 0, likedByMe: false, bodyWeight: bodyWeight || null, bodyFat: bodyFat || null, volume: totalVolume, calories: totalCalories, totalSets: totalSets
      });
      if (!manualStart) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: false, trainingStartTime: null, currentGymId: null, currentExerciseName: '', lastActive: Date.now() }, { merge: true });
      }
      setDraftWorkoutItems([]); setCurrentTab('timeline');
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

  const handleCancelTraining = async () => {
    if (!window.confirm("現在の記録を破棄して終了しますか？")) return;
    if (!currentUser || !db) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: false, trainingStartTime: null, currentGymId: null, currentExerciseName: '', lastActive: Date.now() }, { merge: true }); setDraftWorkoutItems([]); setCurrentTab('timeline'); } catch (e) {}
  };

  const handleSaveProfile = async (data) => {
    if (!currentUser || !db) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), data, { merge: true }); setShowProfileModal(false); } catch (e) {}
  };

  const toggleLike = async (postId, currentLikes, isCurrentlyLiked) => {
    if (!db) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId), { likes: isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1, likedByMe: !isCurrentlyLiked }, { merge: true }); } catch (e) {}
  };

  const myInfo = accountsInfo[currentUser] || {};
  const allGyms = useMemo(() => [{ id: 'common', name: 'フリーウェイト', createdAt: 0 }, ...gyms], [gyms]);

  const notifications = useMemo(() => {
     if (!currentUser) return [];
     const notifs = [];
     const myFriends = myInfo.friends || [];
     
     (myInfo.friendRequests || []).forEach(req => {
        notifs.push({
           id: `req_${req}`, type: 'friend_request', user: req,
           message: 'さんからフレンド申請が届きました',
           time: Date.now()
        });
     });

     const yesterday = Date.now() - 24 * 60 * 60 * 1000;
     posts.forEach(post => {
        if (myFriends.includes(post.author) && post.timestamp > yesterday) {
           notifs.push({
              id: `post_${post.id}`, type: 'workout_complete', user: post.author,
              message: 'さんがトレーニングを完了しました',
              time: post.timestamp
           });
        }
        if (post.author === currentUser && post.likes > 0) {
           notifs.push({
              id: `like_${post.id}`, type: 'like', user: '誰か',
              message: 'さんがいいねしました',
              time: post.timestamp
           });
        }
     });
     return notifs.sort((a, b) => b.time - a.time).slice(0, 10);
  }, [currentUser, myInfo.friendRequests, myInfo.friends, posts]);

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

    const newItems = (post.items || []).map(item => ({
      ...item,
      id: generateId(),
      sets: (item.sets || []).map(set => ({ 
         ...set, 
         id: generateId(),
         dropSets: set.dropSets ? set.dropSets.map(ds => ({ ...ds, id: generateId() })) : [] 
      }))
    }));
    
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

  const handleSendFriendRequest = async (friendCodeOrName) => {
    if (!currentUser || !db || !friendCodeOrName) return;
    const friendEntry = Object.entries(accountsInfo).find(([uname, data]) => data.friendCode === friendCodeOrName || uname === friendCodeOrName);
    if (!friendEntry) {
      alert("該当するフレンドコード（またはユーザー名）が見つかりません。");
      return;
    }
    const friendUsername = friendEntry[0];

    if (friendUsername === currentUser) {
      alert("自分自身は追加できません。");
      return;
    }
    const currentFriends = myInfo.friends || [];
    if (currentFriends.includes(friendUsername)) {
      alert("既にフレンドです。");
      return;
    }
    const targetRequests = accountsInfo[friendUsername]?.friendRequests || [];
    if (targetRequests.includes(currentUser)) {
      alert("既に申請済みです。");
      return;
    }

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', friendUsername), { friendRequests: [...targetRequests, currentUser] }, { merge: true });
      alert(`${accountsInfo[friendUsername]?.displayName || friendUsername}さんにフレンド申請を送信しました！`);
    } catch (e) {}
  };

  const handleAcceptFriendRequest = async (requesterUsername) => {
    if (!currentUser || !db) return;
    const myFriends = myInfo.friends || [];
    const myRequests = myInfo.friendRequests || [];
    const requesterFriends = accountsInfo[requesterUsername]?.friends || [];
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        friends: [...new Set([...myFriends, requesterUsername])],
        friendRequests: myRequests.filter(u => u !== requesterUsername)
      }, { merge: true });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', requesterUsername), {
        friends: [...new Set([...requesterFriends, currentUser])]
      }, { merge: true });
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

  if (!isFullyLoaded) {
    return (
      <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <Activity className="text-emerald-500 w-12 h-12 animate-pulse mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-bold mb-2">データを読み込み中...</p>
        <p className="text-slate-400 text-xs font-bold text-center">完了するまでしばらくお待ちください</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} isOnline={isOnline} />;
  }

  const myFriends = myInfo.friends || [];
  const activeFriends = myFriends.filter(f => accountsInfo[f]?.isTraining);
  
  const isDarkMode = ['dark', 'ocean', 'mono'].includes(myInfo.theme);
  const themeContainerClass = myInfo.theme === 'ocean' ? 'theme-ocean' : myInfo.theme === 'pop' ? 'theme-pop' : '';
  
  const visiblePosts = posts.filter(p => p.author === currentUser || myFriends.includes(p.author));

  return (
    <div className={`min-h-screen font-sans pb-32 overflow-x-hidden select-none transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} ${themeContainerClass}`}>
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
            border-color: #fbcfe8 !important;
            border-width: 2px !important;
          }
          .theme-pop .border-slate-200, .theme-pop .border-slate-800 {
            border-color: #fbcfe8 !important;
            border-width: 2px !important;
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
            color: #831843 !important;
          }
          .theme-pop .text-slate-500, .theme-pop .text-slate-400 {
            color: #0ea5e9 !important;
          }
          .theme-pop .bg-slate-100, .theme-pop .bg-slate-800, .theme-pop .bg-slate-50 {
            background-color: #e0f2fe !important;
          }
        `}</style>
      )}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm flex flex-col transition-colors">
        <div className="p-4 flex justify-between items-center relative">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <WithFitLogo className="text-indigo-500" /> With<span className="text-indigo-500">Fit</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{isOnline ? 'オンライン' : 'オフライン'}</span>
            </div>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              <Bell size={20} />
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white dark:border-slate-900"></span>}
            </button>
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs overflow-hidden border border-emerald-200 dark:border-emerald-800">
                {myInfo.photoUrl ? <img src={myInfo.photoUrl} alt="profile" className="w-full h-full object-cover" /> : currentUser.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">{myInfo.displayName || currentUser}</span>
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-full transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
        {activeFriends.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 flex flex-col items-center justify-center text-xs font-bold animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 mb-0.5"><Flame size={14} className="animate-pulse text-amber-300" /> {activeFriends.join(', ')}さんがトレーニング中です！</div>
          </div>
        )}
        {showNotifications && (
          <div className="absolute top-16 right-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-700 dark:text-slate-300">通知</div>
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
               {notifications.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 p-4">通知はありません</div>
               ) : (
                  notifications.map(notif => (
                     <div key={notif.id} className="flex gap-3 items-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0 overflow-hidden">
                           {accountsInfo[notif.user]?.photoUrl ? <img src={accountsInfo[notif.user].photoUrl} alt="" className="w-full h-full object-cover"/> : notif.user.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              <span className="text-emerald-600 dark:text-emerald-400 mr-1">{accountsInfo[notif.user]?.displayName || notif.user}</span>
                              {notif.message}
                           </p>
                           <p className="text-[10px] text-slate-400 mt-0.5">{getRelativeTime(notif.time)}</p>
                        </div>
                     </div>
                  ))
               )}
            </div>
          </div>
        )}
      </header>

      <main className="p-4 max-w-md mx-auto w-full pb-40">
        {currentTab === 'timeline' && <TimelineView posts={visiblePosts} onToggleLike={toggleLike} onImport={handleImportWorkout} currentUser={currentUser} onDelete={handleDeleteWorkout} onEdit={setEditingPost} accountsInfo={accountsInfo} />}
        {currentTab === 'exercises' && <ExercisesView gyms={allGyms} exercises={exercises} posts={visiblePosts} accountsInfo={accountsInfo} currentUser={currentUser} myInfo={myInfo} />}
        {currentTab === 'record' && <RecordView onStart={handleStartTraining} onPost={handlePostWorkout} onCancel={handleCancelTraining} myInfo={myInfo} gyms={allGyms} exercises={exercises} workoutItems={draftWorkoutItems} setWorkoutItems={setDraftWorkoutItems} selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} posts={visiblePosts} currentUser={currentUser} isManual={isRecordManual} setIsManual={setIsRecordManual} onActiveExerciseChange={handleActiveExerciseChange} accountsInfo={accountsInfo} />}
        {currentTab === 'data' && <DataView posts={posts} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={setEditingPost} onDelete={handleDeleteWorkout} onImport={handleImportWorkout} />}
        {currentTab === 'friends' && <FriendsView currentUser={currentUser} myInfo={myInfo} accountsInfo={accountsInfo} onSendRequest={handleSendFriendRequest} onAccept={handleAcceptFriendRequest} onReject={handleRejectFriendRequest} onRemoveFriend={handleRemoveFriend} onFriendClick={(u) => setSelectedFriendUser(u)} onGenerateFriendCode={handleGenerateFriendCode} />}
      </main>

      {editingPost && <EditWorkoutModal post={editingPost} gyms={allGyms} exercises={exercises} onClose={() => setEditingPost(null)} onSave={handleUpdateWorkout} myPastPosts={posts.filter(p => p.author === currentUser)} />}
      {selectedFriendUser && <FriendDetailModal friendUsername={selectedFriendUser} posts={posts} accountsInfo={accountsInfo} onClose={() => setSelectedFriendUser(null)} onToggleLike={toggleLike} onImport={handleImportWorkout} currentUser={currentUser} />}

      <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-1 pb-safe z-30 transition-colors" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div className="flex justify-around items-center p-2 max-w-md mx-auto">
          <NavButton icon={<Home size={22} />} label="ホーム" isActive={currentTab === 'timeline'} onClick={() => { setCurrentTab('timeline'); }} />
          <NavButton icon={<Dumbbell size={22} />} label="種目" isActive={currentTab === 'exercises'} onClick={() => setCurrentTab('exercises')} />
          <NavButton icon={myInfo.isTraining ? <Clock className="animate-pulse" size={28}/> : <PlusCircle size={28} />} label={myInfo.isTraining ? "記録中" : "記録"} isActive={currentTab === 'record'} onClick={() => setCurrentTab('record')} isPrimary isTraining={myInfo.isTraining} />
          <NavButton icon={<CalendarIcon size={22} />} label="データ" isActive={currentTab === 'data'} onClick={() => { setCurrentTab('data'); }} />
          <NavButton icon={<Users size={22} />} label="フレンド" isActive={currentTab === 'friends'} onClick={() => setCurrentTab('friends')} />
        </div>
      </nav>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} userInfo={myInfo} onSave={handleSaveProfile} currentUser={currentUser} onLinkGoogle={handleLinkGoogle} />
    </div>
  );
}

// --- プロフィール設定モーダル ---
function ProfileModal({ isOpen, onClose, userInfo, onSave, currentUser, onLinkGoogle }) {
  const [isUploading, setIsUploading] = useState(false);
  const [goal, setGoal] = useState(userInfo?.goal || '');
  const [theme, setTheme] = useState(userInfo?.theme || 'light');
  const [photoUrl, setPhotoUrl] = useState(userInfo?.photoUrl || null);
  
  const [birthDate, setBirthDate] = useState(userInfo?.birthDate || '');
  const [gender, setGender] = useState(userInfo?.gender || 'male');
  const [height, setHeight] = useState(userInfo?.height || '');
  const [weight, setWeight] = useState(userInfo?.weight || '');
  const [displayName, setDisplayName] = useState(userInfo?.displayName || currentUser);
  const [hideBodyMetrics, setHideBodyMetrics] = useState(userInfo?.hideBodyMetrics || false);

  useEffect(() => {
    if (isOpen) {
      setGoal(userInfo?.goal || '');
      setTheme(userInfo?.theme || 'light');
      setPhotoUrl(userInfo?.photoUrl || null);
      setBirthDate(userInfo?.birthDate || '');
      setGender(userInfo?.gender || 'male');
      setHeight(userInfo?.height || '');
      setWeight(userInfo?.weight || '');
      setDisplayName(userInfo?.displayName || currentUser);
      setHideBodyMetrics(userInfo?.hideBodyMetrics || false);
    }
  }, [isOpen, userInfo, currentUser]);

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
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
        setPhotoUrl(canvas.toDataURL('image/jpeg', 0.8));
        setIsUploading(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave({ displayName: displayName.trim() || currentUser, photoUrl, goal: goal.trim(), theme, birthDate, gender, height: Number(height)||null, weight: Number(weight)||null, hideBodyMetrics });
  };

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
        <div className="mb-6">
          {userInfo?.googleUid ? (
             <p className="text-sm text-emerald-600 font-bold bg-emerald-50 p-3 rounded-xl text-center border border-emerald-200">✓ Googleアカウント連携済み</p>
          ) : (
             <button onClick={onLinkGoogle} className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                Googleアカウントと連携
             </button>
          )}
        </div>
        <div className="flex flex-col items-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative">
            {photoUrl ? <img src={photoUrl} alt="profile" className="w-full h-full object-cover" /> : <Users size={40} className="text-slate-300 dark:text-slate-500" />}
            {isUploading && <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center"><Activity className="animate-spin text-emerald-500" size={24} /></div>}
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

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">目標 (100文字以内)</label>
            <textarea value={goal} maxLength={100} onChange={e => setGoal(e.target.value)} placeholder="例: ベンチプレス100kg達成！" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-none" style={{ fontSize: '16px' }} rows={2} />
            <div className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1">{goal.length} / 100</div>
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

        <button onClick={handleSave} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md transition-all mt-6">
          設定を保存
        </button>
      </div>
    </div>
  );
}

// --- ログイン・登録画面 ---
function LoginScreen({ onLogin, onGoogleLogin, isOnline }) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const handlePinInput = (num) => { 
    if (pin.length < 4) { setPin(prev => prev + num); setError(''); } 
  };
  const handleBackspace = () => { setPin(prev => prev.slice(0, -1)); setError(''); };
  
  const handleSubmit = async () => {
    if (pin.length !== 4 || !username.trim()) return;
    const success = await onLogin(username.trim(), pin);
    if (!success) { setError('パスワードが間違っています。新規登録の場合は異なるユーザー名をお試しください。'); setPin(''); }
  };

  useEffect(() => { 
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-6 left-6 z-10 flex items-center gap-1.5 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
        <span className="text-[10px] font-bold text-slate-500">{isOnline ? 'オンライン' : 'オフライン'}</span>
      </div>
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <WithFitLogo className="text-indigo-500 w-16 h-16 mb-2" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">WithFit</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">みんなで鍛える、記録アプリ</p>
        </div>
        <div className="w-full bg-white p-6 rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center">
           <button onClick={() => { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' }); signInWithPopup(getAuth(), provider).then((result) => { onGoogleLogin(result.user); }).catch(console.error); }} className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl mb-6 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
             Googleでログイン / 登録
           </button>
           <div className="w-full border-t border-slate-200 my-4 relative">
             <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400 font-bold">または既存アカウントでログイン</span>
           </div>
           <div className="w-full mb-6 mt-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">ユーザー名</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="例: yuta123" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:border-emerald-500" />
           </div>
           <p className="text-slate-500 text-sm mb-4 flex items-center gap-2 font-bold"><Lock size={14} />PINコード (4桁)</p>
           <div className="flex gap-4 mb-6">
             {[0, 1, 2, 3].map(i => <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-200 ${i < pin.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-200'}`} />)}
           </div>
           {error && <p className="text-rose-500 text-xs mb-4 font-bold text-center">{error}</p>}
           <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
             {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => <button key={num} onClick={() => handlePinInput(num.toString())} disabled={!username.trim()} className="h-16 rounded-full bg-white border border-slate-200 text-slate-800 text-2xl font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm disabled:opacity-50">{num}</button>)}
             <div />
             <button onClick={() => handlePinInput('0')} disabled={!username.trim()} className="h-16 rounded-full bg-white border border-slate-200 text-slate-800 text-2xl font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm disabled:opacity-50">0</button>
             <button onClick={handleBackspace} className="h-16 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 active:bg-slate-100 transition-colors">⌫</button>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- タイムライン画面 ---
function TimelineView({ posts, onToggleLike, onImport, currentUser, onDelete, onEdit, accountsInfo }) {
  const [displayLimit, setDisplayLimit] = useState(10);
  const displayedPosts = posts.slice(0, displayLimit);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">アクティビティ</h2>
      {!posts || posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center mt-10 shadow-sm">
          <Dumbbell className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-bold">まだ記録がありません。<br/>最初のトレーニングを記録しましょう！</p>
        </div>
      ) : (
        <>
          {displayedPosts.map(post => <WorkoutCard key={post.id} post={post} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={onEdit} onDelete={onDelete} onToggleLike={onToggleLike} onImport={onImport} />)}
          {posts.length > displayLimit && (
            <button onClick={() => setDisplayLimit(prev => prev + 10)} className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mt-4">
              もっと見る
            </button>
          )}
        </>
      )}
    </div>
  );
}

// --- 月間レポートコンポーネント ---
function MonthlyReport({ monthDate, posts, userName, accountsInfo }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthPosts = posts.filter(p => {
    const d = new Date(p.timestamp);
    return d.getFullYear() === year && d.getMonth() === month && p.author === userName;
  });

  const totalVolume = monthPosts.reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
  const totalCalories = monthPosts.reduce((sum, p) => sum + (Number(p.calories) || 0), 0);
  const trainingDays = new Set(monthPosts.map(p => formatDateFromTimestamp(p.timestamp))).size;
  
  let totalSets = 0;
  let totalWorkoutsCount = 0;
  const categoryCount = {};
  MUSCLE_CATEGORIES.forEach(c => categoryCount[c] = 0);

  monthPosts.forEach(post => {
    if (post.items) {
      post.items.forEach(item => {
        totalWorkoutsCount++;
        const sets = item.sets ? item.sets.length : 0;
        totalSets += sets;
        const cat = item.category || 'その他';
        if (categoryCount[cat] !== undefined) categoryCount[cat] += sets;
        else categoryCount['その他'] += sets;
      });
    }
  });

  const hasData = monthPosts.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
      <div className="flex items-center gap-3 mb-5">
         <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-xs bg-slate-600">
            {accountsInfo[userName]?.photoUrl ? <img src={accountsInfo[userName].photoUrl} alt={userName} className="w-full h-full object-cover" /> : userName.charAt(0).toUpperCase()}
         </div>
         <h3 className="font-bold text-slate-800 dark:text-slate-100">{userName} のレポート</h3>
      </div>
      
      {!hasData ? (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 font-bold text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">記録がありません</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">月間総負荷量</p>
               <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalVolume.toLocaleString()} <span className="text-xs">kg</span></p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">月間総消費カロリー</p>
               <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{totalCalories.toLocaleString()} <span className="text-xs">kcal</span></p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">トレーニング日数</p>
               <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{trainingDays} <span className="text-xs">日</span></p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">総セット数</p>
               <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalSets} <span className="text-xs">set</span></p>
             </div>
          </div>
          
          <div className="pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">部位別のセット数</p>
            <div className="space-y-2">
              {MUSCLE_CATEGORIES.map(cat => {
                if (categoryCount[cat] === 0) return null;
                const percent = Math.min(100, (categoryCount[cat] / totalSets) * 100);
                return (
                  <div key={cat} className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-12 text-slate-600 dark:text-slate-300">{cat}</span>
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${getCategoryColor(cat).split(' ')[0]} ${getCategoryColor(cat).split(' ')[2]}`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <span className="w-8 text-right text-slate-500 dark:text-slate-400">{categoryCount[cat]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 体組成バッジコンポーネント ---
function BodyCompositionInfo({ info, dailyCalories = 0, dateLabel = '' }) {
  if (!info.height || !info.weight || !info.birthDate) return null;
  const age = getAge(info.birthDate);
  const bmr = getBMR(info.weight, info.height, age, info.gender);
  const totalCalories = bmr + dailyCalories;
  
  let advancedStatsBlock = null;
  if (info.weight && info.height && info.gender) {
      if (info.lastFat) {
          const ffmi = getFFMI(info.weight, info.lastFat, info.height);
          const evalText = getFFMIEval(ffmi, info.gender);
          const leanBodyMass = info.weight * (1 - (info.lastFat / 100));

          advancedStatsBlock = (
             <div className="flex gap-2 sm:gap-3 w-full">
                <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-xl p-3 flex flex-col">
                   <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mb-1">FFMI (除脂肪量指数)</p>
                   <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{ffmi.toFixed(1)} <span className="text-xs font-normal">({evalText})</span></p>
                   <p className="text-[9px] text-indigo-500 dark:text-indigo-500 mt-auto pt-1">※男性20、女性16以上で優秀</p>
                </div>
                <div className="flex-1 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-100 dark:border-cyan-900 rounded-xl p-3 flex flex-col">
                   <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold mb-1">除脂肪体重 (LBM)</p>
                   <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{leanBodyMass.toFixed(1)} <span className="text-xs font-normal">kg</span></p>
                   <p className="text-[9px] text-cyan-500 dark:text-cyan-500 mt-auto pt-1">※筋肉・骨・内臓などの総重量</p>
                </div>
             </div>
          );
      } else {
          advancedStatsBlock = (
             <div className="flex gap-2 sm:gap-3 w-full">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                   <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">FFMI / 除脂肪体重 (LBM)</p>
                   <p className="text-base font-bold text-slate-400 dark:text-slate-500 my-1">データなし</p>
                   <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-auto">※計算には体脂肪率の記録が必要です</p>
                </div>
             </div>
          );
      }
  }

  return (
     <div className="space-y-3 mb-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
           <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 rounded-xl p-2 flex flex-col justify-center">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-0.5">基礎代謝</p>
              <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-300">{bmr.toLocaleString()} <span className="text-[9px] sm:text-[10px] font-normal">kcal</span></p>
           </div>
           <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-100 dark:border-orange-900 rounded-xl p-2 flex flex-col justify-center">
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold mb-0.5">運動消費 {dateLabel && <span className="font-normal opacity-80">({dateLabel})</span>}</p>
              <p className="text-sm sm:text-base font-bold text-orange-700 dark:text-orange-300">{dailyCalories.toLocaleString()} <span className="text-[9px] sm:text-[10px] font-normal">kcal</span></p>
           </div>
           <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 rounded-xl p-2 flex flex-col justify-center">
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mb-0.5">合計</p>
              <p className="text-sm sm:text-base font-bold text-rose-700 dark:text-rose-300">{totalCalories.toLocaleString()} <span className="text-[9px] sm:text-[10px] font-normal">kcal</span></p>
           </div>
        </div>
        {advancedStatsBlock && (
           <div className="flex w-full">
              {advancedStatsBlock}
           </div>
        )}
     </div>
  );
}

// --- データ画面 (カレンダー・グラフ・レポート) ---
function DataView({ posts, currentUser, accountsInfo, onEdit, onDelete, onImport, targetUser, onToggleLike }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateFromTimestamp(Date.now()));
  const displayUser = targetUser || currentUser;
  const isMyData = displayUser === currentUser;
  const hideMetrics = !isMyData && accountsInfo[displayUser]?.hideBodyMetrics;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = formatDateFromTimestamp(Date.now());
  
  const myPosts = posts.filter(p => p.author === displayUser);

  const blanks = Array.from({ length: firstDay || 0 }).map((_, i) => <div key={`blank-${i}`} className="p-2"></div>);
  const days = Array.from({ length: daysInMonth || 0 }).map((_, i) => {
    const date = i + 1;
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
    const isMyTraining = myPosts.some(p => formatDateFromTimestamp(p.timestamp) === dateStr);
    const isSelected = selectedDateStr === dateStr;
    const isToday = dateStr === todayStr;
    
    return (
      <div key={`day-${date}`} className="p-1 flex flex-col justify-center items-center h-14" onClick={() => setSelectedDateStr(dateStr)}>
        <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all cursor-pointer 
          ${isSelected ? 'ring-2 ring-offset-1 ring-emerald-500 dark:ring-offset-slate-900' : ''} 
          ${isMyTraining ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
          ${isToday ? 'border-2 border-emerald-400 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}
        `}>
          {date}
        </div>
        <div className="flex gap-1 mt-1 h-1.5">
          {isMyTraining && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
        </div>
      </div>
    );
  });
  
  const weightData = myPosts.filter(p => p.bodyWeight && !isNaN(p.bodyWeight)).map(p => ({ date: p.date, value: Number(p.bodyWeight) })).reverse();
  const fatData = myPosts.filter(p => p.bodyFat && !isNaN(p.bodyFat)).map(p => ({ date: p.date, value: Number(p.bodyFat) })).reverse();

  const selectedPosts = myPosts.filter(p => formatDateFromTimestamp(p.timestamp) === selectedDateStr);

  const myUserInfo = accountsInfo[displayUser] || {};
  const lastMyFatPost = myPosts.find(p => p.bodyFat);
  const myCompositionInfo = { ...myUserInfo, lastFat: lastMyFatPost ? lastMyFatPost.bodyFat : null };

  const myDailyCalories = selectedPosts.reduce((sum, p) => sum + (Number(p.calories) || 0), 0);
  
  const dateLabel = selectedDateStr ? selectedDateStr.substring(5).replace('-', '/') : '';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">データ</h2>

      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">月間レポート ({month + 1}月)</h3>
        <MonthlyReport monthDate={currentMonth} posts={posts} userName={displayUser} accountsInfo={accountsInfo} />
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-slate-400 hover:text-emerald-500 font-bold p-2 transition-colors">&lt;</button>
          <span className="font-bold text-slate-700 dark:text-slate-200">{year}年 {month + 1}月</span>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-slate-400 hover:text-emerald-500 font-bold p-2 transition-colors">&gt;</button>
        </div>
        <div className="grid grid-cols-7 text-center mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d} className={`text-xs font-bold ${d === '日' ? 'text-rose-400' : d === '土' ? 'text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 text-center">{blanks}{days}</div>
        
        <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> トレーニング日</div>
        </div>
      </div>
      
      {selectedDateStr && (
        <div className="pt-2 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{selectedDateStr.replace(/-/g, '/')} の記録</h3>

          {selectedPosts.length > 0 ? (
            selectedPosts.map(post => <WorkoutCard key={post.id} post={post} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={onEdit} onDelete={onDelete} onImport={onImport} onToggleLike={onToggleLike} />)
          ) : (
             <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl text-center text-slate-400 dark:text-slate-500 text-sm font-bold border border-slate-200 dark:border-slate-800">記録はありません</div>
          )}
        </div>
      )}

      <div className="pt-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">体組成データ</h3>
        {hideMetrics ? (
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-center text-slate-500 font-bold border border-slate-200 dark:border-slate-700">ないしょ♡</div>
        ) : (
          <BodyCompositionInfo info={myCompositionInfo} dailyCalories={myDailyCalories} dateLabel={dateLabel} />
        )}
      </div>

      {!hideMetrics && (
      <div className="space-y-6 pt-4">
         <h3 className="text-lg font-bold text-slate-900 dark:text-white">体重・体脂肪率の推移</h3>
         <SimpleChart data={weightData} color="#10b981" title={`${displayUser}の体重推移 (kg)`} />
         <SimpleChart data={fatData} color="#6366f1" title={`${displayUser}の体脂肪率推移 (%)`} />
      </div>
      )}
    </div>
  );
}

// --- 記録入力画面 ---
function RecordView({ onStart, onPost, onCancel, myInfo, gyms, exercises, workoutItems, setWorkoutItems, selectedCategories, setSelectedCategories, posts, currentUser, isManual, setIsManual, onActiveExerciseChange, accountsInfo }) {
  const joinedGyms = myInfo.joinedGyms || ['common'];
  const [selectedGymId, setSelectedGymId] = useState(myInfo.currentGymId || (gyms.filter(g => joinedGyms.includes(g.id))[0]?.id || 'common'));
  const itemDnd = useDragAndDrop(workoutItems, setWorkoutItems);
  const [restTimerStart, setRestTimerStart] = useState(null);
  const [restTimeElapsed, setRestTimeElapsed] = useState(0);

  useEffect(() => {
    if (!restTimerStart) return;
    const interval = setInterval(() => setRestTimeElapsed(Math.floor((Date.now() - restTimerStart) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [restTimerStart]);

  const toggleRestTimer = () => {
    if (restTimerStart) {
      setRestTimerStart(null);
      setRestTimeElapsed(0);
    } else {
      setRestTimerStart(Date.now());
    }
  };

  const formatRestTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bodyWeight, setBodyWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const [manualDate, setManualDate] = useState(formatDateFromTimestamp(Date.now()));
  const [manualStartTime, setManualStartTime] = useState("12:00");
  const [manualEndTime, setManualEndTime] = useState("13:00");

  const [isMetricsOnlyMode, setIsMetricsOnlyMode] = useState(false);

  const isTraining = myInfo.isTraining;
  const myPastPosts = posts.filter(p => p.author === currentUser);

  const mutedExercises = myInfo.mutedExercises || [];
  const availableExercises = exercises.filter(ex => {
    if (ex.gymId !== selectedGymId) return false; 
    if (mutedExercises.includes(ex.name)) return false;
    if (selectedCategories.length === 0) return false;
    return selectedCategories.includes(ex.category || 'その他');
  });

  const handleStart = () => {
    if (!selectedGymId) { alert("ジムを選択してください"); return; }
    onStart(selectedGymId);
    if (workoutItems.length === 0) {
       addExerciseItem('');
    }
  };

  const updateItem = (itemId, data) => { setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, ...data } : item)); };
  
  const addExerciseItem = (defaultName = '') => {
    const defaultEx = availableExercises.find(ex => ex.name === defaultName);
    const isCardio = defaultEx ? defaultEx.weightType === 'cardio' : false;
    const newItem = { 
      id: generateId(), 
      exerciseName: defaultEx ? defaultEx.name : '', 
      weightType: defaultEx ? (defaultEx.weightType || 'total') : 'total',
      category: defaultEx ? (defaultEx.category || 'その他') : 'その他',
      isSuperSet: false, isDropSet: false, isForcedReps: false, memo: '',
      sets: [ isCardio ? { id: generateId(), distance: '', time: '', calories: '' } : { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' } ] 
    };
    setWorkoutItems([...workoutItems, newItem]);
  };

  const removeExerciseItem = (itemId) => setWorkoutItems(workoutItems.filter(item => item.id !== itemId));
  
  const moveItemUp = (index) => {
    if (index === 0) return;
    const newItems = [...workoutItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setWorkoutItems(newItems);
  };
  const moveItemDown = (index) => {
    if (index === workoutItems.length - 1) return;
    const newItems = [...workoutItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setWorkoutItems(newItems);
  };

  const addSet = (itemId) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : {};
        if (item.weightType === 'cardio') {
           return { ...item, sets: [...(item.sets || []), { id: generateId(), distance: lastSet.distance || '', time: lastSet.time || '', calories: lastSet.calories || '' }]};
        }
        return { ...item, sets: [...(item.sets || []), { 
          id: generateId(), 
          weight: lastSet.weight || '', 
          reps: lastSet.reps || '', 
          lReps: lastSet.lReps || '', 
          rReps: lastSet.rReps || '',
          dropSets: lastSet.dropSets ? lastSet.dropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
          superDropSets: lastSet.superDropSets ? lastSet.superDropSets.map(ds => ({ ...ds, id: generateId() })) : undefined,
          superDropSets3: lastSet.superDropSets3 ? lastSet.superDropSets3.map(ds => ({ ...ds, id: generateId() })) : undefined
        }]};
      }
      return item;
    }));
  };

  const removeSet = (itemId, setId) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, sets: item.sets.filter(s => s.id !== setId) } : item));
  
  const reorderSet = (itemId, dragIndex, dropIndex) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newSets = [...(item.sets || [])];
      const [dragged] = newSets.splice(dragIndex, 1);
      newSets.splice(dropIndex, 0, dragged);
      return { ...item, sets: newSets };
    }));
  };

  const updateSetField = (itemId, setId, field, value) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) };
    }));
  };

  const addDropSet = (itemId, parentSetId, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: [...(set[targetArray] || []), { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]};
      })};
    }));
  }
  const removeDropSet = (itemId, parentSetId, dropId, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: (set[targetArray] || []).filter(ds => ds.id !== dropId) };
      })};
    }));
  }
  const updateDropSetField = (itemId, parentSetId, dropId, field, value, targetArray = 'dropSets') => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, [targetArray]: (set[targetArray] || []).map(ds => ds.id === dropId ? { ...ds, [field]: value } : ds) };
      })};
    }));
  }

  const handleSubmit = async () => {
    if (workoutItems.length > 0) {
      const isValid = workoutItems.every(item => {
        if (!item.exerciseName || !item.sets || item.sets.length === 0) return false;
        if (item.weightType === 'cardio') return item.sets.every(set => set.distance !== '' || set.time !== '' || set.calories !== '');
        if (item.weightType === 'lr') return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.lReps !== '' || set.rReps !== ''));
        return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.reps !== '' || set.forcedReps));
      });
      if (!isValid) { alert("種目を選択し、すべての入力を完了してください。"); return; }
    } else if (!bodyWeight && !bodyFat) {
      alert("種目を追加するか、体重・体脂肪率を入力してください。"); return;
    }

    setIsSubmitting(true);
    const gym = gyms.find(g => g.id === selectedGymId);
    
    try {
      if (isManual) {
         const startTs = new Date(`${manualDate}T${manualStartTime}`).getTime();
         const endTs = new Date(`${manualDate}T${manualEndTime}`).getTime();
         await onPost(gym ? gym.name : '不明なジム', workoutItems, Number(bodyWeight), Number(bodyFat), startTs, endTs);
         setIsManual(false);
      } else {
         await onPost(gym ? gym.name : '不明なジム', workoutItems, Number(bodyWeight), Number(bodyFat));
      }
    } finally {
      setBodyWeight(''); setBodyFat(''); setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
      if (isManual) {
          setWorkoutItems([]);
          setIsManual(false);
      } else {
          onCancel();
      }
  };

  const handleMetricsOnlySubmit = async () => {
      if (!bodyWeight && !bodyFat) { alert('体重または体脂肪率を入力してください'); return; }
      setIsSubmitting(true);
      const startTs = new Date(`${manualDate}T${manualStartTime}`).getTime();
      await onPost('', [], Number(bodyWeight), Number(bodyFat), startTs, startTs);
      setIsSubmitting(false);
      setIsMetricsOnlyMode(false);
      setBodyWeight('');
      setBodyFat('');
  };

  const toggleCategory = (cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  if (isMetricsOnlyMode) {
     return (
       <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">体重・体脂肪率を記録</h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
             <div className="min-w-0 overflow-hidden w-full">
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">日付</label>
               <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 sm:px-3 py-2 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 box-border" style={{ fontSize: '16px' }} />
             </div>
             <div className="min-w-0 overflow-hidden w-full">
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">時間</label>
               <input type="time" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 sm:px-3 py-2 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 box-border" style={{ fontSize: '16px' }} />
             </div>
             <div className="flex gap-4 pt-2">
               <div className="flex-1 relative">
                 <input type="number" inputMode="decimal" step="0.1" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="体重" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}/>
                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
               </div>
               <div className="flex-1 relative">
                 <input type="number" inputMode="decimal" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="体脂肪率" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}/>
                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
               </div>
             </div>
             <button onClick={handleMetricsOnlySubmit} disabled={isSubmitting || (!bodyWeight && !bodyFat)} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md mt-6 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
               {isSubmitting ? <Activity className="animate-spin" size={20} /> : <><Scale size={18} /> 記録を保存する</>}
             </button>
             <button onClick={() => setIsMetricsOnlyMode(false)} className="w-full text-slate-500 dark:text-slate-400 font-bold py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mt-2">キャンセル</button>
          </div>
       </div>
     );
  }

  if (!isTraining && !isManual) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ワークアウトを開始</h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><MapPin size={28} className="text-slate-400 dark:text-slate-500" /></div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 text-center">本日のトレーニング場所を選択してください</label>
          <div className="w-full relative mb-6">
            <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
              <option value="" disabled>ジムを選択</option>
              {gyms.filter(g => joinedGyms.includes(g.id)).map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
          </div>
          <button onClick={handleStart} className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 mb-3">
            <Play fill="currentColor" size={20} /> トレーニング開始
          </button>
          
          <div className="grid grid-cols-2 gap-3 w-full">
            <button onClick={() => {setIsManual(true); if(workoutItems.length === 0) addExerciseItem('');}} className="w-full py-3 rounded-xl font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all">
              <CalendarIcon size={18} /> 過去の記録を追加
            </button>
            <button onClick={() => { 
               const d = new Date();
               setManualDate(formatDateFromTimestamp(d.getTime()));
               setManualStartTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
               setIsMetricsOnlyMode(true); 
            }} className="w-full py-3 rounded-xl font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all">
              <Scale size={18} /> 体組成のみ記録
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {!isManual ? (
        <div className="bg-slate-900 rounded-2xl p-4 shadow-lg text-white flex justify-between items-center sticky top-20 z-10">
          <div>
            <div className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1"><MapPin size={12}/> {gyms.find(g => g.id === selectedGymId)?.name || 'トレーニング中'}</div>
            <div className="text-2xl text-emerald-400 flex items-center gap-2"><Clock size={20} className={!isSubmitting ? "animate-pulse" : ""} /> <TimerDisplay startTime={myInfo.trainingStartTime} isStopped={isSubmitting} /></div>
            <div className="text-xs text-slate-400 font-bold mt-1">{formatTimeFromTimestamp(myInfo.trainingStartTime)} から開始</div>
          </div>
          <button onClick={toggleRestTimer} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 transition-colors ${restTimerStart ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
             <Clock size={20} className={restTimerStart ? 'animate-pulse' : ''} />
             <span className="text-xs font-bold mt-1">{restTimerStart ? formatRestTime(restTimeElapsed) : 'レスト'}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
           <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><CalendarIcon size={18} className="text-emerald-500"/> 過去の記録</h3>
           <div>
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ジムを選択</label>
             <div className="w-full relative">
               <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                 <option value="" disabled>ジムを選択</option>
                 {gyms.filter(g => joinedGyms.includes(g.id)).map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
             </div>
           </div>
           <div className="min-w-0 overflow-hidden w-full">
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">日付</label>
             <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 sm:px-3 py-2 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 box-border" style={{ fontSize: '16px' }} />
           </div>
           <div className="flex gap-2 sm:gap-3 w-full">
             <div className="flex-1 min-w-0 overflow-hidden">
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">開始時間</label>
               <input type="time" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-1 sm:px-3 py-2 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 box-border" style={{ fontSize: '16px' }} />
             </div>
             <div className="flex-1 min-w-0 overflow-hidden">
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">終了時間</label>
               <input type="time" value={manualEndTime} onChange={e => setManualEndTime(e.target.value)} className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-1 sm:px-3 py-2 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 box-border" style={{ fontSize: '16px' }} />
             </div>
           </div>
        </div>
      )}

      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-2">{isManual ? '記録内容' : 'ワークアウト中'}</h2>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
        {MUSCLE_CATEGORIES.map(cat => {
          const isSelected = selectedCategories.includes(cat);
          return <button key={cat} onClick={() => toggleCategory(cat)} className={`py-2.5 px-1 rounded-xl text-sm font-bold transition-all border ${getCategoryTabColor(cat, isSelected)}`}>{cat}</button>;
        })}
      </div>

      {selectedCategories.length > 0 && availableExercises.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm mb-4">
          <p className="text-slate-500 dark:text-slate-400 mb-2 text-sm font-bold">この部位に該当する種目がありません。</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">「種目」タブから追加してください。</p>
        </div>
      )}

      <div className="space-y-4">
        {workoutItems.map((item, index) => (
          <div key={item.id}
             ref={(el) => (itemDnd.refs.current[index] = el)}
             draggable={itemDnd.draggableId === item.id}
             onDragStart={(e) => itemDnd.handlers.onDragStart(e, index)}
             onDragOver={(e) => itemDnd.handlers.onDragOver(e, index)}
             onDragLeave={itemDnd.handlers.onDragLeave}
             onDrop={(e) => itemDnd.handlers.onDrop(e, index)}
             onDragEnd={itemDnd.handlers.onDragEnd}
             className={`relative transition-all duration-200 ${itemDnd.draggedIndex === index ? (itemDnd.dragOverIndex === index ? 'opacity-70 scale-[0.98] ring-2 ring-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] rounded-2xl' : 'opacity-40 scale-[0.98] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl') : ''}`}
          >
             {itemDnd.dragOverIndex === index && itemDnd.draggedIndex !== index && <div className={`absolute left-0 w-full h-1.5 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse ${itemDnd.draggedIndex < itemDnd.dragOverIndex ? '-bottom-2' : '-top-2'}`} />}
             <WorkoutItemForm 
               item={item} 
               index={index}
               availableExercises={availableExercises} 
               updateItem={updateItem} 
               removeItem={removeExerciseItem}
               addSet={addSet} 
               removeSet={removeSet} 
               updateSet={updateSetField} 
               addDropSet={addDropSet} 
               removeDropSet={removeDropSet} 
               updateDropSet={updateDropSetField}
               reorderSet={reorderSet}
               myPastPosts={myPastPosts}
               onActive={onActiveExerciseChange}
               isDragging={itemDnd.draggedIndex === index}
               isAnyDragging={itemDnd.draggedIndex !== null}
               dragHandleProps={{
                 onMouseEnter: () => itemDnd.setDraggableId(item.id),
                 onMouseLeave: () => itemDnd.setDraggableId(null),
                 onTouchStart: (e) => { itemDnd.setDraggableId(item.id); itemDnd.handlers.onTouchStart(e, index); },
                 onTouchMove: itemDnd.handlers.onTouchMove,
                 onTouchEnd: itemDnd.handlers.onTouchEnd,
                 onTouchCancel: itemDnd.handlers.onTouchCancel
               }}
             />
          </div>
        ))}

        <button onClick={() => addExerciseItem()} className="w-full py-4 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"><ListPlus size={18} /> 次の種目を追加</button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mt-6">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Activity size={16} /> 本日の体組成（任意）</h3>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input type="number" inputMode="decimal" step="0.1" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="体重" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}/>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
            </div>
            <div className="flex-1 relative">
              <input type="number" inputMode="decimal" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="体脂肪率" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}/>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting || (workoutItems.length === 0 && !bodyWeight && !bodyFat)} className={`w-full text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 mt-6 mb-8 transition-all ${isSubmitting || (workoutItems.length === 0 && !bodyWeight && !bodyFat) ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500 dark:text-slate-400' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
          {isSubmitting ? <Activity className="animate-spin" size={20} /> : (isManual ? <><CalendarIcon size={20} /> 過去の記録を保存</> : <><Flame size={20} /> トレーニングを完了して保存</>)}
        </button>
        
        <button onClick={handleCancel} className="w-full text-slate-500 dark:text-slate-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2 mb-8 transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-800">記録を破棄して終了</button>
      </div>
    </div>
  );
}

// --- 編集モーダル ---
function EditWorkoutModal({ post, gyms, exercises, onClose, onSave, myPastPosts }) {
  const safeItems = post.items ? JSON.parse(JSON.stringify(post.items)) : [];
  const [workoutItems, setWorkoutItems] = useState(safeItems);
  const itemDnd = useDragAndDrop(workoutItems, setWorkoutItems);
  
  const [editDate, setEditDate] = useState(formatDateFromTimestamp(post.startTime || post.timestamp));
  const [editStartTime, setEditStartTime] = useState(formatTimeFromTimestamp(post.startTime || post.timestamp));
  const [editEndTime, setEditEndTime] = useState(formatTimeFromTimestamp(post.endTime || post.timestamp));
  const [editBodyWeight, setEditBodyWeight] = useState(post.bodyWeight || '');
  const [editBodyFat, setEditBodyFat] = useState(post.bodyFat || '');
  const [selectedCategories, setSelectedCategories] = useState([]);

  const toggleCategory = (cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const availableExercises = exercises.filter(ex => {
    const gym = gyms.find(g => g.name === post.gymName);
    const isGymMatch = gym ? (ex.gymId === gym.id || ex.gymId === 'common') : true;
    if (!isGymMatch) return false;
    if (selectedCategories.length === 0) return false;
    return selectedCategories.includes(ex.category || 'その他');
  });

  const updateItem = (itemId, data) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, ...data } : item));
  
  const addExerciseItem = () => {
    const defaultEx = availableExercises.length > 0 ? availableExercises[0] : { name: '', weightType: 'total', category: 'その他' };
    setWorkoutItems([...workoutItems, { id: generateId(), exerciseName: defaultEx.name, weightType: defaultEx.weightType || 'total', category: defaultEx.category || 'その他', isSuperSet: false, isDropSet: false, isForcedReps: false, memo: '', sets: [{ id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }] }]);
  };
  const removeExerciseItem = (itemId) => setWorkoutItems(workoutItems.filter(item => item.id !== itemId));
  const moveItemUp = (index) => {
    if (index === 0) return;
    const newItems = [...workoutItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setWorkoutItems(newItems);
  };
  const moveItemDown = (index) => {
    if (index === workoutItems.length - 1) return;
    const newItems = [...workoutItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setWorkoutItems(newItems);
  };
  const addSet = (itemId) => { setWorkoutItems(prev => prev.map(item => { if (item.id === itemId) { const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : { weight: '', reps: '', lReps: '', rReps: '' }; return { ...item, sets: [...(item.sets || []), { id: generateId(), weight: lastSet.weight || '', reps: lastSet.reps || '', lReps: lastSet.lReps || '', rReps: lastSet.rReps || '', dropSets: lastSet.dropSets ? lastSet.dropSets.map(ds => ({...ds, id: generateId()})) : undefined, superDropSets: lastSet.superDropSets ? lastSet.superDropSets.map(ds => ({...ds, id: generateId()})) : undefined, superDropSets3: lastSet.superDropSets3 ? lastSet.superDropSets3.map(ds => ({...ds, id: generateId()})) : undefined }]}; } return item; })); };
  const removeSet = (itemId, setId) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, sets: (item.sets || []).filter(set => set.id !== setId) } : item));
  const reorderSet = (itemId, dragIndex, dropIndex) => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; const newSets = [...(item.sets || [])]; const [dragged] = newSets.splice(dragIndex, 1); newSets.splice(dropIndex, 0, dragged); return { ...item, sets: newSets }; })); };
  const updateSetField = (itemId, setId, field, value) => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: (item.sets || []).map(set => set.id === setId ? { ...set, [field]: value } : set) }; })); };

  const addDropSet = (itemId, parentSetId, targetArray = 'dropSets') => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, [targetArray]: [...(set[targetArray] || []), { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]}; })}; })); }
  const removeDropSet = (itemId, parentSetId, dropId, targetArray = 'dropSets') => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, [targetArray]: (set[targetArray] || []).filter(ds => ds.id !== dropId) }; })}; })); }
  const updateDropSetField = (itemId, parentSetId, dropId, field, value, targetArray = 'dropSets') => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, [targetArray]: (set[targetArray] || []).map(ds => ds.id === dropId ? { ...ds, [field]: value } : ds) }; })}; })); }

  const handleSave = () => {
    const isValid = workoutItems.every(item => {
      if (!item.exerciseName || !item.sets || item.sets.length === 0) return false;
      if (item.weightType === 'cardio') return item.sets.every(set => set.distance !== '' || set.time !== '' || set.calories !== '');
      if (item.weightType === 'lr') return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.lReps !== '' || set.rReps !== ''));
      return item.sets.every(set => (set.weight !== '' || item.weightType === 'bodyWeight') && (set.reps !== '' || set.forcedReps));
    });
    if (!isValid || workoutItems.length === 0) { alert("種目を選択し、すべての重量と回数を入力してください。"); return; }

    const newStartTimestamp = new Date(`${editDate}T${editStartTime}`).getTime();
    const newEndTimestamp = new Date(`${editDate}T${editEndTime}`).getTime();
    const duration = newEndTimestamp - newStartTimestamp;

    onSave(post.id, {
      items: workoutItems,
      bodyWeight: editBodyWeight ? Number(editBodyWeight) : null,
      bodyFat: editBodyFat ? Number(editBodyFat) : null,
      startTime: isNaN(newStartTimestamp) ? post.startTime : newStartTimestamp,
      endTime: isNaN(newEndTimestamp) ? post.endTime : newEndTimestamp,
      duration: (duration > 0 && !isNaN(duration)) ? duration : post.duration,
      timestamp: isNaN(newEndTimestamp) ? post.timestamp : newEndTimestamp,
      date: isNaN(newEndTimestamp) ? post.date : new Date(newEndTimestamp).toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-slate-950 rounded-t-3xl flex flex-col h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pt-safe sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">記録の編集</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div id="edit-modal-scroll-container" className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Settings size={16} className="text-slate-400" /> トレーニング情報
            </h3>
            
            <div className="space-y-4">
              <div className="min-w-0 overflow-hidden w-full">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">日付</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 sm:px-3 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500 box-border" style={{ fontSize: '16px' }} />
              </div>
              
              <div className="flex gap-2 sm:gap-3 w-full">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">開始</label>
                  <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-1 sm:px-2 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500 box-border" style={{ fontSize: '16px' }} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">終了</label>
                  <input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-1 sm:px-2 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500 box-border" style={{ fontSize: '16px' }} />
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">体重 (kg)</label>
                  <input type="number" inputMode="decimal" step="0.1" value={editBodyWeight} onChange={e => setEditBodyWeight(e.target.value)} className="w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 sm:px-3 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">体脂肪率 (%)</label>
                  <input type="number" inputMode="decimal" step="0.1" value={editBodyFat} onChange={e => setEditBodyFat(e.target.value)} className="w-full min-w-0 block appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 sm:px-3 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
            {MUSCLE_CATEGORIES.map(cat => {
              const isSelected = selectedCategories.includes(cat);
              return <button key={cat} onClick={() => toggleCategory(cat)} className={`py-2.5 px-1 rounded-xl text-sm font-bold transition-all border ${getCategoryTabColor(cat, isSelected)}`}>{cat}</button>;
            })}
          </div>

          {selectedCategories.length > 0 && availableExercises.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm mb-4">
              <p className="text-slate-500 dark:text-slate-400 mb-2 text-sm font-bold">この部位に該当する種目がありません。</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">種目タブから追加してください。</p>
            </div>
          )}

          {workoutItems.map((item, index) => (
             <div key={item.id}
                ref={(el) => (itemDnd.refs.current[index] = el)}
                draggable={itemDnd.draggableId === item.id}
                onDragStart={(e) => itemDnd.handlers.onDragStart(e, index)}
                onDragOver={(e) => itemDnd.handlers.onDragOver(e, index)}
                onDragLeave={itemDnd.handlers.onDragLeave}
                onDrop={(e) => itemDnd.handlers.onDrop(e, index)}
                onDragEnd={itemDnd.handlers.onDragEnd}
                className={`relative transition-all duration-200 ${itemDnd.draggedIndex === index ? (itemDnd.dragOverIndex === index ? 'opacity-70 scale-[0.98] ring-2 ring-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] rounded-2xl' : 'opacity-40 scale-[0.98] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl') : ''}`}
             >
                {itemDnd.dragOverIndex === index && itemDnd.draggedIndex !== index && <div className={`absolute left-0 w-full h-1.5 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse ${itemDnd.draggedIndex < itemDnd.dragOverIndex ? '-bottom-2' : '-top-2'}`} />}
                <WorkoutItemForm 
                  item={item} 
                  index={index}
                  availableExercises={availableExercises} 
                  updateItem={updateItem} 
                  removeItem={removeExerciseItem}
                  addSet={addSet} 
                  removeSet={removeSet} 
                  updateSet={updateSetField} 
                  addDropSet={addDropSet} 
                  removeDropSet={removeDropSet} 
                  updateDropSet={updateDropSetField}
                  reorderSet={reorderSet}
                  myPastPosts={myPastPosts}
                  isDragging={itemDnd.draggedIndex === index}
                  isAnyDragging={itemDnd.draggedIndex !== null}
                  dragHandleProps={{
                    onMouseEnter: () => itemDnd.setDraggableId(item.id),
                    onMouseLeave: () => itemDnd.setDraggableId(null),
                    onTouchStart: (e) => { itemDnd.setDraggableId(item.id); itemDnd.handlers.onTouchStart(e, index); },
                    onTouchMove: itemDnd.handlers.onTouchMove,
                    onTouchEnd: itemDnd.handlers.onTouchEnd,
                    onTouchCancel: itemDnd.handlers.onTouchCancel
                  }}
                />
             </div>
          ))}

          <button onClick={addExerciseItem} className="w-full py-4 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"><ListPlus size={18} /> 次の種目を追加</button>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
          <button onClick={handleSave} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-md transition-all shadow-emerald-500/30">
            変更を保存
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 種目・ジム管理画面 ---
function ExercisesView({ gyms, exercises, posts, accountsInfo, currentUser, myInfo }) {
  const isAdmin = accountsInfo[currentUser]?.googleUid === 'TApwsmyv0TNyeQezlA16FntSZ4B3';
  const joinedGyms = myInfo?.joinedGyms || ['common'];
  const mutedExercises = myInfo?.mutedExercises || [];

  const [activeTab, setActiveTab] = useState('exercises'); 
  const [newGymName, setNewGymName] = useState('');
  const [selectedGymId, setSelectedGymId] = useState(isAdmin ? 'common' : (joinedGyms.find(id => id !== 'common') || ''));
  const [filterGymId, setFilterGymId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingGymId, setEditingGymId] = useState(null);
  const [editGymName, setEditGymName] = useState('');
  const [newExName, setNewExName] = useState('');
  const [newExMaker, setNewExMaker] = useState('');
  const [newExWeightType, setNewExWeightType] = useState('total'); 
  const [newExCategory, setNewExCategory] = useState('胸');
  const [newExFreeWeightType, setNewExFreeWeightType] = useState('barbell');
  const [isAdding, setIsAdding] = useState(false);
  const [showMembersGymId, setShowMembersGymId] = useState(null);

  const [editingExId, setEditingExId] = useState(null);
  const [editingExOldName, setEditingExOldName] = useState('');
  const [editExName, setEditExName] = useState('');
  const [editExMaker, setEditExMaker] = useState('');
  const [editExWeightType, setEditExWeightType] = useState('total'); 
  const [editExCategory, setEditExCategory] = useState('胸');
  const [editingExGymId, setEditingExGymId] = useState('');
  const [editExFreeWeightType, setEditExFreeWeightType] = useState('barbell');

  const handleAddGym = async (e) => {
    e.preventDefault();
    if (!newGymName.trim()) return;
    setIsAdding(true);
    const newDocId = `gym_${Date.now()}`;
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', newDocId), { 
        name: newGymName.trim(), 
        createdAt: Date.now(),
        owner: currentUser,
        members: [currentUser]
      }); 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        joinedGyms: [...new Set([...joinedGyms, newDocId])] 
      }, { merge: true });
      setNewGymName(''); 
      setSelectedGymId(newDocId); 
    } catch (e) {}
    setIsAdding(false);
  };

  const handleUpdateGym = async (e, gymId) => {
    e.preventDefault();
    if (!editGymName.trim()) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { name: editGymName.trim() }, { merge: true }); setEditingGymId(null); } catch (e) {}
  };

  const handleJoinGym = async (gymId) => {
    if (joinedGyms.includes(gymId)) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        joinedGyms: [...new Set([...joinedGyms, gymId])] 
      }, { merge: true });
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym) {
        const members = targetGym.members || [];
        if (!members.includes(currentUser)) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { 
            members: [...members, currentUser] 
          }, { merge: true });
        }
      }
    } catch (e) {}
  };

  const handleLeaveGym = async (gymId) => {
    if (gymId === 'common') {
      alert("フリーウェイト（共通）グループは退会できません。");
      return;
    }
    if (!window.confirm("このジムグループから退会しますか？登録されているマシンなどの種目が表示されなくなります。")) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        joinedGyms: joinedGyms.filter(id => id !== gymId) 
      }, { merge: true });
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym) {
        const members = targetGym.members || [];
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { 
          members: members.filter(m => m !== currentUser) 
        }, { merge: true });
      }
    } catch (e) {}
  };

  const handleMuteExercise = async (exName) => {
    const newMuted = mutedExercises.includes(exName) 
      ? mutedExercises.filter(name => name !== exName) 
      : [...mutedExercises, exName];
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { 
        mutedExercises: newMuted 
      }, { merge: true });
    } catch (e) {}
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!newExName.trim() || !selectedGymId) return;
    setIsAdding(true);
    const newDocId = `ex_${Date.now()}`;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', newDocId), { name: newExName.trim(), maker: newExMaker.trim(), gymId: selectedGymId, weightType: newExWeightType, category: newExCategory, freeWeightType: selectedGymId === 'common' ? newExFreeWeightType : null, createdAt: Date.now() });
      setNewExName(''); setNewExMaker(''); setNewExWeightType('total'); setNewExCategory('胸'); setNewExFreeWeightType('barbell');
    } catch (e) {}
    setIsAdding(false);
  };

  const startEdit = (ex) => { setEditingExId(ex.id); setEditingExOldName(ex.name); setEditExName(ex.name); setEditExMaker(ex.maker || ''); setEditExWeightType(ex.weightType || 'total'); setEditExCategory(ex.category || 'その他'); setEditingExGymId(ex.gymId || ''); setEditExFreeWeightType(ex.freeWeightType || (ex.name.includes('ダンベル') ? 'dumbbell' : ex.name.includes('スミス') ? 'smith' : 'barbell')); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => { setEditingExId(null); setEditingExOldName(''); };

  const handleUpdateExercise = async (e) => {
    e.preventDefault();
    if (!editExName.trim()) return;
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', editingExId), { name: editExName.trim(), maker: editExMaker.trim(), weightType: editExWeightType, category: editExCategory, gymId: editingExGymId, freeWeightType: editingExGymId === 'common' ? editExFreeWeightType : null }, { merge: true }); 

      if (posts && posts.length > 0) {
        const postsToUpdate = posts.filter(post => {
          if (!post.items) return false;
          return post.items.some(item => 
            item.exerciseName === editingExOldName || 
            item.superExerciseName === editingExOldName || 
            item.superExerciseName3 === editingExOldName
          );
        });

        if (postsToUpdate.length > 0) {
          const updatePromises = postsToUpdate.map(async (post) => {
            const updatedItems = post.items.map(item => {
              let newItem = { ...item };
              if (newItem.exerciseName === editingExOldName) {
                newItem.exerciseName = editExName.trim();
                newItem.category = editExCategory;
                newItem.weightType = editExWeightType;
              }
              if (newItem.isSuperSet && newItem.superExerciseName === editingExOldName) {
                newItem.superExerciseName = editExName.trim();
                newItem.superWeightType = editExWeightType;
              }
              if (newItem.isSuperSet && newItem.superExerciseName3 === editingExOldName) {
                newItem.superExerciseName3 = editExName.trim();
                newItem.superWeightType3 = editExWeightType;
              }
              return newItem;
            });

            const baseWeight = Number(post.bodyWeight) || Number(accountsInfo[post.author]?.weight) || 60;
            const { processedItems, totalVolume, totalCalories } = calculateWorkoutTotals(updatedItems, post.duration, baseWeight);
            const totalSets = processedItems.reduce((acc, it) => acc + (it.sets?.length || 0), 0);

            return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', post.id), {
              items: processedItems,
              volume: totalVolume,
              calories: totalCalories,
              totalSets: totalSets
            }, { merge: true });
          });
          
          await Promise.all(updatePromises);
        }
      }

      setEditingExId(null); 
      setEditingExOldName(''); 
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGym = async (gymId, gymName) => {
    if (!window.confirm(`${gymName}を削除しますか？登録されている種目や他の参加メンバーの所属情報も削除されます。`)) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId));
      const gymExs = exercises.filter(ex => ex.gymId === gymId);
      for (let ex of gymExs) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', ex.id));
      }
      const targetGym = gyms.find(g => g.id === gymId);
      if (targetGym && targetGym.members) {
        for (let mId of targetGym.members) {
          const mInfo = accountsInfo[mId];
          if (mInfo && mInfo.joinedGyms) {
            const nextJoined = mInfo.joinedGyms.filter(id => id !== gymId);
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', mId), { joinedGyms: nextJoined }, { merge: true });
          } 
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteExercise = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', id)); } catch (e) {}
  };

  const myFriends = myInfo.friends || [];
  const discoverableGyms = gyms.filter(gym => {
    if (gym.id === 'common') return false;
    if (joinedGyms.includes(gym.id)) return false;
    return myFriends.some(f => (gym.members || []).includes(f) || gym.owner === f);
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">種目とジムの管理</h2>
      
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-6">
        <button onClick={() => setActiveTab('exercises')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'exercises' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>種目リスト</button>
        <button onClick={() => setActiveTab('gyms')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'gyms' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>参加中のジム</button>
        <button onClick={() => setActiveTab('discover')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'discover' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>フレンドのジム</button>
      </div>

      {activeTab === 'gyms' && (
        <div className="space-y-6 animate-in fade-in">
          <form onSubmit={handleAddGym} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">新しいジムグループを作成</h3>
            <div className="flex gap-2">
              <input type="text" value={newGymName} onChange={e => setNewGymName(e.target.value)} required placeholder="例: ビークイック八幡" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
              <button type="submit" disabled={isAdding || !newGymName.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 rounded-xl transition-colors disabled:opacity-50">作成</button>
            </div>
          </form>

          <div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 ml-1">参加中のジムグループ</h3>
            <div className="space-y-3">
              {gyms.filter(g => joinedGyms.includes(g.id)).map(gym => {
                const isOwner = gym.owner === currentUser;
                const membersList = gym.members || [];
                const creatorName = accountsInfo[gym.owner]?.displayName || gym.owner || 'システム';
                return (
                  <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{gym.name}</span>
                        <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">作成者: {creatorName}</div>
                      </div>
                      
                      <div className="flex gap-1">
                        {gym.id !== 'common' && (
                          <button onClick={() => setShowMembersGymId(showMembersGymId === gym.id ? null : gym.id)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            メンバー ({membersList.length})
                          </button>
                        )}
                        {gym.id !== 'common' && isOwner && ( 
                          <>
                            <button onClick={() => { setEditingGymId(gym.id); setEditGymName(gym.name); }} className="p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteGym(gym.id, gym.name)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </>
                        )}
                        {gym.id !== 'common' && !isOwner && (
                          <button onClick={() => handleLeaveGym(gym.id)} className="px-3 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors">退会</button>
                        )}
                      </div>
                    </div>

                    {editingGymId === gym.id && (
                       <form onSubmit={(e) => handleUpdateGym(e, gym.id)} className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <input type="text" value={editGymName} onChange={(e) => setEditGymName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }} autoFocus />
                          <button type="submit" className="text-xs bg-emerald-500 text-white px-3 rounded-lg font-bold shadow-sm">保存</button>
                          <button type="button" onClick={() => setEditingGymId(null)} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 rounded-lg font-bold shadow-sm">キャンセル</button>
                       </form>
                    )}

                    {showMembersGymId === gym.id && (
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 animate-in fade-in">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">参加中メンバー</div>
                        <div className="flex flex-wrap gap-3">
                          {membersList.map(mId => {
                            const mInfo = accountsInfo[mId];
                            return (
                              <div key={mId} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold overflow-hidden">
                                  {mInfo?.photoUrl ? <img src={mInfo.photoUrl} alt="member" className="w-full h-full object-cover"/> : mId.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[80px]">{mInfo?.displayName || mId}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'discover' && (
        <div className="space-y-4 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">フレンドが参加しているジムグループ</h3>
          {discoverableGyms.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
              <MapPin className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">現在フレンドから共有された未所属のジムはありません。</p>
            </div>
          ) : (
            discoverableGyms.map(gym => {
              const membersList = gym.members || [];
              const creatorName = accountsInfo[gym.owner]?.displayName || gym.owner || 'システム';
              return (
                <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{gym.name}</h4>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">作成者: {creatorName} ｜ メンバー: {membersList.length}名</div>
                  </div>
                  <button onClick={() => handleJoinGym(gym.id)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1">
                    <Plus size={14}/> 参加して共有
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="space-y-6 animate-in fade-in">
          {gyms.filter(g => joinedGyms.includes(g.id)).length === 0 ? (
            <div className="text-center py-8"><p className="text-slate-500 dark:text-slate-400 text-sm mb-4 font-bold">先に「参加中のジム」タブから所属するジムを決定してください。</p></div>
          ) : ( 
            <>
              {editingExId ? (
                <form onSubmit={handleUpdateExercise} className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 shadow-sm relative animate-in slide-in-from-top-4">
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2"><Edit2 size={16}/> 種目の編集</h3>
                  <button type="button" onClick={cancelEdit} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20}/></button>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">対象のジムグループ <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select value={editingExGymId} onChange={e => setEditingExGymId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                          {gyms.filter(g => joinedGyms.includes(g.id)).map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                      </div>
                    </div>
                    {editingExGymId === 'common' && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-2">
                         <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mb-2">
                           ※フリーウェイトとして登録できるのは「ダンベル」「バーベル（EZバー含む）」「スミス」のみです。
                         </p>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">フリーウェイトの種類 <span className="text-rose-500">*</span></label>
                         <div className="flex gap-2">
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExFreeWeightType === 'barbell' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="barbell" checked={editExFreeWeightType === 'barbell'} onChange={(e) => setEditExFreeWeightType(e.target.value)} className="hidden"/>バーベル</label>
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExFreeWeightType === 'dumbbell' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="dumbbell" checked={editExFreeWeightType === 'dumbbell'} onChange={(e) => setEditExFreeWeightType(e.target.value)} className="hidden"/>ダンベル</label>
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExFreeWeightType === 'smith' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="smith" checked={editExFreeWeightType === 'smith'} onChange={(e) => setEditExFreeWeightType(e.target.value)} className="hidden"/>スミス</label>
                         </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">部位カテゴリ</label>
                      <div className="relative">
                        <select value={editExCategory} onChange={e => setEditExCategory(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                          {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                      </div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">種目名 <span className="text-rose-500">*</span></label><input type="text" value={editExName} onChange={e => setEditExName(e.target.value)} required className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メーカー (任意)</label><input type="text" value={editExMaker} onChange={e => setEditExMaker(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">重さの単位/記録方法 <span className="text-rose-500">*</span></label>
                       <div className="grid grid-cols-2 gap-2">
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'total' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="total" checked={editExWeightType === 'total'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>合計 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'oneSide' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="oneSide" checked={editExWeightType === 'oneSide'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>片側 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'plate' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="plate" checked={editExWeightType === 'plate'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>プレートロード(枚)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'lr' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="lr" checked={editExWeightType === 'lr'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>片側種目 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'bodyWeight' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="bodyWeight" checked={editExWeightType === 'bodyWeight'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>自重種目(+kg,-kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'cardio' ? 'bg-cyan-500 text-white border-cyan-600' : 'bg-white dark:bg-slate-900 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-slate-300'}`}><input type="radio" value="cardio" checked={editExWeightType === 'cardio'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>有酸素(距離/時間/kcal)</label>
                       </div>
                    </div>
                    <button type="submit" disabled={!editExName.trim()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl mt-2 transition-colors disabled:opacity-50 shadow-md">更新して保存</button>
                  </div>
                </form>
              ) : ( 
                <form onSubmit={handleAddExercise} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">新しい種目を登録</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">登録先のジムグループ <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select value={selectedGymId} onChange={e => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                          {gyms.filter(g => joinedGyms.includes(g.id)).map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                      </div>
                    </div>
                    {selectedGymId === 'common' && (
                      <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                         <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mb-2">
                           ※フリーウェイトとして登録できるのは「ダンベル」「バーベル（EZバー含む）」「スミス」のみです。
                         </p>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">フリーウェイトの種類 <span className="text-rose-500">*</span></label>
                         <div className="flex gap-2">
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExFreeWeightType === 'barbell' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="barbell" checked={newExFreeWeightType === 'barbell'} onChange={(e) => setNewExFreeWeightType(e.target.value)} className="hidden"/>バーベル</label>
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExFreeWeightType === 'dumbbell' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="dumbbell" checked={newExFreeWeightType === 'dumbbell'} onChange={(e) => setNewExFreeWeightType(e.target.value)} className="hidden"/>ダンベル</label>
                           <label className={`flex-1 text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExFreeWeightType === 'smith' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="smith" checked={newExFreeWeightType === 'smith'} onChange={(e) => setNewExFreeWeightType(e.target.value)} className="hidden"/>スミス</label>
                         </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">部位カテゴリ <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select value={newExCategory} onChange={e => setNewExCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                          {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                      </div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">種目名 <span className="text-rose-500">*</span></label><input type="text" value={newExName} onChange={e => setNewExName(e.target.value)} required placeholder="例: ベンチプレス" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メーカー (任意)</label><input type="text" value={newExMaker} onChange={e => setNewExMaker(e.target.value)} placeholder="例: Hammer Strength" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">重さの単位/記録方法 <span className="text-rose-500">*</span></label>
                       <div className="grid grid-cols-2 gap-2">
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'total' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="total" checked={newExWeightType === 'total'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>合計 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'oneSide' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="oneSide" checked={newExWeightType === 'oneSide'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>片側 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'plate' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="plate" checked={newExWeightType === 'plate'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>プレートロード(枚)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'lr' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="lr" checked={newExWeightType === 'lr'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>片側種目 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'bodyWeight' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="bodyWeight" checked={newExWeightType === 'bodyWeight'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>自重種目(+kg,-kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'cardio' ? 'bg-cyan-50 dark:bg-cyan-950 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><input type="radio" value="cardio" checked={newExWeightType === 'cardio'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>有酸素(距離/時間/kcal)</label>
                       </div>
                    </div>
                    <button type="submit" disabled={isAdding || !newExName.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-3 rounded-xl mt-2 transition-colors disabled:opacity-50">種目を登録</button>
                  </div>
                </form>
              )}

              <div>
                <div className="flex flex-col mb-3 ml-1 gap-2">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">登録済みの種目</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select value={filterGymId} onChange={e => setFilterGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-xs">
                        <option value="all">すべてのジム・器具</option>
                        {gyms.filter(g => joinedGyms.includes(g.id)).map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
                    </div>
                    <div className="relative flex-1">
                      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-xs">
                        <option value="all">すべての部位</option>
                        {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {gyms.filter(gym => joinedGyms.includes(gym.id) && (filterGymId === 'all' || gym.id === filterGymId)).map(gym => {
                    const gymExercises = exercises.filter(ex => {
                      if (ex.gymId !== gym.id) return false;
                      if (filterCategory !== 'all' && ex.category !== filterCategory) return false;
                      return true;
                    }).sort((a, b) => {
                      const idxA = MUSCLE_CATEGORIES.indexOf(a.category);
                      const idxB = MUSCLE_CATEGORIES.indexOf(b.category);
                      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
                    });
                    if (gymExercises.length === 0) return null;
                    return (
                      <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 dark:bg-slate-950 px-3 py-2 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-1"><MapPin size={14} className="text-emerald-500"/> {gym.name}</div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {gymExercises.map(ex => {
                            const isMuted = mutedExercises.includes(ex.name);
                            return (
                              <div key={ex.id} className={`p-3 flex justify-between items-center group transition-opacity ${isMuted ? 'opacity-40' : 'opacity-100'}`}>
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                                    {ex.name}
                                    {ex.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(ex.category)}`}>{ex.category}</span>}
                                    {isMuted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">非表示中</span>}
                                  </p>
                                  <div className="flex gap-2 mt-1">
                                    {ex.maker && <span className="text-xs text-slate-400 dark:text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{ex.maker}</span>}
                                    {ex.weightType && <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                                      {ex.weightType === 'oneSide' ? '片側(kg)' : ex.weightType === 'plate' ? 'プレートロード(枚)' : ex.weightType === 'lr' ? '片側種目' : ex.weightType === 'bodyWeight' ? '加重/アシスト' : ex.weightType === 'cardio' ? '有酸素(距離/時間/kcal)' : '合計(kg)'}
                                    </span>}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => handleMuteExercise(ex.name)} className={`p-2 rounded-lg transition-colors border ${isMuted ? 'text-indigo-400 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900' : 'text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:bg-slate-100'}`} title={isMuted ? '表示する' : '非表示にする'}>
                                    <EyeOff size={16}/>
                                  </button>
                                  <>
                                    <button onClick={() => startEdit(ex)} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-100 dark:border-slate-800"><Edit2 size={16} /></button>
                                    <button onClick={() => { if(window.confirm(`${ex.name}を削除しますか？`)) handleDeleteExercise(ex.id); }} className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-100 dark:border-slate-800"><Trash2 size={16} /></button>
                                  </>
                                </div>
                              </div>
                            );
                          })}
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
  );
}

// --- フレンド画面 ---
function FriendsView({ currentUser, myInfo, accountsInfo, onSendRequest, onAccept, onReject, onRemoveFriend, onFriendClick, onGenerateFriendCode }) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [searchUsername, setSearchUsername] = useState('');
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timerId);
  }, []);

  const getTimeAgo = (timestamp) => {
    if (!timestamp || timestamp === 0) return '不明';
    const diff = Math.max(0, currentTime - timestamp);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSendRequest(searchUsername.trim());
    setSearchUsername('');
  };

  const myFriends = myInfo.friends || [];

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">フレンド</h2>
      
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-6">
        <button onClick={() => setActiveTab('friends')} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${activeTab === 'friends' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>フレンド一覧</button>
        <button onClick={() => setActiveTab('add')} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${activeTab === 'add' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>フレンド追加</button>
      </div>

      {activeTab === 'add' && (
        <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
             <UserPlus size={18} className="text-emerald-500" /> フレンドコードで検索
          </h3>
          <div className="flex gap-2">
            <input type="text" value={searchUsername} onChange={e => setSearchUsername(e.target.value)} required placeholder="5桁のコードを入力" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
            <button type="submit" disabled={!searchUsername.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 rounded-xl transition-colors disabled:opacity-50 shadow-sm">追加</button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-bold">※追加したフレンドの記録はタイムラインやデータ画面に表示されます。</p>
        </form>
      )}

      {activeTab === 'friends' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 flex items-center justify-between shadow-sm mb-6">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">あなたのフレンドコード</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300 tracking-widest">{myInfo.friendCode || '未発行'}</p>
            </div>
            {myInfo.friendCode ? (
               <button onClick={() => { navigator.clipboard.writeText(myInfo.friendCode); alert('コピーしました'); }} className="p-2 bg-white dark:bg-slate-900 rounded-lg text-emerald-500 shadow-sm border border-emerald-100 dark:border-emerald-800 transition-colors hover:bg-emerald-100 dark:hover:bg-slate-800"><Copy size={18} /></button>
            ) : (
               <button onClick={onGenerateFriendCode} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-colors hover:bg-emerald-600">発行する</button>
            )}
          </div>

          {myInfo.friendRequests && myInfo.friendRequests.length > 0 && (
             <div className="mb-6 space-y-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">承認待ち</h3>
                {myInfo.friendRequests.map(reqUser => (
                   <div key={reqUser} className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 overflow-hidden">
                            {accountsInfo[reqUser]?.photoUrl ? <img src={accountsInfo[reqUser].photoUrl} alt={reqUser} className="w-full h-full object-cover" /> : reqUser.charAt(0).toUpperCase()}
                         </div>
                         <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{accountsInfo[reqUser]?.displayName || reqUser}</span>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => onAccept(reqUser)} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors">承認</button>
                         <button onClick={() => onReject(reqUser)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors">拒否</button>
                      </div>
                   </div>
                ))}
             </div>
          )}

          {myFriends.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
              <Users className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-bold">フレンドがいません。</p>
              <button onClick={() => setActiveTab('add')} className="mt-4 text-emerald-500 font-bold text-sm bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-900">フレンドを追加する</button>
            </div>
          ) : (
            myFriends.map(friendUsername => {
              const friendInfo = accountsInfo[friendUsername];
              if (!friendInfo) return null;
              
              const isTraining = friendInfo.isTraining;
              const lastActive = friendInfo.lastActive || 0;
              const isAppOnline = friendInfo.isAppOnline !== false;
              const isOnline = isAppOnline && lastActive > 0 && (currentTime - lastActive < 45000);

              return (
                <div key={friendUsername} onClick={() => onFriendClick && onFriendClick(friendUsername)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300 overflow-hidden">
                        {friendInfo.photoUrl ? <img src={friendInfo.photoUrl} alt={friendUsername} className="w-full h-full object-cover" /> : friendUsername.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white dark:border-slate-900 rounded-full z-10 ${isTraining ? 'bg-amber-400' : isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">{friendInfo.displayName || friendUsername}</h3>
                      {isTraining ? (
                        <p className="text-xs text-amber-500 font-bold flex items-center gap-1"><Flame size={12}/>トレーニング中 {friendInfo.currentExerciseName ? `- ${friendInfo.currentExerciseName}` : ''}</p>
                      ) : isOnline ? (
                        <p className="text-xs text-emerald-500 font-bold">オンライン</p>
                      ) : (
                        <p className="text-xs text-slate-400 font-bold">最終アクセス: {getTimeAgo(lastActive)}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveFriend(friendUsername); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="mt-12 text-center pb-4 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">WithFit v1.0.0 (2026.7.15, 21:52, updated)</p>
      </div>
    </div>
  );
}

// --- フレンド詳細モーダル ---
function FriendDetailModal({ friendUsername, posts, accountsInfo, onClose, onToggleLike, onImport, currentUser }) {
  const friendInfo = accountsInfo[friendUsername] || {};

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center sm:items-center animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-slate-950 sm:rounded-3xl rounded-t-3xl flex flex-col h-[90vh] sm:h-[85vh] w-full sm:max-w-md overflow-hidden shadow-2xl relative">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 pt-safe">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-xs bg-slate-600 border border-slate-200 dark:border-slate-700">
                {friendInfo.photoUrl ? <img src={friendInfo.photoUrl} alt={friendUsername} className="w-full h-full object-cover" /> : friendUsername.charAt(0).toUpperCase()}
             </div>
             <h2 className="text-lg font-bold text-slate-800 dark:text-white">{friendInfo.displayName || friendUsername}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 sm:pb-4">
           {friendInfo.goal && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">目標</p>
                 <p className="text-sm text-slate-800 dark:text-slate-200 font-bold">{friendInfo.goal}</p>
              </div>
           )}

           <DataView posts={posts} currentUser={currentUser} targetUser={friendUsername} accountsInfo={accountsInfo} onImport={onImport} onToggleLike={onToggleLike} />
        </div>
      </div>
    </div>
  );
}

// --- ナビゲーションボタン ---
function NavButton({ icon, label, isActive, onClick, isPrimary, isTraining }) {
  if (isPrimary) {
    return (
      <button onClick={onClick} className="flex flex-col items-center justify-center -mt-8 relative group">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 text-white ${isTraining ? 'bg-amber-500 shadow-amber-500/40 scale-110' : isActive ? 'bg-indigo-500 shadow-indigo-500/40 scale-110' : 'bg-slate-800 dark:bg-slate-700 border-4 border-white dark:border-slate-800 group-hover:bg-slate-700 dark:group-hover:bg-slate-600'}`}><div>{icon}</div></div>
        <span className={`text-[10px] mt-1 font-bold transition-colors ${isTraining ? 'text-amber-500' : isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
      </button>
    );
  }
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
      <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}