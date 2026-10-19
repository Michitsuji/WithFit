// ============================================================================
// WithFit v2 - 計算・日付フォーマット・テキスト変換ユーティリティ
// ============================================================================

import { MUSCLE_CATEGORIES, PROG_INFO } from '../constants';

export const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);
export const generateFriendCode = () => Math.floor(10000 + Math.random() * 90000).toString();

export const generateColor = (str) => {
  if (!str) return '#10b981';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 48%)`;
};

export const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const diff = Math.max(0, Date.now() - timestamp);
  const m = Math.floor(diff / 60000);
  if (m === 0) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
};

export const getAge = (birthDateStr) => {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export const getBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return 0;
  if (gender === 'female') return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161);
  return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
};

export const getFFMI = (weight, fat, height) => {
  if (!weight || !fat || !height) return 0;
  const leanWeight = weight * (1 - (fat / 100));
  const heightM = height / 100;
  const ffmi = leanWeight / (heightM * heightM);
  return ffmi + 6.1 * (1.8 - heightM);
};

export const getFFMIEval = (ffmi, gender) => {
  if (gender === 'female') {
    if (ffmi < 14) return '低め';
    if (ffmi < 16) return '平均的';
    if (ffmi < 18) return '優秀';
    if (ffmi < 21) return '非常に優秀';
    return '限界レベル';
  } else {
    if (ffmi < 18) return '低め';
    if (ffmi < 20) return '平均的';
    if (ffmi < 22) return '優秀';
    if (ffmi < 25) return '非常に優秀';
    return '限界レベル';
  }
};

export const formatDuration = (ms) => {
  if (!ms) return '';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ''}`;
  return minutes > 0 ? `${minutes}分` : '1分未満';
};

export const formatTimeFromTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const formatDateFromTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDateWithDay = (timestampOrDateStr) => {
  if (!timestampOrDateStr) return '';
  const date = new Date(timestampOrDateStr);
  if (isNaN(date.getTime())) return '';
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
};

export const formatShortDateTime = (timestamp) => {
  if (!timestamp || isNaN(new Date(timestamp).getTime())) return '';
  const date = new Date(timestamp);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]}) ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const calc1RM = (weight, reps) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0) return 0;
  if (r <= 1) return w;
  return Math.round((w * (1 + r / 40)) * 10) / 10;
};

export const calcSetVolume = (set, wType, userWeight) => {
  if (wType === 'cardio') return 0;
  let v = 0;
  const w = Number(set.weight) || 0;
  const l = Number(set.lReps) || 0;
  const rR = Number(set.rReps) || 0;
  const r = Number(set.reps) || Math.max(l, rR);
  const f = Number(set.forcedReps) || 0;

  if (wType === 'lr') {
    v += w * (l + rR + f * 2);
  } else if (wType === 'oneSide') {
    v += w * (r + f) * 2;
  } else if (wType === 'plate') {
    v += w * (r + f) * 20;
  } else if (wType === 'bodyWeight') {
    const effectiveWeight = (Number(userWeight) || 0) + w;
    if (effectiveWeight > 0) v += effectiveWeight * (r + f);
  } else {
    v += w * (r + f);
  }
  return v;
};

