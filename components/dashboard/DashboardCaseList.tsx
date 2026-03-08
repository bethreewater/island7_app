import React from 'react';
import { ArrowRight, CalendarClock, Edit, MapPin, Trash2 } from 'lucide-react';
import { CaseData, CaseStatus, STATUS_LABELS, isActiveStatus, isCompletedStatus, normalizeCaseStatus } from '../../types';
import { DashboardTargetTab, formatCurrency, getCaseNextAction, getCasePrimarySummary, getCaseRiskFlags, getDaysFromToday } from '../../utils/dashboard';

interface DashboardCaseListProps {
  cases: CaseData[];
  totalCount: number;
  appliedFilters: string[];
  onOpen: (caseId: string) => void;
  onOpenAction?: (caseId: string, targetTab?: DashboardTargetTab) => void;
  onEdit: (item: CaseData, e: React.MouseEvent) => void;
  onDelete: (caseId: string, caseName: string, e: React.MouseEvent) => void;
}

export const DashboardCaseList: React.FC<DashboardCaseListProps> = ({ cases, totalCount, appliedFilters, onOpen, onOpenAction, onEdit, onDelete }) => {
  return (
    <>
      <div className="flex flex-col gap-4 border-b-2 border-zinc-950 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">PROJECT COMMAND LIST</h2>
          <div className="mt-1 text-2xl font-black tracking-tight text-zinc-950">案件清單 / ACTIVE ARCHIVE</div>
          <div className="mt-2 text-sm text-zinc-500">保留搜尋、篩選與風險標記後的結果，直接從清單進入下一步。</div>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          顯示 {cases.length} / {totalCount} 筆
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {appliedFilters.length > 0 ? appliedFilters.map((label) => (
          <span key={label} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</span>
        )) : <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">目前顯示全部案件</span>}
      </div>

      <div className="mt-6 space-y-3">
        {cases.length > 0 ? cases.map((item) => {
          const normalizedStatus = normalizeCaseStatus(item.status);
          const action = getCaseNextAction(item);
          const riskFlags = getCaseRiskFlags(item);
          const createdDays = getDaysFromToday(item.createdDate);

          return (
            <div key={item.caseId} onClick={() => onOpen(item.caseId)} className="group rounded-sm border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-950 md:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black tracking-tight text-zinc-950">{item.customerName}</span>
                    <span className={`rounded-sm border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${isActiveStatus(item.status) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isCompletedStatus(item.status) ? 'border-zinc-200 bg-zinc-100 text-zinc-600' : normalizedStatus === CaseStatus.WARRANTY ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-zinc-950 bg-zinc-950 text-white'}`}>
                      {STATUS_LABELS[normalizedStatus] || String(item.status).toUpperCase()}
                    </span>
                    {riskFlags.map((flag) => (
                      <span key={flag.label} className={`rounded-sm border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeTone(flag.tone)}`}>{flag.label}</span>
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {item.address || '未填寫地址'}</span>
                    <span className="inline-flex items-center gap-1.5"><CalendarClock size={12} /> 建立 {createdDays ?? 0} 天</span>
                    <span>案號 {item.caseId}</span>
                  </div>

                  <div className="mt-3 text-sm font-bold text-zinc-700">{getCasePrimarySummary(item)}</div>
                  <div className="mt-1 text-xs text-zinc-500">下一步：{action.label} / {action.description}</div>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="text-left xl:text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">案件金額</div>
                    <div className="mt-1 text-2xl font-black tracking-tight text-zinc-950">{formatCurrency(item.finalPrice || 0)}</div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
                    <button onClick={(event) => { event.stopPropagation(); onOpenAction ? onOpenAction(item.caseId, action.tab) : onOpen(item.caseId); }} className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-zinc-950 bg-zinc-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-black sm:w-auto">
                      {action.label}
                      <ArrowRight size={14} />
                    </button>
                    <button onClick={(event) => onEdit(item, event)} className="inline-flex w-full items-center justify-center rounded-sm border border-zinc-200 px-3 py-2 text-zinc-500 transition-colors hover:border-zinc-950 hover:text-zinc-950 sm:w-auto" title="編輯案件">
                      <Edit size={16} />
                    </button>
                    <button onClick={(event) => onDelete(item.caseId, item.customerName, event)} className="inline-flex w-full items-center justify-center rounded-sm border border-zinc-200 px-3 py-2 text-zinc-500 transition-colors hover:border-red-300 hover:text-red-600 sm:w-auto" title="刪除案件">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="rounded-sm border border-dashed border-zinc-200 bg-zinc-50 py-20 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300">NO MATCHING RECORDS</div>
            <div className="mt-2 text-sm text-zinc-500">沒有符合目前條件的案件，試試看放寬篩選。</div>
          </div>
        )}
      </div>
    </>
  );
};

const badgeTone = (tone: 'amber' | 'blue' | 'emerald' | 'rose' | 'violet') => {
  const styles = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  } as const;
  return styles[tone];
};
