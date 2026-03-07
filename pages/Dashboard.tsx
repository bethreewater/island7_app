
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, FolderOpen, TrendingUp, AlertCircle, CheckCircle2, Book, X, User, Phone, MessageSquare, MapPin, Navigation, Wallet, ShieldCheck, Download, Bell, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CaseData,
  CaseStatus,
  STATUS_LABELS,
  NavigationView,
  isActiveStatus,
  isAssessmentStatus,
  isCompletedStatus,
  normalizeCaseStatus
} from '../types';
import { getInitialCase, saveCase, deleteCase, getCaseDetails } from '../services/storageService';
import { Button, Card, Input } from '../components/InputComponents';
import { Layout } from '../components/Layout';
import { TodayTasks } from '../components/TodayTasks';
import { StatCard } from '../components/dashboard/StatCard';
import { QuickActionButton } from '../components/dashboard/QuickActionButton';
import { QueueCard } from '../components/dashboard/QueueCard';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DashboardCaseList } from '../components/dashboard/DashboardCaseList';
import { buildOperationQueues, getTodayString, hasMissingLocation, hasOverdueWarrantyVisit, hasPendingDeposit, hasPendingFinalPayment, hasPendingWarrantyVisit } from '../utils/operations';

interface DashboardProps {
  cases: CaseData[];
  onSelectCase: (c: CaseData) => void;
  onOpenCaseWithTab?: (caseId: string, targetTab?: 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty') => void;
  onOpenKB: () => void;
  onNavigate?: (view: NavigationView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ cases = [], onSelectCase, onOpenCaseWithTab, onOpenKB, onNavigate }) => {
  // const [cases, setCases] = useState<CaseData[]>([]); // Removed: Lifted to App
  // const [loading, setLoading] = useState(true); // Removed: Handled by App (or ignored for Dashboard)
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'assessment' | 'active' | 'completed' | 'warranty'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'lt100k' | '100k_300k' | '300k_600k' | 'gt600k'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'last30' | 'last90' | 'thisYear'>('all');
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'price_desc' | 'price_asc'>('created_desc');
  const [opsFilter, setOpsFilter] = useState<'all' | 'missing_location' | 'pending_deposit' | 'pending_final' | 'pending_warranty'>('all');

  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLineId, setNewLineId] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ caseId: string; caseName: string } | null>(null);

  // Removed useEffect fetching logic


  const stats = useMemo(() => {
    const realizedCases = cases.filter(c => !isAssessmentStatus(c.status));
    return {
      assessment: cases.filter(c => isAssessmentStatus(c.status)).length,
      progress: cases.filter(c => isActiveStatus(c.status)).length,
      done: cases.filter(c => isCompletedStatus(c.status)).length,
      revenue: realizedCases.reduce((sum, c) => sum + (c.finalPrice || 0), 0)
    };
  }, [cases]);

  const operationQueues = useMemo(() => buildOperationQueues(cases), [cases]);
  const opsFilterOptions = [
    { key: 'all', label: '全部營運' },
    { key: 'missing_location', label: '待補定位' },
    { key: 'pending_deposit', label: '待頭期' },
    { key: 'pending_final', label: '待尾款' },
    { key: 'pending_warranty', label: '待保固' },
  ] as const;

  const exportOperationalReport = useCallback(() => {
    const today = getTodayString();
    const rows = cases.map((item) => {
      const hasPendingWarranty = hasPendingWarrantyVisit(item);
      const hasOverdueWarranty = hasOverdueWarrantyVisit(item, today);
      return [
        item.caseId,
        item.customerName,
        item.phone || '',
        item.siteContactName || '',
        item.address || '',
        normalizeCaseStatus(item.status),
        String(item.finalPrice || 0),
        item.depositReceivedDate || '',
        item.finalPaymentReceivedDate || '',
        typeof item.latitude === 'number' && typeof item.longitude === 'number' ? 'yes' : 'no',
        hasPendingWarranty ? 'yes' : 'no',
        hasOverdueWarranty ? 'yes' : 'no',
      ];
    });

    const csv = [
      ['caseId', 'customerName', 'phone', 'siteContactName', 'address', 'status', 'finalPrice', 'depositReceivedDate', 'finalPaymentReceivedDate', 'hasLocation', 'hasPendingWarranty', 'hasOverdueWarranty'],
      ...rows,
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `island7-operational-report-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('營運報表已匯出');
  }, [cases]);

  // ... (keep handleSave)
  const handleSave = useCallback(async () => {
    // ... (Keep existing handleSave implementation logic exactly, assume no changes needed inside)
    if (!newClient) return;
    try {
      let caseToSave: CaseData;

      if (editingCaseId) {
        const existingCase = await getCaseDetails(editingCaseId);
        if (!existingCase) throw new Error("Case not found");

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
    } catch (e: any) {
      toast.error("儲存失敗: " + (e.message || "未知錯誤"), { duration: 5000 });
    }
  }, [newClient, newPhone, newLineId, newAddress, editingCaseId, cases, onSelectCase]);


  const handleEdit = useCallback((c: CaseData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setEditingCaseId(c.caseId);
    setNewClient(c.customerName);
    setNewPhone(c.phone);
    setNewLineId(c.lineId || '');
    setNewAddress(c.address || '');
    setShowNewModal(true);
  }, []);

  const handleDelete = useCallback(async (caseId: string, caseName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setPendingDelete({ caseId, caseName });
  }, []);

  const confirmDeleteCase = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await deleteCase(pendingDelete.caseId);
      setPendingDelete(null);
    } catch (err: any) {
      toast.error("刪除失敗: " + err.message, { duration: 5000 });
    }
  }, [pendingDelete]);

  const handleCaseClick = useCallback(async (caseId: string) => {
    setLoading(true);
    try {
      const fullData = await getCaseDetails(caseId);
      if (fullData) {
        onSelectCase(fullData);
      } else {
        throw new Error('Case data missing');
      }
    } catch (err) {
      toast.error('無法讀取案件詳細資料', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [onSelectCase]);

  const filteredCases = useMemo(() => {
    const now = new Date();
    const term = searchTerm.trim().toLowerCase();

    const hasStatusFilter = statusFilter !== 'all';
    const hasPriceFilter = priceFilter !== 'all';
    const hasDateFilter = dateFilter !== 'all';

      const filtered = cases.filter((c) => {
        const matchesSearch = !term ||
        c.customerName?.toLowerCase().includes(term) ||
        c.caseId?.toLowerCase().includes(term) ||
        c.address?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (hasStatusFilter) {
        const normalizedStatus = normalizeCaseStatus(c.status);
        const matchesStatus =
          (statusFilter === 'assessment' && isAssessmentStatus(normalizedStatus)) ||
          (statusFilter === 'active' && isActiveStatus(normalizedStatus)) ||
          (statusFilter === 'completed' && isCompletedStatus(normalizedStatus)) ||
          (statusFilter === 'warranty' && normalizedStatus === CaseStatus.WARRANTY);
        if (!matchesStatus) return false;
      }

      if (hasPriceFilter) {
        const price = c.finalPrice || 0;
        const matchesPrice =
          (priceFilter === 'lt100k' && price < 100000) ||
          (priceFilter === '100k_300k' && price >= 100000 && price <= 300000) ||
          (priceFilter === '300k_600k' && price > 300000 && price <= 600000) ||
          (priceFilter === 'gt600k' && price > 600000);
        if (!matchesPrice) return false;
      }

        if (hasDateFilter) {
        const createdAt = new Date(c.createdDate);
        if (Number.isNaN(createdAt.getTime())) return false;

        const dayMs = 24 * 60 * 60 * 1000;
        const matchesDate =
          (dateFilter === 'last30' && (now.getTime() - createdAt.getTime()) <= 30 * dayMs) ||
          (dateFilter === 'last90' && (now.getTime() - createdAt.getTime()) <= 90 * dayMs) ||
          (dateFilter === 'thisYear' && createdAt.getFullYear() === now.getFullYear());
        if (!matchesDate) return false;
        }

        if (opsFilter !== 'all') {
          const today = getTodayString();
          const matchesOps =
            (opsFilter === 'missing_location' && hasMissingLocation(c)) ||
            (opsFilter === 'pending_deposit' && hasPendingDeposit(c)) ||
            (opsFilter === 'pending_final' && hasPendingFinalPayment(c)) ||
            (opsFilter === 'pending_warranty' && hasPendingWarrantyVisit(c) && !hasOverdueWarrantyVisit(c, today) ? true : hasPendingWarrantyVisit(c));
          if (!matchesOps) return false;
        }

        return true;
      });

    filtered.sort((a, b) => {
      const aDate = new Date(a.createdDate).getTime();
      const bDate = new Date(b.createdDate).getTime();
      const aPrice = a.finalPrice || 0;
      const bPrice = b.finalPrice || 0;

      switch (sortBy) {
        case 'created_asc':
          return aDate - bDate;
        case 'price_desc':
          return bPrice - aPrice;
        case 'price_asc':
          return aPrice - bPrice;
        case 'created_desc':
        default:
          return bDate - aDate;
      }
    });

    return filtered;
  }, [cases, searchTerm, statusFilter, priceFilter, dateFilter, sortBy, opsFilter]);

  const hasAdvancedFilters = statusFilter !== 'all' || priceFilter !== 'all' || dateFilter !== 'all' || sortBy !== 'created_desc' || opsFilter !== 'all';

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setPriceFilter('all');
    setDateFilter('all');
    setSortBy('created_desc');
    setOpsFilter('all');
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-8 h-8 md:w-12 md:h-12 border-[3px] md:border-4 border-zinc-100 border-t-zinc-950 rounded-full animate-spin mb-3"></div>
      <div className="text-zinc-400 text-[8px] md:text-[9px] font-black tracking-widest uppercase whitespace-nowrap">SYSTEM LOADING</div>
    </div>
  );

  return (
    <Layout
      title="系統管理首頁 / DASHBOARD"
      onNavigate={onNavigate}
      currentView="dashboard"
    >
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Today's Tasks Widget */}
        <TodayTasks cases={cases} onSelectCase={(caseId, targetTab) => {
          if (onOpenCaseWithTab) {
            onOpenCaseWithTab(caseId, targetTab);
            return;
          }
          void handleCaseClick(caseId);
        }} />

        <Card title="營運例外 / OPERATION EXCEPTIONS">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <QueueCard icon={<Navigation size={16} />} title="待補定位" count={operationQueues.missingLocation.length} tone="amber" items={operationQueues.missingLocation} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="eval" onFilter={() => setOpsFilter('missing_location')} helper="已有地址但沒有座標" />
            <QueueCard icon={<Wallet size={16} />} title="頭期待確認" count={operationQueues.pendingDeposit.length} tone="blue" items={operationQueues.pendingDeposit} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="quote" onFilter={() => setOpsFilter('pending_deposit')} helper="案件已進正式流程" />
            <QueueCard icon={<TrendingUp size={16} />} title="尾款待收" count={operationQueues.pendingFinalPayment.length} tone="emerald" items={operationQueues.pendingFinalPayment} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="quote" onFilter={() => setOpsFilter('pending_final')} helper="狀態為請領尾款" />
            <QueueCard icon={<ShieldCheck size={16} />} title="保固待回訪" count={operationQueues.pendingWarrantyVisit.length} tone={operationQueues.overdueWarrantyVisit.length > 0 ? 'rose' : 'violet'} items={operationQueues.pendingWarrantyVisit} onOpen={onOpenCaseWithTab} fallbackOpen={handleCaseClick} targetTab="warranty" onFilter={() => setOpsFilter('pending_warranty')} helper={operationQueues.overdueWarrantyVisit.length > 0 ? `逾期 ${operationQueues.overdueWarrantyVisit.length} 筆` : '已有下次回訪日'} />
          </div>
          <div className="mt-4 border border-zinc-100 rounded-sm p-4 bg-zinc-50">
            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">近期保固提醒 / UPCOMING WARRANTY</div>
            <div className="text-sm font-bold text-zinc-700">7 天內待回訪：{operationQueues.upcomingWarrantyVisit.length} 筆</div>
            {operationQueues.upcomingWarrantyVisit.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {operationQueues.upcomingWarrantyVisit.slice(0, 4).map((item) => (
                  <button
                    key={item.caseId}
                    onClick={() => onOpenCaseWithTab ? onOpenCaseWithTab(item.caseId, 'warranty') : void handleCaseClick(item.caseId)}
                    className="px-3 py-1.5 text-[10px] rounded-sm border border-violet-200 bg-white text-zinc-700 font-black uppercase tracking-widest"
                  >
                    {item.customerName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {opsFilterOptions.map((item) => {
            const active = opsFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setOpsFilter(item.key as typeof opsFilter)}
                className={`px-3 py-1.5 text-[10px] rounded-sm border font-black uppercase tracking-widest whitespace-nowrap transition-colors ${active ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 數據卡片 / COMPACT STATS FOR MOBILE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatCard icon={<FolderOpen size={14} />} label="評估 / EVAL" value={stats.assessment} />
          <StatCard icon={<AlertCircle size={14} />} label="進行 / ACTIVE" value={stats.progress} dark />
          <StatCard icon={<CheckCircle2 size={14} />} label="完工 / DONE" value={stats.done} />
          <StatCard icon={<TrendingUp size={14} />} label="營收 / REVENUE" value={`$${parseFloat((stats.revenue / 1000).toFixed(1))}k`} />
        </div>

        {/* 操作按鈕 / COMPACT ACTIONS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-12">
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
            title="建立 / NEW"
            subtitle="新增檔案"
          />
          <QuickActionButton
            onClick={onOpenKB}
            icon={<Book size={20} />}
            title="知識 / KB"
            subtitle="技術手冊"
          />
          <QuickActionButton
            onClick={exportOperationalReport}
            icon={<Download size={20} />}
            title="營運 / OPS"
            subtitle="匯出報表"
          />
          <QuickActionButton
            onClick={() => onNavigate?.('notifications')}
            icon={<Bell size={20} />}
            title="提醒 / ALERTS"
            subtitle="通知中心"
          />
          <QuickActionButton
            onClick={() => onNavigate?.('reports')}
            icon={<BarChart3 size={20} />}
            title="報表 / REPORTS"
            subtitle="營運總覽"
          />
          <div className="col-span-2 md:col-span-3 bg-white border border-zinc-200 rounded-sm p-3 md:p-5 flex flex-col justify-between shadow-sm">
            <div className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap leading-none">搜尋 / SEARCH</div>
            <div className="relative mt-1 md:mt-2">
              <Search className="absolute left-0 top-1 text-zinc-300 w-4 h-4 md:w-5 md:h-5" />
              <input
                className="w-full bg-transparent border-none focus:ring-0 pl-6 md:pl-8 text-sm md:text-base font-black placeholder-zinc-100 outline-none"
                placeholder="搜尋案件..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DashboardFilters
          statusFilter={statusFilter}
          priceFilter={priceFilter}
          dateFilter={dateFilter}
          sortBy={sortBy}
          hasAdvancedFilters={hasAdvancedFilters}
          onStatusFilterChange={setStatusFilter}
          onPriceFilterChange={setPriceFilter}
          onDateFilterChange={setDateFilter}
          onSortChange={setSortBy}
          onReset={resetFilters}
        />

        <DashboardCaseList cases={filteredCases} totalCount={cases.length} onOpen={handleCaseClick} onEdit={handleEdit} onDelete={handleDelete} />

        {/* 新增彈窗 / COMPACT MODAL FOR MOBILE */}
        {showNewModal && (
          <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-3">
            <div className="bg-white rounded-sm shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-800 animate-in zoom-in-95 duration-200">
              <div className="bg-zinc-950 text-white px-5 py-4 flex justify-between items-center whitespace-nowrap">
                <div>
                  <h3 className="font-black text-base md:text-xl tracking-tight uppercase leading-none">
                    {editingCaseId ? '編輯檔案 / EDIT' : '建立檔案 / CREATE'}
                  </h3>
                </div>
                <button onClick={() => setShowNewModal(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-90">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 md:p-8 space-y-4 md:space-y-6 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithIcon icon={<User size={12} />} label="客戶姓名 / NAME *" placeholder="全名" value={newClient} onChange={e => setNewClient(e.target.value)} />
                  <InputWithIcon icon={<Phone size={12} />} label="聯絡電話 / PHONE" placeholder="09XX..." value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithIcon icon={<MessageSquare size={12} />} label="通訊識別 / LINE ID" placeholder="ID" value={newLineId} onChange={e => setNewLineId(e.target.value)} />
                  <InputWithIcon icon={<MapPin size={12} />} label="施工地址 / ADDRESS" placeholder="完整地點" value={newAddress} onChange={e => setNewAddress(e.target.value)} />
                </div>
                <div className="pt-4 flex gap-2 border-t border-zinc-50">
                  <Button variant="outline" className="flex-1" onClick={() => setShowNewModal(false)}>取消 / CANCEL</Button>
                  <Button className="flex-1" onClick={handleSave} disabled={!newClient}>
                    {editingCaseId ? '儲存變更 / SAVE' : '確認建立 / OK'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {pendingDelete && (
          <div className="fixed inset-0 z-[120] bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-zinc-200 rounded-sm shadow-2xl p-6 space-y-5">
              <div>
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">DELETE CONFIRMATION</div>
                <h3 className="text-lg font-black text-zinc-950 mt-1">確定刪除案件？</h3>
                <p className="text-sm text-zinc-500 mt-2">
                  「{pendingDelete.caseName}」將被永久刪除，且無法復原。
                </p>
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
    <label className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap leading-none">
      {icon} {label}
    </label>
    <Input {...props} className="font-black py-1.5 md:py-2.5 text-xs md:text-sm shadow-none" />
  </div>
));