export const calculateWorkoutTotals = (items, durationMs, bodyWeight) => {
  let totalVolume = 0;
  let cardioKcal = 0;
  let cardioTimeMin = 0;
  const baseWeight = Number(bodyWeight) || 60;

  let effectiveDuration = durationMs;
  if (!effectiveDuration || isNaN(effectiveDuration) || effectiveDuration <= 0) {
    let totalSets = 0;
    (items || []).forEach(i => { totalSets += (i.sets?.length || 0); });
    effectiveDuration = totalSets * 3 * 60000;
  }

  const processedItems = (items || []).map(item => {
    let itemVolume = 0;
    if (item.sets && Array.isArray(item.sets)) {
      item.sets.forEach(set => {
        if (item.category === '有酸素' || item.weightType === 'cardio') {
          cardioKcal += Number(set.calories) || 0;
          cardioTimeMin += Number(set.time) || 0;
        } else {
          itemVolume += calcSetVolume(set, item.weightType, baseWeight);
          if (item.isSuperSet) {
            if (item.superExerciseName) {
              itemVolume += calcSetVolume(
                { weight: set.superWeight, reps: set.superReps, lReps: set.superLReps, rReps: set.superRReps, forcedReps: set.superForcedReps },
                item.superWeightType,
                baseWeight
              );
            }
            if (item.superExerciseName3) {
              itemVolume += calcSetVolume(
                { weight: set.superWeight3, reps: set.superReps3, lReps: set.superLReps3, rReps: set.superRReps3, forcedReps: set.superForcedReps3 },
                item.superWeightType3,
                baseWeight
              );
            }
          }
          if (item.isDropSet) {
            if (set.dropSets) {
              set.dropSets.forEach(ds => {
                itemVolume += calcSetVolume(ds, item.weightType, baseWeight);
                if (item.isSuperSet && !set.superDropSets && item.superExerciseName && ds.superWeight !== undefined) {
                  itemVolume += calcSetVolume(
                    { weight: ds.superWeight, reps: ds.superReps, lReps: ds.superLReps, rReps: ds.superRReps, forcedReps: ds.superForcedReps },
                    item.superWeightType,
                    baseWeight
                  );
                }
                if (item.isSuperSet && !set.superDropSets3 && item.superExerciseName3 && ds.superWeight3 !== undefined) {
                  itemVolume += calcSetVolume(
                    { weight: ds.superWeight3, reps: ds.superReps3, lReps: ds.superLReps3, rReps: ds.superRReps3, forcedReps: ds.superForcedReps3 },
                    item.superWeightType3,
                    baseWeight
                  );
                }
              });
            }
            if (item.isSuperSet && item.superExerciseName && set.superDropSets) {
              set.superDropSets.forEach(ds => {
                itemVolume += calcSetVolume(
                  { weight: ds.superWeight, reps: ds.superReps, lReps: ds.superLReps, rReps: ds.superRReps, forcedReps: ds.superForcedReps },
                  item.superWeightType,
                  baseWeight
                );
              });
            }
            if (item.isSuperSet && item.superExerciseName3 && set.superDropSets3) {
              set.superDropSets3.forEach(ds => {
                itemVolume += calcSetVolume(
                  { weight: ds.superWeight3, reps: ds.superReps3, lReps: ds.superLReps3, rReps: ds.superRReps3, forcedReps: ds.superForcedReps3 },
                  item.superWeightType3,
                  baseWeight
                );
              });
            }
          }
        }
      });
    }
    return { ...item, itemVolume };
  });

  processedItems.forEach(i => { totalVolume += (i.itemVolume || 0); });

  const weightliftingMs = Math.max(0, effectiveDuration - (cardioTimeMin * 60000));
  const weightliftingHrs = weightliftingMs / 3600000;
  const weightKcal = 6.0 * baseWeight * weightliftingHrs * 1.05;
  const totalCalories = Math.round(cardioKcal + weightKcal);

  return { processedItems, totalVolume, totalCalories };
};

export const getVolumeMetaphor = (kg) => {
  if (!kg || isNaN(kg) || kg <= 0) return '';
  if (kg < 500) return `原付バイク約${(kg / 100).toFixed(1)}台分`;
  if (kg < 2000) return `軽自動車約${(kg / 1000).toFixed(1)}台分`;
  if (kg < 5000) return `サイ約${(kg / 2000).toFixed(1)}頭分`;
  if (kg < 10000) return `アフリカゾウ約${(kg / 6000).toFixed(1)}頭分`;
  if (kg < 50000) return `中型トラック約${(kg / 8000).toFixed(1)}台分`;
  return `大型トレーラー級！`;
};

