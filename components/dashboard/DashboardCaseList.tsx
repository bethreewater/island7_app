import React from 'react';
import { ArrowRight, Edit, MapPin, Trash2 } from 'lucide-react';
import { CaseData, CaseStatus, STATUS_LABELS, isActiveStatus, isCompletedStatus, normalizeCaseStatus } from '../../types';
import { getTodayString, hasMissingLocation, hasOverdueWarrantyVisit, hasPendingDeposit, hasPendingFinalPayment, hasPendingWarrantyVisit } from '../../utils/operations';

interface DashboardCaseListProps {
  cases: CaseData[];
  totalCount: number;
  onOpen: (caseId: string) => void;
  onEdit: (item: CaseData, e: React.MouseEvent) => void;
  onDelete: (caseId: string, caseName: string, e: React.MouseEvent) => void;
}

export const DashboardCaseList: React.FC<DashboardCaseListProps> = ({ cases, totalCount, onOpen, onEdit, onDelete }) => {
  const today = getTodayString();

  return (
    <>
      <div className="flex items-end justify-between border-b md:border-b-2 border-zinc-950 pb-2 md:pb-3 mb-4 md:mb-6">
        <div className="whitespace-nowrap min-w-0">
          <h2 className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5 leading-none">PROJECT ARCHIVE</h2>
          <div className="text-lg md:text-2xl font-black text-zinc-950 tracking-tighter uppercase leading-none truncate">案件清單 / RECENT</div>
        </div>
        <div className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded-sm whitespace-nowrap">{cases.length} / {totalCount} 筆</div>
      </div>

      <div className="space-y-2 md:space-y-3">
        {cases.length > 0 ? cases.map((c) => (
          <div key={c.caseId} onClick={() => onOpen(c.caseId)} className="group bg-white border border-zinc-100 rounded-sm p-3 md:p-5 hover:border-zinc-950 transition-all cursor-pointer flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4 md:gap-6 min-w-0">
              <div className={`w-1 h-8 md:w-1.5 md:h-10 rounded-full shrink-0 ${isActiveStatus(c.status) ? 'bg-zinc-950' : 'bg-zinc-100'}`}></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 whitespace-nowrap overflow-hidden">
                  <span className="font-black text-sm md:text-lg tracking-tight text-zinc-950 uppercase truncate">{c.customerName}</span>
                  <span className={`text-[8px] md:text-[10px] px-2 py-0.5 rounded-sm border uppercase font-black tracking-widest ${isActiveStatus(c.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isCompletedStatus(c.status) ? 'bg-zinc-100 text-zinc-500 border-zinc-200' : normalizeCaseStatus(c.status) === CaseStatus.WARRANTY ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-zinc-950 text-white border-zinc-950'}`}>
                    {STATUS_LABELS[normalizeCaseStatus(c.status)] || (c.status as string).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-zinc-300 tracking-tight whitespace-nowrap opacity-60">
                  <MapPin className="w-2 h-2 md:w-2.5 md:h-2.5" /> <span className="truncate">{c.address || '未填寫地址'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {hasMissingLocation(c) && <Badge label="待定位" tone="amber" />}
                  {hasPendingDeposit(c) && <Badge label="待頭期" tone="blue" />}
                  {hasPendingFinalPayment(c) && <Badge label="待尾款" tone="emerald" />}
                  {hasPendingWarrantyVisit(c) && <Badge label="待回訪" tone={hasOverdueWarrantyVisit(c, today) ? 'rose' : 'violet'} />}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => onEdit(c, e)} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-950 transition-colors" title="編輯案件">
                  <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button onClick={(e) => onDelete(c.caseId, c.customerName, e)} className="p-2 hover:bg-red-50 rounded-full text-zinc-400 hover:text-red-600 transition-colors" title="刪除案件">
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="text-[12px] md:text-base font-black text-zinc-950 tracking-tighter leading-none">${(c.finalPrice || 0).toLocaleString()}</div>
              </div>
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-zinc-100 group-hover:text-zinc-950 transition-all" />
            </div>
          </div>
        )) : (
          <div className="text-center py-20 border border-dotted border-zinc-100 rounded-sm">
            <div className="text-zinc-200 font-black tracking-widest uppercase text-[8px] italic">NO RECORDS</div>
          </div>
        )}
      </div>
    </>
  );
};

const Badge = ({ label, tone }: { label: string; tone: 'amber' | 'blue' | 'emerald' | 'rose' | 'violet' }) => {
  const styles = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  } as const;
  return <span className={`text-[8px] md:text-[9px] px-2 py-0.5 rounded-sm border font-black uppercase tracking-widest ${styles[tone]}`}>{label}</span>;
};
