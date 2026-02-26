import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    X, Plus, Save, History, Play, Pause, SkipForward, Square, CheckCircle2,
    CloudRain, Cloud, Sun, Edit3, Trash2, Clock, Coffee, Package,
    ChevronDown, ChevronRight, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ScheduleTask, ConstructionLog } from '../../types';
import { Button, Card, Input, Select, ImageUploader } from '../InputComponents';
import { STANDARD_LOG_ACTIONS } from '../../constants';

// Helper Components
const PunchButton = ({ label, subLabel, icon, active, onClick }: { label: string, subLabel: string, icon: React.ReactNode, active: boolean, onClick: () => void }) => {
    const iconClasses = "w-8 h-8 md:w-[18px] md:h-[18px]";
    const iconElement = React.cloneElement(icon as React.ReactElement, { className: iconClasses });
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center rounded-sm border-2 transition-all active:scale-95
                py-8 px-4 md:py-4 md:px-2
                ${active
                    ? 'bg-zinc-950 border-zinc-950 text-white shadow-lg'
                    : 'bg-white border-zinc-100 text-zinc-300 hover:border-zinc-950 hover:text-zinc-950'
                }`}
        >
            <div className="mb-3 md:mb-1.5">
                {active ? <CheckCircle2 className={iconClasses} /> : iconElement}
            </div>
            <span className="font-black leading-none text-base md:text-[11px]">{label}</span>
            <span className="font-black tracking-widest opacity-40 uppercase text-[10px] md:text-[7px] mt-2 md:mt-1">{subLabel}</span>
        </button>
    );
};

const PhotoGroup = ({ label, photos }: { label: string, photos: string[] }) => (
    <div className="space-y-2">
        <div className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">{label}</div>
        <div className="grid grid-cols-3 gap-2">
            {photos?.map((p, idx) => <img key={idx} src={p} className="aspect-square object-cover rounded-sm border border-zinc-100 shadow-sm" />)}
            {(!photos || photos.length === 0) && <div className="aspect-square bg-zinc-50 border border-dotted border-zinc-200 rounded-sm flex items-center justify-center text-[7px] text-zinc-300 font-black">無照片</div>}
        </div>
    </div>
);

// Inline edit form component
const LogEditForm: React.FC<{
    logForm: Partial<ConstructionLog>;
    setLogForm: (form: Partial<ConstructionLog>) => void;
    isBreakActive: boolean;
    onSave: () => void;
    onCancel: () => void;
    getCurrentTime: () => string;
    handleBreakStart: () => void;
    handleBreakEnd: () => void;
}> = ({ logForm, setLogForm, isBreakActive, onSave, onCancel, getCurrentTime, handleBreakStart, handleBreakEnd }) => {

    const addMaterial = () => {
        const current = logForm.materialsUsed || [];
        setLogForm({ ...logForm, materialsUsed: [...current, { brand: '', name: '' }] });
    };
    const updateMaterial = (index: number, field: 'brand' | 'name', value: string) => {
        const current = [...(logForm.materialsUsed || [])];
        current[index] = { ...current[index], [field]: value };
        setLogForm({ ...logForm, materialsUsed: current });
    };
    const removeMaterial = (index: number) => {
        const current = [...(logForm.materialsUsed || [])];
        current.splice(index, 1);
        setLogForm({ ...logForm, materialsUsed: current });
    };

    return (
        <Card className="border-2 border-zinc-950 shadow-2xl">
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-50 pb-4">
                    <span className="text-lg font-black uppercase">現場打卡錄入 / SITE PUNCH-IN</span>
                    <button onClick={onCancel} className="text-zinc-300 hover:text-zinc-950"><X size={24} /></button>
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-sm border border-amber-200">
                    <input type="checkbox" id="isNoWorkDay" className="w-5 h-5 accent-zinc-950 cursor-pointer"
                        checked={logForm.isNoWorkDay || false}
                        onChange={e => setLogForm({ ...logForm, isNoWorkDay: e.target.checked, action: e.target.checked ? '工期順延 (當日不施工)' : STANDARD_LOG_ACTIONS[0], delayDays: e.target.checked ? 1 : 0 })}
                    />
                    <label htmlFor="isNoWorkDay" className="text-sm font-black text-amber-900 uppercase cursor-pointer">今日不施工 / SKIP WORK TODAY</label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="紀錄日期 / DATE" type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} />
                    <Select label="天氣 / WEATHER" value={logForm.weather} onChange={e => setLogForm({ ...logForm, weather: e.target.value })}>
                        <option value="晴天">晴天</option>
                        <option value="多雲">多雲</option>
                        <option value="陰天">陰天</option>
                        <option value="雨天">雨天</option>
                    </Select>
                    {logForm.isNoWorkDay ? (
                        <div className="bg-amber-100 p-2 rounded-sm ring-2 ring-amber-200 flex flex-col justify-center">
                            <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest">延期 / DELAY</div>
                            <div className="font-black text-amber-900">自動順延 1 天</div>
                        </div>
                    ) : (
                        <Select label="施作工項 / ACTION" value={logForm.action} onChange={e => setLogForm({ ...logForm, action: e.target.value })}>
                            {STANDARD_LOG_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </Select>
                    )}
                </div>

                {!logForm.isNoWorkDay && (
                    <>
                        <div className="bg-zinc-50 p-4 rounded-sm border border-zinc-100 space-y-3">
                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                                <div className="flex items-center gap-2"><Clock size={12} /> 打卡紀錄</div>
                                {(logForm.breaks?.length || 0) > 0 && <div className="text-zinc-950">休息: {logForm.breaks?.length} 次</div>}
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <PunchButton label="開始" subLabel="START" icon={<Play />} active={!!logForm.startTime} onClick={() => setLogForm({ ...logForm, startTime: getCurrentTime() })} />
                                <PunchButton label="休息" subLabel="BREAK" icon={<Pause />} active={isBreakActive} onClick={handleBreakStart} />
                                <PunchButton label="復工" subLabel="RESUME" icon={<SkipForward />} active={logForm.breaks?.length > 0 && !isBreakActive} onClick={handleBreakEnd} />
                                <PunchButton label="完工" subLabel="FINISH" icon={<Square />} active={!!logForm.endTime} onClick={() => setLogForm({ ...logForm, endTime: getCurrentTime() })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">施工前 / BEFORE</label>
                                <ImageUploader images={logForm.beforePhotos || []} onImagesChange={imgs => setLogForm({ ...logForm, beforePhotos: imgs })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">施工後 / AFTER</label>
                                <ImageUploader images={logForm.afterPhotos || []} onImagesChange={imgs => setLogForm({ ...logForm, afterPhotos: imgs })} />
                            </div>
                        </div>

                        {/* 今日使用材料 */}
                        <div className="bg-zinc-50 p-4 rounded-sm border border-zinc-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Package size={12} /> 今日使用材料
                                </div>
                                <button onClick={addMaterial} className="flex items-center gap-1 text-[10px] font-black text-zinc-600 hover:text-zinc-950 bg-white border border-zinc-200 rounded-sm px-2 py-1 transition-colors">
                                    <Plus size={12} /> 新增
                                </button>
                            </div>
                            {(logForm.materialsUsed || []).length === 0 && (
                                <div className="text-[10px] text-zinc-300 italic py-1">尚未新增材料</div>
                            )}
                            {(logForm.materialsUsed || []).map((mat, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white rounded-sm border border-zinc-200 p-2">
                                    <input type="text" placeholder="品牌" className="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-zinc-300" value={mat.brand} onChange={e => updateMaterial(idx, 'brand', e.target.value)} />
                                    <div className="w-px h-6 bg-zinc-200" />
                                    <input type="text" placeholder="材料名稱" className="flex-[2] bg-transparent border-none outline-none text-sm font-bold placeholder:text-zinc-300" value={mat.name} onChange={e => updateMaterial(idx, 'name', e.target.value)} />
                                    <button onClick={() => removeMaterial(idx)} className="text-zinc-300 hover:text-red-500 p-1 shrink-0"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <Input label="備註 / NOTES" placeholder={logForm.isNoWorkDay ? "順延原因..." : "施作細節..."} value={logForm.description} onChange={e => setLogForm({ ...logForm, description: e.target.value })} />

                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 py-3" onClick={onCancel}>取消</Button>
                    <Button className="flex-1 py-3" onClick={onSave}><Save size={16} /> 儲存</Button>
                </div>
            </div>
        </Card>
    );
};

// Compact collapsible log entry
const LogEntry: React.FC<{
    log: ConstructionLog;
    isExpanded: boolean;
    isEditing: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    editForm?: React.ReactNode;
}> = ({ log, isExpanded, isEditing, onToggle, onEdit, onDelete, editForm }) => {
    const weatherIcon = log.weather === '雨天' ? <CloudRain size={12} /> : log.weather === '陰天' ? <Cloud size={12} /> : log.weather === '多雲' ? <Cloud size={12} /> : <Sun size={12} />;
    const hasPhotos = (log.beforePhotos?.length || 0) + (log.afterPhotos?.length || 0) > 0;
    const hasMaterials = (log.materialsUsed?.length || 0) > 0;

    if (isEditing) {
        return <>{editForm}</>;
    }

    return (
        <div className={`bg-white border rounded-sm transition-all ${log.isNoWorkDay ? 'border-amber-200 bg-amber-50/20' : 'border-zinc-100'} hover:border-zinc-300`}>
            {/* Compact header - always visible */}
            <div
                className="flex items-center gap-3 p-3 md:p-4 cursor-pointer select-none"
                onClick={onToggle}
            >
                <div className="text-zinc-300 shrink-0">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                <span className="text-[10px] md:text-xs font-black bg-zinc-950 text-white px-2 py-0.5 rounded-sm shrink-0">{log.date}</span>

                <div className="flex items-center gap-1 text-[9px] text-zinc-400 shrink-0">{weatherIcon}</div>

                {log.isNoWorkDay ? (
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 border border-amber-200 rounded-sm shrink-0">
                        順延 +{log.delayDays}
                    </span>
                ) : (
                    <>
                        <span className="text-sm font-black text-zinc-800 truncate">{log.action}</span>

                        {/* Quick status badges */}
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                            {log.startTime && log.endTime && (
                                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-200">
                                    {log.startTime}-{log.endTime}
                                </span>
                            )}
                            {hasPhotos && (
                                <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-200">
                                    照片 {(log.beforePhotos?.length || 0) + (log.afterPhotos?.length || 0)}
                                </span>
                            )}
                            {hasMaterials && (
                                <span className="text-[8px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-sm border border-violet-200">
                                    材料 {log.materialsUsed?.length}
                                </span>
                            )}
                        </div>
                    </>
                )}

                {/* Action buttons */}
                <div className="flex gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <button onClick={onEdit} className="text-zinc-300 hover:text-zinc-950 p-1"><Edit3 size={15} /></button>
                    <button onClick={onDelete} className="text-zinc-200 hover:text-red-500 p-1"><Trash2 size={15} /></button>
                </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
                <div className="border-t border-zinc-100 p-4 md:p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {log.description && (
                        <p className="text-[11px] md:text-sm text-zinc-500 leading-relaxed">{log.description}</p>
                    )}

                    {/* Time details */}
                    {!log.isNoWorkDay && (log.startTime || log.endTime) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {log.startTime && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 bg-zinc-50 px-2 py-0.5 border border-zinc-100 rounded-sm">
                                    <Play size={10} className="text-zinc-400" /> {log.startTime}
                                </div>
                            )}
                            {log.breaks?.map((b, bIdx) => (
                                <div key={bIdx} className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 bg-zinc-50 px-2 py-0.5 border border-zinc-100 rounded-sm">
                                    <Coffee size={10} /> {b.start} - {b.end || '??'}
                                </div>
                            ))}
                            {log.endTime && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 bg-zinc-50 px-2 py-0.5 border border-zinc-100 rounded-sm">
                                    <Square size={10} className="text-zinc-400" /> {log.endTime}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Materials used */}
                    {hasMaterials && (
                        <div className="bg-zinc-50 p-3 rounded-sm border border-zinc-100">
                            <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Package size={10} /> 今日使用材料
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {log.materialsUsed!.map((mat, idx) => (
                                    <span key={idx} className="text-[10px] font-bold text-zinc-700 bg-white border border-zinc-200 px-2 py-0.5 rounded-sm">
                                        {mat.brand ? `${mat.brand} - ` : ''}{mat.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Photos */}
                    {!log.isNoWorkDay && hasPhotos && (
                        <div className="grid grid-cols-2 gap-4">
                            <PhotoGroup label="施工前 / BEFORE" photos={log.beforePhotos} />
                            <PhotoGroup label="施工後 / AFTER" photos={log.afterPhotos} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ConstructionLogTab: React.FC<{
    schedule: ScheduleTask[];
    logs: ConstructionLog[];
    onUpdate: (logs: ConstructionLog[], updatedSchedule?: ScheduleTask[]) => void
}> = ({ schedule, logs, onUpdate }) => {
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [logForm, setLogForm] = useState<Partial<ConstructionLog>>({});
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const editRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editingLogId && editRef.current) {
            setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }, [editingLogId]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAll = () => setExpandedIds(new Set(logs.map(l => l.id)));
    const collapseAll = () => setExpandedIds(new Set());

    const startEdit = (log: ConstructionLog) => {
        setEditingLogId(log.id);
        setLogForm({ ...log, breaks: log.breaks || [], materialsUsed: log.materialsUsed || [] });
    };

    const startNew = () => {
        const id = `LOG-${Date.now()}`;
        setEditingLogId(id);
        setLogForm({
            id, date: new Date().toISOString().slice(0, 10), weather: '晴天',
            action: STANDARD_LOG_ACTIONS[0], description: '', beforePhotos: [], afterPhotos: [],
            startTime: '', breaks: [], endTime: '', delayDays: 0, isNoWorkDay: false, materialsUsed: []
        });
    };

    const getCurrentTime = () => new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const handleBreakStart = () => {
        const currentBreaks = [...(logForm.breaks || [])];
        currentBreaks.push({ start: getCurrentTime() });
        setLogForm({ ...logForm, breaks: currentBreaks });
    };

    const handleBreakEnd = () => {
        const currentBreaks = [...(logForm.breaks || [])];
        if (currentBreaks.length > 0) {
            const lastBreak = { ...currentBreaks[currentBreaks.length - 1] };
            if (!lastBreak.end) {
                lastBreak.end = getCurrentTime();
                currentBreaks[currentBreaks.length - 1] = lastBreak;
                setLogForm({ ...logForm, breaks: currentBreaks });
            }
        }
    };

    const handleSave = () => {
        if (!logForm.id) return;
        const delay = Number(logForm.delayDays) || 0;
        const finalLog = logForm as ConstructionLog;
        const exists = logs.find(l => l.id === finalLog.id);
        let newLogs = exists
            ? logs.map(l => l.id === finalLog.id ? finalLog : l)
            : [finalLog, ...logs];

        let updatedSchedule = undefined;
        if (delay > 0) {
            updatedSchedule = schedule.map(task => {
                if (task.date >= finalLog.date && !task.isCompleted) {
                    const d = new Date(task.date);
                    d.setDate(d.getDate() + delay);
                    return { ...task, date: d.toISOString().slice(0, 10) };
                }
                return task;
            });
        } else {
            const hasPendingTasks = schedule.some(t => t.date === finalLog.date && !t.isCompleted);
            if (hasPendingTasks) {
                updatedSchedule = schedule.map(task => task.date === finalLog.date ? { ...task, isCompleted: true } : task);
            }
        }

        onUpdate(newLogs.sort((a, b) => b.date.localeCompare(a.date)), updatedSchedule);
        setEditingLogId(null);
    };

    const autoSyncFromSchedule = () => {
        const today = new Date().toISOString().slice(0, 10);
        const pendingTasks = schedule.filter(task => {
            const isPastOrToday = task.date <= today;
            const alreadyLogged = logs.some(l => l.date === task.date && l.action.includes(task.taskName));
            return isPastOrToday && !alreadyLogged;
        });
        if (pendingTasks.length === 0) {
            toast('所有排程皆已同步', { icon: 'ℹ️' });
            return;
        }
        const autoLogs: ConstructionLog[] = pendingTasks.map(task => ({
            id: `LOG-AUTO-${Date.now()}-${Math.random()}`, date: task.date, weather: '晴天',
            action: `${task.taskName} / ${task.zoneName}`, description: `[系統自動生成] 請點擊編輯。`,
            beforePhotos: [], afterPhotos: [], startTime: '', breaks: [], endTime: '',
            delayDays: 0, isNoWorkDay: false, materialsUsed: []
        }));
        onUpdate([...autoLogs, ...logs].sort((a, b) => b.date.localeCompare(a.date)));
        toast.success(`同步 ${autoLogs.length} 筆日誌`);
    };

    const isBreakActive = useMemo(() => {
        const breaks = logForm.breaks || [];
        return breaks.length > 0 && !breaks[breaks.length - 1].end;
    }, [logForm.breaks]);

    const isNewEntry = editingLogId && !logs.find(l => l.id === editingLogId);

    // Get unique months for quick filter
    const months = useMemo(() => {
        const set = new Set(logs.map(l => l.date.slice(0, 7)));
        return Array.from(set).sort().reverse();
    }, [logs]);

    // Filter logs
    const filteredLogs = useMemo(() => {
        if (filterMonth === 'all') return logs;
        return logs.filter(l => l.date.startsWith(filterMonth));
    }, [logs, filterMonth]);

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-2">
                <div>
                    <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5 leading-none">Field Management</h2>
                    <div className="text-xl md:text-2xl font-black text-zinc-950 tracking-tighter uppercase leading-none">施工日誌 / DAILY LOG</div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={autoSyncFromSchedule} className="border-zinc-950"><History size={16} /> 同步</Button>
                    {!editingLogId && <Button onClick={startNew}><Plus size={16} /> 新增紀錄</Button>}
                </div>
            </div>

            {/* Quick filter bar */}
            {logs.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-zinc-50 p-2 rounded-sm border border-zinc-100">
                    <Filter size={14} className="text-zinc-400 shrink-0" />

                    <button
                        onClick={() => setFilterMonth('all')}
                        className={`text-[10px] font-black px-2.5 py-1 rounded-sm border transition-all ${filterMonth === 'all' ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}
                    >
                        全部 ({logs.length})
                    </button>

                    {months.map(m => {
                        const count = logs.filter(l => l.date.startsWith(m)).length;
                        const [y, mo] = m.split('-');
                        return (
                            <button
                                key={m}
                                onClick={() => setFilterMonth(m)}
                                className={`text-[10px] font-black px-2.5 py-1 rounded-sm border transition-all ${filterMonth === m ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}
                            >
                                {y}/{mo} ({count})
                            </button>
                        );
                    })}

                    <div className="ml-auto flex gap-1">
                        <button onClick={expandAll} className="text-[9px] font-black text-zinc-400 hover:text-zinc-950 px-2 py-1">全展開</button>
                        <button onClick={collapseAll} className="text-[9px] font-black text-zinc-400 hover:text-zinc-950 px-2 py-1">全收合</button>
                    </div>
                </div>
            )}

            {/* New entry form */}
            {isNewEntry && (
                <div ref={editRef}>
                    <LogEditForm
                        logForm={logForm} setLogForm={setLogForm} isBreakActive={isBreakActive}
                        onSave={handleSave} onCancel={() => setEditingLogId(null)}
                        getCurrentTime={getCurrentTime} handleBreakStart={handleBreakStart} handleBreakEnd={handleBreakEnd}
                    />
                </div>
            )}

            {/* Log entries */}
            <div className="space-y-2">
                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                    <div key={log.id} ref={editingLogId === log.id ? editRef : undefined}>
                        <LogEntry
                            log={log}
                            isExpanded={expandedIds.has(log.id)}
                            isEditing={editingLogId === log.id}
                            onToggle={() => toggleExpand(log.id)}
                            onEdit={() => startEdit(log)}
                            onDelete={() => onUpdate(logs.filter(l => l.id !== log.id))}
                            editForm={
                                <LogEditForm
                                    logForm={logForm} setLogForm={setLogForm} isBreakActive={isBreakActive}
                                    onSave={handleSave} onCancel={() => setEditingLogId(null)}
                                    getCurrentTime={getCurrentTime} handleBreakStart={handleBreakStart} handleBreakEnd={handleBreakEnd}
                                />
                            }
                        />
                    </div>
                )) : (
                    <div className="py-16 text-center text-zinc-200 font-black tracking-widest uppercase text-[10px] italic">
                        {logs.length === 0 ? '目前尚無紀錄 / NO RECORDS' : '此月份無紀錄'}
                    </div>
                )}
            </div>
        </div>
    );
};
