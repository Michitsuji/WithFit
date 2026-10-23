// ==========================================
// CoachAndGame.js — AIコーチ＆台帳モーダル・シークレットゲーム（フレンドランキング対応）コンポーネント
// ==========================================
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Sparkles, ListPlus, Send, Activity, CheckCircle, Trophy, Award } from 'lucide-react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { formatDateFromTimestamp, calculateWorkoutTotals } from './utils';
import { UserAvatar } from './CommonUI';

// --- シークレットゲームコンポーネント ---
const CAT_DESIGNS = {
  1: { bg: "#FAD390", name: "カズさん", desc: "いつも寝ているおっさん猫" },
  2: { bg: "#F8C291", name: "フミさん", desc: "鼻の下が長いおっさん猫" },
  3: { bg: "#FF6B6B", name: "シワさん", desc: "苦労人のおっさん猫" },
  4: { bg: "#C23616", name: "ドロさん", desc: "夜行性のおっさん猫" },
  5: { bg: "#82CCDD", name: "ハチさん", desc: "寄り目のおっさん猫" },
  6: { bg: "#60A3BC", name: "テンさん", desc: "感情がないおっさん猫" },
  7: { bg: "#4A69BD", name: "ヒゲさん", desc: "立派なヒゲを持つ" },
  8: { bg: "#B8E994", name: "マロさん", desc: "高貴な血筋を自称" },
  9: { bg: "#78E08F", name: "トラさん", desc: "阪神ファン歴40年" },
  10:{ bg: "#38ADA9", name: "ボブさん", desc: "尻尾が短いおっさん" },
  11:{ bg: "#E58E26", name: "タマさん", desc: "町内の顔役" },
  12:{ bg: "#D6A2E8", name: "クロさん", desc: "暗闇に同化する" },
  13:{ bg: "#9C88FF", name: "シロさん", desc: "いつも綺麗好き" },
  14:{ bg: "#FFD700", name: "神様", desc: "全てを悟ったおっさん猫" },
};

const CatSvg = ({ level }) => {
  const line = "#4a4a4a";
  const Outline = ({ bg = "#FFF" }) => (
    <path d="M 20,40 C 15,20 20,10 25,20 C 35,15 65,15 75,20 C 80,10 85,20 80,40 C 90,70 70,95 50,95 C 30,95 10,70 20,40 Z" fill={bg} stroke={line} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
  );

  const renderContent = () => {
    switch (level) {
      case 1:
        return (
          <g>
            <Outline />
            <path d="M 25,20 C 35,15 45,25 40,40 C 25,40 15,30 25,20 Z" fill="#E68A5C" />
            <path d="M 75,20 C 65,15 55,25 60,40 C 75,40 85,30 75,20 Z" fill="#4A3F35" />
            <circle cx="35" cy="50" r="3" fill={line} />
            <circle cx="65" cy="50" r="3" fill={line} />
            <circle cx="50" cy="65" r="10" fill="#FFF" stroke={line} strokeWidth="3" />
            <circle cx="50" cy="61" r="3.5" fill="#E68A5C" />
            <path d="M 50,65 L 50,75 M 42,70 Q 50,78 58,70" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 28,60 Q 32,65 38,60 M 62,60 Q 68,65 72,60" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        );
      case 2:
        return (
          <g>
            <Outline />
            <path d="M 45,20 L 45,35 M 50,18 L 50,35 M 55,20 L 55,35" stroke={line} strokeWidth="3" strokeLinecap="round" />
            <path d="M 30,42 Q 35,38 40,42 M 60,42 Q 65,38 70,42" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="35" cy="50" r="2.5" fill={line} />
            <circle cx="65" cy="50" r="2.5" fill={line} />
            <circle cx="50" cy="55" r="3" fill={line} />
            <path d="M 42,55 C 42,75 35,85 50,85 C 65,85 58,75 58,55 Z" fill="#FFF" stroke={line} strokeWidth="3" strokeLinejoin="round" />
          </g>
        );
      case 3:
        return (
          <g>
            <Outline bg="#B0B0B0" />
            <path d="M 25,48 Q 35,42 45,48 Z" fill={line} />
            <path d="M 55,48 Q 65,42 75,48 Z" fill={line} />
            <circle cx="50" cy="65" r="10" fill="#B0B0B0" stroke={line} strokeWidth="3" />
            <circle cx="50" cy="60" r="3" fill="#E68A5C" />
            <path d="M 50,63 L 50,75 M 42,70 Q 50,80 58,70" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 35,60 Q 30,75 35,85 M 65,60 Q 70,75 65,85" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        );
      case 4:
        return (
          <g>
            <Outline />
            <path d="M 20,45 C 30,40 45,55 50,55 C 55,55 70,40 80,45 C 85,50 85,65 75,65 C 65,65 55,75 50,75 C 45,75 35,65 25,65 C 15,65 15,50 20,45 Z" fill={line} />
            <circle cx="35" cy="55" r="3.5" fill="#FFF" />
            <circle cx="65" cy="55" r="3.5" fill="#FFF" />
            <circle cx="50" cy="72" r="10" fill="#FFF" stroke={line} strokeWidth="3" />
            <circle cx="50" cy="68" r="3" fill="#E68A5C" />
            <path d="M 50,71 L 50,80 M 44,76 Q 50,84 56,76" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        );
      case 5:
        return (
          <g>
            <Outline />
            <path d="M 25,20 C 35,15 45,30 50,35 C 55,30 65,15 75,20 C 80,10 85,20 80,40 L 20,40 C 15,20 20,10 25,20 Z" fill={line} />
            <circle cx="40" cy="55" r="3" fill={line} />
            <circle cx="60" cy="55" r="3" fill={line} />
            <circle cx="50" cy="70" r="11" fill="#FFF" stroke={line} strokeWidth="3" />
            <circle cx="50" cy="65" r="3.5" fill={line} />
            <path d="M 50,69 L 50,80 M 42,75 Q 50,85 58,75" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        );
      case 6:
        return (
          <g>
            <Outline />
            <path d="M 20,40 C 40,35 45,55 40,65 C 30,70 20,60 20,40 Z" fill={line} />
            <circle cx="35" cy="52" r="3" fill="#FFF" />
            <circle cx="65" cy="52" r="3" fill={line} />
            <path d="M 40,75 Q 50,75 60,75" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="50" cy="65" r="2.5" fill={line} />
          </g>
        );
      default:
        return (
          <g>
            <Outline bg={level % 2 === 0 ? "#F9E4B7" : "#E4B7F9"} />
            <circle cx="35" cy="50" r="3" fill={line} />
            <circle cx="65" cy="50" r="3" fill={line} />
            <path d="M 40,70 Q 50,80 60,70" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
            <text x="50" y="40" textAnchor="middle" fill={line} fontSize="14" fontWeight="bold">Lv.{level}</text>
          </g>
        );
    }
  };

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
      {renderContent()}
    </svg>
  );
};

const BackgroundCats = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-between items-center opacity-70 z-0">
    <svg viewBox="0 0 100 100" className="w-[45%] translate-x-[-15%] translate-y-[10%]" fill="none" stroke="#C1B79E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20,50 C10,70 30,90 50,95 C70,90 90,70 80,50 C75,30 50,30 20,50 Z" />
      <path d="M25,40 L15,15 L40,32 M75,40 L85,15 L60,32" />
      <circle cx="35" cy="55" r="8" />
      <circle cx="65" cy="55" r="8" />
      <path d="M43,55 L57,55" />
      <path d="M35,45 Q40,40 45,45 M65,45 Q60,40 55,45" />
      <path d="M20,60 L10,62 M20,65 L10,68 M20,70 L12,74" />
      <path d="M80,60 L90,62 M80,65 L90,68 M80,70 L88,74" />
      <circle cx="50" cy="70" r="10" />
      <circle cx="50" cy="67" r="2" fill="#C1B79E" />
      <path d="M45,73 Q50,75 55,73" />
    </svg>
    <svg viewBox="0 0 100 100" className="w-[45%] translate-x-[15%] translate-y-[10%]" fill="none" stroke="#C1B79E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20,50 C10,70 30,90 50,95 C70,90 90,70 80,50 C75,30 50,30 20,50 Z" />
      <path d="M25,40 L15,15 L40,32 M75,40 L85,15 L60,32" />
      <path d="M60,35 C65,40 75,30 70,25 Z" fill="#C1B79E" stroke="none" />
      <path d="M30,55 Q35,52 40,55 M60,55 Q65,52 70,55" />
      <circle cx="50" cy="70" r="12" />
      <path d="M48,65 Q50,68 52,65 Z" fill="#C1B79E" />
      <path d="M50,68 L50,82 M40,75 Q50,82 60,75" />
      <path d="M20,60 L10,62 M20,65 L10,68 M20,70 L12,74" />
      <path d="M80,60 L90,62 M80,65 L90,68 M80,70 L88,74" />
    </svg>
  </div>
);

