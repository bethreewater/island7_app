import React, { useMemo } from 'react';
import { CaseData, ScheduleTask } from '../types';
import { MapPin, TrendingUp, Clock } from 'lucide-react';

interface TodayTasksProps {
    cases: CaseData[];
    onSelectCase: (caseData: CaseData) => void;
}

interface TaskInfo {
    case: CaseData;
    todayTasks: ScheduleTask[];
    progress: number;
    totalDays: number;
    currentDay: number;
}

export const TodayTasks: React.FC<TodayTasksProps> = ({ cases, onSelectCase }) => {
    const { activeToday, pendingStart } = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        const activeToday: TaskInfo[] = cases
            .filter(c => c.status === 'inProgress')
            .map(c => {
                const todayTasks = c.schedule?.filter(task =>
                    task.date === today && task.status !== 'completed'
                ) || [];

                const totalTasks = c.schedule?.length || 0;
                const completedTasks = c.schedule?.filter(t => t.status === 'completed').length || 0;
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                // Calculate days
                const allDates = c.schedule?.map(t => t.date).sort() || [];
                const totalDays = allDates.length;
                const currentDay = allDates.findIndex(d => d === today) + 1;

                return {
                    case: c,
                    todayTasks,
                    progress,
                    totalDays,
                    currentDay
                };
            })
            .filter(item => item.todayTasks.length > 0);

        const pendingStart = cases.filter(c => c.status === 'new');

        return { activeToday, pendingStart };
    }, [cases]);

    const todayDate = new Date().toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    return (
        <div className="bg-white rounded-sm shadow-sm border border-zinc-100 overflow-hidden mb-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-zinc-50 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-blue-600"></div>
                    <div>
                        <h3 className="font-black text-zinc-950 text-sm md:text-base uppercase tracking-wider leading-tight">
                            今日任務 / TODAY'S TASKS
                        </h3>
                    </div>
                </div>
                <div className="text-xs font-mono text-zinc-400">
                    📅 {todayDate}
                </div>
            </div>

            <div className="p-4 md:p-6">
                {/* Active Cases Today */}
                {activeToday.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="text-xs font-black text-zinc-600 uppercase tracking-wider">
                                🚧 進行中 ({activeToday.length} 案件)
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeToday.map(({ case: caseItem, todayTasks, progress, totalDays, currentDay }) => (
                                <div
                                    key={caseItem.id}
                                    onClick={() => onSelectCase(caseItem)}
                                    className="border-2 border-green-200 rounded-lg p-4 hover:border-green-400 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-green-50/30"
                                >
                                    {/* Case Name */}
                                    <div className="font-black text-base text-zinc-900 mb-2">
                                        {caseItem.customerName}
                                    </div>

                                    {/* Today's Tasks */}
                                    <div className="text-xs text-zinc-600 mb-3">
                                        {todayTasks.map((task, idx) => (
                                            <div key={idx} className="flex items-start gap-1">
                                                <span className="text-green-600">•</span>
                                                <span>{task.description}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Location */}
                                    {caseItem.address && (
                                        <div className="flex items-center gap-1 text-xs text-zinc-500 mb-3">
                                            <MapPin size={12} />
                                            <span className="truncate">{caseItem.address}</span>
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-400 font-mono">進度</span>
                                            <span className="font-black text-zinc-700">
                                                {progress}%
                                                {currentDay > 0 && totalDays > 0 && (
                                                    <span className="ml-2 text-zinc-400 font-normal">
                                                        (第{currentDay}天/共{totalDays}天)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* View Details Button */}
                                    <div className="mt-3 text-xs text-green-700 font-black flex items-center gap-1 hover:gap-2 transition-all">
                                        查看詳情 →
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pending Start Cases */}
                {pendingStart.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="text-xs font-black text-zinc-600 uppercase tracking-wider">
                                ⏰ 待開工 ({pendingStart.length} 案件)
                            </div>
                        </div>

                        <div className="space-y-2">
                            {pendingStart.slice(0, 3).map(caseItem => (
                                <div
                                    key={caseItem.id}
                                    onClick={() => onSelectCase(caseItem)}
                                    className="flex items-center gap-3 p-3 border border-orange-200 rounded-lg hover:border-orange-400 hover:bg-orange-50/30 transition-all cursor-pointer"
                                >
                                    <Clock size={16} className="text-orange-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-zinc-900 truncate">
                                            {caseItem.customerName}
                                        </div>
                                        <div className="text-xs text-zinc-500 truncate">
                                            {caseItem.address || '待安排現場評估'}
                                        </div>
                                    </div>
                                    <TrendingUp size={14} className="text-orange-400 shrink-0" />
                                </div>
                            ))}
                            {pendingStart.length > 3 && (
                                <div className="text-xs text-zinc-400 text-center pt-1">
                                    +{pendingStart.length - 3} 個待開工案件
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {activeToday.length === 0 && pendingStart.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-3">🎉</div>
                        <div className="text-zinc-500 font-bold mb-1">今日無排程施工</div>
                        <div className="text-xs text-zinc-300 uppercase tracking-widest">NO TASKS SCHEDULED TODAY</div>
                    </div>
                )}
            </div>
        </div>
    );
};
