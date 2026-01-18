import React from 'react';
import { CaseStatus, STATUS_LABELS } from '../../types';

interface MapFilterBarProps {
    selectedStatuses: CaseStatus[];
    onToggleStatus: (status: CaseStatus | 'ALL') => void;
    counts: Record<string, number>;
}

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
    selectedStatuses,
    onToggleStatus,
    counts
}) => {
    // Helper to check if a status is active
    const isActive = (status: CaseStatus) => selectedStatuses.includes(status);
    const isAll = selectedStatuses.length === 0;

    const filters = [
        { key: 'ALL', label: '全部顯示', color: 'bg-zinc-800' },
        { key: CaseStatus.CONSTRUCTION, label: '施工中', color: 'bg-orange-500' },
        { key: CaseStatus.ASSESSMENT, label: '評估中', color: 'bg-blue-500' },
        { key: CaseStatus.COMPLETED, label: '已完工', color: 'bg-emerald-500' },
        { key: CaseStatus.WARRANTY, label: '保固中', color: 'bg-purple-500' },
    ];

    return (
        <div className="absolute top-4 left-4 right-16 z-[500] flex gap-2 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
            {filters.map((filter) => {
                const active = filter.key === 'ALL' ? isAll : isActive(filter.key as CaseStatus);
                const count = filter.key === 'ALL' ? counts.total : counts[filter.key];

                return (
                    <button
                        key={filter.key}
                        onClick={() => onToggleStatus(filter.key as CaseStatus | 'ALL')}
                        className={`
                            whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border
                            flex items-center gap-1.5 transition-all active:scale-95
                            ${active
                                ? `${filter.color} text-white border-transparent`
                                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}
                        `}
                    >
                        <span>{filter.key === 'ALL' ? '全部' : STATUS_LABELS[filter.key as CaseStatus]}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-zinc-100'}`}>
                            {count || 0}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