let sharedAudioCtx = null;

function SecretGame({ onClose, currentUser, accountsInfo = {}, appId }) {
  const playSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioContext();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }
      const ctx = sharedAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'merge') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'new') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch(e) {}
  };

  const userMaxKey = currentUser ? `ossanMax_${currentUser}` : 'ossanMax';
  const userHighKey = currentUser ? `ossanHigh_${currentUser}` : 'ossanHigh';

  const [screen, setScreen] = useState('TITLE'); // 'TITLE' | 'PLAY' | 'RESULT' | 'ZUKAN' | 'RANKING'
  const [tiles, setTiles] = useState([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  
  const [zukanPage, setZukanPage] = useState(0);
  const [selectedCat, setSelectedCat] = useState(null);
  
  const [maxLevel, setMaxLevel] = useState(() => {
    const localMax = parseInt(localStorage.getItem(userMaxKey)) || parseInt(localStorage.getItem('ossanMax')) || 1;
    const remoteMax = Number(accountsInfo?.[currentUser]?.ossanMaxLevel) || 1;
    return Math.max(localMax, remoteMax);
  });
  const [highScore, setHighScore] = useState(() => {
    const localHigh = parseInt(localStorage.getItem(userHighKey)) || parseInt(localStorage.getItem('ossanHigh')) || 0;
    const remoteHigh = Number(accountsInfo?.[currentUser]?.ossanHighScore) || 0;
    return Math.max(localHigh, remoteHigh);
  });

  const nextId = useRef(1);
  const touchRef = useRef({ x: 0, y: 0, r: null, c: null, active: false });

  // ローカル＆Firestoreへベストスコア・最大レベルを自動同期
  useEffect(() => {
    localStorage.setItem(userMaxKey, maxLevel);
    localStorage.setItem(userHighKey, highScore);
    localStorage.setItem('ossanMax', maxLevel);
    localStorage.setItem('ossanHigh', highScore);

    if (db && currentUser && appId) {
      const remoteHigh = Number(accountsInfo?.[currentUser]?.ossanHighScore) || 0;
      const remoteMax = Number(accountsInfo?.[currentUser]?.ossanMaxLevel) || 1;
      if (highScore > remoteHigh || maxLevel > remoteMax) {
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), {
          ossanHighScore: Math.max(highScore, remoteHigh),
          ossanMaxLevel: Math.max(maxLevel, remoteMax),
          ossanUpdatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    }
  }, [maxLevel, highScore, currentUser, appId, userMaxKey, userHighKey, accountsInfo]);

  // 自分とフレンドのランキング集計
  const rankingList = useMemo(() => {
    const myFriends = accountsInfo?.[currentUser]?.friends || [];
    const participants = Array.from(new Set([currentUser, ...myFriends].filter(Boolean)));
    const entries = participants.map(uid => {
      const info = accountsInfo?.[uid] || {};
      const isMe = uid === currentUser;
      const bestScore = isMe
        ? Math.max(highScore, Number(info.ossanHighScore) || 0)
        : (Number(info.ossanHighScore) || 0);
      const bestCatLevel = isMe
        ? Math.max(maxLevel, Number(info.ossanMaxLevel) || 1)
        : (Number(info.ossanMaxLevel) || 1);
      return {
        uid,
        isMe,
        displayName: info.displayName || uid,
        score: bestScore,
        maxLevel: Math.min(14, Math.max(1, bestCatLevel)),
      };
    });

    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
      return a.displayName.localeCompare(b.displayName, 'ja');
    });

    // 順位付け（同点の場合は同順位）
    let currentRank = 1;
    return entries.map((entry, idx) => {
      if (idx > 0 && entry.score < entries[idx - 1].score) {
        currentRank = idx + 1;
      }
      return { ...entry, rank: currentRank };
    });
  }, [accountsInfo, currentUser, highScore, maxLevel]);

  const myRankEntry = useMemo(() => {
    return rankingList.find(r => r.isMe) || null;
  }, [rankingList]);

  const resetGame = () => {
    let initialTiles = [];
    let count = 0;
    let positions = new Set();
    while(count < 6) {
      let r = Math.floor(Math.random() * 4);
      let c = Math.floor(Math.random() * 4);
      let pos = `${r}-${c}`;
      if(!positions.has(pos)) {
        positions.add(pos);
        initialTiles.push({ id: nextId.current++, val: 1, r, c, isNew: true });
        count++;
      }
    }
    setTiles(initialTiles);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    setIsNewRecord(false);
  };

  const handleSwipe = (startR, startC, dir) => {
    if (gameOver || isAnimating) return;
    let board = Array(4).fill(null).map(() => Array(4).fill(null));
    tiles.forEach(t => { if (!t.isMerging) board[t.r][t.c] = t; });
    let line = [];
    for(let i=0; i<4; i++) {
      if (dir === 'RIGHT') line[i] = board[startR][i];
      if (dir === 'LEFT')  line[i] = board[startR][3-i];
      if (dir === 'DOWN')  line[i] = board[i][startC];
      if (dir === 'UP')    line[i] = board[3-i][startC];
    }
    let moved = false;
    let mergedLevel = 0;
    let sacrifices = [];
    for (let i = 3; i > 0; i--) {
      if (line[i] === null && line[i-1] !== null) {
        for(let j=i; j>0; j--) line[j] = line[j-1];
        line[0] = null;
        moved = true;
        break;
      } else if (line[i] !== null && line[i-1] !== null && line[i].val === line[i-1].val) {
        let survivor = line[i];
        let sacrifice = line[i-1];
        survivor.nextVal = survivor.val + 1;
        survivor.isUpgrading = true;
        sacrifice.isMerging = true;
        sacrifice.mergeTarget = survivor;
        sacrifices.push(sacrifice);
        for(let j=i-1; j>0; j--) line[j] = line[j-1];
        line[0] = null;
        moved = true;
        mergedLevel = survivor.nextVal;
        break;
      }
    }
    if (!moved) return;
    setIsAnimating(true);
    for(let i=0; i<4; i++) {
      let tile = line[i];
      if (tile) {
        if (dir === 'RIGHT') { tile.nextR = startR; tile.nextC = i; }
        if (dir === 'LEFT')  { tile.nextR = startR; tile.nextC = 3-i; }
        if (dir === 'DOWN')  { tile.nextR = i; tile.nextC = startC; }
        if (dir === 'UP')    { tile.nextR = 3-i; tile.nextC = startC; }
      }
    }
    sacrifices.forEach(sac => {
      sac.nextR = sac.mergeTarget.nextR;
      sac.nextC = sac.mergeTarget.nextC;
    });
    let spawnR, spawnC;
    if (dir === 'RIGHT') { spawnR = startR; spawnC = 0; }
    if (dir === 'LEFT')  { spawnR = startR; spawnC = 3; }
    if (dir === 'DOWN')  { spawnR = 0; spawnC = startC; }
    if (dir === 'UP')    { spawnR = 3; spawnC = startC; }
    let newTile = { id: nextId.current++, val: 1, r: spawnR, c: spawnC, isNew: true };
    let updatedTiles = tiles.map(t => {
      let updated = { ...t };
      if (updated.nextR !== undefined) {
        updated.r = updated.nextR;
        updated.c = updated.nextC;
        if (updated.nextVal) updated.val = updated.nextVal;
        delete updated.nextR;
        delete updated.nextC;
        delete updated.nextVal;
      }
      return updated;
    });
    updatedTiles.push(newTile);
    setTiles(updatedTiles);
    let currentCombo = mergedLevel ? combo + 1 : 0;
    setCombo(currentCombo);
    let newMax = maxLevel;
    if (mergedLevel) {
      let addScore = Math.pow(2, mergedLevel) * (currentCombo > 1 ? currentCombo : 1);
      setScore(s => {
        const ns = s + addScore;
        if (ns > highScore) {
          setHighScore(ns);
          setIsNewRecord(true);
        }
        return ns;
      });
      if (mergedLevel > newMax) {
        newMax = mergedLevel;
        setMaxLevel(newMax);
        playSound('new');
      } else {
        playSound('merge');
      }
    } else {
      playSound('move');
    }
    setTimeout(() => {
      setTiles(prev => {
        const cleaned = prev.filter(t => !t.isMerging).map(t => ({...t, isNew: false, isUpgrading: false}));
        checkGameOver(cleaned);
        return cleaned;
      });
      setIsAnimating(false);
    }, 150);
  };

  const checkGameOver = (currentTiles) => {
    if (currentTiles.length < 16) return;
    let b = Array(4).fill(0).map(()=>Array(4).fill(0));
    currentTiles.forEach(t => { b[t.r][t.c] = t.val; });
    for(let r=0; r<4; r++){
      for(let c=0; c<4; c++){
        if (c<3 && b[r][c] === b[r][c+1]) return;
        if (r<3 && b[r][c] === b[r+1][c]) return;
      }
    }
    setGameOver(true);
    setTimeout(() => setScreen('RESULT'), 800);
  };

  const handlePointerDown = (e) => {
    if(screen !== 'PLAY' || gameOver || isAnimating) return;
    const cell = e.target.closest('[data-grid-cell]');
    if (cell) {
      touchRef.current = {
        x: e.clientX,
        y: e.clientY,
        r: parseInt(cell.getAttribute('data-row')),
        c: parseInt(cell.getAttribute('data-col')),
        active: true
      };
    }
  };

  const handlePointerUp = (e) => {
    const start = touchRef.current;
    if (!start.active || start.r === null) return;
    start.active = false;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      let dir = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        dir = dy > 0 ? 'DOWN' : 'UP';
      }
      handleSwipe(start.r, start.c, dir);
    }
  };

  const renderContent = () => {
    if (screen === 'TITLE') {
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center p-6 bg-[#F4F1E1]">
          <BackgroundCats />
          <div className="z-10 flex flex-col items-center mb-5 w-full">
            <div className="relative mb-2">
              <h1 className="text-[52px] font-black text-white title-text-stroke absolute inset-0 tracking-wide text-center drop-shadow-md">おっさん猫</h1>
              <h1 className="text-[52px] font-black text-white relative z-10 tracking-wide text-center">おっさん猫</h1>
            </div>
            <div className="text-[#A4997C] text-lg tracking-widest my-1 relative z-10">ossan cat puzzle</div>
            <div className="relative flex items-center justify-center w-full mt-1">
              <div className="relative">
                <h1 className="text-[64px] font-black text-white title-text-stroke absolute inset-0 tracking-widest text-center drop-shadow-md">パズル</h1>
                <h1 className="text-[64px] font-black text-white relative z-10 tracking-widest text-center">パズル</h1>
              </div>
            </div>
          </div>

          <div className="z-10 flex flex-col items-center mb-6">
            <div className="text-[#B5A585] text-xl font-bold mb-0.5">Best Score</div>
            <div className="text-[#8B7D60] text-4xl font-black mb-2">{highScore.toLocaleString()}</div>
            {myRankEntry && (
              <button
                onClick={() => setScreen('RANKING')}
                className="bg-white/90 border-2 border-[#E58E26] text-[#B36A14] px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
              >
                <Trophy size={15} className="text-[#E58E26]" />
                <span>フレンド内 {myRankEntry.rank}位 / {rankingList.length}人中</span>
              </button>
            )}
          </div>

          <div className="z-10 flex flex-col gap-3.5 w-[92%] max-w-[310px]">
            <button onClick={() => { resetGame(); setScreen('PLAY'); }} className="w-full bg-[#FF6B6B] text-white text-3xl font-bold py-4 rounded-2xl shadow-[0_5px_0_#D15456] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center">
              <span className="drop-shadow-sm">スタート</span>
            </button>
            <div className="grid grid-cols-2 gap-3.5 w-full">
              <button onClick={() => { setZukanPage(0); setScreen('ZUKAN'); }} className="bg-[#1ABC9C] text-white text-xl font-bold py-3.5 rounded-2xl shadow-[0_5px_0_#129C81] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center">
                <span className="drop-shadow-sm tracking-tighter">コレクション</span>
              </button>
              <button onClick={() => setScreen('RANKING')} className="bg-[#E58E26] text-white text-xl font-bold py-3.5 rounded-2xl shadow-[0_5px_0_#B86D14] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center gap-1">
                <Trophy size={20} />
                <span className="drop-shadow-sm tracking-tighter">ランキング</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (screen === 'RANKING') {
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-between p-5 bg-[#F4F1E1]">
          <div className="w-full flex flex-col items-center mt-4 mb-3">
            <div className="flex items-center gap-2 text-[#8B7D60] text-2xl font-black tracking-wide">
              <Trophy size={26} className="text-[#E58E26]" />
              <h2>フレンドランキング</h2>
            </div>
            <p className="text-xs font-bold text-[#A4997C] mt-1">
              おっさん猫パズル ハイスコア順位
            </p>
          </div>

          <div className="flex-1 w-full bg-white hand-drawn-border p-3.5 overflow-y-auto space-y-2.5 shadow-sm mb-4">
            {rankingList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#A4997C] font-bold text-center">
                ランキングデータがありません
              </div>
            ) : (
              rankingList.map((entry) => {
                const catInfo = CAT_DESIGNS[entry.maxLevel] || CAT_DESIGNS[1];
                const isTop1 = entry.rank === 1 && entry.score > 0;
                const isTop2 = entry.rank === 2 && entry.score > 0;
                const isTop3 = entry.rank === 3 && entry.score > 0;

                const rankBadgeBg = isTop1
                  ? 'bg-[#FFD700] text-[#7A5900] border-[#E5B800]'
                  : isTop2
                  ? 'bg-[#E2E8F0] text-[#475569] border-[#CBD5E1]'
                  : isTop3
                  ? 'bg-[#F6AD55] text-[#7B341E] border-[#DD6B20]'
                  : 'bg-[#F4F1E1] text-[#8B7D60] border-[#DFD9C5]';

                return (
                  <div
                    key={entry.uid}
                    className={`flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border-2 transition-all ${
                      entry.isMe
                        ? 'bg-[#FFF9E6] border-[#E58E26] shadow-sm'
                        : 'bg-[#FAF8F1] border-[#EAE5D4]'
                    }`}
                  >
                    {/* 順位バッジ */}
                    <div className={`w-9 h-9 rounded-xl border-2 flex flex-col items-center justify-center shrink-0 font-black ${rankBadgeBg}`}>
                      <span className="text-sm leading-none">{entry.rank}</span>
                      <span className="text-[9px] leading-none mt-0.5">位</span>
                    </div>

                    {/* ユーザーアバター＆名前 */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <UserAvatar userId={entry.uid} accountsInfo={accountsInfo} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold text-gray-800 text-sm truncate">
                            {entry.displayName}
                          </span>
                          {entry.isMe && (
                            <span className="text-[10px] font-bold bg-[#FF6B6B] text-white px-1.5 py-0.5 rounded-full leading-none">
                              あなた
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-[#A4997C] truncate mt-0.5">
                          到達: Lv.{entry.maxLevel} {catInfo.name}
                        </div>
                      </div>
                    </div>

                    {/* 到達おっさん猫アイコン＆スコア */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        onClick={() => setSelectedCat({ ...catInfo, id: entry.maxLevel })}
                        className="w-10 h-10 rounded-xl border-2 border-[#4a4a4a] p-0.5 cursor-pointer active:scale-95 transition-transform shrink-0"
                        style={{ backgroundColor: catInfo.bg }}
                        title={`Lv.${entry.maxLevel} ${catInfo.name}`}
                      >
                        <CatSvg level={entry.maxLevel} />
                      </div>
                      <div className="text-right min-w-[68px]">
                        {entry.score > 0 ? (
                          <>
                            <div className="text-base font-black text-gray-800 leading-tight">
                              {entry.score.toLocaleString()}
                            </div>
                            <div className="text-[10px] font-bold text-[#A4997C]">pt</div>
                          </>
                        ) : (
                          <div className="text-xs font-bold text-[#C1B79E]">未プレイ</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-3 w-full max-w-[340px]">
            <button
              onClick={() => setScreen('TITLE')}
              className="flex-1 bg-[#1ABC9C] text-white text-xl font-bold py-3.5 rounded-2xl shadow-[0_5px_0_#129C81] active:translate-y-1 active:shadow-none transition-all"
            >
              タイトルへ
            </button>
            <button
              onClick={() => { resetGame(); setScreen('PLAY'); }}
              className="flex-1 bg-[#FF6B6B] text-white text-xl font-bold py-3.5 rounded-2xl shadow-[0_5px_0_#D15456] active:translate-y-1 active:shadow-none transition-all"
            >
              プレイする
            </button>
          </div>

          {selectedCat && (
            <div className="absolute inset-0 bg-[#F4F1E1] flex flex-col items-center justify-center z-50 p-6 animate-pop">
              <div className="bg-white hand-drawn-border w-full max-w-[340px] p-8 flex flex-col items-center shadow-md relative mb-8">
                <div className="w-44 h-44 mb-5"><CatSvg level={selectedCat.id} /></div>
                <div className="w-full text-center">
                  <div className="text-sm font-bold text-[#A4997C] mb-1">Lv.{selectedCat.id}</div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">{selectedCat.name}</h3>
                  <p className="text-lg text-gray-700 font-bold mb-4">{selectedCat.desc}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCat(null)} className="bg-[#FF6B6B] text-white text-2xl py-3 px-16 rounded-2xl shadow-[0_5px_0_#D15456] active:translate-y-1 active:shadow-none transition-all">
                閉じる
              </button>
            </div>
          )}
        </div>
      );
    }

    if (screen === 'RESULT') {
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center p-6 bg-[#F4F1E1]">
          <div className="bg-white hand-drawn-border w-full max-w-[340px] p-6 flex flex-col items-center mb-6 shadow-sm">
            {isNewRecord && (
              <div className="bg-[#FF6B6B] text-white text-xs font-bold px-3 py-1 rounded-full mb-2 animate-bounce flex items-center gap-1">
                <Award size={14} /> NEW RECORD!!
              </div>
            )}
            <div className="relative mb-2 mt-1">
              <h2 className="text-4xl font-black text-[#FFCC00] absolute inset-0 score-text-stroke text-center tracking-wide">Score</h2>
              <h2 className="text-4xl font-black text-[#FFCC00] relative z-10 text-center tracking-wide">Score</h2>
            </div>
            <div className="text-[64px] font-black text-[#7A7A7A] mb-3 leading-none">{score.toLocaleString()}</div>
            <div className="text-sm font-bold text-[#A4997C]">
              自己ベスト: {highScore.toLocaleString()} pt
              {myRankEntry && ` （フレンド内 ${myRankEntry.rank}位）`}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-[340px]">
            <div className="flex gap-3 w-full">
              <button onClick={() => setScreen('TITLE')} className="flex-1 bg-[#1ABC9C] text-white text-xl font-bold py-3.5 rounded-2xl shadow-[0_5px_0_#129C81] active:translate-y-1 active:shadow-none transition-all text-center flex justify-center items-center">
                <span className="drop-shadow-sm">タイトルへ</span>
              </button>
              <button onClick={() => { resetGame(); setScreen('PLAY'); }} className="flex-1 bg-[#FF6B6B] text-white text-xl font-bold py-3.5 rounded-2xl shadow-[0_5px_0_#D15456] active:translate-y-1 active:shadow-none transition-all text-center flex justify-center items-center">
                <span className="drop-shadow-sm">リトライ</span>
              </button>
            </div>
            <button onClick={() => setScreen('RANKING')} className="w-full bg-[#E58E26] text-white text-xl font-bold py-3.5 rounded-2xl shadow-[0_5px_0_#B86D14] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center gap-2">
              <Trophy size={20} />
              <span className="drop-shadow-sm">フレンドランキングを見る</span>
            </button>
          </div>
        </div>
      );
    }
    if (screen === 'ZUKAN') {
      const compRate = Math.floor((maxLevel / 14) * 100);
      const itemsPerPage = 6;
      const maxPage = Math.ceil(14 / itemsPerPage) - 1;
      const startIndex = zukanPage * itemsPerPage;
      const pageItems = [];
      for (let i = 0; i < itemsPerPage; i++) {
        const catId = startIndex + i + 1;
        pageItems.push(catId <= 14 ? catId : null);
      }
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center p-4 bg-[#F4F1E1]">
          <h2 className="text-[#A4997C] text-2xl mb-4 font-bold tracking-widest">派閥Aコンプ率: {compRate}%</h2>
          <div className="flex items-center justify-between w-full mb-8 relative px-2">
            <button 
              className={`w-10 h-16 flex items-center justify-center z-10 text-[#1ABC9C] text-4xl font-bold active:scale-90 ${zukanPage > 0 ? '' : 'opacity-0 pointer-events-none'}`} 
              onClick={() => setZukanPage(p => p - 1)}
            >◀</button>
            <div className="flex-1 bg-white hand-drawn-border p-4 grid grid-cols-3 gap-2 min-h-[280px] shadow-sm mx-1">
              {pageItems.map((id, idx) => {
                if (!id) return <div key={`empty-${idx}`} className="bg-transparent rounded-xl"></div>;
                const isUnlocked = id <= maxLevel;
                const cat = CAT_DESIGNS[id] || CAT_DESIGNS[1];
                return (
                  <div key={id} onClick={() => isUnlocked && setSelectedCat({...cat, id})} className={`tile-border flex flex-col items-center justify-center relative aspect-square cursor-pointer transition-transform active:scale-95 ${isUnlocked ? '' : 'bg-[#EAE5D4] border-[#DFD9C5]'}`} style={{ backgroundColor: isUnlocked ? cat.bg : '' }}>
                    {isUnlocked ? (
                      <><div className="absolute top-1 left-1 text-xs text-yellow-300 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] z-10 rotate-[-15deg]">new</div><CatSvg level={id} /></>
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#C1B79E] opacity-50" fill="currentColor">
                         <path d="M50,45 C40,45 35,55 35,65 C35,75 42,85 50,85 C58,85 65,75 65,65 C65,55 60,45 50,45 Z" />
                         <circle cx="30" cy="35" r="10" /><circle cx="50" cy="25" r="10" /><circle cx="70" cy="35" r="10" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
            <button 
              className={`w-10 h-16 flex items-center justify-center z-10 text-[#1ABC9C] text-4xl font-bold transition-opacity ${zukanPage < maxPage ? 'active:scale-90' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setZukanPage(p => p + 1)}
            >▶</button>
          </div>
          <button onClick={() => {setScreen('TITLE'); setZukanPage(0);}} className="bg-[#1ABC9C] text-white text-2xl font-bold py-3 px-12 rounded-2xl shadow-[0_5px_0_#129C81] active:translate-y-1 active:shadow-none transition-all">
            タイトルヘ
          </button>
          {selectedCat && (
            <div className="absolute inset-0 bg-[#F4F1E1] flex flex-col items-center justify-center z-50 p-6 animate-pop">
              <div className="bg-white hand-drawn-border w-full max-w-[340px] p-8 flex flex-col items-center shadow-md relative mb-8">
                <div className="w-48 h-48 mb-6"><CatSvg level={selectedCat.id} /></div>
                <div className="w-full text-left">
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">{selectedCat.name}</h3>
                  <p className="text-xl text-gray-700 font-bold mb-8">{selectedCat.desc}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCat(null)} className="bg-[#FF6B6B] text-white text-2xl py-3 px-16 rounded-2xl shadow-[0_5px_0_#D15456] active:translate-y-1 active:shadow-none transition-all">
                閉じる
              </button>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="w-full h-full flex flex-col relative bg-[#F4F1E1] text-[#A4997C] pb-6" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
        <div className="pt-6 pb-2 flex justify-between items-center px-4 relative z-10 h-[80px]">
          <button onClick={() => setScreen('TITLE')} className="w-12 h-12 bg-[#1ABC9C] text-white rounded-xl shadow-[0_4px_0_#129C81] flex items-center justify-center active:translate-y-1 active:shadow-none z-50 transition-all pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
            <svg className="w-7 h-7 pr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div className="flex-1 text-center pointer-events-none">
             {combo > 1 && (
               <div key={combo} className="relative inline-block animate-combo mt-2">
                 <div className="text-xl font-bold text-[#1ABC9C] mb-1 title-text-stroke-white drop-shadow-sm whitespace-nowrap">コレクション追加</div>
                 <div className="relative">
                   <span className="text-[#1ABC9C] font-black text-3xl absolute inset-0 combo-text-stroke tracking-widest whitespace-nowrap">連続コンボ中!!</span>
                   <span className="text-[#1ABC9C] font-black text-3xl relative z-10 tracking-widest whitespace-nowrap">連続コンボ中!!</span>
                 </div>
               </div>
             )}
          </div>
          <button
            onClick={() => setScreen('RANKING')}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-12 h-12 bg-[#E58E26] text-white rounded-xl shadow-[0_4px_0_#B86D14] flex items-center justify-center active:translate-y-1 active:shadow-none z-50 transition-all pointer-events-auto"
            title="ランキング"
          >
            <Trophy size={22} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative w-full mx-auto">
          <div className="w-full aspect-square bg-white hand-drawn-border p-2 relative shadow-sm flex-shrink-0">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={`bg-${i}`} className="absolute p-[6px]" style={{ width: '25%', height: '25%', left: `${(i % 4) * 25}%`, top: `${Math.floor(i / 4) * 25}%` }}>
                <div className="w-full h-full bg-[#EAE5D4] rounded-xl"></div>
              </div>
            ))}
            {tiles.map(t => {
              const config = CAT_DESIGNS[t.val > 14 ? 14 : t.val] || CAT_DESIGNS[1];
              return (
                <div key={t.id} className="absolute p-[6px] transition-transform duration-[150ms] ease-out" style={{ width: '25%', height: '25%', transform: `translate(${t.c * 100}%, ${t.r * 100}%)`, zIndex: t.isMerging ? 10 : 20 }}>
                  <div className={`w-full h-full tile-border flex items-center justify-center relative ${t.isNew ? 'animate-pop' : ''} ${t.isUpgrading ? 'animate-merge' : ''}`} style={{ backgroundColor: config.bg }}>
                    <div className="w-full h-full p-1"><CatSvg level={t.val} /></div>
                    <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-7 h-7 bg-white border-[3px] border-[#4a4a4a] rounded-full flex items-center justify-center text-[16px] text-gray-800 font-bold z-30">{t.val}</div>
                  </div>
                </div>
              );
            })}
            <div className="absolute inset-1 z-40 touch-none">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={`touch-${i}`} data-grid-cell="true" data-row={Math.floor(i / 4)} data-col={i % 4} className="absolute" style={{ width: '25%', height: '25%', left: `${(i % 4) * 25}%`, top: `${Math.floor(i / 4) * 25}%` }}></div>
              ))}
            </div>
          </div>
          <div className="w-full flex justify-between mt-6 gap-3 px-1 flex-shrink-0">
            <div className="flex-1 bg-[#1ABC9C] text-white rounded-2xl py-3 px-5 flex justify-between items-center shadow-md">
               <span className="text-lg font-bold">Score:</span> 
               <span className="text-2xl font-bold">{score}</span>
            </div>
            <div className="flex-1 bg-[#FF6B6B] text-white rounded-2xl py-3 px-5 flex justify-between items-center shadow-md">
               <span className="text-lg font-bold">Best:</span> 
               <span className="text-2xl font-bold">{highScore}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 animate-in fade-in duration-300 overflow-hidden flex flex-col justify-center items-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Yomogi&display=swap');
        .hand-drawn-border { border: 4px solid #1ABC9C; border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; background-color: white; }
        .tile-border { border: 3px solid #4a4a4a; border-radius: 12px; }
        .title-text-stroke { -webkit-text-stroke: 8px #C1B79E; paint-order: stroke fill; }
        .title-text-stroke-white { -webkit-text-stroke: 8px white; paint-order: stroke fill; }
        .score-text-stroke { -webkit-text-stroke: 6px #FF6B6B; paint-order: stroke fill; }
        .combo-text-stroke { -webkit-text-stroke: 6px white; paint-order: stroke fill; }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes mergePop { 0% { transform: scale(1); } 50% { transform: scale(1.2); box-shadow: 0 0 15px rgba(255,215,0,0.6); z-index: 30; } 100% { transform: scale(1); } }
        @keyframes comboAnim { 0% { transform: translateY(20px) scale(0.8) rotate(-5deg); opacity: 0; } 30% { transform: translateY(0px) scale(1.2) rotate(5deg); opacity: 1; } 70% { transform: translateY(0px) scale(1.1) rotate(0deg); opacity: 1; } 100% { transform: translateY(-20px) scale(1) opacity: 0; } }
        .animate-pop { animation: popIn 0.2s ease-out forwards; }
        .animate-merge { animation: mergePop 0.25s ease-out forwards; }
        .animate-combo { animation: comboAnim 1.2s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <button onClick={onClose} className="absolute top-6 right-6 mt-4 bg-slate-800 text-slate-400 hover:text-white p-2 rounded-full z-[110] transition-colors shadow-lg">
        <X size={24} />
      </button>

      <div className="w-full max-w-[420px] h-full relative" style={{ fontFamily: "'Yomogi', cursive, sans-serif" }}>
        {renderContent()}
      </div>
    </div>
  );
}

// --- AIコーチ＆台帳モーダル ---
function CoachChatModal({ isOpen, onClose, currentUser, accountsInfo, posts, appId }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const myInfo = accountsInfo[currentUser] || {};
  const [ledgerText, setLedgerText] = useState(myInfo.coachLedger || '');
  const [isSavingLedger, setIsSavingLedger] = useState(false);
  const chatEndRef = useRef(null);

  const [setupGoal, setSetupGoal] = useState('筋肥大（バルクアップ）');
  const [setupLevel, setSetupLevel] = useState('初心者（1年未満）');
  const [setupDays, setSetupDays] = useState('週3〜4回');
  const [selectedMenuDate, setSelectedMenuDate] = useState(() => formatDateFromTimestamp(Date.now()));

  useEffect(() => {
    if (isOpen) {
      setLedgerText(myInfo.coachLedger || '');
      if (chatHistory.length === 0) {
         setChatHistory([{ role: 'assistant', text: 'お疲れ様です！本日のトレーニング予定や、相談したいことはありますか？台帳の内容に沿ってサポートしますよ！' }]);
      }
    }
  }, [isOpen, myInfo.coachLedger]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  if (!isOpen) return null;

  const handleSaveLedger = async () => {
    if (!db || !currentUser) return;
    setIsSavingLedger(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { coachLedger: ledgerText }, { merge: true });
      alert('台帳を保存しました！以降のAIコーチの回答はこの台帳を基準に行われます。');
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました');
    }
    setIsSavingLedger(false);
  };

  const handleLoadMenu = () => {
    const targetPosts = posts.filter(p => p.author === currentUser && formatDateFromTimestamp(p.timestamp) === selectedMenuDate);
    
    if (targetPosts.length === 0) {
      alert(`${selectedMenuDate} の記録がありません。`);
      return;
    }

    let allText = '';
    
    targetPosts.forEach(post => {
      const authorInfo = accountsInfo && accountsInfo[post.author];
      const baseWeight = Number(post.bodyWeight) || Number(authorInfo?.weight) || 60;
      const { processedItems, totalVolume, totalCalories } = calculateWorkoutTotals(post.items || [], post.duration, baseWeight);
      const displayVolumeCalc = (!post.items || post.items.length === 0) ? 0 : ((post.volume && post.volume > 0) ? post.volume : totalVolume);
      const displayCalories = (!post.items || post.items.length === 0) ? 0 : ((post.calories && post.calories > 0) ? post.calories : totalCalories);

      const d = new Date(post.timestamp);
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      
      let text = `【トレーニング記録】\n`;
      text += `日時: ${dateStr}\n`;
      if (post.gymName) text += `場所: ${post.gymName}\n`;
      if (post.bodyWeight || post.bodyFat) {
          text += `体組成: `;
          if (post.bodyWeight) text += `${post.bodyWeight}kg `;
          if (post.bodyFat) text += `${post.bodyFat}%`;
          text += `\n`;
      }
      if (displayVolumeCalc > 0) text += `総負荷量: ${displayVolumeCalc.toLocaleString()}kg\n`;
      if (displayCalories > 0) text += `総消費: ${displayCalories.toLocaleString()} kcal\n`;
      text += `\n`;

      processedItems.forEach((item, idx) => {
          text += `■ ${idx + 1}. ${item.exerciseName}`;
          if (item.category) text += ` [${item.category}]`;
          text += `\n`;
          
          if (item.isSuperSet && item.superExerciseName) {
              text += `  スーパー: ${item.superExerciseName}\n`;
              if (item.superExerciseName3) text += `  ジャイアント: ${item.superExerciseName3}\n`;
          }

          const getSetText = (setObj, wType, type, isDrop, prefix) => {
              const isCardio = wType === 'cardio';
              const isLR = wType === 'lr';
              
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
                  let t = `${prefix} `;
                  if (distance) t += `${distance}km `;
                  if (time) t += `${time}分 `;
                  if (calories) t += `${calories}kcal `;
                  return t.trim() + '\n';
              }

              const weight = val('weight');
              const reps = val('reps');
              const lReps = val('lReps');
              const rReps = val('rReps');
              const forcedReps = val('forcedReps');

              if (!weight && !reps && !lReps && !rReps) return null;

              let displayWeight = weight || 0;
              let weightLabel = 'kg';
              if (wType === 'plate') weightLabel = '枚';
              else if (wType === 'oneSide') weightLabel = 'kg(片)';
              else if (wType === 'bodyWeight') {
                  if (Number(weight) < 0) { displayWeight = weight; weightLabel = 'kg'; } 
                  else if (Number(weight) > 0) { displayWeight = `+${weight}`; weightLabel = 'kg'; } 
                  else { displayWeight = '自重'; weightLabel = ''; }
              }

              let t = `${prefix} ${displayWeight}${weightLabel} x `;
              if (isLR) {
                  t += `L:${lReps||0} R:${rReps||0}回`;
              } else {
                  t += `${reps||0}回`;
              }
              if (forcedReps) t += ` (+補助${forcedReps})`;
              return t + '\n';
          };

          if (item.sets && Array.isArray(item.sets)) {
              item.sets.forEach((set, sIdx) => {
                  const mainText = getSetText(set, item.weightType, 'main', false, `Set ${sIdx + 1}:`);
                  if (mainText) text += `  ${mainText}`;
                  
                  if (item.isDropSet && set.dropSets) {
                      set.dropSets.forEach((ds, dsIdx) => {
                          const dropText = getSetText(ds, item.weightType, 'main', true, `   ↳ Drop:`);
                          if (dropText) text += `  ${dropText}`;
                      });
                  }
                  
                  if (item.isSuperSet && item.superExerciseName) {
                      const sup2Text = getSetText(set, item.superWeightType || 'total', 'super2', false, `   ↳ Sup2:`);
                      if (sup2Text) text += `  ${sup2Text}`;
                      
                      if (item.isDropSet && set.dropSets && !set.superDropSets) {
                          set.dropSets.forEach((ds, dsIdx) => {
                              if (ds.superWeight !== undefined) {
                                  const dsSup2Text = getSetText(ds, item.superWeightType || 'total', 'super2', true, `     ↳ Drop2:`);
                                  if (dsSup2Text) text += `    ${dsSup2Text}`;
                              }
                          });
                      }
                      if (item.isDropSet && set.superDropSets) {
                          set.superDropSets.forEach((ds, dsIdx) => {
                              const dsSup2Text = getSetText(ds, item.superWeightType || 'total', 'super2', true, `     ↳ Drop2:`);
                              if (dsSup2Text) text += `    ${dsSup2Text}`;
                          });
                      }
                  }

                  if (item.isSuperSet && item.superExerciseName3) {
                      const sup3Text = getSetText(set, item.superWeightType3 || 'total', 'super3', false, `   ↳ Sup3:`);
                      if (sup3Text) text += `  ${sup3Text}`;
                      
                      if (item.isDropSet && set.dropSets && !set.superDropSets3) {
                          set.dropSets.forEach((ds, dsIdx) => {
                              if (ds.superWeight3 !== undefined) {
                                  const dsSup3Text = getSetText(ds, item.superWeightType3 || 'total', 'super3', true, `     ↳ Drop3:`);
                                  if (dsSup3Text) text += `    ${dsSup3Text}`;
                              }
                          });
                      }
                      if (item.isDropSet && set.superDropSets3) {
                          set.superDropSets3.forEach((ds, dsIdx) => {
                              const dsSup3Text = getSetText(ds, item.superWeightType3 || 'total', 'super3', true, `     ↳ Drop3:`);
                              if (dsSup3Text) text += `    ${dsSup3Text}`;
                          });
                      }
                  }
              });
          }
          if (item.memo) text += `  メモ: ${item.memo}\n`;
          text += `\n`;
      });
      allText += text + '\n';
    });

    setMessage(`以下のトレーニング内容について、分析やアドバイスをお願いします！\n\n${allText.trim()}`);
  };

  const handleGenerateLedger = () => {
    const initialText = `【長期進捗マスター台帳】\n・主な目的: ${setupGoal}\n・経験レベル: ${setupLevel}\n・トレーニング頻度: ${setupDays}\n\n【方針】\n無理なく継続し、設定した目的に沿って着実にステップアップを目指す。`;
    setLedgerText(initialText);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    const userMsg = message.trim();
    setMessage('');
    setChatHistory(prev => {
      const newHistory = [...prev, { role: 'user', text: userMsg }];
      return newHistory.slice(-10);
    });
    setIsLoading(true);

    const myRecentPosts = posts.filter(p => p.author === currentUser).slice(0, 3);
    const recentWorkoutText = myRecentPosts.map(p => 
      `${p.date.substring(0,10)}: ${p.gymName || '不明なジム'} (総負荷量: ${p.volume}kg)`
    ).join('\n');

    const historyText = chatHistory.slice(-10).map(m => `${m.role === 'user' ? '私' : 'コーチ'}: ${m.text}`).join('\n');

    const prompt = `あなたは私の専属トレーニングコーチです。
ユーザーからメッセージやトレーニング内容が送られます。
以下の2つの要素を含むJSON形式で回答してください。JSON以外のテキストは一切含めないでください。

1. "chatResponse": 送信されたメニューやメッセージに対する評価・アドバイス・励ましのみを親しみやすく簡潔な言葉で書いてください。（台帳の更新についての言及は不要です）
2. "updatedLedger": 以下の【現在のマスター台帳】の内容をもとに、今回の会話内容から得られた新しい気づき、重量更新、フォームの課題、今後の目標などを反映し、整理・追記・更新した最新の台帳テキストを出力してください。

【現在のマスター台帳】
${myInfo.coachLedger || 'まだ台帳が設定されていません。'}

【私の現在の状態】
・表示名: ${myInfo.displayName || currentUser}
・目標: ${myInfo.goal || '未設定'}
・体重: ${myInfo.weight ? myInfo.weight + 'kg' : '未設定'}
・直近のトレーニング:
${recentWorkoutText || 'まだ記録がありません'}

【これまでの会話（直近10件）】
${historyText}

私のメッセージ:「${userMsg}」`;

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      let textResponse = data.candidates[0].content.parts[0].text;
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(textResponse);
      
      setChatHistory(prev => {
        const newHistory = [...prev, { role: 'assistant', text: parsed.chatResponse }];
        return newHistory.slice(-10);
      });
      
      if (parsed.updatedLedger) {
         setLedgerText(parsed.updatedLedger);
         try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { coachLedger: parsed.updatedLedger }, { merge: true });
         } catch(err) { console.error("Ledger auto-update failed", err); }
      }
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'assistant', text: '申し訳ありません、エラーが発生しました。時間を置いて再度お試しください。' }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[90] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-500"/> AIコーチ
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 m-4 rounded-xl shrink-0">
          <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>チャット</button>
          <button onClick={() => setActiveTab('ledger')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'ledger' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>マスター台帳</button>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none p-3 shadow-sm flex gap-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="px-4 pt-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input 
                type="date" 
                value={selectedMenuDate} 
                onChange={(e) => setSelectedMenuDate(e.target.value)}
                className="text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
              />
              <button onClick={handleLoadMenu} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1 shrink-0">
                <ListPlus size={12} /> データを読み込む
              </button>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 flex gap-2 shrink-0">
              <input 
                type="text" 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="コーチに相談する..." 
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-transparent rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                onClick={handleSendMessage} 
                disabled={!message.trim() || isLoading}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white p-2.5 rounded-xl transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-slate-50 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
              チャットをするたびにAIが自動で「マスター台帳」を整理・更新します。<br/>
              コーチは常にこの情報を基準に指導を行います。手動で直接編集して保存することも可能です。
            </p>
            {(!myInfo.coachLedger && ledgerText === '') ? (
              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center">台帳の初期設定</p>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">主な目的</label>
                  <select value={setupGoal} onChange={e => setSetupGoal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700">
                    <option value="筋肥大（バルクアップ）">筋肥大（バルクアップ）</option>
                    <option value="ダイエット（減量）">ダイエット（減量）</option>
                    <option value="筋力向上（重量アップ）">筋力向上（重量アップ）</option>
                    <option value="健康維持">健康維持</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">経験レベル</label>
                  <select value={setupLevel} onChange={e => setSetupLevel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700">
                    <option value="初心者（1年未満）">初心者（1年未満）</option>
                    <option value="中級者（1〜3年）">中級者（1〜3年）</option>
                    <option value="上級者（3年以上）">上級者（3年以上）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">トレーニング頻度</label>
                  <select value={setupDays} onChange={e => setSetupDays(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700">
                    <option value="週1〜2回">週1〜2回</option>
                    <option value="週3〜4回">週3〜4回</option>
                    <option value="週5回以上">週5回以上</option>
                  </select>
                </div>
                <button onClick={handleGenerateLedger} className="mt-auto bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-sm hover:bg-indigo-600 transition-colors">
                  台帳のベースを作成
                </button>
              </div>
            ) : (
              <textarea
                value={ledgerText}
                onChange={e => setLedgerText(e.target.value)}
                placeholder="【長期進捗マスター台帳】&#10;・身長: 171cm&#10;・目標: ...&#10;などを記述"
                className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none font-mono"
              />
            )}
            <button 
              onClick={handleSaveLedger} 
              disabled={isSavingLedger || (!myInfo.coachLedger && ledgerText === '')}
              className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {isSavingLedger ? <Activity className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              台帳を保存して適用
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export {
  CAT_DESIGNS,
  CatSvg,
  BackgroundCats,
  SecretGame,
  CoachChatModal
};