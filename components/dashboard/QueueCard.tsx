import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
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
  severity,
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
  severity?: 'normal' | 'high';
}) => {
  const toneClass = {
    amber: 'border-amber-200 bg-amber-50/70 text-amber-800',
    blue: 'border-blue-200 bg-blue-50/70 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50/70 text-violet-800',
    rose: 'border-rose-200 bg-rose-50/70 text-rose-800',
  }[tone];

  return (
    <div className={`rounded-sm border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]">{icon} {title}</div>
          <div className="mt-2 text-sm opacity-80">{helper}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tracking-tight">{count}</div>
          {severity === 'high' && <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-current/20 bg-white/60 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em]"><AlertTriangle size={10} /> 高優先</div>}
        </div>
      </div>

      <button onClick={onFilter} className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] opacity-80 transition-opacity hover:opacity-100">
        套用此篩選 <ArrowRight size={12} />
      </button>

      <div className="mt-4 space-y-2">
        {items.slice(0, 3).map((item, index) => (
          <button key={item.caseId} onClick={() => onOpen ? onOpen(item.caseId, targetTab) : fallbackOpen(item.caseId)} className="w-full rounded-sm border border-current/10 bg-white/90 px-3 py-3 text-left transition-colors hover:bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-zinc-950">{item.customerName}</div>
                <div className="mt-1 truncate text-[11px] text-zinc-500">{item.address || item.buildingContext || '待補資訊'}</div>
              </div>
              <div className="rounded-full border border-current/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em]">#{index + 1}</div>
            </div>
          </button>
        ))}
        {count === 0 && <div className="rounded-sm border border-dashed border-current/15 bg-white/40 px-3 py-4 text-center text-xs opacity-70">目前沒有待處理項目</div>}
        {count > 3 && <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">另外還有 {count - 3} 筆待處理</div>}
      </div>
    </div>
  );
});
