import React, { useCallback, useMemo, useState } from 'react';
import { BarChart3, Bell, Book, Download, FolderOpen, Plus, User, Phone, MessageSquare, MapPin, Wallet, ShieldCheck, Navigation, AlertTriangle, TrendingUp, ReceiptText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { CaseData, NavigationView } from '../types';
import { deleteCase, getCaseDetails, getInitialCase, saveCase } from '../services/storageService';
import { Button, Card, Input } from '../components/InputComponents';
import { Layout } from '../components/Layout';
import { TodayTasks } from '../components/TodayTasks';
import { StatCard } from '../components/dashboard/StatCard';
import { QuickActionButton } from '../components/dashboard/QuickActionButton';
import { QueueCard } from '../components/dashboard/QueueCard';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DashboardCaseList } from '../components/dashboard/DashboardCaseList';
import { buildOperationQueues, getTodayString, hasOverdueWarrantyVisit } from '../utils/operations';
import { DashboardFilterState, DashboardOpsFilter, filterDashboardCases, formatCurrency, formatCurrencyCompact, getAppliedFilterLabels, getDashboardMetrics } from '../utils/dashboard';

interface DashboardProps {
  cases: CaseData[];
  onSelectCase: (c: CaseData) => void;
  onOpenCaseWithTab?: (caseId: string, targetTab?: 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty') => void;
  onOpenKB: () => void;
  onNavigate?: (view: NavigationView) => void;
}

const INITIAL_FILTERS: DashboardFilterState = {
  searchTerm: '',
  statusFilter: 'all',
  priceFilter: 'all',
  dateFilter: 'all',
  sortBy: 'created_desc',
  opsFilter: 'all',
};

export const Dashboard: React.FC<DashboardProps> = ({ cases = [], onSelectCase, onOpenCaseWithTab, onOpenKB, onNavigate }) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<DashboardFilterState>(INITIAL_FILTERS);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLineId, setNewLineId] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ caseId: string; caseName: string } | null>(null);

  const metrics = useMemo(() => getDashboardMetrics(cases), [cases]);
  const operationQueues = useMemo(() => buildOperationQueues(cases), [cases]);
  const filteredCases = useMemo(() => filterDashboardCases(cases, filters), [cases, filters]);
  const appliedFilters = useMemo(() => getAppliedFilterLabels(filters), [filters]);
  const hasAdvancedFilters = appliedFilters.length > 0;

  const setFilter = useCallback(<K extends keyof DashboardFilterState>(key: K, value: DashboardFilterState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const exportOperationalReport = useCallback((targetCases: CaseData[]) => {
    const today = getTodayString();
    const rows = targetCases.map((item) => {
      const hasOverdueWarranty = hasOverdueWarrantyVisit(item, today);
      return [
        item.caseId,
        item.customerName,
        item.phone || '',
        item.siteContactName || '',
        item.address || '',
        item.status,
        String(item.finalPrice || 0),
        item.depositReceivedDate || '',
        item.finalPaymentReceivedDate || '',
        typeof item.latitude === 'number' && typeof item.longitude === 'number' ? 'yes' : 'no',
        item.warrantyRecords?.some((record) => record.nextVisitDate && !record.result?.trim()) ? 'yes' : 'no',
        hasOverdueWarranty ? 'yes' : 'no',
      ];
    });

    const csv = [
      ['caseId', 'customerName', 'phone', 'siteContactName', 'address', 'status', 'finalPrice', 'depositReceivedDate', 'finalPaymentReceivedDate', 'hasLocation', 'hasPendingWarranty', 'hasOverdueWarranty'],
      ...rows,
    ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `island7-operational-report-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(targetCases === cases ? '已匯出全部營運報表' : '已匯出目前篩選結果');
  }, [cases]);

  const handleSave = useCallback(async () => {
    if (!newClient) return;
    try {
      let caseToSave: CaseData;

      if (editingCaseId) {
        const existingCase = await getCaseDetails(editingCaseId);
        if (!existingCase) throw new Error('Case not found');

        caseToSave = {
          ...existingCase,
          customerName: newClient,
          phone: newPhone,
          lineId: newLineId,
          address: newAddress,
        };
      } else {
        caseToSave = await getInitialCase(newClient, newPhone, newAddress, newLineId);
      }

      await saveCase(caseToSave);

      if (!editingCaseId) {
        onSelectCase(caseToSave);
      }

      setNewClient('');
      setNewPhone('');
      setNewLineId('');
      setNewAddress('');
      setEditingCaseId(null);
      setShowNewModal(false);
    } catch (error: any) {
      toast.error(`儲存失敗: ${error.message || '未知錯誤'}`, { duration: 5000 });
    }
  }, [editingCaseId, newAddress, newClient, newLineId, newPhone, onSelectCase]);

  const handleEdit = useCallback((item: CaseData, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingCaseId(item.caseId);
    setNewClient(item.customerName);
    setNewPhone(item.phone);
    setNewLineId(item.lineId || '');
    setNewAddress(item.address || '');
    setShowNewModal(true);
  }, []);

  const handleDelete = useCallback((caseId: string, caseName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPendingDelete({ caseId, caseName });
  }, []);

  const confirmDeleteCase = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await deleteCase(pendingDelete.caseId);
      setPendingDelete(null);
    } catch (error: any) {
      toast.error(`刪除失敗: ${error.message}`, { duration: 5000 });
    }
  }, [pendingDelete]);

  const handleCaseClick = useCallback(async (caseId: string) => {
    setLoading(true);
    try {
      const fullData = await getCaseDetails(caseId);
      if (!fullData) throw new Error('Case data missing');
      onSelectCase(fullData);
    } catch (error) {
      toast.error('無法讀取案件詳細資料', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [onSelectCase]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-100 border-t-zinc-950 md:h-12 md:w-12 md:border-4" />
        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">System Loading</div>
      </div>
    );
  }

  return (
    <Layout title="系統管理首頁 / DASHBOARD" onNavigate={onNavigate} currentView="dashboard">
      <div className="space-y-8 animate-in fade-in duration-500">
        <TodayTasks cases={cases} onSelectCase={(caseId, targetTab) => {
          if (onOpenCaseWithTab) {
            onOpenCaseWithTab(caseId, targetTab);
            return;
          }
          void handleCaseClick(caseId);
        }} />

        <Card title="營運警報中心 / OPERATION ALERT CENTER" className="border-zinc-200">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <QueueCard icon={<Navigation size={16} />} title="待補定位" count={operationQueues.missingLocation.length} tone="amber" items={operationQueues.missingLocation} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="eval" onFilter={() => setFilter('opsFilter', 'missing_location')} helper="有地址但沒有座標，現場定位資訊不完整" />
            <QueueCard icon={<Wallet size={16} />} title="待頭期" count={operationQueues.pendingDeposit.length} tone="blue" items={operationQueues.pendingDeposit} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="quote" onFilter={() => setFilter('opsFilter', 'pending_deposit')} helper={`待確認頭期 ${formatCurrency(metrics.pendingDepositAmount)}`} />
            <QueueCard icon={<ReceiptText size={16} />} title="待尾款" count={operationQueues.pendingFinalPayment.length} tone="emerald" items={operationQueues.pendingFinalPayment} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="quote" onFilter={() => setFilter('opsFilter', 'pending_final')} helper={`待收尾款 ${formatCurrency(metrics.pendingFinalAmount)}`} />
            <QueueCard icon={<ShieldCheck size={16} />} title="保固待回訪" count={operationQueues.pendingWarrantyVisit.length} tone="violet" items={operationQueues.pendingWarrantyVisit} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="warranty" onFilter={() => setFilter('opsFilter', 'pending_warranty')} helper="已有預定回訪日，請提前安排提醒" />
            <QueueCard icon={<AlertTriangle size={16} />} title="回訪逾期" count={operationQueues.overdueWarrantyVisit.length} tone="rose" severity={operationQueues.overdueWarrantyVisit.length > 0 ? 'high' : 'normal'} items={operationQueues.overdueWarrantyVisit} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="warranty" onFilter={() => setFilter('opsFilter', 'overdue_warranty')} helper={operationQueues.overdueWarrantyVisit.length > 0 ? '需要立即處理的保固回訪' : '目前沒有逾期保固案件'} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">合約總額</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{formatCurrency(metrics.totalRevenue)}</div>
              <div className="mt-1 text-xs text-zinc-500">正式流程案件總營收</div>
            </div>
            <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">已收款金額</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{formatCurrency(metrics.totalCollected)}</div>
              <div className="mt-1 text-xs text-zinc-500">目前現金回收狀態</div>
            </div>
            <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">本月新增 / 成交</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{metrics.newThisMonth} / {formatCurrencyCompact(metrics.signedThisMonth)}</div>
              <div className="mt-1 text-xs text-zinc-500">兼顧新案流入與成交效率</div>
            </div>
            <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">待收款拆分</div>
              <div className="mt-2 text-base font-black tracking-tight text-zinc-950">頭期 {formatCurrencyCompact(metrics.pendingDepositAmount)}</div>
              <div className="mt-1 text-base font-black tracking-tight text-zinc-950">尾款 {formatCurrencyCompact(metrics.pendingFinalAmount)}</div>
              <div className="mt-1 text-xs text-zinc-500">依各案件付款比例精準拆算</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {metrics.metrics.map((item) => (
            <StatCard
              key={item.key}
              icon={
                item.key === 'assessment' ? <FolderOpen size={16} /> :
                item.key === 'active' ? <TrendingUp size={16} /> :
                item.key === 'pending-final' ? <Wallet size={16} /> :
                item.key === 'warranty' ? <ShieldCheck size={16} /> :
                item.key === 'new-this-month' ? <Plus size={16} /> :
                <BarChart3 size={16} />
              }
              label={item.label}
              value={item.value}
              helper={item.helper}
              tone={item.tone}
            />
          ))}
        </div>

        <Card title="快捷動作 / QUICK ACTIONS">
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <QuickActionButton
              onClick={() => {
                setEditingCaseId(null);
                setNewClient('');
                setNewPhone('');
                setNewLineId('');
                setNewAddress('');
                setShowNewModal(true);
              }}
              icon={<Plus size={20} />}
              title="建立案件"
              subtitle="新增檔案"
            />
            <QuickActionButton onClick={() => setFilter('opsFilter', 'pending_final')} icon={<Wallet size={20} />} title="收款追蹤" subtitle="待收尾款" badge={`${operationQueues.pendingFinalPayment.length} 筆`} />
            <QuickActionButton onClick={() => setFilter('opsFilter', operationQueues.overdueWarrantyVisit.length > 0 ? 'overdue_warranty' : 'pending_warranty')} icon={<ShieldCheck size={20} />} title="保固回訪" subtitle="優先案件" badge={operationQueues.overdueWarrantyVisit.length > 0 ? `逾期 ${operationQueues.overdueWarrantyVisit.length}` : `${operationQueues.pendingWarrantyVisit.length} 待處理`} />
            <QuickActionButton onClick={onOpenKB} icon={<Book size={20} />} title="知識庫" subtitle="方案與備料" />
            <QuickActionButton onClick={() => exportOperationalReport(filteredCases)} icon={<Download size={20} />} title="匯出目前結果" subtitle="CSV 報表" badge={`${filteredCases.length} 筆`} />
            <QuickActionButton onClick={() => onNavigate?.('notifications')} icon={<Bell size={20} />} title="通知中心" subtitle="查看提醒" />
            <QuickActionButton onClick={() => onNavigate?.('reports')} icon={<BarChart3 size={20} />} title="營運報表" subtitle="深入分析" />
            <QuickActionButton onClick={() => exportOperationalReport(cases)} icon={<Download size={20} />} title="匯出全部" subtitle="完整營運表" badge={`${cases.length} 筆`} />
          </div>
        </Card>

        <DashboardFilters
          searchTerm={filters.searchTerm}
          statusFilter={filters.statusFilter}
          priceFilter={filters.priceFilter}
          dateFilter={filters.dateFilter}
          sortBy={filters.sortBy}
          opsFilter={filters.opsFilter}
          hasAdvancedFilters={hasAdvancedFilters}
          onSearchChange={(value) => setFilter('searchTerm', value)}
          onStatusFilterChange={(value) => setFilter('statusFilter', value)}
          onPriceFilterChange={(value) => setFilter('priceFilter', value)}
          onDateFilterChange={(value) => setFilter('dateFilter', value)}
          onSortChange={(value) => setFilter('sortBy', value)}
          onOpsFilterChange={(value: DashboardOpsFilter) => setFilter('opsFilter', value)}
          onReset={resetFilters}
        />

        <DashboardCaseList
          cases={filteredCases}
          totalCount={cases.length}
          appliedFilters={appliedFilters}
          onOpen={handleCaseClick}
          onOpenAction={onOpenCaseWithTab}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {showNewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 p-3 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-sm border border-zinc-800 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between bg-zinc-950 px-5 py-4 text-white">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight md:text-xl">{editingCaseId ? '編輯檔案 / EDIT' : '建立檔案 / CREATE'}</h3>
                </div>
                <button onClick={() => setShowNewModal(false)} className="rounded-full p-1.5 transition-colors hover:bg-white/10" aria-label="關閉">
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[80vh] space-y-4 overflow-y-auto p-5 md:space-y-6 md:p-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputWithIcon icon={<User size={12} />} label="客戶姓名 / NAME *" placeholder="全名" value={newClient} onChange={(event) => setNewClient(event.target.value)} />
                  <InputWithIcon icon={<Phone size={12} />} label="聯絡電話 / PHONE" placeholder="09XX..." value={newPhone} onChange={(event) => setNewPhone(event.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputWithIcon icon={<MessageSquare size={12} />} label="通訊識別 / LINE ID" placeholder="ID" value={newLineId} onChange={(event) => setNewLineId(event.target.value)} />
                  <InputWithIcon icon={<MapPin size={12} />} label="施工地址 / ADDRESS" placeholder="完整地點" value={newAddress} onChange={(event) => setNewAddress(event.target.value)} />
                </div>
                <div className="flex gap-2 border-t border-zinc-50 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowNewModal(false)}>取消 / CANCEL</Button>
                  <Button className="flex-1" onClick={handleSave} disabled={!newClient}>{editingCaseId ? '儲存變更 / SAVE' : '確認建立 / OK'}</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {pendingDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-5 rounded-sm border border-zinc-200 bg-white p-6 shadow-2xl">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">Delete Confirmation</div>
                <h3 className="mt-1 text-lg font-black text-zinc-950">確定刪除案件？</h3>
                <p className="mt-2 text-sm text-zinc-500">「{pendingDelete.caseName}」將被永久刪除，且無法復原。</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPendingDelete(null)}>取消 / CANCEL</Button>
                <Button variant="danger" className="flex-1" onClick={confirmDeleteCase}>刪除 / DELETE</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

type InputWithIconProps = {
  icon: React.ReactNode;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const InputWithIcon = React.memo(({ icon, label, ...props }: InputWithIconProps) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1.5 whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-zinc-500 md:text-[9px]">
      {icon} {label}
    </label>
    <Input {...props} className="py-2.5 text-sm font-black shadow-none" />
  </div>
));
