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

export export const getFFMIEval = (ffmi, gender) => {
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
     (items || []).forEach(i => totalSets += (i.sets?.length || 0));
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
            if (item.superExerciseName) itemVolume += calcSetVolume({weight: set.superWeight, reps: set.superReps, lReps: set.superLReps, rReps: set.superRReps, forcedReps: set.superForcedReps}, item.superWeightType, baseWeight); 
            if (item.superExerciseName3) itemVolume += calcSetVolume({weight: set.superWeight3, reps: set.superReps3, lReps: set.superLReps3, rReps: set.superRReps3, forcedReps: set.superForcedReps3}, item.superWeightType3, baseWeight); 
          }
          if (item.isDropSet) { 
            if (set.dropSets) {
              set.dropSets.forEach(ds => { 
                itemVolume += calcSetVolume(ds, item.weightType, baseWeight); 
                if (item.isSuperSet && !set.superDropSets && item.superExerciseName && ds.superWeight !== undefined) {
                   itemVolume += calcSetVolume({weight: ds.superWeight, reps: ds.superReps, lReps: ds.superLReps, rReps: ds.superRReps, forcedReps: ds.superForcedReps}, item.superWeightType, baseWeight); 
                }
                if (item.isSuperSet && !set.superDropSets3 && item.superExerciseName3 && ds.superWeight3 !== undefined) {
                   itemVolume += calcSetVolume({weight: ds.superWeight3, reps: ds.superReps3, lReps: ds.superLReps3, rReps: ds.superRReps3, forcedReps: ds.superForcedReps3}, item.superWeightType3, baseWeight); 
                }
              }); 
            }
            if (item.isSuperSet && item.superExerciseName && set.superDropSets) {
              set.superDropSets.forEach(ds => {
                itemVolume += calcSetVolume({weight: ds.superWeight, reps: ds.superReps, lReps: ds.superLReps, rReps: ds.superRReps, forcedReps: ds.superForcedReps}, item.superWeightType, baseWeight);
              });
            }
            if (item.isSuperSet && item.superExerciseName3 && set.superDropSets3) {
              set.superDropSets3.forEach(ds => {
                itemVolume += calcSetVolume({weight: ds.superWeight3, reps: ds.superReps3, lReps: ds.superLReps3, rReps: ds.superRReps3, forcedReps: ds.superForcedReps3}, item.superWeightType3, baseWeight);
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

// --- グラフコンポーネント ---