// ワークアウト記録のテキスト書き出し
export const exportWorkoutToText = (post, processedItems, displayVolumeCalc, displayCalories) => {
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

  const getSetText = (setObj, wType, type, prefix) => {
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
      t += `L:${lReps || 0} R:${rReps || 0}回`;
    } else {
      t += `${reps || 0}回`;
    }
    if (forcedReps) t += ` (+補助${forcedReps})`;
    return t + '\n';
  };

  processedItems.forEach((item, idx) => {
    text += `■ ${idx + 1}. ${item.exerciseName}`;
    if (item.category) text += ` [${item.category}]`;
    text += `\n`;

    if (item.isSuperSet && item.superExerciseName) {
      text += `  スーパー: ${item.superExerciseName}\n`;
      if (item.superExerciseName3) text += `  ジャイアント: ${item.superExerciseName3}\n`;
    }

    if (item.sets && Array.isArray(item.sets)) {
      item.sets.forEach((set, sIdx) => {
        const mainText = getSetText(set, item.weightType, 'main', `Set ${sIdx + 1}:`);
        if (mainText) text += `  ${mainText}`;

        if (item.isDropSet && set.dropSets) {
          set.dropSets.forEach(ds => {
            const dropText = getSetText(ds, item.weightType, 'main', `   ↳ Drop:`);
            if (dropText) text += `  ${dropText}`;
          });
        }

        if (item.isSuperSet && item.superExerciseName) {
          const sup2Text = getSetText(set, item.superWeightType || 'total', 'super2', `   ↳ Sup2:`);
          if (sup2Text) text += `  ${sup2Text}`;
          if (item.isDropSet && set.superDropSets) {
            set.superDropSets.forEach(ds => {
              const dsSup2Text = getSetText(ds, item.superWeightType || 'total', 'super2', `     ↳ Drop2:`);
              if (dsSup2Text) text += `    ${dsSup2Text}`;
            });
          }
        }

        if (item.isSuperSet && item.superExerciseName3) {
          const sup3Text = getSetText(set, item.superWeightType3 || 'total', 'super3', `   ↳ Sup3:`);
          if (sup3Text) text += `  ${sup3Text}`;
          if (item.isDropSet && set.superDropSets3) {
            set.superDropSets3.forEach(ds => {
              const dsSup3Text = getSetText(ds, item.superWeightType3 || 'total', 'super3', `     ↳ Drop3:`);
              if (dsSup3Text) text += `    ${dsSup3Text}`;
            });
          }
        }
      });
    }
    if (item.memo) text += `  メモ: ${item.memo}\n`;
    text += `\n`;
  });

  return text;
};

