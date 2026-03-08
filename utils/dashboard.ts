import { CaseData, CaseStatus, normalizeCaseStatus, isActiveStatus, isAssessmentStatus, isCompletedStatus } from '../types';
import { getCollectedAmount } from './finance';
import { getPaymentBreakdown } from './payment';
import {
  buildOperationQueues,
  getTodayString,
  hasMissingLocation,
  hasOverdueWarrantyVisit,
  hasPendingDeposit,
  hasPendingFinalPayment,
  hasPendingWarrantyVisit,
} from './operations';

export type DashboardTargetTab = 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty';

export type DashboardStatusFilter = 'all' | 'assessment' | 'active' | 'completed' | 'warranty';
export type DashboardPriceFilter = 'all' | 'lt100k' | '100k_300k' | '300k_600k' | 'gt600k';
export type DashboardDateFilter = 'all' | 'last30' | 'last90' | 'thisYear';
export type DashboardSortBy = 'created_desc' | 'created_asc' | 'price_desc' | 'price_asc';
export type DashboardOpsFilter = 'all' | 'missing_location' | 'pending_deposit' | 'pending_final' | 'pending_warranty' | 'overdue_warranty';

export interface DashboardFilterState {
  searchTerm: string;
  statusFilter: DashboardStatusFilter;
  priceFilter: DashboardPriceFilter;
  dateFilter: DashboardDateFilter;
  sortBy: DashboardSortBy;
  opsFilter: DashboardOpsFilter;
}

export interface DashboardActionMeta {
  tab: DashboardTargetTab;
  label: string;
  description: string;
}

export interface DashboardMetricItem {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone?: 'default' | 'dark' | 'blue' | 'amber' | 'emerald' | 'rose';
}

export interface DashboardSummaryMetrics {
  assessmentCount: number;
  activeCount: number;
  completedCount: number;
  warrantyCount: number;
  totalRevenue: number;
  totalCollected: number;
  newThisMonth: number;
  signedThisMonth: number;
  pendingDepositAmount: number;
  pendingFinalAmount: number;
  overdueWarrantyCount: number;
  upcomingWarrantyCount: number;
  pendingDepositCount: number;
  metrics: DashboardMetricItem[];
}

