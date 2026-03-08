import React, { useMemo } from 'react';
import { ArrowRight, Clock3, MapPin, ShieldAlert, WalletCards } from 'lucide-react';
import { CaseData, ScheduleTask, isConstructionStatus, isAssessmentStatus, normalizeCaseStatus, CaseStatus } from '../types';
import { getCaseNextAction, getCasePrimarySummary } from '../utils/dashboard';

interface TodayTasksProps {
  cases: CaseData[];
  onSelectCase: (caseId: string, targetTab?: 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty') => void;
}

interface TaskInfo {
  case: CaseData;
  todayTasks: ScheduleTask[];
  progress: number;
  totalDays: number;
  currentDay: number;
}

export const TodayTasks: React.FC<TodayTasksProps> = ({ cases, onSelectCase }) => {
  const { activeToday, pendingStart, planningQueue, paymentQueue } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const activeToday: TaskInfo[] = cases
      .filter((item) => isConstructionStatus(item.status))
      .map((item) => {
        const todayTasks = item.schedule?.filter((task) => task.date === today && !task.isCompleted) || [];
        const totalTasks = item.schedule?.length || 0;
        const completedTasks = item.schedule?.filter((task) => task.isCompleted).length || 0;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const allDates = Array.from(new Set(item.schedule?.map((task) => task.date) || [])).sort();
        const totalDays = allDates.length;
        const currentDay = allDates.findIndex((date) => date === today) + 1;

        return { case: item, todayTasks, progress, totalDays, currentDay };
      })
      .filter((item) => item.todayTasks.length > 0);

    const pendingStart = cases.filter((item) => isAssessmentStatus(item.status)).slice(0, 4);
    const planningQueue = cases.filter((item) => {
      const status = normalizeCaseStatus(item.status);
      return status === CaseStatus.PLANNING || status === CaseStatus.DEPOSIT_RECEIVED;
    }).slice(0, 4);
    const paymentQueue = cases.filter((item) => {
      const status = normalizeCaseStatus(item.status);
      return status === CaseStatus.FINAL_PAYMENT || (status === CaseStatus.DEPOSIT_RECEIVED && !item.depositReceivedDate);
    }).slice(0, 4);

    return { activeToday, pendingStart, planningQueue, paymentQueue };
  }, [cases]);

  const todayDate = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const primaryFocus = activeToday[0]?.case || paymentQueue[0] || planningQueue[0] || pendingStart[0] || null;
  const primaryAction = primaryFocus ? getCaseNextAction(primaryFocus) : null;

  return (
    <div className="rounded-sm border border-zinc-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800 px-5 py-5 text-white md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">TODAY FOCUS</div>
            <h3 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">今日先處理什麼</h3>
            <div className="mt-2 text-sm text-zinc-300">{todayDate} - 把今天最該處理的施工、排程、請款與保固放在同一個入口。</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-widest md:min-w-[320px]">
            <div className="rounded-sm border border-white/10 bg-white/5 p-3">
              <div className="text-zinc-500">施工</div>
              <div className="mt-1 text-xl text-white">{activeToday.length}</div>
            </div>
            <div className="rounded-sm border border-white/10 bg-white/5 p-3">
              <div className="text-zinc-500">待進場</div>
              <div className="mt-1 text-xl text-white">{planningQueue.length}</div>
            </div>
            <div className="rounded-sm border border-white/10 bg-white/5 p-3">
              <div className="text-zinc-500">待請款</div>
              <div className="mt-1 text-xl text-white">{paymentQueue.length}</div>
            </div>
          </div>
        </div>

        {primaryFocus && primaryAction ? (
          <div className="mt-5 rounded-sm border border-white/10 bg-white/5 p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">PRIMARY ACTION</div>
                <div className="mt-2 text-xl font-black tracking-tight truncate">{primaryFocus.customerName}</div>
                <div className="mt-1 text-sm text-zinc-300">{getCasePrimarySummary(primaryFocus)}</div>
                <div className="mt-2 text-xs text-zinc-400 truncate">{primaryAction.description}{primaryFocus.address ? ` / ${primaryFocus.address}` : ''}</div>
              </div>
              <button
                onClick={() => onSelectCase(primaryFocus.caseId, primaryAction.tab)}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/20 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-950 transition-colors hover:bg-zinc-100"
              >
                {primaryAction.label}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-sm border border-dashed border-white/15 bg-white/5 p-5 text-sm text-zinc-400">
            目前沒有今日必做項目，可改為整理資料、追蹤回款或檢查保固排程。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:p-6 xl:grid-cols-4">
        <section className="rounded-sm border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
            <Clock3 size={14} /> 今日施工
          </div>
          <div className="mt-3 space-y-3">
            {activeToday.length > 0 ? activeToday.slice(0, 3).map(({ case: item, todayTasks, progress, currentDay, totalDays }) => (
              <button key={item.caseId} onClick={() => onSelectCase(item.caseId, 'log')} className="w-full rounded-sm border border-emerald-200 bg-white p-3 text-left transition-colors hover:border-emerald-400">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-zinc-950">{item.customerName}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-zinc-600">{todayTasks.map((task) => task.taskName).join(' / ')}</div>
                  </div>
                  <div className="text-right text-[10px] font-black text-emerald-700">{progress}%</div>
                </div>
                <div className="mt-2 text-[10px] text-zinc-500">{currentDay > 0 && totalDays > 0 ? `第 ${currentDay} / ${totalDays} 天` : '今日施工排程'}</div>
              </button>
            )) : <EmptyTaskState text="今天沒有施工排程" />}
          </div>
        </section>

        <section className="rounded-sm border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700">
            <MapPin size={14} /> 待開工/評估
          </div>
          <div className="mt-3 space-y-3">
            {pendingStart.length > 0 ? pendingStart.map((item) => {
              const action = getCaseNextAction(item);
              return (
                <button key={item.caseId} onClick={() => onSelectCase(item.caseId, action.tab)} className="w-full rounded-sm border border-amber-200 bg-white p-3 text-left transition-colors hover:border-amber-400">
                  <div className="text-sm font-black text-zinc-950">{item.customerName}</div>
                  <div className="mt-1 text-xs text-zinc-600 truncate">{item.address || '待安排現場評估'}</div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-700">{action.label}</div>
                </button>
              );
            }) : <EmptyTaskState text="目前沒有待開工案件" />}
          </div>
        </section>

        <section className="rounded-sm border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-700">
            <ArrowRight size={14} /> 備料/待進場
          </div>
          <div className="mt-3 space-y-3">
            {planningQueue.length > 0 ? planningQueue.map((item) => (
              <button key={item.caseId} onClick={() => onSelectCase(item.caseId, 'schedule')} className="w-full rounded-sm border border-blue-200 bg-white p-3 text-left transition-colors hover:border-blue-400">
                <div className="text-sm font-black text-zinc-950">{item.customerName}</div>
                <div className="mt-1 text-xs text-zinc-600 truncate">{item.address || item.buildingContext || '待補進場資訊'}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-700">安排排程 / 備料</div>
              </button>
            )) : <EmptyTaskState text="目前沒有待進場案件" />}
          </div>
        </section>

        <section className="rounded-sm border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-700">
            <WalletCards size={14} /> 請款/保固追蹤
          </div>
          <div className="mt-3 space-y-3">
            {paymentQueue.length > 0 ? paymentQueue.map((item) => {
              const action = getCaseNextAction(item);
              return (
                <button key={item.caseId} onClick={() => onSelectCase(item.caseId, action.tab)} className="w-full rounded-sm border border-rose-200 bg-white p-3 text-left transition-colors hover:border-rose-400">
                  <div className="text-sm font-black text-zinc-950">{item.customerName}</div>
                  <div className="mt-1 text-xs text-zinc-600">{action.description}</div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-rose-700">{action.label}</div>
                </button>
              );
            }) : <EmptyTaskState text="目前沒有待請款案件" icon={<ShieldAlert size={14} />} />}
          </div>
        </section>
      </div>
    </div>
  );
};

const EmptyTaskState = ({ text, icon }: { text: string; icon?: React.ReactNode }) => (
  <div className="rounded-sm border border-dashed border-current/20 bg-white/70 px-3 py-4 text-center text-xs text-zinc-500">
    <div className="mb-1 flex items-center justify-center gap-1 text-zinc-300">{icon}</div>
    {text}
  </div>
);
