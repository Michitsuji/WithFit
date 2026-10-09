export const MASTER_USER = 'ゆうた';
export const APP_ID = 'withfit-app';
export const FIREBASE_PROJECT_ID = 'duofit-app-75cb2';

export const MUSCLE_CATEGORIES = ['胸', '背中', '肩', '腕', '脚', '腹筋', 'その他', '有酸素'];

export const PROG_INFO = {
  HPS: {
    name: 'HPSトレーニング', weeks: 6,
    desc: 'Hypertrophy（筋肥大）、Power（瞬発力）、Strength（筋力）の異なる刺激を週3回行うプログラム。BIG3の停滞期打破に最適です。',
    upRate: '約2.5% 〜 5%', mult: 1.025
  },
  SMOLOV: {
    name: 'Smolov Jr. (スモロフJr)', weeks: 3,
    desc: '3週間という短期間で一気に高頻度・高ボリュームをこなし、使用重量を伸ばす非常にハードなピーキングプログラムです。',
    upRate: '約5% 〜 10%', mult: 1.05
  },
  WENDLER: {
    name: '5/3/1 プログラム', weeks: 4,
    desc: '1RMの90%を基準(TM)とし、少しずつ着実に筋力を伸ばす長期的なプログラム。最終セットは限界まで反復(AMRAP)します。',
    upRate: '約1.5% 〜 2.5% (1サイクル)', mult: 1.02
  }
};
