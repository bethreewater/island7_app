import React from 'react';
import { CaseData } from '../../types';

export const QueueCard = React.memo(({
  icon,
  title,
  count,
  helper,
  items,
  onOpen,
  fallbackOpen,
  targetTab,
  onFilter,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  helper: string;
  items: CaseData[];
  onOpen?: (caseId: string, targetTab?: 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty') => void;
  fallbackOpen: (caseId: string) => void;
  targetTab?: 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty';
  onFilter: () => void;
  tone: 'amber' | 'blue' | 'emerald' | 'violet' | 'rose';
}) => {
  const toneClass = {
    amber: 'border-amber-200 bg-amber-50/50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50/50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
    violet: 'border-violet-200 bg-violet-50/50 text-violet-700',
    rose: 'border-rose-200 bg-rose-50/50 text-rose-700',
  }[tone];

  return (
    <div className={`border rounded-sm p-4 ${toneClass}`}>
      <button onClick={onFilter} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">{icon} {title}</div>
        <div className="text-2xl font-black">{count}</div>
      </button>
      <div className="text-xs mt-2 opacity-80">{helper}</div>
      <div className="mt-3 space-y-2">
        {items.slice(0, 3).map((item) => (
          <button key={item.caseId} onClick={() => onOpen ? onOpen(item.caseId, targetTab) : fallbackOpen(item.caseId)} className="w-full text-left bg-white/80 hover:bg-white border border-current/10 rounded-sm px-3 py-2 transition-colors">
            <div className="text-sm font-black text-zinc-950 truncate">{item.customerName}</div>
            <div className="text-[10px] text-zinc-500 truncate">{item.address || item.buildingContext || '待補資訊'}</div>
          </button>
        ))}
        {count === 0 && <div className="text-xs opacity-60 py-2">目前沒有待處理項目</div>}
        {count > 3 && <div className="text-[10px] font-black opacity-70">+{count - 3} 筆待處理</div>}
      </div>
    </div>
  );
});
