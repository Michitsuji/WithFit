import React from 'react';
import { MUSCLE_CATEGORIES } from '../../constants/定数一覧';
import { getCategoryTabColor } from '../../utils/便利関数';

export function CategoryFilterGrid({ selectedCategories, toggleCategory }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
      {MUSCLE_CATEGORIES.map(cat => {
        const isSelected = selectedCategories.includes(cat);
        return <button key={cat} onClick={() => toggleCategory(cat)} className={`py-2.5 px-1 rounded-xl text-sm font-bold transition-all border ${getCategoryTabColor(cat, isSelected)}`}>{cat}</button>;
      })}
    </div>
  );
}
