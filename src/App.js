import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Home, PlusCircle, Users, Dumbbell, LogOut, Activity, Flame, Lock, Settings, Trash2, Plus, X, ListPlus, MapPin, Clock, Play, Circle, Edit2, KeyRound, AlignLeft, Scale, Calendar as CalendarIcon, Zap, TrendingDown, Copy, Moon, Sun, Target, Trophy, ArrowUp, ArrowDown } from 'lucide-react';
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

  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Offline persistence error:", err.code);
    });
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const MUSCLE_CATEGORIES = ['胸', '背中', '肩', '腕', '脚', 'その他'];

// --- カラーユーティリティ ---
const getCategoryColor = (category) => {
  switch (category) {
    case '胸': return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-900';
    case '背中': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-900';
    case '肩': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
    case '腕': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border border-purple-200 dark:border-purple-900';
    case '脚': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900';
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
    default: return 'bg-slate-600 text-white border-slate-600 shadow-sm';
  }
}

// --- ユーティリティ関数 ---
const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

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

const formatShortDateTime = (timestamp) => {
  if (!timestamp || isNaN(new Date(timestamp).getTime())) return '';
  const date = new Date(timestamp);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]}) ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const calcSetVolume = (weight, reps, lReps, rReps, forcedReps, wType) => {
  if (wType === 'assist') return 0;

  let v = 0;
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  const l = Number(lReps) || 0;
  const rR = Number(rReps) || 0;
  const f = Number(forcedReps) || 0;

  if (wType === 'lr') {
    v += w * l;
    v += w * rR;
    v += w * f * 2; 
  } else if (wType === 'oneSide') {
    v += w * (r + f) * 2;
  } else if (wType === 'plate') {
    v += w * (r + f) * 5;
  } else {
    v += w * (r + f);
  }
  return v;
};

