import React, { useState, useRef } from 'react';
import { AlignLeft, Edit2 } from 'lucide-react';

export function RecordWheelWrapper({ myInfo, currentTab, setCurrentTab, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const wrapperRef = useRef(null);
  const hoveredRef = useRef(null);
  const isOpenRef = useRef(false);
  
  const pressTimer = useRef(null);
  const touchPos = useRef({ x: 0, y: 0 });

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const calculateHover = (clientX, clientY) => {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = clientX - centerX;
    const dy = centerY - clientY; 
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 30 && dy > -10) {
      return dx < 0 ? 'left' : 'right';
    }
    return null;
  };

  const updateHover = (clientX, clientY) => {
    const nextHover = calculateHover(clientX, clientY);
    hoveredRef.current = nextHover;
    setHovered(nextHover);
  };

  const handleStart = (e) => {
    if (!myInfo?.isTraining) return;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }
    
    touchPos.current = { x: clientX, y: clientY };
    clearPressTimer();

    pressTimer.current = setTimeout(() => {
      isOpenRef.current = true;
      setIsOpen(true);
      updateHover(touchPos.current.x, touchPos.current.y);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 200);
  };

  const handleMove = (e) => {
    if (!myInfo?.isTraining) return;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if (e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    touchPos.current = { x: clientX, y: clientY };

    if (isOpenRef.current) {
      if (e.cancelable && e.type === 'touchmove') {
        e.preventDefault();
      }
      updateHover(clientX, clientY);
    } else if (pressTimer.current) {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
        if (dist > 40) {
          clearPressTimer();
        }
      }
    }
  };

  const handleEnd = (e) => {
    if (!myInfo?.isTraining) return;
    
    clearPressTimer();

    if (!isOpenRef.current) return;
    
    if (e.type === 'touchend' || e.type === 'touchcancel' || e.type === 'mouseup' || e.type === 'mouseleave') {
       updateHover(touchPos.current.x, touchPos.current.y);
    }
    
    const finalSelected = hoveredRef.current;
    
    isOpenRef.current = false;
    setIsOpen(false);
    hoveredRef.current = null;
    setHovered(null);

    if (finalSelected === 'left') {
      if (currentTab !== 'record') {
        setCurrentTab('record');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('showRecordDashboard'));
      }, 10);
    } else if (finalSelected === 'right') {
      if (currentTab !== 'record') {
        setCurrentTab('record');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('returnToRecordInput'));
      }, 10);
    }
  };

  return (
    <div 
      ref={wrapperRef}
      className={`relative flex flex-col items-center ${myInfo?.isTraining ? 'touch-none select-none z-50' : ''}`}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onContextMenu={(e) => {
        if (myInfo?.isTraining) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }}
    >
       {myInfo?.isTraining && (
         <div 
           className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex transition-all duration-200 pointer-events-none ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
           style={{ transformOrigin: 'bottom center' }}
         >
           <div className={`relative w-28 h-28 bg-indigo-500/95 backdrop-blur-md rounded-tl-full flex items-center justify-center border-[3px] border-r-[1.5px] border-indigo-300 dark:border-indigo-700 transition-transform duration-200 ${hovered === 'left' ? 'scale-110 bg-indigo-500 z-10 shadow-[0_0_20px_rgba(99,102,241,0.6)]' : 'opacity-70'} origin-bottom-right`}>
             <div className="flex flex-col items-center justify-center text-white mr-4 mt-6">
               <AlignLeft size={28} />
               <span className="text-xs font-bold mt-1 tracking-wider">メニュー</span>
             </div>
           </div>
           <div className={`relative w-28 h-28 bg-emerald-500/95 backdrop-blur-md rounded-tr-full flex items-center justify-center border-[3px] border-l-[1.5px] border-emerald-300 dark:border-emerald-700 transition-transform duration-200 ${hovered === 'right' ? 'scale-110 bg-emerald-500 z-10 shadow-[0_0_20px_rgba(16,185,129,0.6)]' : 'opacity-70'} origin-bottom-left`}>
             <div className="flex flex-col items-center justify-center text-white ml-4 mt-6">
               <Edit2 size={28} />
               <span className="text-xs font-bold mt-1 tracking-wider">記録画面</span>
             </div>
           </div>
         </div>
       )}

       <div className={`transition-transform duration-200 ${isOpen && myInfo?.isTraining ? 'scale-90 opacity-80' : 'scale-100'}`}>
         <div className={myInfo?.isTraining ? "pointer-events-none" : ""}>
           {children}
         </div>
       </div>
    </div>
  );
}
