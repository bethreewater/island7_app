import React from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';

interface DashboardFiltersProps {
  statusFilter: 'all' | 'assessment' | 'active' | 'completed' | 'warranty';
  priceFilter: 'all' | 'lt100k' | '100k_300k' | '300k_600k' | 'gt600k';
  dateFilter: 'all' | 'last30' | 'last90' | 'thisYear';
  sortBy: 'created_desc' | 'created_asc' | 'price_desc' | 'price_asc';
  hasAdvancedFilters: boolean;
  onStatusFilterChange: (value: DashboardFiltersProps['statusFilter']) => void;
  onPriceFilterChange: (value: DashboardFiltersProps['priceFilter']) => void;
  onDateFilterChange: (value: DashboardFiltersProps['dateFilter']) => void;
  onSortChange: (value: DashboardFiltersProps['sortBy']) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'assessment', label: '評估' },
  { key: 'active', label: '進行中' },
  { key: 'completed', label: '完工' },
  { key: 'warranty', label: '保固' },
] as const;

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  statusFilter,
  priceFilter,
  dateFilter,
  sortBy,
  hasAdvancedFilters,
  onStatusFilterChange,
  onPriceFilterChange,
  onDateFilterChange,
  onSortChange,
  onReset,
}) => (
  <div className="bg-white border border-zinc-100 rounded-sm p-3 md:p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">
        <SlidersHorizontal size={14} /> 篩選 / FILTERS
      </div>
      {hasAdvancedFilters && (
        <button onClick={onReset} className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1">
          <RotateCcw size={12} /> 清除條件
        </button>
      )}
    </div>

    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 mb-3">
      {STATUS_OPTIONS.map((item) => {
        const active = statusFilter === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onStatusFilterChange(item.key)}
            className={`px-3 py-1.5 text-[9px] md:text-[10px] rounded-sm border font-black uppercase tracking-widest whitespace-nowrap transition-colors ${active ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
      <select value={priceFilter} onChange={(e) => onPriceFilterChange(e.target.value as DashboardFiltersProps['priceFilter'])} className="w-full bg-white border border-zinc-200 rounded-sm px-2.5 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-700 outline-none focus:border-zinc-950">
        <option value="all">金額：全部</option>
        <option value="lt100k">金額：10萬以下</option>
        <option value="100k_300k">金額：10萬-30萬</option>
        <option value="300k_600k">金額：30萬-60萬</option>
        <option value="gt600k">金額：60萬以上</option>
      </select>

      <select value={dateFilter} onChange={(e) => onDateFilterChange(e.target.value as DashboardFiltersProps['dateFilter'])} className="w-full bg-white border border-zinc-200 rounded-sm px-2.5 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-700 outline-none focus:border-zinc-950">
        <option value="all">日期：全部</option>
        <option value="last30">日期：近30天</option>
        <option value="last90">日期：近90天</option>
        <option value="thisYear">日期：今年</option>
      </select>

      <select value={sortBy} onChange={(e) => onSortChange(e.target.value as DashboardFiltersProps['sortBy'])} className="w-full bg-white border border-zinc-200 rounded-sm px-2.5 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-700 outline-none focus:border-zinc-950">
        <option value="created_desc">排序：最新建立</option>
        <option value="created_asc">排序：最早建立</option>
        <option value="price_desc">排序：金額高到低</option>
        <option value="price_asc">排序：金額低到高</option>
      </select>
    </div>
  </div>
);
