import React, { useMemo } from 'react';
import { BarChart3, Wallet, ShieldCheck, CalendarDays } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card } from '../components/InputComponents';
import { CaseData, CaseStatus, NavigationView, normalizeCaseStatus } from '../types';

interface OperationsReportProps {
  cases: CaseData[];
  onNavigate?: (view: NavigationView) => void;
  onOpenCaseWithTab?: (caseId: string, targetTab?: 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty') => void;
}

export const OperationsReport: React.FC<OperationsReportProps> = ({ cases, onNavigate, onOpenCaseWithTab }) => {
  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const totalContractValue = cases.filter((c) => normalizeCaseStatus(c.status) !== CaseStatus.ASSESSMENT).reduce((sum, c) => sum + (c.finalPrice || 0), 0);
    const collected = cases.reduce((sum, c) => {
      const ratio = typeof c.depositPercentage === 'number' ? c.depositPercentage : 0.7;
      let amount = 0;
      if (c.depositReceivedDate) amount += (c.finalPrice || 0) * ratio;
      if (c.finalPaymentReceivedDate) amount += (c.finalPrice || 0) * (1 - ratio);
      return sum + amount;
    }, 0);
    const overdueWarranty = cases.filter((c) => (c.warrantyRecords || []).some((r) => r.nextVisitDate && r.nextVisitDate < today && !r.result?.trim()));
    const activeConstruction = cases.filter((c) => normalizeCaseStatus(c.status) === CaseStatus.CONSTRUCTION);
    return { totalContractValue, collected, outstanding: Math.max(totalContractValue - collected, 0), overdueWarranty, activeConstruction };
  }, [cases]);

  return (
    <Layout title="營運報表 / OPERATIONS REPORT" onNavigate={onNavigate} currentView="reports">
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric icon={<BarChart3 size={16} />} label="合約總額" value={`$${metrics.totalContractValue.toLocaleString()}`} />
          <Metric icon={<Wallet size={16} />} label="已收款" value={`$${Math.round(metrics.collected).toLocaleString()}`} />
          <Metric icon={<Wallet size={16} />} label="待收款" value={`$${Math.round(metrics.outstanding).toLocaleString()}`} />
          <Metric icon={<ShieldCheck size={16} />} label="保固逾期" value={metrics.overdueWarranty.length} />
        </div>

        <Card title="待收款案件 / OUTSTANDING CASES">
          <div className="space-y-3">
            {cases.filter((c) => !c.finalPaymentReceivedDate || !c.depositReceivedDate).map((item) => (
              <button key={item.caseId} onClick={() => onOpenCaseWithTab?.(item.caseId, 'quote')} className="w-full text-left border border-zinc-100 rounded-sm p-4 hover:border-zinc-300">
                <div className="font-black text-sm">{item.customerName}</div>
                <div className="text-xs text-zinc-500 mt-1">頭期：{item.depositReceivedDate || '未收'} / 尾款：{item.finalPaymentReceivedDate || '未收'}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="保固逾期案件 / OVERDUE WARRANTY">
            <div className="space-y-3">
              {metrics.overdueWarranty.length === 0 && <div className="text-sm text-zinc-400">目前沒有逾期案件</div>}
              {metrics.overdueWarranty.map((item) => (
                <button key={item.caseId} onClick={() => onOpenCaseWithTab?.(item.caseId, 'warranty')} className="w-full text-left border border-rose-200 bg-rose-50 rounded-sm p-4">
                  <div className="font-black text-sm">{item.customerName}</div>
                  <div className="text-xs text-zinc-500 mt-1">{item.address || '未填地址'}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="施工中案件 / ACTIVE CONSTRUCTION">
            <div className="space-y-3">
              {metrics.activeConstruction.length === 0 && <div className="text-sm text-zinc-400">目前沒有施工中案件</div>}
              {metrics.activeConstruction.map((item) => (
                <button key={item.caseId} onClick={() => onOpenCaseWithTab?.(item.caseId, 'log')} className="w-full text-left border border-zinc-100 rounded-sm p-4 hover:border-zinc-300">
                  <div className="font-black text-sm">{item.customerName}</div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><CalendarDays size={12} /> 任務 {item.schedule.filter((t) => !t.isCompleted).length} 筆未完成</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

const Metric = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div className="bg-white border border-zinc-100 rounded-sm p-4">
    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">{icon} {label}</div>
    <div className="text-2xl font-black mt-2">{value}</div>
  </div>
);
