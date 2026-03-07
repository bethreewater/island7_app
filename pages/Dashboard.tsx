
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, FolderOpen, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, Book, X, User, Phone, MessageSquare, MapPin, Trash2, Edit, SlidersHorizontal, RotateCcw, Navigation, Wallet, ShieldCheck, CalendarClock, Download } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
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

  const operationQueues = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const missingLocation = cases.filter((c) => Boolean(c.address?.trim()) && (typeof c.latitude !== 'number' || typeof c.longitude !== 'number'));
    const pendingDeposit = cases.filter((c) => {
      const status = normalizeCaseStatus(c.status);
      return status !== CaseStatus.ASSESSMENT && !c.depositReceivedDate;
    });
    const pendingFinalPayment = cases.filter((c) => normalizeCaseStatus(c.status) === CaseStatus.FINAL_PAYMENT && !c.finalPaymentReceivedDate);
    const pendingWarrantyVisit = cases.filter((c) =>
      (c.warrantyRecords || []).some((record) => record.nextVisitDate && !record.result?.trim())
    );
    const overdueWarrantyVisit = cases.filter((c) =>
      (c.warrantyRecords || []).some((record) => record.nextVisitDate && record.nextVisitDate < today && !record.result?.trim())
    );
    const upcomingWarrantyVisit = cases.filter((c) =>
      (c.warrantyRecords || []).some((record) => record.nextVisitDate && record.nextVisitDate >= today && record.nextVisitDate <= nextWeek && !record.result?.trim())
    );

    return { missingLocation, pendingDeposit, pendingFinalPayment, pendingWarrantyVisit, overdueWarrantyVisit, upcomingWarrantyVisit };
  }, [cases]);

  const exportOperationalReport = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = cases.map((item) => {
      const hasPendingWarranty = (item.warrantyRecords || []).some((record) => record.nextVisitDate && !record.result?.trim());
      const hasOverdueWarranty = (item.warrantyRecords || []).some((record) => record.nextVisitDate && record.nextVisitDate < today && !record.result?.trim());
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
          const today = new Date().toISOString().slice(0, 10);
          const matchesOps =
            (opsFilter === 'missing_location' && Boolean(c.address?.trim()) && (typeof c.latitude !== 'number' || typeof c.longitude !== 'number')) ||
            (opsFilter === 'pending_deposit' && normalizeCaseStatus(c.status) !== CaseStatus.ASSESSMENT && !c.depositReceivedDate) ||
            (opsFilter === 'pending_final' && normalizeCaseStatus(c.status) === CaseStatus.FINAL_PAYMENT && !c.finalPaymentReceivedDate) ||
            (opsFilter === 'pending_warranty' && (c.warrantyRecords || []).some((record) => record.nextVisitDate && record.nextVisitDate <= today && !record.result?.trim()));
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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-8 h-8 md:w-12 md:h-12 border-[3px] md:border-4 border-zinc-100 border-t-zinc-950 rounded-full animate-spin mb-3"></div>
      <div className="text-zinc-400 text-[8px] md:text-[9px] font-black tracking-widest uppercase whitespace-nowrap">SYSTEM LOADING</div>
    </div>
  );

  if (error) {
    return (
      <Layout
        title="系統管理首頁 / DASHBOARD"
        onNavigate={onNavigate}
        currentView="dashboard"
      >
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-bold">{error}</span>
          <Button onClick={() => window.location.reload()} variant="outline" className="ml-auto text-xs">重試 / RETRY</Button>
        </div>
      </Layout>
    );
  }

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
          {[
            { key: 'all', label: '全部營運' },
            { key: 'missing_location', label: '待補定位' },
            { key: 'pending_deposit', label: '待頭期' },
            { key: 'pending_final', label: '待尾款' },
            { key: 'pending_warranty', label: '待保固' },
          ].map((item) => {
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

        {/* 清單標題 / HEADER */}
        <div className="bg-white border border-zinc-100 rounded-sm p-3 md:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">
              <SlidersHorizontal size={14} /> 篩選 / FILTERS
            </div>
            {hasAdvancedFilters && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setPriceFilter('all');
                  setDateFilter('all');
                  setSortBy('created_desc');
                  setOpsFilter('all');
                }}
                className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"
              >
                <RotateCcw size={12} /> 清除條件
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 mb-3">
            {[
              { key: 'all', label: '全部' },
              { key: 'assessment', label: '評估' },
              { key: 'active', label: '進行中' },
              { key: 'completed', label: '完工' },
              { key: 'warranty', label: '保固' },
            ].map((item) => {
              const active = statusFilter === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key as typeof statusFilter)}
                  className={`px-3 py-1.5 text-[9px] md:text-[10px] rounded-sm border font-black uppercase tracking-widest whitespace-nowrap transition-colors ${active
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                    }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)}
              className="w-full bg-white border border-zinc-200 rounded-sm px-2.5 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-700 outline-none focus:border-zinc-950"
            >
              <option value="all">金額：全部</option>
              <option value="lt100k">金額：10萬以下</option>
              <option value="100k_300k">金額：10萬-30萬</option>
              <option value="300k_600k">金額：30萬-60萬</option>
              <option value="gt600k">金額：60萬以上</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="w-full bg-white border border-zinc-200 rounded-sm px-2.5 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-700 outline-none focus:border-zinc-950"
            >
              <option value="all">日期：全部</option>
              <option value="last30">日期：近30天</option>
              <option value="last90">日期：近90天</option>
              <option value="thisYear">日期：今年</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full bg-white border border-zinc-200 rounded-sm px-2.5 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-700 outline-none focus:border-zinc-950"
            >
              <option value="created_desc">排序：最新建立</option>
              <option value="created_asc">排序：最早建立</option>
              <option value="price_desc">排序：金額高到低</option>
              <option value="price_asc">排序：金額低到高</option>
            </select>
          </div>
        </div>

        <div className="flex items-end justify-between border-b md:border-b-2 border-zinc-950 pb-2 md:pb-3 mb-4 md:mb-6">
          <div className="whitespace-nowrap min-w-0">
            <h2 className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5 leading-none">PROJECT ARCHIVE</h2>
            <div className="text-lg md:text-2xl font-black text-zinc-950 tracking-tighter uppercase leading-none truncate">案件清單 / RECENT</div>
          </div>
          <div className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded-sm whitespace-nowrap">{filteredCases.length} / {cases.length} 筆</div>
        </div>

        {/* 列表內容 / LIST - COMPACT FOR MOBILE */}
        <div className="space-y-2 md:space-y-3">
          {filteredCases.length > 0 ? filteredCases.map(c => (
            <div
              key={c.caseId}
              onClick={() => handleCaseClick(c.caseId)}
              className="group bg-white border border-zinc-100 rounded-sm p-3 md:p-5 hover:border-zinc-950 transition-all cursor-pointer flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-4 md:gap-6 min-w-0">
                <div className={`w-1 h-8 md:w-1.5 md:h-10 rounded-full shrink-0 ${isActiveStatus(c.status) ? 'bg-zinc-950' : 'bg-zinc-100'}`}></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 whitespace-nowrap overflow-hidden">
                    <span className="font-black text-sm md:text-lg tracking-tight text-zinc-950 uppercase truncate">{c.customerName}</span>
                    {/* Status Badge */}
                    <span className={`text-[8px] md:text-[10px] px-2 py-0.5 rounded-sm border uppercase font-black tracking-widest ${isActiveStatus(c.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      isCompletedStatus(c.status) ? 'bg-zinc-100 text-zinc-500 border-zinc-200' :
                        normalizeCaseStatus(c.status) === CaseStatus.WARRANTY ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-zinc-950 text-white border-zinc-950'
                      }`}>
                      {STATUS_LABELS[normalizeCaseStatus(c.status)] || (c.status as string).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-zinc-300 tracking-tight whitespace-nowrap opacity-60">
                    <MapPin className="w-2 h-2 md:w-2.5 md:h-2.5" /> <span className="truncate">{c.address || '未填寫地址'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(typeof c.latitude !== 'number' || typeof c.longitude !== 'number') && c.address && (
                      <span className="text-[8px] md:text-[9px] px-2 py-0.5 rounded-sm border bg-amber-50 text-amber-700 border-amber-200 font-black uppercase tracking-widest">待定位</span>
                    )}
                    {!c.depositReceivedDate && !isAssessmentStatus(c.status) && (
                      <span className="text-[8px] md:text-[9px] px-2 py-0.5 rounded-sm border bg-blue-50 text-blue-700 border-blue-200 font-black uppercase tracking-widest">待頭期</span>
                    )}
                    {!c.finalPaymentReceivedDate && normalizeCaseStatus(c.status) === CaseStatus.FINAL_PAYMENT && (
                      <span className="text-[8px] md:text-[9px] px-2 py-0.5 rounded-sm border bg-emerald-50 text-emerald-700 border-emerald-200 font-black uppercase tracking-widest">待尾款</span>
                    )}
                    {(c.warrantyRecords || []).some((record) => record.nextVisitDate && !record.result?.trim()) && (
                      <span className={`text-[8px] md:text-[9px] px-2 py-0.5 rounded-sm border font-black uppercase tracking-widest ${
                        (c.warrantyRecords || []).some((record) => record.nextVisitDate && record.nextVisitDate < new Date().toISOString().slice(0, 10) && !record.result?.trim())
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-violet-50 text-violet-700 border-violet-200'
                      }`}>待回訪</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                {/* 編輯/刪除按鈕 (Desktop shows on hover, Mobile always visible) */}
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleEdit(c, e)}
                    className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-950 transition-colors"
                    title="編輯案件"
                  >
                    <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(c.caseId, c.customerName, e)}
                    className="p-2 hover:bg-red-50 rounded-full text-zinc-400 hover:text-red-600 transition-colors"
                    title="刪除案件"
                  >
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

const StatCard = React.memo(({ icon, label, value, dark = false }: { icon: React.ReactNode, label: string, value: string | number, dark?: boolean }) => (
  <div className={`${dark ? 'bg-zinc-950 text-white border-zinc-900 shadow-md' : 'bg-white text-zinc-950 border-zinc-100'} p-3 md:p-5 rounded-sm border flex flex-col justify-between h-20 md:h-32 transition-all`}>
    <div className={`text-[7px] md:text-[9px] font-black flex items-center gap-1 md:gap-2 tracking-widest uppercase whitespace-nowrap leading-none ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
      {icon} {label.split(' / ')[0]}
    </div>
    <div className="text-xl md:text-3xl font-black tracking-tighter leading-none whitespace-nowrap">{value}</div>
  </div>
));

const QuickActionButton = React.memo(({ onClick, icon, title, subtitle }: { onClick: () => void, icon: React.ReactNode, title: string, subtitle: string }) => (
  <button onClick={onClick} className="group relative h-20 md:h-32 bg-white border border-zinc-200 rounded-sm p-4 md:p-6 text-left hover:border-zinc-950 transition-all shadow-sm active:scale-95 overflow-hidden">
    <div className="absolute top-4 right-4 text-zinc-100 md:group-hover:text-zinc-950 transition-all">{icon}</div>
    <div className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5 leading-none">{title}</div>
    <div className="text-sm md:text-lg font-black text-zinc-950 tracking-tighter uppercase whitespace-nowrap leading-none">{subtitle}</div>
  </button>
));

const QueueCard = React.memo(({
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
