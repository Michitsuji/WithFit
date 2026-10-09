import React, { useState, useRef } from 'react';
import { AlignLeft, Edit2, X } from 'lucide-react';

export function RecordWheelWrapper({ myInfo, currentTab, setCurrentTab, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const pressTimer = useRef(null);

  const clearTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleStart = (e) => {
    if (!myInfo?.isTraining) return;
    clearTimer();

    pressTimer.current = setTimeout(() => {
      setIsOpen(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 250);
  };

  const handleEnd = () => {
    clearTimer();
  };

  const selectOption = (type) => {
    setIsOpen(false);
    if (currentTab !== 'record') {
      setCurrentTab('record');
    }
    setTimeout(() => {
      if (type === 'dashboard') {
        window.dispatchEvent(new CustomEvent('showRecordDashboard'));
      } else {
        window.dispatchEvent(new CustomEvent('returnToRecordInput'));
      }
    }, 10);
  };

  return (
    <div 
      className="relative flex flex-col items-center"
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onContextMenu={(e) => {
        if (myInfo?.isTraining) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {isOpen && myInfo?.isTraining && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[95] animate-in fade-in duration-200"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          />
          <div 
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex gap-3 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => selectOption('dashboard')}
              className="flex flex-col items-center justify-center w-32 h-24 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-2xl shadow-2xl p-3 border-2 border-indigo-300 dark:border-indigo-400 transition-all"
            >
              <AlignLeft size={28} />
              <span className="text-xs font-bold mt-1.5">メニュー・プログラム</span>
            </button>
            <button
              onClick={() => selectOption('input')}
              className="flex flex-col items-center justify-center w-32 h-24 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl shadow-2xl p-3 border-2 border-emerald-300 dark:border-emerald-400 transition-all"
            >
              <Edit2 size={28} />
              <span className="text-xs font-bold mt-1.5">ワークアウト記録</span>
            </button>
          </div>
        </>
      )}

      {children}
    </div>
  );
}
