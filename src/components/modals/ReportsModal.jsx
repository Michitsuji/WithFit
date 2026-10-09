import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { renderUsernameWithBadge } from '../common/renderUsernameWithBadge';
import { appId } from '../../services/firebase';

export function ReportsModal({ isOpen, onClose, db, accountsInfo }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !db) return;
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = [];
      snapshot.forEach(doc => {
        reportsData.push({ id: doc.id, ...doc.data() });
      });
      setReports(reportsData);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [isOpen, db]);

  const handleDeleteReport = async (id) => {
    if (!window.confirm('この報告を削除しますか？')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', id));
    } catch (e) {}
  };

  const getRelativeTime = (timestamp) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const m = Math.floor(diff / 60000);
    if (m === 0) return 'たった今';
    if (m < 60) return `${m}分前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}時間前`;
    return `${Math.floor(h / 24)}日前`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">不具合・要望一覧</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={18}/></button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="text-center p-4 text-slate-400 font-bold text-xs">読み込み中...</div>
          ) : reports.length === 0 ? (
            <div className="text-center p-4 text-slate-400 font-bold text-xs">報告はありません</div>
          ) : (
            reports.map(report => {
              const uInfo = accountsInfo && accountsInfo[report.author];
              return (
                <div key={report.id} className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[9px] overflow-hidden">
                        {uInfo?.photoUrl ? <img src={uInfo.photoUrl} alt="" className="w-full h-full object-cover" /> : report.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        {renderUsernameWithBadge(report.author, uInfo?.displayName, accountsInfo, "text-xs font-bold text-slate-800 dark:text-slate-200")}
                        <span className="text-[9px] text-slate-400">{getRelativeTime(report.timestamp)}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteReport(report.id)} className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words pl-8 leading-relaxed">{report.text}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// --- ナビゲーションボタン ---