// AI不要のルールベース高速テキストパーサー（書き出しフォーマット＆自由記述対応）
export const parseWorkoutFromText = (rawText, availableExercises = []) => {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  let currentItem = null;

  const findExerciseMeta = (name) => {
    if (!name) return null;
    return availableExercises.find(ex => ex.name === name || ex.name.includes(name) || name.includes(ex.name));
  };

  for (const line of lines) {
    // ヘッダー行はスキップ
    if (/^(【トレーニング記録】|日時:|場所:|体組成:|総負荷量:|総消費:)/.test(line)) continue;

    // 種目見出し行: ■ 1. ベンチプレス [胸] または 1. ベンチプレス
    const headerMatch = line.match(/^(?:■\s*)?(?:\d+\.\s*)?([^\[\n]+?)(?:\s*\[([^\]]+)\])?$/);
    if (line.startsWith('■') || (/^\d+\.\s+/.test(line) && !line.toLowerCase().startsWith('set'))) {
      const exNameRaw = (headerMatch ? headerMatch[1] : line.replace(/^■\s*\d*\.*\s*/, '')).trim();
      const catRaw = headerMatch && headerMatch[2] ? headerMatch[2].trim() : null;
      const matched = findExerciseMeta(exNameRaw);
      currentItem = {
        id: generateId(),
        exerciseName: matched ? matched.name : exNameRaw,
        category: matched ? (matched.category || 'その他') : (MUSCLE_CATEGORIES.includes(catRaw) ? catRaw : 'その他'),
        weightType: matched ? (matched.weightType || 'total') : 'total',
        isSuperSet: false,
        isDropSet: false,
        isForcedReps: false,
        superExerciseName: '',
        superWeightType: 'total',
        superExerciseName3: '',
        superWeightType3: 'total',
        memo: '',
        sets: []
      };
      items.push(currentItem);
      continue;
    }

    if (!currentItem) continue;

    if (line.startsWith('スーパー:')) {
      const supName = line.replace('スーパー:', '').trim();
      const matched = findExerciseMeta(supName);
      currentItem.isSuperSet = true;
      currentItem.superExerciseName = matched ? matched.name : supName;
      currentItem.superWeightType = matched ? (matched.weightType || 'total') : 'total';
      continue;
    }
    if (line.startsWith('ジャイアント:')) {
      const sup3Name = line.replace('ジャイアント:', '').trim();
      const matched = findExerciseMeta(sup3Name);
      currentItem.isSuperSet = true;
      currentItem.superExerciseName3 = matched ? matched.name : sup3Name;
      currentItem.superWeightType3 = matched ? (matched.weightType3 || 'total') : 'total';
      continue;
    }
    if (line.startsWith('メモ:')) {
      currentItem.memo = line.replace('メモ:', '').trim();
      continue;
    }

    // セット行の解析 (Set 1: 60kg x 10回 / Set 1: 60kg x L:10 R:10回 / ↳ Drop: 50kg x 8回)
    const isDropLine = line.includes('Drop:');
    const lrMatch = line.match(/([+-]?\d+(?:\.\d+)?|自重)\s*(?:kg|枚|kg\(片\))?\s*[x×]\s*L:(\d+)\s*R:(\d+)/i);
    const stdMatch = line.match(/([+-]?\d+(?:\.\d+)?|自重)\s*(?:kg|枚|kg\(片\))?\s*[x×]\s*(\d+)\s*回?/i);
    const forcedMatch = line.match(/\(\+補助(\d+)\)/);
    const cardioMatch = line.match(/(?:(\d+(?:\.\d+)?)km)?\s*(?:(\d+)分)?\s*(?:(\d+)kcal)?/i);

    if (lrMatch) {
      currentItem.weightType = 'lr';
      const w = lrMatch[1] === '自重' ? '0' : lrMatch[1];
      const setObj = {
        id: generateId(),
        weight: w,
        reps: '',
        lReps: lrMatch[2],
        rReps: lrMatch[3],
        forcedReps: forcedMatch ? forcedMatch[1] : '',
        dropSets: []
      };
      if (forcedMatch) currentItem.isForcedReps = true;
      if (isDropLine && currentItem.sets.length > 0) {
        currentItem.isDropSet = true;
        currentItem.sets[currentItem.sets.length - 1].dropSets.push(setObj);
      } else {
        currentItem.sets.push(setObj);
      }
    } else if (stdMatch) {
      const w = stdMatch[1] === '自重' ? '0' : stdMatch[1];
      const setObj = {
        id: generateId(),
        weight: w,
        reps: stdMatch[2],
        lReps: '',
        rReps: '',
        forcedReps: forcedMatch ? forcedMatch[1] : '',
        dropSets: []
      };
      if (forcedMatch) currentItem.isForcedReps = true;
      if (isDropLine && currentItem.sets.length > 0) {
        currentItem.isDropSet = true;
        currentItem.sets[currentItem.sets.length - 1].dropSets.push(setObj);
      } else {
        currentItem.sets.push(setObj);
      }
    } else if (line.toLowerCase().startsWith('set') && cardioMatch && (cardioMatch[1] || cardioMatch[2] || cardioMatch[3])) {
      currentItem.weightType = 'cardio';
      currentItem.category = '有酸素';
      currentItem.sets.push({
        id: generateId(),
        distance: cardioMatch[1] || '',
        time: cardioMatch[2] || '',
        calories: cardioMatch[3] || ''
      });
    }
  }

  return items.filter(it => it.exerciseName && it.sets.length > 0);
};