export const formatCurrencyCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${Math.round(value).toLocaleString()}`;
};

export const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

export const getDaysFromToday = (dateString?: string) => {
  if (!dateString) return null;
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;
  const diff = Date.now() - target.getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
};

export const getCaseNextAction = (item: CaseData): DashboardActionMeta => {
  const status = normalizeCaseStatus(item.status);
  const today = getTodayString();

  if (hasOverdueWarrantyVisit(item, today)) {
    return { tab: 'warranty', label: '處理逾期回訪', description: '保固回訪已逾期' };
  }
  if (hasPendingWarrantyVisit(item)) {
    return { tab: 'warranty', label: '安排保固回訪', description: '已有下次回訪日' };
  }
  if (hasMissingLocation(item)) {
    return { tab: 'eval', label: '補定位資訊', description: '地址已填但尚未定位' };
  }
  if (hasPendingDeposit(item)) {
    return { tab: 'quote', label: '確認頭期收款', description: '案件已進正式流程' };
  }
  if (status === CaseStatus.FINAL_PAYMENT || hasPendingFinalPayment(item)) {
    return { tab: 'quote', label: '追蹤尾款', description: '進入尾款請領階段' };
  }
  if (status === CaseStatus.ASSESSMENT) {
    return { tab: 'eval', label: '完成現場評估', description: '補齊評估與需求' };
  }
  if (status === CaseStatus.DEPOSIT_RECEIVED || status === CaseStatus.PLANNING) {
    return { tab: 'schedule', label: '安排進場', description: '確認排程與備料' };
  }
  if (status === CaseStatus.CONSTRUCTION) {
    return { tab: 'log', label: '更新施工日誌', description: '回填當日施工進度' };
  }
  if (status === CaseStatus.COMPLETED || status === CaseStatus.WARRANTY) {
    return { tab: 'warranty', label: '檢查保固狀態', description: '確認回訪與保固紀錄' };
  }

  return { tab: 'eval', label: '查看案件', description: '檢查目前案件資料' };
};

export const getCaseRiskFlags = (item: CaseData) => {
  const today = getTodayString();
  return [
    hasMissingLocation(item) ? { label: '待定位', tone: 'amber' as const } : null,
    hasPendingDeposit(item) ? { label: '待頭期', tone: 'blue' as const } : null,
    hasPendingFinalPayment(item) ? { label: '待尾款', tone: 'emerald' as const } : null,
    hasPendingWarrantyVisit(item)
      ? { label: hasOverdueWarrantyVisit(item, today) ? '回訪逾期' : '待回訪', tone: hasOverdueWarrantyVisit(item, today) ? 'rose' as const : 'violet' as const }
      : null,
  ].filter(Boolean);
};

export const getCasePrimarySummary = (item: CaseData) => {
  const status = normalizeCaseStatus(item.status);
  if (status === CaseStatus.ASSESSMENT) return '等待現場評估與報價整理';
  if (status === CaseStatus.DEPOSIT_RECEIVED) return '已收頭期，待安排排程與備料';
  if (status === CaseStatus.PLANNING) return '排程與進場前準備中';
  if (status === CaseStatus.CONSTRUCTION) return '現場施工執行中';
  if (status === CaseStatus.FINAL_PAYMENT) return '完工後待尾款確認';
  if (status === CaseStatus.COMPLETED) return '已完工，待觀察保固狀態';
  if (status === CaseStatus.WARRANTY) return '保固追蹤與回訪中';
  return '查看案件最新資料';
};

export const getDashboardMetrics = (cases: CaseData[]): DashboardSummaryMetrics => {
  const queues = buildOperationQueues(cases);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const realizedCases = cases.filter((item) => !isAssessmentStatus(item.status));
  const totalRevenue = realizedCases.reduce((sum, item) => sum + (item.finalPrice || 0), 0);
  const totalCollected = cases.reduce((sum, item) => sum + getCollectedAmount(item), 0);
  const pendingDepositAmount = cases
    .filter((item) => hasPendingDeposit(item))
    .reduce((sum, item) => {
      const payment = getPaymentBreakdown(item.finalPrice || 0, item.depositPercentage);
      return sum + payment.depositAmount;
    }, 0);
  const pendingFinalAmount = cases
    .filter((item) => hasPendingFinalPayment(item))
    .reduce((sum, item) => {
      const payment = getPaymentBreakdown(item.finalPrice || 0, item.depositPercentage);
      return sum + payment.finalAmount;
    }, 0);
  const newThisMonth = cases.filter((item) => {
    const createdDate = new Date(item.createdDate);
    return !Number.isNaN(createdDate.getTime()) && createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
  }).length;
  const signedThisMonth = realizedCases.filter((item) => {
    const dateSource = item.contractSignedDate || item.createdDate;
    const signedDate = new Date(dateSource);
    return !Number.isNaN(signedDate.getTime()) && signedDate.getMonth() === currentMonth && signedDate.getFullYear() === currentYear;
  }).reduce((sum, item) => sum + (item.finalPrice || 0), 0);

  const assessmentCount = cases.filter((item) => isAssessmentStatus(item.status)).length;
  const activeCount = cases.filter((item) => isActiveStatus(item.status)).length;
  const completedCount = cases.filter((item) => isCompletedStatus(item.status)).length;
  const warrantyCount = cases.filter((item) => normalizeCaseStatus(item.status) === CaseStatus.WARRANTY).length;
  const overdueWarrantyCount = queues.overdueWarrantyVisit.length;
  const upcomingWarrantyCount = queues.upcomingWarrantyVisit.length;
  const pendingDepositCount = queues.pendingDeposit.length;

  const metrics: DashboardMetricItem[] = [
    { key: 'assessment', label: '評估中案件', value: `${assessmentCount}`, helper: '等待現場與報價', tone: 'default' },
    { key: 'active', label: '施工中案件', value: `${activeCount}`, helper: '正式流程進行中', tone: 'dark' },
    { key: 'pending-final', label: '待收尾款', value: formatCurrencyCompact(pendingFinalAmount), helper: `${queues.pendingFinalPayment.length} 筆待追款`, tone: 'emerald' },
    { key: 'warranty', label: '保固待回訪', value: `${upcomingWarrantyCount}`, helper: overdueWarrantyCount > 0 ? `其中 ${overdueWarrantyCount} 筆逾期` : '7 天內需留意', tone: overdueWarrantyCount > 0 ? 'rose' : 'amber' },
    { key: 'new-this-month', label: '本月新增', value: `${newThisMonth}`, helper: '以建立日期計算', tone: 'blue' },
    { key: 'signed-this-month', label: '本月成交', value: formatCurrencyCompact(signedThisMonth), helper: formatCurrency(totalCollected), tone: 'default' },
  ];

  return {
    assessmentCount,
    activeCount,
    completedCount,
    warrantyCount,
    totalRevenue,
    totalCollected,
    newThisMonth,
    signedThisMonth,
    pendingDepositAmount,
    pendingFinalAmount,
    overdueWarrantyCount,
    upcomingWarrantyCount,
    pendingDepositCount,
    metrics,
  };
};

export const filterDashboardCases = (cases: CaseData[], filters: DashboardFilterState) => {
  const now = new Date();
  const term = filters.searchTerm.trim().toLowerCase();
  const today = getTodayString();

  const filtered = cases.filter((item) => {
    const matchesSearch = !term ||
      item.customerName?.toLowerCase().includes(term) ||
      item.caseId?.toLowerCase().includes(term) ||
      item.address?.toLowerCase().includes(term) ||
      item.phone?.toLowerCase().includes(term);
    if (!matchesSearch) return false;

    if (filters.statusFilter !== 'all') {
      const status = normalizeCaseStatus(item.status);
      const matchesStatus =
        (filters.statusFilter === 'assessment' && isAssessmentStatus(status)) ||
        (filters.statusFilter === 'active' && isActiveStatus(status)) ||
        (filters.statusFilter === 'completed' && isCompletedStatus(status)) ||
        (filters.statusFilter === 'warranty' && status === CaseStatus.WARRANTY);
      if (!matchesStatus) return false;
    }

    if (filters.priceFilter !== 'all') {
      const price = item.finalPrice || 0;
      const matchesPrice =
        (filters.priceFilter === 'lt100k' && price < 100000) ||
        (filters.priceFilter === '100k_300k' && price >= 100000 && price <= 300000) ||
        (filters.priceFilter === '300k_600k' && price > 300000 && price <= 600000) ||
        (filters.priceFilter === 'gt600k' && price > 600000);
      if (!matchesPrice) return false;
    }

    if (filters.dateFilter !== 'all') {
      const createdAt = new Date(item.createdDate);
      if (Number.isNaN(createdAt.getTime())) return false;
      const ageInMs = now.getTime() - createdAt.getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      const matchesDate =
        (filters.dateFilter === 'last30' && ageInMs <= 30 * dayMs) ||
        (filters.dateFilter === 'last90' && ageInMs <= 90 * dayMs) ||
        (filters.dateFilter === 'thisYear' && createdAt.getFullYear() === now.getFullYear());
      if (!matchesDate) return false;
    }

    if (filters.opsFilter !== 'all') {
      const matchesOps =
        (filters.opsFilter === 'missing_location' && hasMissingLocation(item)) ||
        (filters.opsFilter === 'pending_deposit' && hasPendingDeposit(item)) ||
        (filters.opsFilter === 'pending_final' && hasPendingFinalPayment(item)) ||
        (filters.opsFilter === 'pending_warranty' && hasPendingWarrantyVisit(item)) ||
        (filters.opsFilter === 'overdue_warranty' && hasOverdueWarrantyVisit(item, today));
      if (!matchesOps) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    const aDate = new Date(a.createdDate).getTime();
    const bDate = new Date(b.createdDate).getTime();
    const aPrice = a.finalPrice || 0;
    const bPrice = b.finalPrice || 0;

    switch (filters.sortBy) {
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
};

export const getAppliedFilterLabels = (filters: DashboardFilterState) => {
  const labels: string[] = [];

  if (filters.searchTerm.trim()) labels.push(`搜尋：${filters.searchTerm.trim()}`);
  if (filters.statusFilter !== 'all') {
    labels.push(`狀態：${({ assessment: '評估', active: '進行中', completed: '完工', warranty: '保固' } as Record<string, string>)[filters.statusFilter]}`);
  }
  if (filters.priceFilter !== 'all') {
    labels.push(`金額：${({ lt100k: '10萬以下', '100k_300k': '10萬-30萬', '300k_600k': '30萬-60萬', gt600k: '60萬以上' } as Record<string, string>)[filters.priceFilter]}`);
  }
  if (filters.dateFilter !== 'all') {
    labels.push(`日期：${({ last30: '近30天', last90: '近90天', thisYear: '今年' } as Record<string, string>)[filters.dateFilter]}`);
  }
  if (filters.opsFilter !== 'all') {
    labels.push(`營運：${({ missing_location: '待補定位', pending_deposit: '待頭期', pending_final: '待尾款', pending_warranty: '待保固', overdue_warranty: '回訪逾期' } as Record<string, string>)[filters.opsFilter]}`);
  }
  if (filters.sortBy !== 'created_desc') {
    labels.push(`排序：${({ created_asc: '最早建立', price_desc: '金額高到低', price_asc: '金額低到高' } as Record<string, string>)[filters.sortBy]}`);
  }

  return labels;
};
