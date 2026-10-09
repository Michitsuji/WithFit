import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, GripVertical, X } from 'lucide-react';

export function ReorderItemsModal({ items, onClose, onSave }) {
  const [localItems, setLocalItems] = useState([...items]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const itemRefs = useRef([]);

  const moveUp = (idx) => {
    if (idx === 0) return;
    const newItems = [...localItems];
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    setLocalItems(newItems);
  };
  const moveDown = (idx) => {
    if (idx === localItems.length - 1) return;
    const newItems = [...localItems];
    [newItems[idx + 1], newItems[idx]] = [newItems[idx], newItems[idx + 1]];
    setLocalItems(newItems);
  };

  const handleDragStart = (e, idx) => {
    document.body.style.overflow = 'hidden';
    setDraggedIdx(idx);
    setDragOverIdx(idx);
  };
  
  const handleDragMove = (e) => {
    if (draggedIdx === null) return;
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (!y) return;
    let overIdx = dragOverIdx;
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (y > rect.top && y < rect.bottom) {
        overIdx = idx;
      }
    });
    if (overIdx !== null && overIdx !== dragOverIdx) {
      setDragOverIdx(overIdx);
    }
  };

  const handleDragEnd = () => {
    document.body.style.overflow = '';
    if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
      const newItems = [...localItems];
      const [dragged] = newItems.splice(draggedIdx, 1);
      newItems.splice(dragOverIdx, 0, dragged);
      setLocalItems(newItems);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  useEffect(() => {
    if (draggedIdx !== null) {
      const handleGlobalMouseMove = (e) => handleDragMove(e);
      const handleGlobalMouseUp = () => handleDragEnd();
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [draggedIdx, dragOverIdx, localItems]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><ArrowUp size={18}/><ArrowDown size={18} className="-ml-2"/> 種目の並び替え</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2 flex-1 relative">
          {localItems.map((item, idx) => {
            const isDragged = draggedIdx === idx;
            const isDragOver = dragOverIdx === idx && draggedIdx !== idx;
            return (
            <div key={item.id}
              ref={el => itemRefs.current[idx] = el}
              className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border transition-all relative ${isDragged ? 'border-emerald-500 opacity-60 scale-[0.98]' : 'border-slate-200 dark:border-slate-800'}`}
            >
               {isDragOver && <div className={`absolute left-0 w-full h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse ${draggedIdx < dragOverIdx ? '-bottom-1' : '-top-1'}`} />}
               <div 
                 className={`cursor-grab active:cursor-grabbing p-2 -ml-2 touch-none ${isDragged ? 'text-emerald-500' : 'text-slate-400'}`}
                 onTouchStart={(e) => handleDragStart(e, idx)}
                 onTouchMove={handleDragMove}
                 onTouchEnd={handleDragEnd}
                 onTouchCancel={handleDragEnd}
                 onMouseDown={(e) => { e.preventDefault(); handleDragStart(e, idx); }}
               >
                 <GripVertical size={18}/>
               </div>
               <div className="flex-1 font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{item.exerciseName || '未選択'}</div>
               <div className="flex gap-1">
                 <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-300 transition-colors"><ArrowUp size={16}/></button>
                 <button onClick={() => moveDown(idx)} disabled={idx === localItems.length - 1} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-300 transition-colors"><ArrowDown size={16}/></button>
               </div>
            </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
           <button onClick={() => onSave(localItems)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-sm">完了</button>
        </div>
      </div>
    </div>
  );
}
