import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Calendar, List, FileText, Clock, CloudRain, Cloud, Sun } from 'lucide-react';
import { ScheduleTask, ConstructionLog } from '../../types';
import { Card } from '../InputComponents';

const toLocalDate = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const ProjectCalendar: React.FC<{ schedule: ScheduleTask[]; logs: ConstructionLog[]; onUpdate: (s: ScheduleTask[]) => void }> = ({ schedule: rawSchedule, logs: rawLogs, onUpdate }) => {
    const schedule = rawSchedule || [];
    const logs = rawLogs || [];

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [hasAutoNavigated, setHasAutoNavigated] = useState(false);

    // Auto-navigate to first incomplete task on mount
    useEffect(() => {
        if (hasAutoNavigated || schedule.length === 0) return;
        const logDatesSet = new Set(logs.filter(l => !l.description?.startsWith('[系統自動生成]')).map(l => l.date));
        const firstIncomplete = [...schedule]
            .sort((a, b) => a.date.localeCompare(b.date))
            .find(t => !t.isCompleted && !logDatesSet.has(t.date));

        if (firstIncomplete) {
            const [y, m] = firstIncomplete.date.split('-').map(Number);
            setCurrentDate(new Date(y, m - 1, 1));
            setSelectedDate(firstIncomplete.date);
        }
        setHasAutoNavigated(true);
    }, [schedule, logs, hasAutoNavigated]);

    const totalDelay = useMemo(() => logs.reduce((sum, log) => sum + (log.delayDays || 0), 0), [logs]);
    const totalTasks = schedule.length;
    // Only count real (user-edited) logs for progress, exclude auto-generated placeholders
    const editedLogDates = useMemo(() => new Set(logs.filter(l => !l.description?.startsWith('[系統自動生成]')).map(l => l.date)), [logs]);
    const completedTasks = useMemo(() => schedule.filter(t => t.isCompleted || editedLogDates.has(t.date)).length, [schedule, editedLogDates]);
    const loggedDays = editedLogDates.size;

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const todayStr = toLocalDate();

    const tasksByDate = useMemo(() => {
        const map: Record<string, ScheduleTask[]> = {};
        schedule.forEach(t => { if (!map[t.date]) map[t.date] = []; map[t.date].push(t); });
        return map;
    }, [schedule]);

    const logsByDate = useMemo(() => {
        const map: Record<string, ConstructionLog[]> = {};
        logs.forEach(l => { if (!map[l.date]) map[l.date] = []; map[l.date].push(l); });
        return map;
    }, [logs]);

    const sortedTasks = useMemo(() => [...schedule].sort((a, b) => a.date.localeCompare(b.date)), [schedule]);

    // Day status for calendar coloring
    const getDayStatus = (dateKey: string) => {
        const dayTasks = tasksByDate[dateKey] || [];
        const dayLogs = logsByDate[dateKey] || [];
        const hasSchedule = dayTasks.length > 0;
        const hasRealLog = dayLogs.some(l => !l.description?.startsWith('[系統自動生成]'));
        const allComplete = dayTasks.length > 0 && dayTasks.every(t => t.isCompleted);
        const hasDelay = dayLogs.some(l => l.isNoWorkDay);
        const isPast = dateKey < todayStr;

        if (hasDelay) return 'delayed';                    // amber
        if (allComplete && hasRealLog) return 'done';      // green (dark)
        if (hasRealLog) return 'logged';                   // green (light)
        if (hasSchedule && isPast) return 'overdue';       // red
        if (hasSchedule) return 'planned';                 // blue
        return 'none';
    };

    const weatherIcon = (w: string) => {
        if (w === '雨天') return <CloudRain size={10} />;
        if (w === '陰天' || w === '多雲') return <Cloud size={10} />;
        return <Sun size={10} />;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-zinc-950 overflow-hidden shadow-xl" title={null}>
                    <div className="bg-zinc-950 text-white p-4 flex justify-between items-center">
                        <h3 className="font-black text-lg uppercase tracking-tight">{year} / {month + 1}月</h3>
                        <div className="flex gap-3 items-center">
                            <div className="flex gap-1 bg-white/10 p-1 rounded-sm">
                                <button onClick={() => setViewMode('calendar')}
                                    className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-white text-zinc-950' : 'text-white/60 hover:text-white'}`}>
                                    <Calendar size={12} /> 日曆
                                </button>
                                <button onClick={() => setViewMode('list')}
                                    className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white text-zinc-950' : 'text-white/60 hover:text-white'}`}>
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

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                        <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-500"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 已完成</div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-500"><div className="w-2.5 h-2.5 rounded-full bg-emerald-300" /> 已紀錄</div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-500"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 延期</div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-500"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /> 未紀錄</div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-500"><div className="w-2.5 h-2.5 rounded-full bg-blue-400" /> 表定施工</div>
                    </div>

                    {viewMode === 'calendar' ? (
                        <>
                            <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50">
                                {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                                    <div key={d} className="py-2 text-[10px] font-black text-center text-zinc-400">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} className="aspect-square border-b border-r border-zinc-50 bg-zinc-50/20" />)}
                                {Array.from({ length: days }).map((_, i) => {
                                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                                    const isToday = todayStr === dateKey;
                                    const status = getDayStatus(dateKey);
                                    const dayTasks = tasksByDate[dateKey] || [];
                                    const dayLogs = logsByDate[dateKey] || [];

                                    let dotColor = '';
                                    let bgColor = '';
                                    switch (status) {
                                        case 'done': dotColor = 'bg-emerald-500'; bgColor = 'bg-emerald-50'; break;
                                        case 'logged': dotColor = 'bg-emerald-300'; bgColor = 'bg-emerald-50/50'; break;
                                        case 'delayed': dotColor = 'bg-amber-400'; bgColor = 'bg-amber-50'; break;
                                        case 'overdue': dotColor = 'bg-red-400'; bgColor = 'bg-red-50'; break;
                                        case 'planned': dotColor = 'bg-blue-400'; bgColor = 'bg-blue-50'; break;
                                    }

                                    return (
                                        <div key={i} onClick={() => setSelectedDate(dateKey)}
                                            className={`aspect-square border-b border-r border-zinc-50 p-1 cursor-pointer transition-colors relative
                                                ${selectedDate === dateKey ? 'ring-2 ring-inset ring-zinc-950 z-10' : ''} ${bgColor || 'hover:bg-zinc-50'}`}>
                                            <span className={`text-[10px] font-black ${isToday ? 'bg-zinc-950 text-white px-1.5 rounded-sm' : 'text-zinc-400'}`}>{i + 1}</span>
                                            {status !== 'none' && (
                                                <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${dotColor}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        /* List View - unified timeline of schedule + logs */
                        <div className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
                            {(() => {
                                // Build a unified date list from both schedule and logs
                                const allDates = new Set<string>();
                                schedule.forEach(t => allDates.add(t.date));
                                logs.forEach(l => allDates.add(l.date));
                                const sortedDates = Array.from(allDates).sort();

                                if (sortedDates.length === 0) {
                                    return (
                                        <div className="text-center py-20">
                                            <div className="text-zinc-200 font-black text-sm uppercase tracking-widest">尚無排程與日誌 / NO DATA</div>
                                        </div>
                                    );
                                }

                                return sortedDates.map(date => {
                                    const dayTasks = tasksByDate[date] || [];
                                    const dayLogs = logsByDate[date] || [];
                                    const isToday = date === todayStr;
                                    const isPast = date < todayStr;

                                    return (
                                        <div key={date} className={`p-4 hover:bg-zinc-50 transition-colors ${isToday ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
                                            {/* Date header */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-xs font-black px-2 py-0.5 rounded-sm ${isToday ? 'bg-blue-600 text-white' : isPast ? 'bg-zinc-200 text-zinc-600' : 'bg-zinc-100 text-zinc-600'}`}>
                                                    {date}
                                                </span>
                                                {isToday && <span className="text-[9px] font-black text-blue-600 uppercase">• 今天</span>}
                                                {dayLogs.length > 0 && (
                                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-200 flex items-center gap-1">
                                                        <FileText size={8} /> 日誌 {dayLogs.length}
                                                    </span>
                                                )}
                                                {dayTasks.length > 0 && dayLogs.length === 0 && isPast && (
                                                    <span className="text-[8px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-sm border border-red-200">缺日誌</span>
                                                )}
                                            </div>

                                            {/* Schedule tasks */}
                                            {dayTasks.map((task, idx) => (
                                                <div key={`t-${idx}`} className="flex items-start gap-3 ml-2 mb-1">
                                                    <div className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 ${task.isCompleted ? 'bg-emerald-500 border-emerald-500' : isPast ? 'border-red-400 bg-red-50' : 'border-zinc-300'}`}>
                                                        {task.isCompleted && <CheckCircle2 size={10} className="text-white" />}
                                                    </div>
                                                    <div className={task.isCompleted ? 'opacity-40 line-through' : ''}>
                                                        <div className="text-sm font-bold text-zinc-950">{task.taskName}</div>
                                                        <div className="text-[10px] text-zinc-400 uppercase font-black">@{task.zoneName}</div>
                                                    </div>
                                                    {task.isCompleted && <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-sm ml-auto">已完成</span>}
                                                </div>
                                            ))}

                                            {/* Log entries */}
                                            {dayLogs.map((log, idx) => (
                                                <div key={`l-${idx}`} className={`ml-2 p-2 rounded-sm border text-sm ${log.isNoWorkDay ? 'bg-amber-50 border-amber-200' : 'bg-zinc-50 border-zinc-100'} ${idx === 0 && dayTasks.length > 0 ? 'mt-2' : ''}`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-zinc-400 flex items-center gap-1">{weatherIcon(log.weather)}</span>
                                                        <span className="font-bold text-zinc-800 text-xs">{log.action}</span>
                                                        {log.isNoWorkDay && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1 rounded-sm">順延 +{log.delayDays}</span>}
                                                        {log.startTime && log.endTime && (
                                                            <span className="text-[8px] text-zinc-400 ml-auto flex items-center gap-1"><Clock size={8} /> {log.startTime}-{log.endTime}</span>
                                                        )}
                                                    </div>
                                                    {log.description && <p className="text-[10px] text-zinc-500 mt-1">{log.description}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </Card>

                <div className="space-y-4">
                    {/* Progress Overview */}
                    <Card title="進度概況 / STATUS">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-50 pb-3">
                                <span className="text-[10px] font-black text-zinc-400 uppercase">
                                    {totalTasks > 0 ? '排程進度 / SCHEDULE' : '施工紀錄 / LOG RECORDS'}
                                </span>
                                <div className="flex items-center gap-2">
                                    {totalTasks > 0 ? (
                                        <span className="text-2xl font-black text-zinc-950">{completedTasks}/{totalTasks}</span>
                                    ) : (
                                        <span className="text-2xl font-black text-zinc-950">{loggedDays}<span className="text-sm text-zinc-400 ml-1">天</span></span>
                                    )}
                                </div>
                            </div>
                            {totalTasks > 0 && (
                                <div className="w-full bg-zinc-100 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(completedTasks / totalTasks) * 100}%` }} />
                                </div>
                            )}
                            <div className="flex justify-between items-center border-b border-zinc-50 pb-3">
                                <span className="text-[10px] font-black text-zinc-400 uppercase">累計順延 / DELAY</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-black ${totalDelay > 0 ? 'text-amber-600' : 'text-zinc-950'}`}>{totalDelay}</span>
                                    <span className="text-[10px] font-black text-zinc-300 uppercase">DAYS</span>
                                </div>
                            </div>
                            {totalDelay > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-sm flex gap-3 items-start">
                                    <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                                    <p className="text-[10px] font-bold text-amber-800 leading-tight uppercase">
                                        工程進度已發生順延，排程已根據日誌紀錄自動調整日期。
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Selected date detail */}
                    {selectedDate && (
                        <Card title={`${selectedDate} 詳情`}>
                            <div className="space-y-3">

                                {/* Logs for this day */}
                                {(logsByDate[selectedDate] || []).length > 0 && (
                                    <div>
                                        <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <FileText size={10} /> 施工日誌
                                        </div>
                                        {logsByDate[selectedDate].map((log, idx) => (
                                            <div key={idx} className={`p-2 rounded-sm border mb-2 last:mb-0 ${log.isNoWorkDay ? 'bg-amber-50 border-amber-200' : 'bg-zinc-50 border-zinc-100'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="flex items-center gap-1 text-[9px] text-zinc-400">{weatherIcon(log.weather)}</div>
                                                    <span className="text-xs font-black text-zinc-800">{log.action}</span>
                                                    {log.isNoWorkDay && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1 rounded-sm">順延</span>}
                                                </div>
                                                {log.description && <p className="text-[10px] text-zinc-500 leading-relaxed">{log.description}</p>}
                                                {log.startTime && log.endTime && (
                                                    <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-400">
                                                        <Clock size={9} /> {log.startTime} - {log.endTime}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Empty state */}
                                {!(tasksByDate[selectedDate] || []).length && !(logsByDate[selectedDate] || []).length && (
                                    <div className="text-zinc-300 text-xs italic text-center py-4">無排程與日誌 / NO DATA</div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
