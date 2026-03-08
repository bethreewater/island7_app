import React from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { DashboardDateFilter, DashboardOpsFilter, DashboardPriceFilter, DashboardSortBy, DashboardStatusFilter } from '../../utils/dashboard';

interface DashboardFiltersProps {
  searchTerm: string;
  statusFilter: DashboardStatusFilter;
  priceFilter: DashboardPriceFilter;
  dateFilter: DashboardDateFilter;
  sortBy: DashboardSortBy;
  opsFilter: DashboardOpsFilter;
  hasAdvancedFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: DashboardStatusFilter) => void;
  onPriceFilterChange: (value: DashboardPriceFilter) => void;
  onDateFilterChange: (value: DashboardDateFilter) => void;
  onSortChange: (value: DashboardSortBy) => void;
  onOpsFilterChange: (value: DashboardOpsFilter) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { key: DashboardStatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'assessment', label: '評估' },
  { key: 'active', label: '進行中' },
  { key: 'completed', label: '完工' },
  { key: 'warranty', label: '保固' },
];

const OPS_OPTIONS: { key: DashboardOpsFilter; label: string }[] = [
  { key: 'all', label: '全部營運' },
  { key: 'missing_location', label: '待補定位' },
  { key: 'pending_deposit', label: '待頭期' },
  { key: 'pending_final', label: '待尾款' },
  { key: 'pending_warranty', label: '待回訪' },
  { key: 'overdue_warranty', label: '回訪逾期' },
];

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  searchTerm,
  statusFilter,
  priceFilter,
  dateFilter,
  sortBy,
  opsFilter,
  hasAdvancedFilters,
  onSearchChange,
  onStatusFilterChange,
  onPriceFilterChange,
  onDateFilterChange,
  onSortChange,
  onOpsFilterChange,
  onReset,
}) => (
  <div className="rounded-sm border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
          <SlidersHorizontal size={14} /> Dashboard Filters
        </div>
        <div className="mt-2 text-lg font-black tracking-tight text-zinc-950">用狀態、風險、金額與日期快速收斂案件</div>
      </div>
      {hasAdvancedFilters && (
        <button onClick={onReset} className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 transition-colors hover:border-zinc-950 hover:text-zinc-950">
          <RotateCcw size={14} /> 清除全部條件
        </button>
      )}
    </div>

    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">搜尋案件</div>
        <div className="relative mt-2">
          <Search className="absolute left-0 top-1 text-zinc-300" size={16} />
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="客戶、案號、電話、地址"
            className="w-full border-none bg-transparent pl-6 text-base font-black text-zinc-950 outline-none placeholder:text-zinc-300"
          />
        </div>
      </div>

      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">營運焦點</div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {OPS_OPTIONS.map((item) => {
            const active = opsFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onOpsFilterChange(item.key)}
                className={`whitespace-nowrap rounded-sm border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${active ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
      {STATUS_OPTIONS.map((item) => {
        const active = statusFilter === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onStatusFilterChange(item.key)}
            className={`whitespace-nowrap rounded-sm border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${active ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400'}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <select value={priceFilter} onChange={(event) => onPriceFilterChange(event.target.value as DashboardPriceFilter)} className="w-full rounded-sm border border-zinc-200 bg-white px-3 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-700 outline-none focus:border-zinc-950">
        <option value="all">金額：全部</option>
        <option value="lt100k">金額：10萬以下</option>
        <option value="100k_300k">金額：10萬-30萬</option>
        <option value="300k_600k">金額：30萬-60萬</option>
        <option value="gt600k">金額：60萬以上</option>
      </select>

      <select value={dateFilter} onChange={(event) => onDateFilterChange(event.target.value as DashboardDateFilter)} className="w-full rounded-sm border border-zinc-200 bg-white px-3 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-700 outline-none focus:border-zinc-950">
        <option value="all">日期：全部</option>
        <option value="last30">日期：近30天</option>
        <option value="last90">日期：近90天</option>
        <option value="thisYear">日期：今年</option>
      </select>

      <select value={sortBy} onChange={(event) => onSortChange(event.target.value as DashboardSortBy)} className="w-full rounded-sm border border-zinc-200 bg-white px-3 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-700 outline-none focus:border-zinc-950">
        <option value="created_desc">排序：最新建立</option>
        <option value="created_asc">排序：最早建立</option>
        <option value="price_desc">排序：金額高到低</option>
        <option value="price_asc">排序：金額低到高</option>
      </select>
    </div>
  </div>
);
