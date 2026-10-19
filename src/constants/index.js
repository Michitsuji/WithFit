// ============================================================================
// WithFit v2 - 定数・カラーシステム定義
// 全画面で統一されたデザインシステム・部位カラー・プログラム設定
// ============================================================================

export const MUSCLE_CATEGORIES = ['胸', '背中', '肩', '腕', '脚', '腹筋', 'その他', '有酸素'];

export const CATEGORY_META = {
  '胸': {
    badge: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80',
    tabActive: 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/25',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500 dark:bg-rose-400',
    hex: '#f43f5e'
  },
  '背中': {
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80',
    tabActive: 'bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/25',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500 dark:bg-blue-400',
    hex: '#3b82f6'
  },
  '肩': {
    badge: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80',
    tabActive: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/25',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500 dark:bg-amber-400',
    hex: '#f59e0b'
  },
  '腕': {
    badge: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/80',
    tabActive: 'bg-purple-500 text-white border-purple-500 shadow-sm shadow-purple-500/25',
    dot: 'bg-purple-500',
    bar: 'bg-purple-500 dark:bg-purple-400',
    hex: '#a855f7'
  },
  '脚': {
    badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80',
    tabActive: 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500 dark:bg-emerald-400',
    hex: '#10b981'
  },
  '腹筋': {
    badge: 'bg-lime-50 text-lime-600 dark:bg-lime-950/60 dark:text-lime-400 border border-lime-200/80 dark:border-lime-800/80',
    tabActive: 'bg-lime-500 text-white border-lime-500 shadow-sm shadow-lime-500/25',
    dot: 'bg-lime-500',
    bar: 'bg-lime-500 dark:bg-lime-400',
    hex: '#84cc16'
  },
  '有酸素': {
    badge: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border border-cyan-200/80 dark:border-cyan-800/80',
    tabActive: 'bg-cyan-500 text-white border-cyan-500 shadow-sm shadow-cyan-500/25',
    dot: 'bg-cyan-500',
    bar: 'bg-cyan-500 dark:bg-cyan-400',
    hex: '#06b6d4'
  },
  'その他': {
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
    tabActive: 'bg-slate-600 text-white border-slate-600 shadow-sm shadow-slate-500/25',
    dot: 'bg-slate-500',
    bar: 'bg-slate-500 dark:bg-slate-400',
    hex: '#64748b'
  }
};

export const getCategoryColor = (category) => {
  return (CATEGORY_META[category] || CATEGORY_META['その他']).badge;
};

export const getCategoryTabColor = (category, isSelected) => {
  if (!isSelected) {
    return 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95';
  }
  return `${(CATEGORY_META[category] || CATEGORY_META['その他']).tabActive} active:scale-95`;
};

export const getCategoryDotColor = (category) => {
  return (CATEGORY_META[category] || CATEGORY_META['その他']).dot;
};

export const getCategoryBarColor = (category) => {
  return (CATEGORY_META[category] || CATEGORY_META['その他']).bar;
};

export const WEIGHT_TYPE_LABELS = {
  total: '合計 (kg)',
  oneSide: '片側 (kg)',
  plate: 'プレート (枚)',
  lr: '左右別 (L/R)',
  bodyWeight: '自重 (+加重/-補助)',
  cardio: '有酸素 (km/分/kcal)'
};

export const PROG_INFO = {
  HPS: {
    name: 'HPSトレーニング',
    weeks: 6,
    desc: 'Hypertrophy（筋肥大）、Power（瞬発力）、Strength（筋力）の異なる刺激を週3回行うプログラム。BIG3の停滞期打破に最適です。',
    upRate: '約2.5% 〜 5%',
    mult: 1.025
  },
  SMOLOV: {
    name: 'Smolov Jr. (スモロフJr)',
    weeks: 3,
    desc: '3週間という短期間で一気に高頻度・高ボリュームをこなし、使用重量を伸ばす非常にハードなピーキングプログラムです。',
    upRate: '約5% 〜 10%',
    mult: 1.05
  },
  WENDLER: {
    name: '5/3/1 プログラム',
    weeks: 4,
    desc: '1RMの90%を基準(TM)とし、少しずつ着実に筋力を伸ばす長期的なプログラム。最終セットは限界まで反復(AMRAP)します。',
    upRate: '約1.5% 〜 2.5% (1サイクル)',
    mult: 1.02
  }
};

export const CAT_DESIGNS = {
  1: { bg: "#FAD390", name: "カズさん", desc: "いつも寝ているおっさん猫" },
  2: { bg: "#F8C291", name: "フミさん", desc: "鼻の下が長いおっさん猫" },
  3: { bg: "#FF6B6B", name: "シワさん", desc: "苦労人のおっさん猫" },
  4: { bg: "#C23616", name: "ドロさん", desc: "夜行性のおっさん猫" },
  5: { bg: "#82CCDD", name: "ハチさん", desc: "寄り目のおっさん猫" },
  6: { bg: "#60A3BC", name: "テンさん", desc: "感情がないおっさん猫" },
  7: { bg: "#4A69BD", name: "ヒゲさん", desc: "立派なヒゲを持つ" },
  8: { bg: "#B8E994", name: "マロさん", desc: "高貴な血筋を自称" },
  9: { bg: "#78E08F", name: "トラさん", desc: "阪神ファン歴40年" },
  10: { bg: "#38ADA9", name: "ボブさん", desc: "尻尾が短いおっさん" },
  11: { bg: "#E58E26", name: "タマさん", desc: "町内の顔役" },
  12: { bg: "#D6A2E8", name: "クロさん", desc: "暗闇に同化する" },
  13: { bg: "#9C88FF", name: "シロさん", desc: "いつも綺麗好き" },
  14: { bg: "#FFD700", name: "神様", desc: "全てを悟ったおっさん猫" },
};
