import React from 'react';
import { getAge, getBMR, getFFMI, getFFMIEval } from '../../utils/calculations';

export function BodyCompositionInfo({ info, dailyCalories = 0, dateLabel = '' }) {
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
