import React, { useMemo } from 'react';
import { Bell, AlertTriangle, Wallet, MapPin, ShieldCheck } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card } from '../components/InputComponents';
import { CaseData, CaseStatus, NavigationView, normalizeCaseStatus } from '../types';

interface NotificationsProps {
  cases: CaseData[];
  onNavigate?: (view: NavigationView) => void;
  onOpenCaseWithTab?: (caseId: string, targetTab?: 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty') => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ cases, onNavigate, onOpenCaseWithTab }) => {
  const alerts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return cases.flatMap((item) => {
      const rows: { id: string; tone: 'amber' | 'blue' | 'rose' | 'emerald'; title: string; detail: string; tab: 'eval' | 'quote' | 'warranty' }[] = [];
      if (item.address && (typeof item.latitude !== 'number' || typeof item.longitude !== 'number')) {
        rows.push({ id: `${item.caseId}-loc`, tone: 'amber', title: '待補定位', detail: `${item.customerName} 尚未完成地圖定位`, tab: 'eval' });
      }
      if (normalizeCaseStatus(item.status) !== CaseStatus.ASSESSMENT && !item.depositReceivedDate) {
        rows.push({ id: `${item.caseId}-deposit`, tone: 'blue', title: '待收頭期', detail: `${item.customerName} 尚未登記頭期收款`, tab: 'quote' });
      }
      if (normalizeCaseStatus(item.status) === CaseStatus.FINAL_PAYMENT && !item.finalPaymentReceivedDate) {
        rows.push({ id: `${item.caseId}-final`, tone: 'emerald', title: '待收尾款', detail: `${item.customerName} 尾款尚未入帳`, tab: 'quote' });
      }
      if ((item.warrantyRecords || []).some((record) => record.nextVisitDate && record.nextVisitDate <= today && !record.result?.trim())) {
        rows.push({ id: `${item.caseId}-warranty`, tone: 'rose', title: '保固待回訪', detail: `${item.customerName} 有保固回訪待處理`, tab: 'warranty' });
      }
      return rows.map((row) => ({ ...row, caseId: item.caseId }));
    });
  }, [cases]);

  const toneClass = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  return (
    <Layout title="通知提醒 / NOTIFICATIONS" onNavigate={onNavigate} currentView="notifications">
      <div className="space-y-6 animate-in fade-in duration-300">
        <Card title="通知中心 / ALERT CENTER">
          <div className="space-y-3">
            {alerts.length === 0 && <div className="text-sm text-zinc-400 py-8 text-center">目前沒有待處理提醒</div>}
            {alerts.map((alert) => (
              <button key={alert.id} onClick={() => onOpenCaseWithTab?.(alert.caseId, alert.tab)} className={`w-full border rounded-sm p-4 text-left ${toneClass[alert.tone]}`}>
                <div className="text-[10px] font-black uppercase tracking-widest">{alert.title}</div>
                <div className="text-sm font-bold mt-1">{alert.detail}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniCard icon={<MapPin size={16} />} label="待補定位" value={alerts.filter((a) => a.title === '待補定位').length} />
          <MiniCard icon={<Wallet size={16} />} label="待收頭期" value={alerts.filter((a) => a.title === '待收頭期').length} />
          <MiniCard icon={<AlertTriangle size={16} />} label="待收尾款" value={alerts.filter((a) => a.title === '待收尾款').length} />
          <MiniCard icon={<ShieldCheck size={16} />} label="待回訪" value={alerts.filter((a) => a.title === '保固待回訪').length} />
        </div>
      </div>
    </Layout>
  );
};

const MiniCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="bg-white border border-zinc-100 rounded-sm p-4">
    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">{icon} {label}</div>
    <div className="text-2xl font-black mt-2">{value}</div>
  </div>
);