// プログラムスケジュール生成ユーティリティ
export const buildProgramSchedule = (progType, oneRM) => {
  const round25 = (val) => Math.round(val / 2.5) * 2.5;
  const schedule = [];

  if (progType === 'HPS') {
    const percents = [
      { h: 0.7, p: 0.6, s: 0.8 },
      { h: 0.725, p: 0.6, s: 0.825 },
      { h: 0.75, p: 0.65, s: 0.85 },
      { h: 0.775, p: 0.65, s: 0.875 },
      { h: 0.8, p: 0.7, s: 0.9 },
      { h: 0.6, p: 0.5, s: 1.025 }
    ];
    const schemes = [
      { hR: 8, hS: 5, pR: 3, pS: 5, sR: 3, sS: 3 },
      { hR: 8, hS: 5, pR: 3, pS: 5, sR: 3, sS: 3 },
      { hR: 8, hS: 5, pR: 3, pS: 5, sR: 2, sS: 3 },
      { hR: 8, hS: 5, pR: 3, pS: 5, sR: 2, sS: 3 },
      { hR: 8, hS: 5, pR: 3, pS: 5, sR: 1, sS: 3 },
      { hR: 5, hS: 3, pR: 3, pS: 3, sR: 1, sS: 1 }
    ];
    const hAdvice = '丁寧なフォームでコントロールし、筋肉への負荷を意識。下ろす動作（ネガティブ）をゆっくりと。';
    const pAdvice = '挙上スピードをできるだけ爆発的に！重量は軽いですが全力で素早く挙げます（ボトムで止めない）。';
    const sAdvice = '高重量の日。セット間の休憩を長め（3〜5分）に取り、神経系を鍛える意識で全力挙上。';
    for (let w = 0; w < 6; w++) {
      schedule.push({ id: generateId(), week: w + 1, day: 1, type: 'Hypertrophy', weight: round25(oneRM * percents[w].h), reps: schemes[w].hR, sets: schemes[w].hS, advice: hAdvice, completed: false });
      schedule.push({ id: generateId(), week: w + 1, day: 2, type: 'Power', weight: round25(oneRM * percents[w].p), reps: schemes[w].pR, sets: schemes[w].pS, advice: pAdvice, completed: false });
      schedule.push({ id: generateId(), week: w + 1, day: 3, type: 'Strength', weight: round25(oneRM * percents[w].s), reps: schemes[w].sR, sets: schemes[w].sS, advice: sAdvice, completed: false });
    }
  } else if (progType === 'SMOLOV') {
    const base = [
      { w: 0.7, r: 6, s: 6, t: 'Day 1', a: '初日。まだ余裕がある重量ですが、全セットのフォームを統一する意識で。' },
      { w: 0.75, r: 5, s: 7, t: 'Day 2', a: 'セット数が多いです。休憩をしっかり取り、後半のフォーム崩れに注意。' },
      { w: 0.8, r: 4, s: 8, t: 'Day 3', a: '疲労が溜まってくる頃。無理に挙げ急がず、1レップずつ丁寧に。' },
      { w: 0.85, r: 3, s: 10, t: 'Day 4', a: '今週の山場。10セットと過酷ですが、気合いで乗り切りましょう！' }
    ];
    for (let w = 0; w < 3; w++) {
      const addKg = w * 2.5;
      base.forEach((d, i) => {
        schedule.push({ id: generateId(), week: w + 1, day: i + 1, type: d.t, weight: round25(oneRM * d.w) + addKg, reps: d.r, sets: d.s, advice: d.a, completed: false });
      });
    }
  } else if (progType === 'WENDLER') {
    const tm = oneRM * 0.9;
    const wData = [
      { w: 0.85, r: '5+', s: 1, t: 'メインセット', a: '最終セットはフォームが崩れない範囲で限界まで反復（AMRAP）！' },
      { w: 0.90, r: '3+', s: 1, t: 'メインセット', a: '最終セットは限界まで。先週の記録を超える意識で。' },
      { w: 0.95, r: '1+', s: 1, t: 'メインセット', a: '自己ベスト更新のつもりで、限界まで反復！' },
      { w: 0.60, r: '5', s: 1, t: 'ディロード', a: '疲労を抜くための軽い週。フォームの確認に集中し、追い込みすぎないこと。' }
    ];
    for (let w = 0; w < 4; w++) {
      schedule.push({ id: generateId(), week: w + 1, day: 1, type: wData[w].t, weight: round25(tm * wData[w].w), reps: wData[w].r, sets: wData[w].s, advice: wData[w].a, completed: false, isAmrap: w !== 3 });
    }
  }
  return schedule;
};


// トースト通知ディスパッチ（alertの代替として洗練されたアプリ内トーストを表示）
export const notifyUser = (message, type = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('withfitToast', { detail: { message, type } }));
  }
};

// クリップボードへの安全なコピー（フォールバック付き）
export const copyTextSafe = (text, successMsg = 'クリップボードにコピーしました') => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => notifyUser(successMsg, 'success')).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        notifyUser(successMsg, 'success');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      notifyUser(successMsg, 'success');
    }
  } catch (e) {
    notifyUser('コピーに失敗しました', 'error');
  }
};
