// ============================================================================
// WithFit v2 - シークレットミニゲーム「おっさん猫パズル」(SecretGame)
// ヘッダーのオンラインステータスを10回連続タップで起動
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CAT_DESIGNS } from '../../constants';

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
          </g>
        );
      case 2:
        return (
          <g>
            <Outline />
            <path d="M 45,20 L 45,35 M 50,18 L 50,35 M 55,20 L 55,35" stroke={line} strokeWidth="3" strokeLinecap="round" />
            <circle cx="35" cy="50" r="2.5" fill={line} />
            <circle cx="65" cy="50" r="2.5" fill={line} />
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
            <path d="M 50,63 L 50,75 M 42,70 Q 50,80 58,70" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
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

let sharedAudioCtx = null;

export default function SecretGame({ onClose }) {
  const playSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioContext();
      if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
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
    } catch (e) {}
  };

  const [screen, setScreen] = useState('TITLE');
  const [tiles, setTiles] = useState([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [zukanPage, setZukanPage] = useState(0);
  const [selectedCat, setSelectedCat] = useState(null);

  const [maxLevel, setMaxLevel] = useState(() => parseInt(localStorage.getItem('ossanMax'), 10) || 1);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('ossanHigh'), 10) || 0);
  const nextId = useRef(1);
  const touchRef = useRef({ x: 0, y: 0, r: null, c: null, active: false });

  useEffect(() => {
    try {
      localStorage.setItem('ossanMax', maxLevel);
      localStorage.setItem('ossanHigh', highScore);
    } catch (e) {}
  }, [maxLevel, highScore]);

  const resetGame = () => {
    let initialTiles = [];
    let count = 0;
    let positions = new Set();
    while (count < 6) {
      let r = Math.floor(Math.random() * 4);
      let c = Math.floor(Math.random() * 4);
      let pos = `${r}-${c}`;
      if (!positions.has(pos)) {
        positions.add(pos);
        initialTiles.push({ id: nextId.current++, val: 1, r, c, isNew: true });
        count++;
      }
    }
    setTiles(initialTiles);
    setScore(0);
    setCombo(0);
    setGameOver(false);
  };

  const checkGameOver = (currentTiles) => {
    if (currentTiles.length < 16) return;
    let b = Array(4).fill(0).map(() => Array(4).fill(0));
    currentTiles.forEach(t => { b[t.r][t.c] = t.val; });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (c < 3 && b[r][c] === b[r][c + 1]) return;
        if (r < 3 && b[r][c] === b[r + 1][c]) return;
      }
    }
    setGameOver(true);
    setTimeout(() => setScreen('RESULT'), 800);
  };

  const handleSwipe = (startR, startC, dir) => {
    if (gameOver || isAnimating) return;
    let board = Array(4).fill(null).map(() => Array(4).fill(null));
    tiles.forEach(t => { if (!t.isMerging) board[t.r][t.c] = t; });
    let line = [];
    for (let i = 0; i < 4; i++) {
      if (dir === 'RIGHT') line[i] = board[startR][i];
      if (dir === 'LEFT') line[i] = board[startR][3 - i];
      if (dir === 'DOWN') line[i] = board[i][startC];
      if (dir === 'UP') line[i] = board[3 - i][startC];
    }
    let moved = false;
    let mergedLevel = 0;
    let sacrifices = [];
    for (let i = 3; i > 0; i--) {
      if (line[i] === null && line[i - 1] !== null) {
        for (let j = i; j > 0; j--) line[j] = line[j - 1];
        line[0] = null;
        moved = true;
        break;
      } else if (line[i] !== null && line[i - 1] !== null && line[i].val === line[i - 1].val) {
        let survivor = line[i];
        let sacrifice = line[i - 1];
        survivor.nextVal = survivor.val + 1;
        survivor.isUpgrading = true;
        sacrifice.isMerging = true;
        sacrifice.mergeTarget = survivor;
        sacrifices.push(sacrifice);
        for (let j = i - 1; j > 0; j--) line[j] = line[j - 1];
        line[0] = null;
        moved = true;
        mergedLevel = survivor.nextVal;
        break;
      }
    }
    if (!moved) return;
    setIsAnimating(true);
    for (let i = 0; i < 4; i++) {
      let tile = line[i];
      if (tile) {
        if (dir === 'RIGHT') { tile.nextR = startR; tile.nextC = i; }
        if (dir === 'LEFT') { tile.nextR = startR; tile.nextC = 3 - i; }
        if (dir === 'DOWN') { tile.nextR = i; tile.nextC = startC; }
        if (dir === 'UP') { tile.nextR = 3 - i; tile.nextC = startC; }
      }
    }
    sacrifices.forEach(sac => {
      sac.nextR = sac.mergeTarget.nextR;
      sac.nextC = sac.mergeTarget.nextC;
    });
    let spawnR, spawnC;
    if (dir === 'RIGHT') { spawnR = startR; spawnC = 0; }
    if (dir === 'LEFT') { spawnR = startR; spawnC = 3; }
    if (dir === 'DOWN') { spawnR = 0; spawnC = startC; }
    if (dir === 'UP') { spawnR = 3; spawnC = startC; }
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
        if (ns > highScore) setHighScore(ns);
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
        const cleaned = prev.filter(t => !t.isMerging).map(t => ({ ...t, isNew: false, isUpgrading: false }));
        checkGameOver(cleaned);
        return cleaned;
      });
      setIsAnimating(false);
    }, 150);
  };

  const handlePointerDown = (e) => {
    if (screen !== 'PLAY' || gameOver || isAnimating) return;
    const cell = e.target.closest('[data-grid-cell]');
    if (cell) {
      touchRef.current = {
        x: e.clientX,
        y: e.clientY,
        r: parseInt(cell.getAttribute('data-row'), 10),
        c: parseInt(cell.getAttribute('data-col'), 10),
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
    if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP');
      handleSwipe(start.r, start.c, dir);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 animate-in fade-in duration-200 overflow-hidden flex flex-col justify-center items-center">
      <button onClick={onClose} className="absolute top-6 right-6 bg-slate-800 text-slate-300 hover:text-white p-2.5 rounded-full z-[110] shadow-lg active:scale-90">
        <X size={22} />
      </button>

      <div className="w-full max-w-[420px] h-full relative bg-[#F4F1E1] flex flex-col items-center justify-center p-5 select-none">
        {screen === 'TITLE' && (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl font-black text-[#4a4a4a] mb-2">おっさん猫パズル</h1>
            <p className="text-sm font-bold text-[#A4997C] mb-6">Best Score: {highScore}</p>
            <div className="flex gap-3">
              <button onClick={() => { resetGame(); setScreen('PLAY'); }} className="bg-[#FF6B6B] text-white text-lg font-bold px-8 py-3.5 rounded-2xl shadow-md active:scale-95">スタート</button>
              <button onClick={() => { setZukanPage(0); setScreen('ZUKAN'); }} className="bg-[#1ABC9C] text-white text-lg font-bold px-6 py-3.5 rounded-2xl shadow-md active:scale-95">図鑑</button>
            </div>
          </div>
        )}

        {screen === 'RESULT' && (
          <div className="flex flex-col items-center text-center bg-white p-8 rounded-3xl border-4 border-[#1ABC9C] shadow-lg w-full max-w-xs">
            <h2 className="text-2xl font-black text-[#FF6B6B] mb-2">GAME OVER</h2>
            <p className="text-5xl font-black text-slate-700 mb-6">{score}</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setScreen('TITLE')} className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl">タイトル</button>
              <button onClick={() => { resetGame(); setScreen('PLAY'); }} className="flex-1 bg-[#1ABC9C] text-white font-bold py-3 rounded-xl">リトライ</button>
            </div>
          </div>
        )}

        {screen === 'ZUKAN' && (
          <div className="w-full flex flex-col items-center">
            <h2 className="text-[#A4997C] text-lg font-bold mb-4">コンプ率: {Math.floor((maxLevel / 14) * 100)}%</h2>
            <div className="bg-white border-4 border-[#1ABC9C] rounded-3xl p-4 grid grid-cols-3 gap-2.5 w-full mb-6">
              {Array.from({ length: 6 }).map((_, idx) => {
                const catId = zukanPage * 6 + idx + 1;
                if (catId > 14) return <div key={idx} className="aspect-square" />;
                const isUnlocked = catId <= maxLevel;
                const cat = CAT_DESIGNS[catId] || CAT_DESIGNS[1];
                return (
                  <div
                    key={catId}
                    onClick={() => isUnlocked && setSelectedCat({ ...cat, id: catId })}
                    className={`aspect-square rounded-xl border-2 border-[#4a4a4a] flex items-center justify-center p-1 cursor-pointer ${isUnlocked ? '' : 'bg-slate-200 opacity-50'}`}
                    style={{ backgroundColor: isUnlocked ? cat.bg : undefined }}
                  >
                    {isUnlocked ? <CatSvg level={catId} /> : <span className="font-bold text-slate-400">?</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mb-4">
              <button disabled={zukanPage === 0} onClick={() => setZukanPage(p => p - 1)} className="px-4 py-2 bg-[#1ABC9C] text-white rounded-xl font-bold disabled:opacity-30">前へ</button>
              <button disabled={zukanPage >= 2} onClick={() => setZukanPage(p => p + 1)} className="px-4 py-2 bg-[#1ABC9C] text-white rounded-xl font-bold disabled:opacity-30">次へ</button>
            </div>
            <button onClick={() => setScreen('TITLE')} className="bg-slate-700 text-white font-bold px-8 py-2.5 rounded-xl">戻る</button>
            {selectedCat && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={() => setSelectedCat(null)}>
                <div className="bg-white p-6 rounded-3xl text-center max-w-xs w-full" onClick={e => e.stopPropagation()}>
                  <div className="w-32 h-32 mx-auto mb-3"><CatSvg level={selectedCat.id} /></div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedCat.name}</h3>
                  <p className="text-sm text-slate-500 font-bold mt-1 mb-4">{selectedCat.desc}</p>
                  <button onClick={() => setSelectedCat(null)} className="bg-[#FF6B6B] text-white font-bold px-6 py-2 rounded-xl">閉じる</button>
                </div>
              </div>
            )}
          </div>
        )}

        {screen === 'PLAY' && (
          <div className="w-full flex flex-col items-center" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
            <div className="w-full flex justify-between items-center mb-4">
              <button onClick={() => setScreen('TITLE')} className="bg-[#1ABC9C] text-white font-bold px-4 py-2 rounded-xl text-sm">戻る</button>
              <div className="text-sm font-bold text-[#A4997C]">Score: {score} / Best: {highScore}</div>
            </div>
            <div className="w-full aspect-square bg-white border-4 border-[#1ABC9C] rounded-3xl p-2 relative shadow-md">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={`bg-${i}`} className="absolute p-1.5" style={{ width: '25%', height: '25%', left: `${(i % 4) * 25}%`, top: `${Math.floor(i / 4) * 25}%` }}>
                  <div className="w-full h-full bg-[#EAE5D4] rounded-xl" />
                </div>
              ))}
              {tiles.map(t => {
                const config = CAT_DESIGNS[t.val > 14 ? 14 : t.val] || CAT_DESIGNS[1];
                return (
                  <div key={t.id} className="absolute p-1.5 transition-transform duration-150 ease-out" style={{ width: '25%', height: '25%', transform: `translate(${t.c * 100}%, ${t.r * 100}%)`, zIndex: 20 }}>
                    <div className="w-full h-full rounded-xl border-2 border-[#4a4a4a] flex items-center justify-center relative" style={{ backgroundColor: config.bg }}>
                      <div className="w-full h-full p-1"><CatSvg level={t.val} /></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border-2 border-[#4a4a4a] rounded-full flex items-center justify-center text-xs text-slate-800 font-bold">
                        {t.val}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="absolute inset-1 z-40 touch-none">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={`touch-${i}`} data-grid-cell="true" data-row={Math.floor(i / 4)} data-col={i % 4} className="absolute" style={{ width: '25%', height: '25%', left: `${(i % 4) * 25}%`, top: `${Math.floor(i / 4) * 25}%` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