const calculateTotalVolume = (items) => {
  let volume = 0;
  if (!items || !Array.isArray(items)) return volume;
  items.forEach(item => {
    if (!item.sets || !Array.isArray(item.sets)) return;
    item.sets.forEach(set => {
      volume += calcSetVolume(set.weight, set.reps, set.lReps, set.rReps, set.forcedReps, item.weightType);
      if (item.isSuperSet) { 
        if (item.superExerciseName) volume += calcSetVolume(set.superWeight, set.superReps, set.superLReps, set.superRReps, set.superForcedReps, item.superWeightType); 
        if (item.superExerciseName3) volume += calcSetVolume(set.superWeight3, set.superReps3, set.superLReps3, set.superRReps3, set.superForcedReps3, item.superWeightType3); 
      }
      if (item.isDropSet && set.dropSets && Array.isArray(set.dropSets)) { 
        set.dropSets.forEach(ds => { 
          volume += calcSetVolume(ds.weight, ds.reps, ds.lReps, ds.rReps, ds.forcedReps, item.weightType); 
          if (item.isSuperSet) {
            if (item.superExerciseName) volume += calcSetVolume(ds.superWeight, ds.superReps, ds.superLReps, ds.superRReps, ds.superForcedReps, item.superWeightType); 
            if (item.superExerciseName3) volume += calcSetVolume(ds.superWeight3, ds.superReps3, ds.superLReps3, ds.superRReps3, ds.superForcedReps3, item.superWeightType3); 
          }
        }); 
      }
    });
  });
  return volume;
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
  const isMyPost = post.author === currentUser;
  const authorInfo = accountsInfo && accountsInfo[post.author];
  const userColor = post.author === '勇太' ? 'bg-indigo-500' : 'bg-rose-500';

  const renderSetRow = (setObj, wType, type, isDrop, label) => {
    const isLR = wType === 'lr';
    const isPlate = wType === 'plate';
    const isBodyWeight = wType === 'bodyWeight';
    const isAssist = wType === 'assist';
    
    const val = (f) => {
      let fieldName = f;
      if (type === 'super2') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1);
      if (type === 'super3') fieldName = 'super' + f.charAt(0).toUpperCase() + f.slice(1) + '3';
      return setObj[fieldName] || '';
    };

    const weight = val('weight');
    const reps = val('reps');
    const lReps = val('lReps');
    const rReps = val('rReps');
    const forcedReps = val('forcedReps');

    if (!weight && !reps && !lReps && !rReps) return null;

    const forced = forcedReps ? <span className="text-rose-500 text-xs ml-1">(+{forcedReps})</span> : null;

    let weightLabel = 'kg';
    if (isPlate) weightLabel = '枚';
    else if (wType === 'oneSide') weightLabel = 'kg(片)';
    else if (isBodyWeight) weightLabel = 'kg加重';
    else if (isAssist) weightLabel = 'kgアシスト';

    return (
      <div className={`flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-2 pt-2 last:border-0 ${isDrop ? 'pl-8' : ''}`}>
        <span className={`font-bold w-16 text-sm shrink-0 ${isDrop ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'} ${type !== 'main' && !isDrop ? 'pl-4 text-indigo-500 dark:text-indigo-400' : ''}`}>
          {label}
        </span>
        {isLR ? (
           <div className="flex-1 flex justify-between items-center px-1 gap-2 overflow-hidden">
             <span className="font-bold text-base tracking-wide text-slate-800 dark:text-slate-100 text-center w-20 shrink-0 whitespace-nowrap">
               {weight || 0} <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-0.5">kg</span>
             </span>
             <span className="font-bold text-sm sm:text-base tracking-wide text-slate-800 dark:text-slate-100 flex-1 text-right whitespace-nowrap overflow-hidden text-ellipsis">
               L:{lReps || 0} <span className="text-slate-300 dark:text-slate-600 font-normal mx-0.5">/</span> R:{rReps || 0}
               <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-0.5">回</span>
               {forced}
             </span>
           </div>
        ) : (
           <div className="flex-1 flex justify-between items-center px-1 gap-2">
             <span className="font-bold text-base tracking-wide text-slate-800 dark:text-slate-100 text-center flex-1 whitespace-nowrap">
               {isAssist && weight ? `-${weight}` : (weight || 0)} 
               <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">
                 {weightLabel}
               </span>
             </span>
             <span className="font-bold text-base tracking-wide text-slate-800 dark:text-slate-100 w-24 text-right shrink-0 whitespace-nowrap">
               {reps || 0} <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-0.5">回</span>
               {forced}
             </span>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden relative mb-4">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${isMyPost ? 'bg-slate-300 dark:bg-slate-600' : 'bg-emerald-400'}`}></div>
      <div className="flex justify-between items-start mb-4 pl-3">
        <div className="flex items-center gap-3 w-full overflow-hidden">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden shrink-0 ${isMyPost ? 'bg-slate-600 dark:bg-slate-500' : userColor}`}>
            {authorInfo?.photoUrl ? <img src={authorInfo.photoUrl} alt={post.author} className="w-full h-full object-cover" /> : post.author ? post.author.charAt(0) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{post.author || '不明'}</p>
            <div className="flex flex-col gap-1 mt-0.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {formatShortDateTime(post.timestamp)}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {post.gymName && <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900"><MapPin size={10}/> {post.gymName}</span>}
                {post.duration && <span className="flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"><Clock size={10}/> {formatDuration(post.duration)}</span>}
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

      {(post.bodyWeight || post.bodyFat) && (
        <div className="pl-3 mb-3 flex gap-2">
          <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900">
            <Scale size={14} />
            {post.bodyWeight && `${post.bodyWeight}kg`}
            {post.bodyWeight && post.bodyFat && ' / '}
            {post.bodyFat && `${post.bodyFat}%`}
          </div>
        </div>
      )}
      {(post.volume && !isNaN(post.volume) && post.volume > 0) ? (
        <div className="pl-3 mb-4">
          <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Flame size={14} className="text-orange-500" />
            総負荷量: {Number(post.volume).toLocaleString()}kg
            <span className="text-slate-400 dark:text-slate-500 font-normal">（{getVolumeMetaphor(post.volume)}）</span>
          </div>
        </div>
      ) : null}

      <div className="pl-3 space-y-3 mb-4">
        {post.items && Array.isArray(post.items) && post.items.map((item, idx) => (
          <div key={idx} className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Dumbbell size={14} className="text-emerald-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-[15px]">{item.exerciseName}</span>
                  {item.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(item.category)}`}>{item.category}</span>}
                </div>
                {item.isSuperSet && item.superExerciseName && (
                  <div className="flex items-center gap-2 flex-wrap pl-5">
                    <Zap size={14} className="text-indigo-400"/>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{item.superExerciseName}</span>
                  </div>
                )}
                {item.isSuperSet && item.superExerciseName3 && (
                  <div className="flex items-center gap-2 flex-wrap pl-5">
                    <Zap size={14} className="text-indigo-400"/>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{item.superExerciseName3}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {item.sets && Array.isArray(item.sets) && item.sets.map((set, sIdx) => (
                <div key={sIdx} className="mb-4 last:mb-0 bg-white/40 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                  {/* メメイン通常 */}
                  {renderSetRow(set, item.weightType, 'main', false, `set ${sIdx + 1}`)}
                  
                  {/* メメインドロップ */}
                  {item.isDropSet && set.dropSets && set.dropSets.map((ds, dsIdx) => (
                    renderSetRow(ds, item.weightType, 'main', true, '↳ drop')
                  ))}
                  
                  {/* スーパー2 通常＆ドロップ */}
                  {item.isSuperSet && item.superExerciseName && (
                    <>
                      {renderSetRow(set, item.superWeightType || 'total', 'super2', false, '↳ Sup2')}
                      {item.isDropSet && set.dropSets && set.dropSets.map((ds, dsIdx) => (
                        renderSetRow(ds, item.superWeightType || 'total', 'super2', true, '↳ drop2')
                      ))}
                    </>
                  )}

                  {/* スーパー3 通常＆ドロップ */}
                  {item.isSuperSet && item.superExerciseName3 && (
                    <>
                      {renderSetRow(set, item.superWeightType3 || 'total', 'super3', false, '↳ Sup3')}
                      {item.isDropSet && set.dropSets && set.dropSets.map((ds, dsIdx) => (
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
        
        {onImport && (
          <button onClick={() => onImport(post)} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/80 transition-colors border border-emerald-100 dark:border-emerald-900">
            <Copy size={14} /> この構成で開始
          </button>
        )}
      </div>
    </div>
  );
}

// --- 共通コンポーネント：ワークアウト入力フォーム ---
function WorkoutItemForm({ item, index, isFirst, isLast, availableExercises, updateItem, removeItem, moveItemUp, moveItemDown, addSet, removeSet, updateSet, addDropSet, removeDropSet, updateDropSet }) {
  
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
    if (type === 'bodyWeight') return '加重kg';
    if (type === 'assist') return '-補助kg';
    return '重量kg';
  };

  const renderInputRow = (setObj, wType, type, isDrop, dropId = null) => {
    const isLR = wType === 'lr';
    
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

      if (isDrop) updateDropSet(item.id, setObj._parentId, dropId, fieldName, v);
      else updateSet(item.id, setObj.id, fieldName, v);
    };

    return (
      <div className="flex-1 flex gap-2 min-w-0">
        {isLR ? (
          <>
            <input type="number" value={val('weight')} onChange={(e) => update('weight', e.target.value)} placeholder={getWeightPlaceholder(wType)} className="w-[64px] shrink-0 text-center text-base font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-emerald-500 py-2 px-0" style={{ fontSize: '16px' }}/>
            <div className="flex flex-1 items-center gap-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded px-2 min-w-0">
              <span className="text-xs text-slate-400 font-bold shrink-0">L:</span>
              <input type="number" value={val('lReps')} onChange={(e) => update('lReps', e.target.value)} placeholder="0" className="w-full text-center text-base font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none min-w-0" style={{ fontSize: '16px' }}/>
            </div>
            <div className="flex flex-1 items-center gap-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded px-2 min-w-0">
              <span className="text-xs text-slate-400 font-bold shrink-0">R:</span>
              <input type="number" value={val('rReps')} onChange={(e) => update('rReps', e.target.value)} placeholder="0" className="w-full text-center text-base font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none min-w-0" style={{ fontSize: '16px' }}/>
            </div>
          </>
        ) : (
          <>
            <input type="number" value={val('weight')} onChange={(e) => update('weight', e.target.value)} placeholder={getWeightPlaceholder(wType)} className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
            <input type="number" value={val('reps')} onChange={(e) => update('reps', e.target.value)} placeholder="回数" className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded py-2 px-1 text-center text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}/>
          </>
        )}
        {item.isForcedReps && (
          <input type="number" value={val('forcedReps')} onChange={(e) => update('forcedReps', e.target.value)} placeholder="+補" className="w-12 shrink-0 text-center text-sm font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded focus:outline-none focus:border-rose-500 py-2 px-0" style={{ fontSize: '16px' }}/>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative w-full overflow-hidden mb-6 transition-all duration-200">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => moveItemUp(index)} disabled={isFirst} className="p-1 text-slate-400 hover:text-emerald-500 disabled:opacity-30 bg-slate-50 dark:bg-slate-800 rounded transition-colors"><ArrowUp size={14}/></button>
            <button onClick={() => moveItemDown(index)} disabled={isLast} className="p-1 text-slate-400 hover:text-emerald-500 disabled:opacity-30 bg-slate-50 dark:bg-slate-800 rounded transition-colors"><ArrowDown size={14}/></button>
          </div>
          <div className="relative flex-1 min-w-0 ml-1">
            <select value={item.exerciseName} onChange={(e) => updateExerciseName(e.target.value, 0)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base pr-8" style={{ fontSize: '16px' }}>
              <option value="" disabled>種目を選択</option>
              {availableExercises.map(ex => <option key={ex.id} value={ex.name}>{ex.name}{ex.maker ? `（${ex.maker}）` : ''}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
          </div>
        </div>
        <button onClick={() => removeItem(item.id)} className="ml-2 text-slate-400 hover:text-rose-500 p-2 flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><Trash2 size={18} /></button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide py-1 pl-8">
        <button onClick={() => updateItem(item.id, { isSuperSet: !item.isSuperSet })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isSuperSet ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>スーパー</button>
        <button onClick={() => updateItem(item.id, { isDropSet: !item.isDropSet })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isDropSet ? 'bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>ドロップ</button>
        <button onClick={() => updateItem(item.id, { isForcedReps: !item.isForcedReps })} className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${item.isForcedReps ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>補助</button>
      </div>

      {item.isSuperSet && (
        <div className="mb-5 pl-8 border-l-2 border-indigo-300 dark:border-indigo-600 space-y-3">
          <div className="relative w-full">
            <select value={item.superExerciseName || ''} onChange={(e) => updateExerciseName(e.target.value, 2)} className="w-full bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold appearance-none focus:outline-none focus:border-indigo-300 text-base pr-8" style={{ fontSize: '16px' }}>
              <option value="" disabled>スーパーセットの種目 (2種目目)</option>
              {availableExercises.map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none text-xs">▼</div>
          </div>
          {item.superExerciseName && (
            <div className="relative w-full">
              <select value={item.superExerciseName3 || ''} onChange={(e) => updateExerciseName(e.target.value, 3)} className="w-full bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2 text-indigo-800 dark:text-indigo-300 font-bold appearance-none focus:outline-none focus:border-indigo-300 text-base pr-8" style={{ fontSize: '16px' }}>
                <option value="">ジャイアントセット (3種目目・任意)</option>
                {availableExercises.map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none text-xs">▼</div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 mb-5 w-full pl-2">
        <div className="flex text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1 mb-1">
          <div className="w-10 text-center shrink-0">Set</div>
          <div className="flex-1 text-center min-w-0">記録</div>
          <div className="w-6 shrink-0"></div>
        </div>
        
        {item.sets && Array.isArray(item.sets) && item.sets.map((set, sIndex) => (
          <div key={set.id} className="bg-slate-50/50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            {/* 1. メイン通常入力 */}
            <div className="flex items-center gap-2">
              <div className="w-10 text-center text-slate-400 dark:text-slate-500 font-bold text-sm shrink-0">{sIndex + 1}</div>
              {renderInputRow(set, item.weightType, 'main', false)}
              <button onClick={() => removeSet(item.id, set.id)} disabled={item.sets.length === 1} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 disabled:opacity-30 flex justify-center"><X size={18} /></button>
            </div>

            {/* 2. メインドロップ入力 */}
            {item.isDropSet && set.dropSets && set.dropSets.map(ds => (
              <div key={ds.id} className="border-l-2 border-orange-200 dark:border-orange-800 pl-3 flex items-center gap-2 ml-4">
                <TrendingDown size={16} className="text-orange-400 flex-shrink-0" />
                {renderInputRow({ ...ds, _parentId: set.id }, item.weightType, 'main', true, ds.id)}
                <button onClick={() => removeDropSet(item.id, set.id, ds.id)} className="w-6 flex-shrink-0 text-slate-400 hover:text-rose-500 flex justify-center"><X size={18} /></button>
              </div>
            ))}

            {/* ドロップ追加ボタン（メイン用） */}
            {item.isDropSet && (
              <button onClick={() => addDropSet(item.id, set.id)} className="ml-4 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded transition-colors font-bold flex items-center gap-1"><Plus size={12}/>ドロップ追加</button>
            )}

            {/* 3. スーパー2 通常＆ドロップ入力 */}
            {item.isSuperSet && item.superExerciseName && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pl-4 border-l-2 border-indigo-300 dark:border-indigo-600 ml-1">
                  <Zap size={16} className="text-indigo-400 flex-shrink-0" />
                  {renderInputRow(set, item.superWeightType || 'total', 'super2', false)}
                  <div className="w-6 shrink-0"></div>
                </div>
                {item.isDropSet && set.dropSets && set.dropSets.map(ds => (
                  <div key={`super2-ds-${ds.id}`} className="flex items-center gap-2 pl-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-5">
                    <TrendingDown size={14} className="text-indigo-300 flex-shrink-0" />
                    {renderInputRow({ ...ds, _parentId: set.id }, item.superWeightType || 'total', 'super2', true, ds.id)}
                    <div className="w-6 shrink-0"></div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 4. スーパー3 通常＆ドロップ入力 */}
            {item.isSuperSet && item.superExerciseName3 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pl-4 border-l-2 border-indigo-300 dark:border-indigo-600 ml-1">
                  <Zap size={16} className="text-indigo-400 flex-shrink-0" />
                  {renderInputRow(set, item.superWeightType3 || 'total', 'super3', false)}
                  <div className="w-6 shrink-0"></div>
                </div>
                {item.isDropSet && set.dropSets && set.dropSets.map(ds => (
                  <div key={`super3-ds-${ds.id}`} className="flex items-center gap-2 pl-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-5">
                    <TrendingDown size={14} className="text-indigo-300 flex-shrink-0" />
                    {renderInputRow({ ...ds, _parentId: set.id }, item.superWeightType3 || 'total', 'super3', true, ds.id)}
                    <div className="w-6 shrink-0"></div>
                  </div>
                ))}
              </div>
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
  );
}

// === メインアプリケーション ===
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [currentTab, setCurrentTab] = useState('timeline');
  
  const [posts, setPosts] = useState([]);
  const [accountsInfo, setAccountsInfo] = useState({});
  const [gyms, setGyms] = useState([]); 
  const [exercises, setExercises] = useState([]); 

  const [dataLoaded, setDataLoaded] = useState({ accounts: false, gyms: false, exercises: false, workouts: false });
  const [loadTimeout, setLoadTimeout] = useState(false);
  const isFullyLoaded = Object.values(dataLoaded).every(Boolean) || loadTimeout;
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [draftWorkoutItems, setDraftWorkoutItems] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
    const u4 = onSnapshot(workoutsRef, (snapshot) => {
      const workoutsData = []; snapshot.forEach(doc => { workoutsData.push({ id: doc.id, ...doc.data() }); }); workoutsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); setPosts(workoutsData); setDataLoaded(prev => ({ ...prev, workouts: true }));
    }, () => setDataLoaded(prev => ({ ...prev, workouts: true })));

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    if (!currentUser || !db || !isOnline) return;
    const updatePresence = async () => { try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { lastActive: Date.now() }, { merge: true }); } catch (e) {} };
    updatePresence();
    const intervalId = setInterval(updatePresence, 60000);
    return () => clearInterval(intervalId);
  }, [currentUser, isOnline]);

  const handleLogin = async (userId, pin) => {
    if (!db) return false;
    const accountData = accountsInfo[userId];
    if (!accountData || !accountData.pin) {
      try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', userId), { pin: pin, isTraining: false, lastActive: Date.now(), theme: 'light' }); setCurrentUser(userId); } catch (e) {}
    } else if (accountData.pin === pin) {
      setCurrentUser(userId);
      try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', userId), { lastActive: Date.now() }, { merge: true }); } catch (e) {}
    } else { return false; }
    return true;
  };

  const handleChangePin = async (userId, oldPin, newPin) => {
    if (!db) return false;
    if (accountsInfo[userId] && accountsInfo[userId].pin === oldPin) {
       try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', userId), { pin: newPin }, { merge: true }); return true; } catch (e) {}
    }
    return false;
  }

  const handleLogout = () => { setCurrentUser(null); setCurrentTab('timeline'); setEditingPost(null); };

  const handleStartTraining = async (gymId) => {
    if (!currentUser || !db) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: true, trainingStartTime: Date.now(), currentGymId: gymId, lastActive: Date.now() }, { merge: true }); } catch (e) {}
  };

  const handlePostWorkout = async (gymName, workoutItems, bodyWeight, bodyFat) => {
    if (!currentUser || !workoutItems || workoutItems.length === 0 || !db) return;
    const myInfo = accountsInfo[currentUser];
    const startTime = myInfo?.trainingStartTime || Date.now();
    const endTime = Date.now();
    const duration = endTime - startTime;
    const volume = calculateTotalVolume(workoutItems);
    const newDocId = `workout_${generateId()}`;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', newDocId), {
        author: currentUser, gymName, items: workoutItems, timestamp: Date.now(), startTime, endTime, duration, date: new Date().toISOString(), likes: 0, likedByMe: false, bodyWeight: bodyWeight || null, bodyFat: bodyFat || null, volume: volume
      });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: false, trainingStartTime: null, currentGymId: null, lastActive: Date.now() }, { merge: true });
      setDraftWorkoutItems([]); setCurrentTab('timeline');
    } catch (e) {}
  };

  const handleUpdateWorkout = async (postId, updatedData) => {
    if (!currentUser || !db) return;
    const volume = calculateTotalVolume(updatedData.items);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId), { ...updatedData, volume }, { merge: true }); setEditingPost(null); } catch (e) {}
  };

  const handleDeleteWorkout = async (postId) => {
    if (!currentUser || !db) return;
    if (!window.confirm("この記録を削除しますか？")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', postId)); } catch (e) {}
  };

  const handleCancelTraining = async () => {
    if (!window.confirm("現在の記録を破棄してトレーニングを終了しますか？")) return;
    if (!currentUser || !db) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { isTraining: false, trainingStartTime: null, currentGymId: null, lastActive: Date.now() }, { merge: true }); setDraftWorkoutItems([]); setCurrentTab('timeline'); } catch (e) {}
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

  const handleImportWorkout = (post) => {
    if (myInfo.isTraining && myInfo.currentGymId) {
       const currentGymName = gyms.find(g => g.id === myInfo.currentGymId)?.name;
       if (currentGymName !== post.gymName) {
          alert(`現在 ${currentGymName} でトレーニング中のため、他のジムのメニューはコピーできません。`);
          return;
       }
    }

    const newItems = post.items.map(item => ({
      ...item,
      id: generateId(),
      sets: item.sets.map(set => ({ 
         ...set, 
         id: generateId(),
         dropSets: set.dropSets ? set.dropSets.map(ds => ({ ...ds, id: generateId() })) : [] 
      }))
    }));
    
    setDraftWorkoutItems(newItems);
    
    if (!myInfo.isTraining) {
      const gym = gyms.find(g => g.name === post.gymName);
      if (gym) handleStartTraining(gym.id);
    }
    
    setCurrentTab('record');
  };

  const allGyms = useMemo(() => [{ id: 'common', name: 'ジム共通', createdAt: 0 }, ...gyms], [gyms]);

  if (!isFullyLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <Activity className="text-emerald-500 w-12 h-12 animate-pulse mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-bold mb-2">データを読み込み中...</p>
        <p className="text-slate-400 text-xs font-bold text-center">完了するまでしばらくお待ちください</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} accountsInfo={accountsInfo} onChangePin={handleChangePin} isOnline={isOnline} />;
  }

  const partnerName = currentUser === '勇太' ? '未来' : '勇太';
  const partnerInfo = accountsInfo[partnerName];
  const partnerIsTraining = partnerInfo?.isTraining || false;
  const isSameGym = Boolean(myInfo.isTraining && partnerIsTraining && myInfo.currentGymId && partnerInfo?.currentGymId && (myInfo.currentGymId === partnerInfo.currentGymId));
  const isDarkMode = myInfo.theme === 'dark';

  return (
    <div className={`min-h-screen font-sans pb-32 overflow-x-hidden selection:bg-emerald-200 transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm flex flex-col">
        {isSameGym && (
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-4 py-2 flex items-center justify-center gap-2 text-white text-xs font-bold animate-pulse shadow-inner">
            <span>🔥 パートナーと同じジムでトレーニング中！ 🔥</span>
          </div>
        )}
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="text-emerald-500" /> Duo<span className="text-emerald-500">Fit</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hidden sm:flex">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{isOnline ? 'オンライン' : 'オフライン'}</span>
            </div>
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs overflow-hidden border border-emerald-200 dark:border-emerald-800">
                {myInfo.photoUrl ? <img src={myInfo.photoUrl} alt="profile" className="w-full h-full object-cover" /> : currentUser.charAt(0)}
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">{currentUser}</span>
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-full transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
        {partnerIsTraining && !isSameGym && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold animate-in slide-in-from-top duration-300">
            <Flame size={16} className="animate-pulse text-amber-300" /> {partnerName}さんがトレーニング中です！ <TimerDisplay startTime={partnerInfo.trainingStartTime} />
          </div>
        )}
      </header>

      <main className="p-4 max-w-md mx-auto w-full pb-40">
        {currentTab === 'timeline' && <TimelineView posts={posts} onToggleLike={toggleLike} onImport={handleImportWorkout} currentUser={currentUser} onDelete={handleDeleteWorkout} onEdit={setEditingPost} accountsInfo={accountsInfo} />}
        {currentTab === 'exercises' && <ExercisesView gyms={allGyms} exercises={exercises} />}
        {currentTab === 'record' && <RecordView onStart={handleStartTraining} onPost={handlePostWorkout} onCancel={handleCancelTraining} myInfo={myInfo} gyms={allGyms} exercises={exercises} workoutItems={draftWorkoutItems} setWorkoutItems={setDraftWorkoutItems} />}
        {currentTab === 'data' && <DataView posts={posts} currentUser={currentUser} partnerName={partnerName} accountsInfo={accountsInfo} onEdit={setEditingPost} onDelete={handleDeleteWorkout} onImport={handleImportWorkout} />}
        {currentTab === 'friends' && <FriendsView partnerName={partnerName} partnerInfo={partnerInfo} currentUser={currentUser} posts={posts} />}
      </main>

      {editingPost && <EditWorkoutModal post={editingPost} gyms={allGyms} exercises={exercises} onClose={() => setEditingPost(null)} onSave={handleUpdateWorkout} />}

      <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-1 pb-safe z-30 transition-colors" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div className="flex justify-around items-center p-2 max-w-md mx-auto">
          <NavButton icon={<Home size={22} />} label="ホーム" isActive={currentTab === 'timeline'} onClick={() => setCurrentTab('timeline')} />
          <NavButton icon={<Dumbbell size={22} />} label="種目" isActive={currentTab === 'exercises'} onClick={() => setCurrentTab('exercises')} />
          <NavButton icon={myInfo.isTraining ? <Clock className="animate-pulse" size={28}/> : <PlusCircle size={28} />} label={myInfo.isTraining ? "記録中" : "記録"} isActive={currentTab === 'record'} onClick={() => setCurrentTab('record')} isPrimary isTraining={myInfo.isTraining} />
          <NavButton icon={<CalendarIcon size={22} />} label="データ" isActive={currentTab === 'data'} onClick={() => setCurrentTab('data')} />
          <NavButton icon={<Users size={22} />} label="パートナー" isActive={currentTab === 'friends'} onClick={() => setCurrentTab('friends')} />
        </div>
      </nav>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} userInfo={myInfo} onSave={handleSaveProfile} />
    </div>
  );
}

// --- プロフィール設定モーダル ---
function ProfileModal({ isOpen, onClose, userInfo, onSave }) {
  const [isUploading, setIsUploading] = useState(false);
  const [goal, setGoal] = useState(userInfo?.goal || '');
  const [theme, setTheme] = useState(userInfo?.theme || 'light');
  const [photoUrl, setPhotoUrl] = useState(userInfo?.photoUrl || null);

  useEffect(() => {
    if (isOpen) {
      setGoal(userInfo?.goal || '');
      setTheme(userInfo?.theme || 'light');
      setPhotoUrl(userInfo?.photoUrl || null);
    }
  }, [isOpen, userInfo]);

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
    onSave({ photoUrl, goal: goal.trim(), theme });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">プロフィール設定</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative">
            {photoUrl ? (
              <img src={photoUrl} alt="profile" className="w-full h-full object-cover" />
            ) : <Users size={40} className="text-slate-300 dark:text-slate-600" />}
            {isUploading && <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center"><Activity className="animate-spin text-emerald-500" size={24} /></div>}
          </div>
          
          <div className="flex gap-2 w-full">
            <label className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 transition-colors cursor-pointer">
              <PlusCircle size={16} /> 画像変更
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
            </label>
            {photoUrl && (
              <button onClick={() => setPhotoUrl(null)} disabled={isUploading} className="flex-1 py-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-950/80 transition-colors">
                <Trash2 size={16} /> 削除
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">目標 (100文字以内)</label>
            <textarea value={goal} maxLength={100} onChange={e => setGoal(e.target.value)} placeholder="例: ベンチプレス100kg達成！" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-none" style={{ fontSize: '16px' }} rows={3} />
            <div className="text-right text-xs text-slate-400 mt-1">{goal.length} / 100</div>
          </div>
          
          <div>
             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">テーマ設定</label>
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
               <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${theme === 'light' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Sun size={16}/> ライト</button>
               <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Moon size={16}/> ダーク</button>
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

// --- ログイン画面 ---
function LoginScreen({ onLogin, accountsInfo, onChangePin, isOnline }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [step, setStep] = useState(1);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const isRegistered = (userId) => accountsInfo && accountsInfo[userId] && accountsInfo[userId].pin;
  
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
       if (accountsInfo[selectedUser]?.pin === pin) {
         setCurrentPin(pin); setPin(''); setError(''); setStep(3); 
       } else {
         setError('現在のパスワードが間違っています'); setPin('');
       }
     } else if (step === 3) {
       setNewPin(pin); setPin(''); setError(''); setStep(4);
     } else if (step === 4) {
       if (newPin === pin) {
         const success = await onChangePin(selectedUser, currentPin, newPin);
         if (success) { alert("パスワードを変更しました"); resetChangePinState(); } else { setError('パスワードの変更に失敗しました'); setPin(''); }
       } else {
          setError('新しいパスワードが一致しません'); setPin('');
       }
     }
  };

  useEffect(() => { 
    if (pin.length === 4) {
      if (isChangingPin) { handleSubmitChangePin(); } else { handleSubmitLogin(); }
    }
  }, [pin, isChangingPin]);

  const resetChangePinState = () => { setIsChangingPin(false); setSelectedUser(null); setPin(''); setError(''); setStep(1); setCurrentPin(''); setNewPin(''); }

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-6 left-6 z-10 flex items-center gap-1.5 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
          <span className="text-[10px] font-bold text-slate-500">{isOnline ? 'オンライン' : 'オフライン (キャッシュ利用)'}</span>
        </div>
        <button onClick={() => setIsChangingPin(true)} className={`absolute top-6 right-6 text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${isChangingPin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
          <KeyRound size={16} />{isChangingPin ? 'パスワード変更モード' : 'パスワード変更'}
        </button>
        {isChangingPin && (
          <div className="absolute top-16 right-6 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
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
                {accountsInfo && accountsInfo['勇太']?.photoUrl ? <img src={accountsInfo['勇太'].photoUrl} alt="勇太" className="w-full h-full object-cover" /> : '勇'}
              </div>
              <span className="text-slate-800 font-bold">勇太</span>
            </button>
            <button onClick={() => {setSelectedUser('未来'); setStep(2);}} className="flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 p-6 rounded-2xl transition-all border border-slate-200 hover:border-emerald-300">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-2xl mb-3 overflow-hidden border border-rose-200">
                {accountsInfo && accountsInfo['未来']?.photoUrl ? <img src={accountsInfo['未来'].photoUrl} alt="未来" className="w-full h-full object-cover" /> : '未'}
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
      <div className="absolute top-6 left-6 z-10 flex items-center gap-1.5 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
        <span className="text-[10px] font-bold text-slate-500">{isOnline ? 'オンライン' : 'オフライン (キャッシュ利用)'}</span>
      </div>
      <div className="w-full max-w-sm flex flex-col items-center">
        <button onClick={() => isChangingPin ? resetChangePinState() : setSelectedUser(null)} className="text-slate-500 hover:text-slate-800 self-start mb-8 flex items-center gap-2 font-bold">
          &larr; 戻る
        </button>
        <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-800 font-bold text-3xl mb-4 shadow-sm overflow-hidden">
          {accountsInfo && accountsInfo[selectedUser]?.photoUrl ? <img src={accountsInfo[selectedUser].photoUrl} alt={selectedUser} className="w-full h-full object-cover" /> : selectedUser.charAt(0)}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedUser} {isChangingPin && <span className="text-sm text-emerald-600 ml-2">(パスワード変更)</span>}</h2>
        <p className="text-slate-500 text-sm mb-8 flex items-center gap-2 font-bold"><Lock size={14} />{pinPrompt}</p>
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(i => <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-200 ${i < pin.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-200'}`} />)}
        </div>
        {error && <p className="text-rose-500 text-sm mb-4 font-bold">{error}</p>}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => <button key={num} onClick={() => handlePinInput(num.toString())} className="h-16 rounded-full bg-white border border-slate-200 text-slate-800 text-2xl font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm">{num}</button>)}
          <div />
          <button onClick={() => handlePinInput('0')} className="h-16 rounded-full bg-white border border-slate-200 text-slate-800 text-2xl font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm">0</button>
          <button onClick={handleBackspace} className="h-16 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 active:bg-slate-100 transition-colors">⌫</button>
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
  const trainingDays = new Set(monthPosts.map(p => formatDateFromTimestamp(p.timestamp))).size;
  
  let totalSets = 0;
  let totalWorkoutsCount = 0;
  const categoryCount = { '胸': 0, '背中': 0, '肩': 0, '腕': 0, '脚': 0, 'その他': 0 };

  monthPosts.forEach(post => {
    if (post.items) {
      post.items.forEach(item => {
        totalWorkoutsCount++;
        const sets = item.sets ? item.sets.length : 0;
        totalSets += sets;
        const cat = item.category || 'その他';
        if (categoryCount[cat] !== undefined) {
           categoryCount[cat] += sets;
        } else {
           categoryCount['その他'] += sets;
        }
      });
    }
  });

  const hasData = monthPosts.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
      <div className="flex items-center gap-3 mb-5">
         <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-xs ${userName === '勇太' ? 'bg-indigo-500' : 'bg-rose-500'}`}>
            {accountsInfo[userName]?.photoUrl ? <img src={accountsInfo[userName].photoUrl} alt={userName} className="w-full h-full object-cover" /> : userName.charAt(0)}
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
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">トレーニング日数</p>
               <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{trainingDays} <span className="text-xs">日</span></p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">総セット数</p>
               <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalSets} <span className="text-xs">set</span></p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">トレーニング回数(種目)</p>
               <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalWorkoutsCount} <span className="text-xs">回</span></p>
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
                    <span className="w-10 text-slate-600 dark:text-slate-300">{cat}</span>
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${getCategoryColor(cat).split(' ')[0]} ${getCategoryColor(cat).split(' ')[2]}`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <span className="w-8 text-right text-slate-500">{categoryCount[cat]}</span>
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

// --- データ画面 (カレンダー・グラフ・レポート) ---
function DataView({ posts, currentUser, partnerName, accountsInfo, onEdit, onDelete, onImport }) {
  const myPosts = posts ? posts.filter(p => p.author === currentUser) : [];
  const partnerPosts = posts ? posts.filter(p => p.author === partnerName) : [];
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateFromTimestamp(Date.now()));
  const [reportTab, setReportTab] = useState(currentUser);
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = formatDateFromTimestamp(Date.now());
  
  const blanks = Array.from({ length: firstDay || 0 }).map((_, i) => <div key={`blank-${i}`} className="p-2"></div>);
  const days = Array.from({ length: daysInMonth || 0 }).map((_, i) => {
    const date = i + 1;
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
    const isMyTraining = myPosts.some(p => formatDateFromTimestamp(p.timestamp) === dateStr);
    const isPartnerTraining = partnerPosts.some(p => formatDateFromTimestamp(p.timestamp) === dateStr);
    const isSelected = selectedDateStr === dateStr;
    const isToday = dateStr === todayStr;
    
    return (
      <div key={`day-${date}`} className="p-1 flex flex-col justify-center items-center h-14" onClick={() => setSelectedDateStr(dateStr)}>
        <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all cursor-pointer 
          ${isSelected ? 'ring-2 ring-offset-1 ring-emerald-500 dark:ring-offset-slate-900' : ''} 
          ${isMyTraining || isPartnerTraining ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
          ${isToday ? 'border-2 border-emerald-400 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}
        `}>
          {date}
        </div>
        <div className="flex gap-1 mt-1 h-1.5">
          {isMyTraining && <div className={`w-1.5 h-1.5 rounded-full ${currentUser === '勇太' ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>}
          {isPartnerTraining && <div className={`w-1.5 h-1.5 rounded-full ${partnerName === '勇太' ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>}
        </div>
      </div>
    );
  });
  
  const weightData = myPosts.filter(p => p.bodyWeight && !isNaN(p.bodyWeight)).map(p => ({ date: p.date, value: Number(p.bodyWeight) })).reverse();
  const fatData = myPosts.filter(p => p.bodyFat && !isNaN(p.bodyFat)).map(p => ({ date: p.date, value: Number(p.bodyFat) })).reverse();

  const selectedPosts = posts.filter(p => formatDateFromTimestamp(p.timestamp) === selectedDateStr);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">データ</h2>
      
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-slate-400 hover:text-emerald-500 font-bold p-2 transition-colors">&lt;</button>
          <span className="font-bold text-slate-700 dark:text-slate-200">{year}年 {month + 1}月</span>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-slate-400 hover:text-emerald-500 font-bold p-2 transition-colors">&gt;</button>
        </div>
        <div className="grid grid-cols-7 text-center mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d} className={`text-xs font-bold ${d === '日' ? 'text-rose-400' : d === '土' ? 'text-blue-400' : 'text-slate-400'}`}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 text-center">{blanks}{days}</div>
        
        <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400"><div className={`w-2 h-2 rounded-full ${currentUser === '勇太' ? 'bg-indigo-500' : 'bg-rose-500'}`}></div> {currentUser}</div>
           <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400"><div className={`w-2 h-2 rounded-full ${partnerName === '勇太' ? 'bg-indigo-500' : 'bg-rose-500'}`}></div> {partnerName}</div>
        </div>
      </div>
      
      {selectedDateStr && (
        <div className="pt-2 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">{selectedDateStr.replace(/-/g, '/')} の記録</h3>
          {selectedPosts.length > 0 ? (
            selectedPosts.map(post => <WorkoutCard key={post.id} post={post} currentUser={currentUser} accountsInfo={accountsInfo} onEdit={onEdit} onDelete={onDelete} onImport={onImport} />)
          ) : (
             <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl text-center text-slate-400 dark:text-slate-500 text-sm font-bold border border-slate-200 dark:border-slate-800">記録はありません</div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-8 mb-4">月間レポート ({month + 1}月)</h3>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-6">
          <button onClick={() => setReportTab(currentUser)} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${reportTab === currentUser ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{currentUser}</button>
          <button onClick={() => setReportTab(partnerName)} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${reportTab === partnerName ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{partnerName}</button>
        </div>
        <MonthlyReport monthDate={currentMonth} posts={posts} userName={reportTab} accountsInfo={accountsInfo} />
      </div>

      <div className="space-y-6 pt-8">
         <h3 className="text-lg font-bold text-slate-900 dark:text-white">体重・体脂肪率の推移</h3>
         <SimpleChart data={weightData} color="#10b981" title={`${currentUser}の体重推移 (kg)`} />
         <SimpleChart data={fatData} color="#6366f1" title={`${currentUser}の体脂肪率推移 (%)`} />
      </div>
    </div>
  );
}

// --- 記録入力画面 ---
function RecordView({ onStart, onPost, onCancel, myInfo, gyms, exercises, workoutItems, setWorkoutItems }) {
  const [selectedGymId, setSelectedGymId] = useState(myInfo.currentGymId || (gyms.filter(g => g.id !== 'common')[0]?.id || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [bodyWeight, setBodyWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const isTraining = myInfo.isTraining;
  
  const availableExercises = exercises.filter(ex => {
    if (ex.gymId !== selectedGymId && ex.gymId !== 'common' && selectedGymId !== 'common') return false; 
    if (selectedCategories.length === 0) return true;
    return selectedCategories.includes(ex.category || 'その他');
  });

  const handleStart = () => {
    if (!selectedGymId) { alert("ジムを選択してください"); return; }
    onStart(selectedGymId);
    if (workoutItems.length === 0 && availableExercises.length > 0) {
       addExerciseItem(availableExercises[0].name);
    }
  };

  const updateItem = (itemId, data) => { setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, ...data } : item)); };
  
  const addExerciseItem = (defaultName = '') => {
    const defaultEx = availableExercises.find(ex => ex.name === defaultName) || (availableExercises.length > 0 ? availableExercises[0] : null);
    const newItem = { 
      id: generateId(), 
      exerciseName: defaultEx ? defaultEx.name : '', 
      weightType: defaultEx ? (defaultEx.weightType || 'total') : 'total',
      category: defaultEx ? (defaultEx.category || 'その他') : 'その他',
      isSuperSet: false, isDropSet: false, isForcedReps: false, memo: '',
      sets: [{ id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }] 
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
        const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : { weight: '', reps: '', lReps: '', rReps: '' };
        return { ...item, sets: [...(item.sets || []), { id: generateId(), weight: lastSet.weight || '', reps: lastSet.reps || '', lReps: lastSet.lReps || '', rReps: lastSet.rReps || '' }]};
      }
      return item;
    }));
  };

  const removeSet = (itemId, setId) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, sets: item.sets.filter(s => s.id !== setId) } : item));
  
  const updateSetField = (itemId, setId, field, value) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) };
    }));
  };

  const addDropSet = (itemId, parentSetId) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, dropSets: [...(set.dropSets || []), { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]};
      })};
    }));
  }
  const removeDropSet = (itemId, parentSetId, dropId) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, dropSets: set.dropSets.filter(ds => ds.id !== dropId) };
      })};
    }));
  }
  const updateDropSetField = (itemId, parentSetId, dropId, field, value) => {
    setWorkoutItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sets: item.sets.map(set => {
        if (set.id !== parentSetId) return set;
        return { ...set, dropSets: set.dropSets.map(ds => ds.id === dropId ? { ...ds, [field]: value } : ds) };
      })};
    }));
  }

  const handleSubmit = async () => {
    const isValid = workoutItems.every(item => {
      if (!item.exerciseName || !item.sets || item.sets.length === 0) return false;
      if (item.weightType === 'lr') return item.sets.every(set => set.weight !== '' && set.lReps !== '' && set.rReps !== '');
      return item.sets.every(set => set.weight !== '' && set.reps !== '');
    });
    if (!isValid || workoutItems.length === 0) { alert("種目を選択し、すべての重量と回数を入力してください。"); return; }
    setIsSubmitting(true);
    const gym = gyms.find(g => g.id === selectedGymId);
    await onPost(gym ? gym.name : '不明なジム', workoutItems, Number(bodyWeight), Number(bodyFat));
    setBodyWeight(''); setBodyFat(''); setIsSubmitting(false);
  };

  const toggleCategory = (cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  if (!isTraining) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ワークアウトを開始</h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><MapPin size={28} className="text-slate-400 dark:text-slate-500" /></div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 text-center">本日のトレーニング場所を選択してください</label>
          <div className="w-full relative mb-6">
            <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
              <option value="" disabled>ジムを選択</option>
              {gyms.filter(g => g.id !== 'common').map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
          </div>
          <button onClick={handleStart} className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30">
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
          <div className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1"><MapPin size={12}/> {gyms.find(g => g.id === selectedGymId)?.name || 'トレーニング中'}</div>
          <div className="text-2xl text-emerald-400 flex items-center gap-2"><Clock size={20} className={!isSubmitting ? "animate-pulse" : ""} /> <TimerDisplay startTime={myInfo.trainingStartTime} isStopped={isSubmitting} /></div>
          <div className="text-xs text-slate-400 font-bold mt-1">{formatTimeFromTimestamp(myInfo.trainingStartTime)} から開始</div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-2">ワークアウト中</h2>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {MUSCLE_CATEGORIES.map(cat => {
          const isSelected = selectedCategories.includes(cat);
          return <button key={cat} onClick={() => toggleCategory(cat)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${getCategoryTabColor(cat, isSelected)}`}>{cat}</button>;
        })}
      </div>

      {availableExercises.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 mb-2 text-sm font-bold">該当する種目がありません。</p><p className="text-slate-400 dark:text-slate-500 text-xs font-bold">「種目」タブから追加してください。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workoutItems.map((item, index) => (
             <WorkoutItemForm 
               key={item.id} 
               item={item} 
               index={index}
               isFirst={index === 0}
               isLast={index === workoutItems.length - 1}
               availableExercises={availableExercises} 
               updateItem={updateItem} 
               removeItem={removeExerciseItem}
               moveItemUp={moveItemUp}
               moveItemDown={moveItemDown}
               addSet={addSet} 
               removeSet={removeSet} 
               updateSet={updateSetField} 
               addDropSet={addDropSet} 
               removeDropSet={removeDropSet} 
               updateDropSet={updateDropSetField}
             />
          ))}

          <button onClick={() => addExerciseItem()} className="w-full py-4 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"><ListPlus size={18} /> 次の種目を追加</button>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mt-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Activity size={16} /> 本日の体組成（任意）</h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input type="number" step="0.1" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="体重" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
              </div>
              <div className="flex-1 relative">
                <input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="体脂肪率" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={isSubmitting || workoutItems.length === 0} className={`w-full text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 mt-6 mb-8 transition-all ${isSubmitting || workoutItems.length === 0 ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500 dark:text-slate-400' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : <><Flame size={20} /> トレーニングを完了して保存</>}
          </button>
          
          <button onClick={onCancel} className="w-full text-slate-500 dark:text-slate-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2 mb-8 transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-800">記録を破棄して終了</button>
        </div>
      )}
    </div>
  );
}

// --- 編集モーダル ---
function EditWorkoutModal({ post, gyms, exercises, onClose, onSave }) {
  const safeItems = post.items ? JSON.parse(JSON.stringify(post.items)) : [];
  const [workoutItems, setWorkoutItems] = useState(safeItems);
  
  const [editDate, setEditDate] = useState(formatDateFromTimestamp(post.startTime || post.timestamp));
  const [editStartTime, setEditStartTime] = useState(formatTimeFromTimestamp(post.startTime || post.timestamp));
  const [editEndTime, setEditEndTime] = useState(formatTimeFromTimestamp(post.endTime || post.timestamp));
  const [editBodyWeight, setEditBodyWeight] = useState(post.bodyWeight || '');
  const [editBodyFat, setEditBodyFat] = useState(post.bodyFat || '');

  const availableExercises = exercises.filter(ex => {
    const gym = gyms.find(g => g.name === post.gymName);
    return gym ? (ex.gymId === gym.id || ex.gymId === 'common') : true;
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
  const addSet = (itemId) => { setWorkoutItems(prev => prev.map(item => { if (item.id === itemId) { const lastSet = (item.sets && item.sets.length > 0) ? item.sets[item.sets.length - 1] : { weight: '', reps: '', lReps: '', rReps: '' }; return { ...item, sets: [...(item.sets || []), { id: generateId(), weight: lastSet.weight || '', reps: lastSet.reps || '', lReps: lastSet.lReps || '', rReps: lastSet.rReps || '' }]}; } return item; })); };
  const removeSet = (itemId, setId) => setWorkoutItems(prev => prev.map(item => item.id === itemId ? { ...item, sets: (item.sets || []).filter(set => set.id !== setId) } : item));
  const updateSetField = (itemId, setId, field, value) => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: (item.sets || []).map(set => set.id === setId ? { ...set, [field]: value } : set) }; })); };

  const addDropSet = (itemId, parentSetId) => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, dropSets: [...(set.dropSets || []), { id: generateId(), weight: '', reps: '', lReps: '', rReps: '' }]}; })}; })); }
  const removeDropSet = (itemId, parentSetId, dropId) => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, dropSets: set.dropSets.filter(ds => ds.id !== dropId) }; })}; })); }
  const updateDropSetField = (itemId, parentSetId, dropId, field, value) => { setWorkoutItems(prev => prev.map(item => { if (item.id !== itemId) return item; return { ...item, sets: item.sets.map(set => { if (set.id !== parentSetId) return set; return { ...set, dropSets: set.dropSets.map(ds => ds.id === dropId ? { ...ds, [field]: value } : ds) }; })}; })); }

  const handleSave = () => {
    const isValid = workoutItems.every(item => {
      if (!item.exerciseName || !item.sets || item.sets.length === 0) return false;
      if (item.weightType === 'lr') return item.sets.every(set => set.weight !== '' && set.lReps !== '' && set.rReps !== '');
      return item.sets.every(set => set.weight !== '' && set.reps !== '');
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-slate-950 rounded-t-3xl flex flex-col h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pt-safe sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">記録の編集</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Settings size={16} className="text-slate-400" /> トレーニング情報</h3>
            
            <div className="flex flex-wrap gap-3">
              <div className="w-36">
                <label className="block text-xs font-bold text-slate-500 mb-1">日付</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
              </div>
              <div className="w-24">
                <label className="block text-xs font-bold text-slate-500 mb-1">開始</label>
                <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
              </div>
              <div className="w-24">
                <label className="block text-xs font-bold text-slate-500 mb-1">終了</label>
                <input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="w-28">
                <label className="block text-xs font-bold text-slate-500 mb-1">体重 (kg)</label>
                <input type="number" step="0.1" value={editBodyWeight} onChange={e => setEditBodyWeight(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
              </div>
              <div className="w-28">
                <label className="block text-xs font-bold text-slate-500 mb-1">体脂肪率 (%)</label>
                <input type="number" step="0.1" value={editBodyFat} onChange={e => setEditBodyFat(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-base font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500" style={{ fontSize: '16px' }} />
              </div>
            </div>
          </div>

          {workoutItems.map((item, index) => (
             <WorkoutItemForm 
               key={item.id} 
               item={item} 
               index={index}
               isFirst={index === 0}
               isLast={index === workoutItems.length - 1}
               availableExercises={availableExercises} 
               updateItem={updateItem} 
               removeItem={removeExerciseItem}
               moveItemUp={moveItemUp}
               moveItemDown={moveItemDown}
               addSet={addSet} 
               removeSet={removeSet} 
               updateSet={updateSetField} 
               addDropSet={addDropSet} 
               removeDropSet={removeDropSet} 
               updateDropSet={updateDropSetField}
             />
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
function ExercisesView({ gyms, exercises }) {
  const [activeTab, setActiveTab] = useState('exercises'); 
  const [newGymName, setNewGymName] = useState('');
  const [selectedGymId, setSelectedGymId] = useState(gyms.length > 0 ? gyms[0].id : '');
  const [newExName, setNewExName] = useState('');
  const [newExMaker, setNewExMaker] = useState('');
  const [newExWeightType, setNewExWeightType] = useState('total'); 
  const [newExCategory, setNewExCategory] = useState('胸');
  const [isAdding, setIsAdding] = useState(false);

  const [editingExId, setEditingExId] = useState(null);
  const [editExName, setEditExName] = useState('');
  const [editExMaker, setEditExMaker] = useState('');
  const [editExWeightType, setEditExWeightType] = useState('total'); 
  const [editExCategory, setEditExCategory] = useState('胸');

  const handleAddGym = async (e) => {
    e.preventDefault();
    if (!newGymName.trim()) return;
    setIsAdding(true);
    const newDocId = `gym_${Date.now()}`;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', newDocId), { name: newGymName.trim(), createdAt: Date.now() }); setNewGymName(''); if (gyms.length === 0) setSelectedGymId(newDocId); } catch (e) {}
    setIsAdding(false);
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!newExName.trim() || !selectedGymId) return;
    setIsAdding(true);
    const newDocId = `ex_${Date.now()}`;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', newDocId), { name: newExName.trim(), maker: newExMaker.trim(), gymId: selectedGymId, weightType: newExWeightType, category: newExCategory, createdAt: Date.now() });
      setNewExName(''); setNewExMaker(''); setNewExWeightType('total'); setNewExCategory('胸');
    } catch (e) {}
    setIsAdding(false);
  };

  const startEdit = (ex) => { setEditingExId(ex.id); setEditExName(ex.name); setEditExMaker(ex.maker || ''); setEditExWeightType(ex.weightType || 'total'); setEditExCategory(ex.category || 'その他'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => { setEditingExId(null); };

  const handleUpdateExercise = async (e) => {
    e.preventDefault();
    if (!editExName.trim()) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', editingExId), { name: editExName.trim(), maker: editExMaker.trim(), weightType: editExWeightType, category: editExCategory }, { merge: true }); setEditingExId(null); } catch (e) {}
  };

  const handleDelete = async (collectionName, id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id)); } catch (e) {}
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">種目とジムの管理</h2>
      
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-6">
        <button onClick={() => setActiveTab('exercises')} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${activeTab === 'exercises' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>種目リスト</button>
        <button onClick={() => setActiveTab('gyms')} className={`flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${activeTab === 'gyms' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>ジムの登録</button>
      </div>

      {activeTab === 'gyms' && (
        <div className="space-y-6 animate-in fade-in">
          <form onSubmit={handleAddGym} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">新しいジムを登録</h3>
            <div className="flex gap-2">
              <input type="text" value={newGymName} onChange={e => setNewGymName(e.target.value)} required placeholder="例: エニタイム新宿" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/>
              <button type="submit" disabled={isAdding || !newGymName.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 rounded-xl transition-colors disabled:opacity-50">追加</button>
            </div>
          </form>
          <div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 ml-1">登録済みのジム</h3>
            <div className="space-y-2">
              {gyms.filter(g => g.id !== 'common').map(gym => (
                <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center shadow-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{gym.name}</span>
                  <button onClick={() => { if(window.confirm(`${gym.name}を削除しますか？`)) handleDelete('gyms', gym.id); }} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-lg"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="space-y-6 animate-in fade-in">
          {gyms.length === 0 ? (
            <div className="text-center py-8"><p className="text-slate-500 dark:text-slate-400 text-sm mb-4 font-bold">先に「ジムの登録」タブでジムを追加してください。</p></div>
          ) : (
            <>
              {editingExId ? (
                <form onSubmit={handleUpdateExercise} className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 shadow-sm relative animate-in slide-in-from-top-4">
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2"><Edit2 size={16}/> 種目の編集</h3>
                  <button type="button" onClick={cancelEdit} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">部位カテゴリ</label>
                      <div className="relative">
                        <select value={editExCategory} onChange={e => setEditExCategory(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                          {MUSCLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                      </div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">種目名 <span className="text-rose-500">*</span></label><input type="text" value={editExName} onChange={e => setEditExName(e.target.value)} required className="w-full bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メーカー (任意)</label><input type="text" value={editExMaker} onChange={e => setEditExMaker(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-base" style={{ fontSize: '16px' }}/></div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">重さの単位/記録方法 <span className="text-rose-500">*</span></label>
                       <div className="grid grid-cols-2 gap-2">
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'total' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="total" checked={editExWeightType === 'total'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>合計 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'oneSide' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="oneSide" checked={editExWeightType === 'oneSide'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>片側 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'plate' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="plate" checked={editExWeightType === 'plate'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>プレート (枚)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'lr' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="lr" checked={editExWeightType === 'lr'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>片側種目 (左右別)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'bodyWeight' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="bodyWeight" checked={editExWeightType === 'bodyWeight'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>自重 (+加重)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${editExWeightType === 'assist' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300'}`}><input type="radio" value="assist" checked={editExWeightType === 'assist'} onChange={(e) => setEditExWeightType(e.target.value)} className="hidden"/>アシスト</label>
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
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">対象のジム <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select value={selectedGymId} onChange={e => setSelectedGymId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-emerald-500 text-base" style={{ fontSize: '16px' }}>
                          {gyms.map(gym => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                      </div>
                    </div>
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
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'total' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><input type="radio" value="total" checked={newExWeightType === 'total'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>合計 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'oneSide' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><input type="radio" value="oneSide" checked={newExWeightType === 'oneSide'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>片側 (kg)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'plate' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><input type="radio" value="plate" checked={newExWeightType === 'plate'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>プレート (枚)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'lr' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><input type="radio" value="lr" checked={newExWeightType === 'lr'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>片側種目 (左右別)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'bodyWeight' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><input type="radio" value="bodyWeight" checked={newExWeightType === 'bodyWeight'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>自重 (+加重)</label>
                          <label className={`text-center py-2 rounded-lg text-sm font-bold border cursor-pointer ${newExWeightType === 'assist' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><input type="radio" value="assist" checked={newExWeightType === 'assist'} onChange={(e) => setNewExWeightType(e.target.value)} className="hidden"/>アシスト</label>
                       </div>
                    </div>
                    <button type="submit" disabled={isAdding || !newExName.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-3 rounded-xl mt-2 transition-colors disabled:opacity-50">リストに追加</button>
                  </div>
                </form>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 ml-1">登録済みの種目</h3>
                <div className="space-y-4">
                  {gyms.map(gym => {
                    const gymExercises = exercises.filter(ex => ex.gymId === gym.id).sort((a, b) => {
                      const idxA = MUSCLE_CATEGORIES.indexOf(a.category || 'その他');
                      const idxB = MUSCLE_CATEGORIES.indexOf(b.category || 'その他');
                      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
                    });
                    if (gymExercises.length === 0) return null;
                    return (
                      <div key={gym.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 dark:bg-slate-950 px-3 py-2 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-1"><MapPin size={14} className="text-emerald-500"/> {gym.name}</div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {gymExercises.map(ex => (
                            <div key={ex.id} className="p-3 flex justify-between items-center group">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">{ex.name}{ex.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(ex.category)}`}>{ex.category}</span>}</p>
                                <div className="flex gap-2 mt-1">
                                  {ex.maker && <span className="text-xs text-slate-400 dark:text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{ex.maker}</span>}
                                  {ex.weightType && <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                                    {ex.weightType === 'oneSide' ? '片側(kg)' : ex.weightType === 'plate' ? 'プレート(枚)' : ex.weightType === 'lr' ? '片側種目' : ex.weightType === 'bodyWeight' ? '自重' : ex.weightType === 'assist' ? 'アシスト' : '合計(kg)'}
                                  </span>}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => startEdit(ex)} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => { if(window.confirm(`${ex.name}を削除しますか？`)) handleDelete('exercises', ex.id); }} className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
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
  );
}

// --- パートナー画面 ---
function FriendsView({ partnerName, partnerInfo, currentUser, posts }) {
  const isTraining = partnerInfo?.isTraining;
  const lastActive = partnerInfo?.lastActive || 0;
  const isOnline = !isTraining && (Date.now() - lastActive < 300000);

  let cardGradient = 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20'; 
  let iconBorder = 'border-slate-300';
  let badgeColor = 'bg-slate-400';
  
  if (isTraining) { cardGradient = 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/20'; iconBorder = 'border-orange-400'; badgeColor = 'bg-orange-400'; } 
  else if (isOnline) { cardGradient = 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'; iconBorder = 'border-emerald-400'; badgeColor = 'bg-emerald-400'; }

  const partnerPosts = posts ? posts.filter(p => p.author === partnerName) : [];
  const weightData = partnerPosts.filter(p => p.bodyWeight && !isNaN(p.bodyWeight)).map(p => ({ date: p.date, value: Number(p.bodyWeight) })).reverse();
  const fatData = partnerPosts.filter(p => p.bodyFat && !isNaN(p.bodyFat)).map(p => ({ date: p.date, value: Number(p.bodyFat) })).reverse();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthPosts = posts.filter(p => {
    const d = new Date(p.timestamp);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const myMonthVolume = currentMonthPosts.filter(p => p.author === currentUser).reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
  const partnerMonthVolume = currentMonthPosts.filter(p => p.author === partnerName).reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
  const totalMonthVolume = myMonthVolume + partnerMonthVolume;
  const targetVolume = 100000; 
  const progressPercent = Math.min(100, (totalMonthVolume / targetVolume) * 100);
  
  const myPercent = Math.min(100, (myMonthVolume / targetVolume) * 100);
  const partnerPercent = Math.min(100 - myPercent, (partnerMonthVolume / targetVolume) * 100);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">パートナー</h2>
      <div className={`rounded-3xl p-6 relative overflow-hidden shadow-lg w-full text-white transition-colors duration-500 ${cardGradient}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="flex flex-col items-center justify-center text-center relative z-10 py-4">
          <div className="relative mb-4">
            <div className={`w-24 h-24 rounded-full bg-white border-4 ${iconBorder} shadow-xl flex items-center justify-center text-3xl font-bold overflow-hidden`}>
              {partnerInfo?.photoUrl ? <img src={partnerInfo.photoUrl} alt={partnerName} className="w-full h-full object-cover" /> : <span className={partnerName === '勇太' ? 'text-indigo-600' : 'text-rose-500'}>{partnerName ? partnerName.charAt(0) : '?'}</span>}
            </div>
            <div className={`absolute bottom-0 right-0 w-6 h-6 border-4 border-white rounded-full ${badgeColor} z-20`}></div>
          </div>
          <p className="font-bold text-2xl mb-1">{partnerName}</p>
          
          {partnerInfo?.goal && (
             <div className="mt-2 bg-black/20 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm w-full max-w-[280px]">
                <p className="text-white/80 text-xs mb-1">目標</p>
                <p className="text-white break-words">{partnerInfo.goal}</p>
             </div>
          )}

          {isTraining ? (
            <div className="mt-4 inline-flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm"><Flame size={16} className="text-amber-300 animate-pulse" /> トレーニング中 <TimerDisplay startTime={partnerInfo.trainingStartTime} /></div>
          ) : isOnline ? (
            <div className="mt-4 inline-flex items-center gap-2 bg-black/30 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm"><Circle fill="currentColor" size={10} className="text-emerald-300 animate-pulse" /> オンライン</div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm text-slate-200"><Circle fill="currentColor" size={10} className="text-slate-300" /> オフライン</div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
         <div className="absolute top-2 right-2 text-white/20"><Trophy size={80}/></div>
         <div className="relative z-10">
           <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><Target size={20}/> 今月のふたりで100トンチャレンジ！</h3>
           <p className="text-xs text-indigo-100 font-bold mb-4">ふたりの合計総負荷量で100,000kgを目指おう！</p>
           
           <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-bold">{totalMonthVolume.toLocaleString()} <span className="text-sm font-normal">kg</span></span>
              <span className="text-sm font-bold text-indigo-200">/ 100,000 kg</span>
           </div>
           
           <div className="w-full h-4 bg-black/30 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${myPercent}%` }}></div>
              <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: `${partnerPercent}%` }}></div>
           </div>
           
           <div className="flex justify-between items-center mt-3 text-xs font-bold">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400"></div>{currentUser}: {myMonthVolume.toLocaleString()}kg</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-400"></div>{partnerName}: {partnerMonthVolume.toLocaleString()}kg</div>
           </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mt-4 shadow-sm">
        <h3 className="text-slate-700 dark:text-slate-300 font-bold mb-3 text-sm">システムステータス</h3>
        <ul className="space-y-3 text-sm font-bold">
          <li className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">ネットワーク接続</span>
            <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1">
              {typeof navigator !== 'undefined' && navigator.onLine ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-md"><Activity size={14}/> 良好</span> : <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-md"><X size={14}/> オフライン</span>}
            </span>
          </li>
          <li className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
            <span className="text-slate-500 dark:text-slate-400">データ保存先</span>
            <a href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/data`} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-100 dark:border-emerald-800 px-2 py-1 rounded-md transition-colors">Firestore データを確認</a>
          </li>
        </ul>
      </div>

      <div className="space-y-6 pt-4">
         <h3 className="text-lg font-bold text-slate-800 dark:text-white">{partnerName}のデータ</h3>
         <SimpleChart data={weightData} color="#10b981" title="体重の推移 (kg)" />
         <SimpleChart data={fatData} color="#6366f1" title="体脂肪率の推移 (%)" />
      </div>
    </div>
  );
}

// --- ナビゲーションボタン ---
function NavButton({ icon, label, isActive, onClick, isPrimary, isTraining }) {
  if (isPrimary) {
    return (
      <button onClick={onClick} className="flex flex-col items-center justify-center -mt-8 relative group">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 text-white ${isTraining ? 'bg-amber-500 shadow-amber-500/40 scale-110' : isActive ? 'bg-emerald-500 shadow-emerald-500/40 scale-110' : 'bg-slate-800 dark:bg-slate-700 border-4 border-white dark:border-slate-950 group-hover:bg-slate-700 dark:group-hover:bg-slate-600'}`}><div>{icon}</div></div>
        <span className={`text-[10px] mt-1 font-bold transition-colors ${isTraining ? 'text-amber-500' : isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
      </button>
    );
  }
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
      <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}