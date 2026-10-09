import React, { useState } from 'react';
import { Target, X } from 'lucide-react';
import { PROG_INFO } from '../../constants';

export function ProgramGeneratorModal({ isOpen, onClose, onGenerate, exercises }) {
  const [progType, setProgType] = useState('HPS');
  const [exName, setExName] = useState('ベンチプレス');
  const [oneRM, setOneRM] = useState('');

  if (!isOpen) return null;

  const big3Exercises = ['ベンチプレス', 'スクワット', 'デッドリフト'];

  const info = PROG_INFO[progType];
  const targetWeight = oneRM && !isNaN(oneRM) ? Math.round(Number(oneRM) * info.mult) : '-';

  const handleGenerate = () => {
    if (!oneRM || isNaN(oneRM)) { alert('現在の1RM（最大重量）を入力してください'); return; }
    onGenerate(progType, exName, Number(oneRM));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target size={18} className="text-indigo-500"/> プログラム自動作成
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">プログラムの種類</label>
            <div className="relative">
              <select value={progType} onChange={e => setProgType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-indigo-500 text-sm">
                <option value="HPS">HPSトレーニング (全6週・週3回)</option>
                <option value="SMOLOV">Smolov Jr. (全3週・週4回)</option>
                <option value="WENDLER">5/3/1プログラム (全4週・週1回)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
            </div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4">
            <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2">{info.name} とは？</h4>
            <p className="text-xs text-indigo-600/80 dark:text-indigo-300/80 leading-relaxed font-bold">
              {info.desc}
            </p>
            <div className="mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-800/50 flex flex-col gap-1">
              <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 flex justify-between">
                <span>期待される向上率:</span> <span>{info.upRate}</span>
              </p>
              <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 flex justify-between">
                <span>完了時の目標重量:</span> <span>{targetWeight} kg</span>
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">対象の種目</label>
            <div className="relative">
              <select value={exName} onChange={e => setExName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold appearance-none focus:outline-none focus:border-indigo-500 text-sm">
                {big3Exercises.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">現在の1RM (MAX重量)</label>
            <div className="relative">
              <input type="number" inputMode="decimal" value={oneRM} onChange={e => setOneRM(e.target.value)} placeholder="例: 100" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500 text-sm" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">kg</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={handleGenerate} disabled={!oneRM} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors">
            {info.weeks}週間のプログラムを作成
          </button>
        </div>
      </div>
    </div>
  );
}
