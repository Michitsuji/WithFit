import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ListPlus, Send, Activity, CheckCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { calculateWorkoutTotals } from '../../utils/calculations';
import { formatDateFromTimestamp } from '../../utils/dateUtils';

export function CoachChatModal({ isOpen, onClose, currentUser, accountsInfo, posts, appId }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const myInfo = accountsInfo[currentUser] || {};
  const [ledgerText, setLedgerText] = useState(myInfo.coachLedger || '');
  const [isSavingLedger, setIsSavingLedger] = useState(false);
  const chatEndRef = useRef(null);

  const [setupGoal, setSetupGoal] = useState('筋肥大（バルクアップ）');
  const [setupLevel, setSetupLevel] = useState('初心者（1年未満）');
  const [setupDays, setSetupDays] = useState('週3〜4回');
  const [selectedMenuDate, setSelectedMenuDate] = useState(() => formatDateFromTimestamp(Date.now()));

  useEffect(() => {
    if (isOpen) {
      setLedgerText(myInfo.coachLedger || '');
      if (chatHistory.length === 0) {
         setChatHistory([{ role: 'assistant', text: 'お疲れ様です！本日のトレーニング予定や、相談したいことはありますか？台帳の内容に沿ってサポートしますよ！' }]);
      }
    }
  }, [isOpen, myInfo.coachLedger]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  if (!isOpen) return null;

  const handleSaveLedger = async () => {
    if (!db || !currentUser) return;
    setIsSavingLedger(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { coachLedger: ledgerText }, { merge: true });
      alert('台帳を保存しました！以降のAIコーチの回答はこの台帳を基準に行われます。');
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました');
    }
    setIsSavingLedger(false);
  };

  const handleLoadMenu = () => {
    const targetPosts = posts.filter(p => p.author === currentUser && formatDateFromTimestamp(p.timestamp) === selectedMenuDate);
    
    if (targetPosts.length === 0) {
      alert(`${selectedMenuDate} の記録がありません。`);
      return;
    }

    let allText = '';
    
    targetPosts.forEach(post => {
      const authorInfo = accountsInfo && accountsInfo[post.author];
      const baseWeight = Number(post.bodyWeight) || Number(authorInfo?.weight) || 60;
      const { processedItems, totalVolume, totalCalories } = calculateWorkoutTotals(post.items || [], post.duration, baseWeight);
      const displayVolumeCalc = (!post.items || post.items.length === 0) ? 0 : ((post.volume && post.volume > 0) ? post.volume : totalVolume);
      const displayCalories = (!post.items || post.items.length === 0) ? 0 : ((post.calories && post.calories > 0) ? post.calories : totalCalories);

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

      processedItems.forEach((item, idx) => {
          text += `■ ${idx + 1}. ${item.exerciseName}`;
          if (item.category) text += ` [${item.category}]`;
          text += `\n`;
          
          if (item.isSuperSet && item.superExerciseName) {
              text += `  スーパー: ${item.superExerciseName}\n`;
              if (item.superExerciseName3) text += `  ジャイアント: ${item.superExerciseName3}\n`;
          }

          const getSetText = (setObj, wType, type, isDrop, prefix) => {
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
                  t += `L:${lReps||0} R:${rReps||0}回`;
              } else {
                  t += `${reps||0}回`;
              }
              if (forcedReps) t += ` (+補助${forcedReps})`;
              return t + '\n';
          };

          if (item.sets && Array.isArray(item.sets)) {
              item.sets.forEach((set, sIdx) => {
                  const mainText = getSetText(set, item.weightType, 'main', false, `Set ${sIdx + 1}:`);
                  if (mainText) text += `  ${mainText}`;
                  
                  if (item.isDropSet && set.dropSets) {
                      set.dropSets.forEach((ds, dsIdx) => {
                          const dropText = getSetText(ds, item.weightType, 'main', true, `   ↳ Drop:`);
                          if (dropText) text += `  ${dropText}`;
                      });
                  }
                  
                  if (item.isSuperSet && item.superExerciseName) {
                      const sup2Text = getSetText(set, item.superWeightType || 'total', 'super2', false, `   ↳ Sup2:`);
                      if (sup2Text) text += `  ${sup2Text}`;
                      
                      if (item.isDropSet && set.dropSets && !set.superDropSets) {
                          set.dropSets.forEach((ds, dsIdx) => {
                              if (ds.superWeight !== undefined) {
                                  const dsSup2Text = getSetText(ds, item.superWeightType || 'total', 'super2', true, `     ↳ Drop2:`);
                                  if (dsSup2Text) text += `    ${dsSup2Text}`;
                              }
                          });
                      }
                      if (item.isDropSet && set.superDropSets) {
                          set.superDropSets.forEach((ds, dsIdx) => {
                              const dsSup2Text = getSetText(ds, item.superWeightType || 'total', 'super2', true, `     ↳ Drop2:`);
                              if (dsSup2Text) text += `    ${dsSup2Text}`;
                          });
                      }
                  }

                  if (item.isSuperSet && item.superExerciseName3) {
                      const sup3Text = getSetText(set, item.superWeightType3 || 'total', 'super3', false, `   ↳ Sup3:`);
                      if (sup3Text) text += `  ${sup3Text}`;
                      
                      if (item.isDropSet && set.dropSets && !set.superDropSets3) {
                          set.dropSets.forEach((ds, dsIdx) => {
                              if (ds.superWeight3 !== undefined) {
                                  const dsSup3Text = getSetText(ds, item.superWeightType3 || 'total', 'super3', true, `     ↳ Drop3:`);
                                  if (dsSup3Text) text += `    ${dsSup3Text}`;
                              }
                          });
                      }
                      if (item.isDropSet && set.superDropSets3) {
                          set.superDropSets3.forEach((ds, dsIdx) => {
                              const dsSup3Text = getSetText(ds, item.superWeightType3 || 'total', 'super3', true, `     ↳ Drop3:`);
                              if (dsSup3Text) text += `    ${dsSup3Text}`;
                          });
                      }
                  }
              });
          }
          if (item.memo) text += `  メモ: ${item.memo}\n`;
          text += `\n`;
      });
      allText += text + '\n';
    });

    setMessage(`以下のトレーニング内容について、分析やアドバイスをお願いします！\n\n${allText.trim()}`);
  };

  const handleGenerateLedger = () => {
    const initialText = `【長期進捗マスター台帳】\n・主な目的: ${setupGoal}\n・経験レベル: ${setupLevel}\n・トレーニング頻度: ${setupDays}\n\n【方針】\n無理なく継続し、設定した目的に沿って着実にステップアップを目指す。`;
    setLedgerText(initialText);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    const userMsg = message.trim();
    setMessage('');
    setChatHistory(prev => {
      const newHistory = [...prev, { role: 'user', text: userMsg }];
      return newHistory.slice(-10);
    });
    setIsLoading(true);

    const myRecentPosts = posts.filter(p => p.author === currentUser).slice(0, 3);
    const recentWorkoutText = myRecentPosts.map(p => 
      `${p.date.substring(0,10)}: ${p.gymName || '不明なジム'} (総負荷量: ${p.volume}kg)`
    ).join('\n');

    const historyText = chatHistory.slice(-10).map(m => `${m.role === 'user' ? '私' : 'コーチ'}: ${m.text}`).join('\n');

    const prompt = `あなたは私の専属トレーニングコーチです。
ユーザーからメッセージやトレーニング内容が送られます。
以下の2つの要素を含むJSON形式で回答してください。JSON以外のテキストは一切含めないでください。

1. "chatResponse": 送信されたメニューやメッセージに対する評価・アドバイス・励ましのみを親しみやすく簡潔な言葉で書いてください。（台帳の更新についての言及は不要です）
2. "updatedLedger": 以下の【現在のマスター台帳】の内容をもとに、今回の会話内容から得られた新しい気づき、重量更新、フォームの課題、今後の目標などを反映し、整理・追記・更新した最新の台帳テキストを出力してください。

【現在のマスター台帳】
${myInfo.coachLedger || 'まだ台帳が設定されていません。'}

【私の現在の状態】
・表示名: ${myInfo.displayName || currentUser}
・目標: ${myInfo.goal || '未設定'}
・体重: ${myInfo.weight ? myInfo.weight + 'kg' : '未設定'}
・直近のトレーニング:
${recentWorkoutText || 'まだ記録がありません'}

【これまでの会話（直近10件）】
${historyText}

私のメッセージ:「${userMsg}」`;

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      let textResponse = data.candidates[0].content.parts[0].text;
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(textResponse);
      
      setChatHistory(prev => {
        const newHistory = [...prev, { role: 'assistant', text: parsed.chatResponse }];
        return newHistory.slice(-10);
      });
      
      if (parsed.updatedLedger) {
         setLedgerText(parsed.updatedLedger);
         try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentUser), { coachLedger: parsed.updatedLedger }, { merge: true });
         } catch(err) { console.error("Ledger auto-update failed", err); }
      }
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'assistant', text: '申し訳ありません、エラーが発生しました。時間を置いて再度お試しください。' }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[90] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-500"/> AIコーチ
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 m-4 rounded-xl shrink-0">
          <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>チャット</button>
          <button onClick={() => setActiveTab('ledger')} className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-colors ${activeTab === 'ledger' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>マスター台帳</button>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none p-3 shadow-sm flex gap-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="px-4 pt-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input 
                type="date" 
                value={selectedMenuDate} 
                onChange={(e) => setSelectedMenuDate(e.target.value)}
                className="text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
              />
              <button onClick={handleLoadMenu} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1 shrink-0">
                <ListPlus size={12} /> データを読み込む
              </button>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 flex gap-2 shrink-0">
              <input 
                type="text" 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="コーチに相談する..." 
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-transparent rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                onClick={handleSendMessage} 
                disabled={!message.trim() || isLoading}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white p-2.5 rounded-xl transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-slate-50 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
              チャットをするたびにAIが自動で「マスター台帳」を整理・更新します。<br/>
              コーチは常にこの情報を基準に指導を行います。手動で直接編集して保存することも可能です。
            </p>
            {(!myInfo.coachLedger && ledgerText === '') ? (
              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center">台帳の初期設定</p>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">主な目的</label>
                  <select value={setupGoal} onChange={e => setSetupGoal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700">
                    <option value="筋肥大（バルクアップ）">筋肥大（バルクアップ）</option>
                    <option value="ダイエット（減量）">ダイエット（減量）</option>
                    <option value="筋力向上（重量アップ）">筋力向上（重量アップ）</option>
                    <option value="健康維持">健康維持</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">経験レベル</label>
                  <select value={setupLevel} onChange={e => setSetupLevel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700">
                    <option value="初心者（1年未満）">初心者（1年未満）</option>
                    <option value="中級者（1〜3年）">中級者（1〜3年）</option>
                    <option value="上級者（3年以上）">上級者（3年以上）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">トレーニング頻度</label>
                  <select value={setupDays} onChange={e => setSetupDays(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700">
                    <option value="週1〜2回">週1〜2回</option>
                    <option value="週3〜4回">週3〜4回</option>
                    <option value="週5回以上">週5回以上</option>
                  </select>
                </div>
                <button onClick={handleGenerateLedger} className="mt-auto bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-sm hover:bg-indigo-600 transition-colors">
                  台帳のベースを作成
                </button>
              </div>
            ) : (
              <textarea
                value={ledgerText}
                onChange={e => setLedgerText(e.target.value)}
                placeholder="【長期進捗マスター台帳】&#10;・身長: 171cm&#10;・目標: ...&#10;などを記述"
                className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none font-mono"
              />
            )}
            <button 
              onClick={handleSaveLedger} 
              disabled={isSavingLedger || (!myInfo.coachLedger && ledgerText === '')}
              className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {isSavingLedger ? <Activity className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              台帳を保存して適用
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- プロフィール設定モーダル ---
