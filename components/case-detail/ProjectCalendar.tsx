import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Calendar, List } from 'lucide-react';
import { ScheduleTask, ConstructionLog } from '../../types';
import { Card } from '../InputComponents';

export const ProjectCalendar: React.FC<{ schedule: ScheduleTask[]; logs: ConstructionLog[]; onUpdate: (s: ScheduleTask[]) => void }> = ({ schedule, logs, onUpdate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().slice(0, 10)); // Default to today
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar'); // View mode toggle

    const totalDelay = useMemo(() => logs.reduce((sum, log) => sum + (log.delayDays || 0), 0), [logs]);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const tasksByDate = useMemo(() => {
        const map: Record<string, ScheduleTask[]> = {};
        schedule.forEach(t => {
            if (!map[t.date]) map[t.date] = [];
            map[t.date].push(t);
        });
        return map;
    }, [schedule]);

    // Sorted tasks for list view
    const sortedTasks = useMemo(() => {
        return [...schedule].sort((a, b) => a.date.localeCompare(b.date));
    }, [schedule]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-zinc-950 overflow-hidden shadow-xl" title={null}>
                    <div className="bg-zinc-950 text-white p-4 flex justify-between items-center">
                        <h3 className="font-black text-lg uppercase tracking-tight">{year} / {month + 1}月</h3>
                        <div className="flex gap-3 items-center">
                            {/* View Mode Toggle */}
                            <div className="flex gap-1 bg-white/10 p-1 rounded-sm">
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-white text-zinc-950' : 'text-white/60 hover:text-white'
                                        }`}
                                >
                                    <Calendar size={12} /> 日曆
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white text-zinc-950' : 'text-white/60 hover:text-white'
                                        }`}
                                >
                                    <List size={12} /> 清單
                                </button>
                            </div>
                            {viewMode === 'calendar' && (
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-white/10 rounded"><ChevronLeft size={20} /></button>
                                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-white/10 rounded"><ChevronRight size={20} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Calendar View */}
                    {viewMode === 'calendar' ? (
                        <>
                            <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50">
                                {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                                    <div key={d} className="py-2 text-[10px] font-black text-center text-zinc-400">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} className="aspect-square border-b border-r border-zinc-50 bg-zinc-50/20"></div>)}
                                {Array.from({ length: days }).map((_, i) => {
                                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                                    const dayTasks = tasksByDate[dateKey] || [];
                                    const isToday = new Date().toISOString().slice(0, 10) === dateKey;

                                    return (
                                        <div key={i} onClick={() => setSelectedDate(dateKey)} className={`aspect-square border-b border-r border-zinc-50 p-1 cursor-pointer transition-colors relative ${selectedDate === dateKey ? 'bg-zinc-100 ring-2 ring-inset ring-zinc-950 z-10' : 'hover:bg-zinc-50'}`}>
                                            <span className={`text-[10px] font-black ${isToday ? 'bg-zinc-950 text-white px-1.5 rounded-sm' : 'text-zinc-300'}`}>{i + 1}</span>
                                            <div className="flex gap-0.5 mt-1 flex-wrap content-start">
                                                {dayTasks.map((t, ti) => (
                                                    <div key={ti} className={`w-1.5 h-1.5 rounded-full ${t.isCompleted ? 'bg-emerald-300' : 'bg-red-400'}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        /* List View */
                        <div className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
                            {sortedTasks.length > 0 ? sortedTasks.map((task, idx) => {
                                const isToday = task.date === new Date().toISOString().slice(0, 10);
                                const isPast = task.date < new Date().toISOString().slice(0, 10);

                                return (
                                    <div key={idx} className={`p-4 hover:bg-zinc-50 transition-colors ${isToday ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
                                        <div className="flex items-start gap-4">
                                            <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${task.isCompleted ? 'bg-emerald-500 border-emerald-500' :
                                                    isPast ? 'border-red-400 bg-red-50' :
                                                        'border-zinc-300'
                                                }`}>
                                                {task.isCompleted && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-sm ${isToday ? 'bg-blue-600 text-white' :
                                                            isPast ? 'bg-zinc-200 text-zinc-600' :
                                                                'bg-zinc-100 text-zinc-600'
                                                        }`}>
                                                        {task.date}
                                                    </span>
                                                    {isToday && <span className="text-[9px] font-black text-blue-600 uppercase">• 今天</span>}
                                                </div>
                                                <div className={`font-bold text-sm mb-0.5 ${task.isCompleted ? 'line-through opacity-50' : 'text-zinc-950'}`}>
                                                    {task.taskName}
                                                </div>
                                                <div className="text-[10px] text-zinc-400 uppercase font-black">@{task.zoneName}</div>
                                            </div>
                                            {task.isCompleted && (
                                                <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-sm">已完成</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-20">
                                    <div className="text-zinc-200 font-black text-sm uppercase tracking-widest">尚無排程 / NO SCHEDULE</div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                <div className="space-y-4">
                    <Card title="進度概況 / STATUS">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-50 pb-3">
                                <span className="text-[10px] font-black text-zinc-400 uppercase">累計順延 / DELAY</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-black ${totalDelay > 0 ? 'text-amber-600' : 'text-zinc-950'}`}>
                                        {totalDelay}
                                    </span>
                                    <span className="text-[10px] font-black text-zinc-300 uppercase">DAYS</span>
                                </div>
                            </div>
                            {totalDelay > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-sm flex gap-3 items-start animate-pulse">
                                    <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                                    <p className="text-[10px] font-bold text-amber-800 leading-tight uppercase">
                                        工程進度已發生順延，排程已根據日誌紀錄自動調整日期。
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {selectedDate && tasksByDate[selectedDate] && (
                        <Card title={`${selectedDate} 任務`}>
                            {tasksByDate[selectedDate].length > 0 ? (
                                <div className="space-y-2">
                                    {tasksByDate[selectedDate].map((t, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-2 border-b border-zinc-50 last:border-0">
                                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${t.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 bg-zinc-50'}`}>
                                                {t.isCompleted && <CheckCircle2 size={10} />}
                                            </div>
                                            <div className={t.isCompleted ? 'opacity-40 line-through' : ''}>
                                                <div className="text-[10px] text-zinc-400 uppercase font-black">@{t.zoneName}</div>
                                                <div className="text-sm font-bold text-zinc-950">{t.taskName}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-zinc-300 text-xs italic text-center py-4">無任務 / NO TASK</div>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
