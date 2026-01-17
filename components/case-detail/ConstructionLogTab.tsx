import React, { useState, useMemo } from 'react';
import {
    X, Plus, Save, History, Play, Pause, SkipForward, Square, CheckCircle2,
    CloudRain, Cloud, Sun, Edit3, Trash2, Clock, Coffee
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ScheduleTask, ConstructionLog } from '../../types';
import { Button, Card, Input, Select, ImageUploader } from '../InputComponents';
import { STANDARD_LOG_ACTIONS } from '../../constants';

// Helper Components
const PunchButton = ({ label, subLabel, icon, active, onClick }: { label: string, subLabel: string, icon: React.ReactNode, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center py-4 px-2 rounded-sm border-2 transition-all active:scale-95 ${active ? 'bg-zinc-950 border-zinc-950 text-white shadow-lg' : 'bg-white border-zinc-100 text-zinc-300 hover:border-zinc-950 hover:text-zinc-950'}`}
    >
        <div className="mb-1.5">{active ? <CheckCircle2 size={18} /> : icon}</div>
        <span className="text-[11px] font-black leading-none">{label}</span>
        <span className="text-[7px] font-black tracking-widest opacity-40 mt-1 uppercase">{subLabel}</span>
    </button>
);

const PhotoGroup = ({ label, photos }: { label: string, photos: string[] }) => (
    <div className="space-y-2">
        <div className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">{label}</div>
        <div className="grid grid-cols-3 gap-2">
            {photos?.map((p, idx) => <img key={idx} src={p} className="aspect-square object-cover rounded-sm border border-zinc-100 shadow-sm" />)}
            {(!photos || photos.length === 0) && <div className="aspect-square bg-zinc-50 border border-dotted border-zinc-200 rounded-sm flex items-center justify-center text-[7px] text-zinc-300 font-black">無照片</div>}
        </div>
    </div>
);

export const ConstructionLogTab: React.FC<{
    schedule: ScheduleTask[];
    logs: ConstructionLog[];
    onUpdate: (logs: ConstructionLog[], updatedSchedule?: ScheduleTask[]) => void
}> = ({ schedule, logs, onUpdate }) => {
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [logForm, setLogForm] = useState<Partial<ConstructionLog>>({});

    const startEdit = (log: ConstructionLog) => {
        setEditingLogId(log.id);
        setLogForm({ ...log, breaks: log.breaks || [] });
    };

    const startNew = () => {
        const id = `LOG-${Date.now()}`;
        const newLog: Partial<ConstructionLog> = {
            id,
            date: new Date().toISOString().slice(0, 10),
            weather: '晴天',
            action: STANDARD_LOG_ACTIONS[0],
            description: '',
            beforePhotos: [],
            afterPhotos: [],
            startTime: '',
            breaks: [],
            endTime: '',
            delayDays: 0,
            isNoWorkDay: false
        };
        setEditingLogId(id);
        setLogForm(newLog);
    };

    const getCurrentTime = () => {
        return new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });
    };

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

        // 更新日誌清單
        const exists = logs.find(l => l.id === finalLog.id);
        let newLogs = exists
            ? logs.map(l => l.id === finalLog.id ? finalLog : l)
            : [finalLog, ...logs];

        // 若有延期，更新排程 (順延)；若無延期，則視為當日任務完成
        let updatedSchedule = undefined;

        if (delay > 0) {
            // 延期：將「當日及之後」且「未完成」的任務往後推移
            updatedSchedule = schedule.map(task => {
                if (task.date >= finalLog.date && !task.isCompleted) {
                    const d = new Date(task.date);
                    d.setDate(d.getDate() + delay);
                    return { ...task, date: d.toISOString().slice(0, 10) };
                }
                return task;
            });
        } else {
            // 正常施工：將「當日」的任務標記為完成
            const hasPendingTasks = schedule.some(t => t.date === finalLog.date && !t.isCompleted);
            if (hasPendingTasks) {
                updatedSchedule = schedule.map(task => {
                    if (task.date === finalLog.date) {
                        return { ...task, isCompleted: true };
                    }
                    return task;
                });
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
            toast('目前所有排程皆已同步或尚無應施工項', {
                icon: 'ℹ️',
            });
            return;
        }

        const autoLogs: ConstructionLog[] = pendingTasks.map(task => ({
            id: `LOG-AUTO-${Date.now()}-${Math.random()}`,
            date: task.date,
            weather: '晴天',
            action: `${task.taskName} / ${task.zoneName}`,
            description: `[系統自動生成] 請點擊編輯紀錄現場打卡。`,
            beforePhotos: [],
            afterPhotos: [],
            startTime: '',
            breaks: [],
            endTime: '',
            delayDays: 0,
            isNoWorkDay: false
        }));

        onUpdate([...autoLogs, ...logs].sort((a, b) => b.date.localeCompare(a.date)));
        toast.success(`成功同步 ${autoLogs.length} 筆待紀錄日誌`, {
            icon: '✅',
        });
    };

    // 休息按鈕狀態判斷
    const isBreakActive = useMemo(() => {
        const breaks = logForm.breaks || [];
        return breaks.length > 0 && !breaks[breaks.length - 1].end;
    }, [logForm.breaks]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5 leading-none">Field Management</h2>
                    <div className="text-xl md:text-2xl font-black text-zinc-950 tracking-tighter uppercase leading-none">施工日誌 / DAILY LOG</div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={autoSyncFromSchedule} className="border-zinc-950"><History size={16} /> 同步進度 / SYNC</Button>
                    {!editingLogId && <Button onClick={startNew}><Plus size={16} /> 手動紀錄 / NEW</Button>}
                </div>
            </div>

            {editingLogId && (
                <Card className="border-2 border-zinc-950 animate-in slide-in-from-top duration-300 shadow-2xl">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-zinc-50 pb-4">
                            <span className="text-lg font-black uppercase">現場打卡錄入 / SITE PUNCH-IN</span>
                            <button onClick={() => setEditingLogId(null)} className="text-zinc-300 hover:text-zinc-950"><X size={24} /></button>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-sm border border-amber-200">
                            <input
                                type="checkbox"
                                id="isNoWorkDay"
                                className="w-5 h-5 accent-zinc-950 cursor-pointer"
                                checked={logForm.isNoWorkDay || false}
                                onChange={e => setLogForm({ ...logForm, isNoWorkDay: e.target.checked, action: e.target.checked ? '工期順延 (當日不施工)' : STANDARD_LOG_ACTIONS[0], delayDays: e.target.checked ? 1 : 0 })}
                            />
                            <label htmlFor="isNoWorkDay" className="text-sm font-black text-amber-900 uppercase cursor-pointer">今日不施工 (僅紀錄工期順延) / SKIP WORK TODAY</label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="紀錄日期 / DATE" type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} />
                            <Select label="現場天氣 / WEATHER" value={logForm.weather} onChange={e => setLogForm({ ...logForm, weather: e.target.value })}>
                                <option value="晴天">晴天 / SUNNY</option>
                                <option value="多雲">多雲 / CLOUDY</option>
                                <option value="陰天">陰天 / OVERCAST</option>
                                <option value="雨天">雨天 / RAINY</option>
                            </Select>
                            {logForm.isNoWorkDay ? (
                                <div className="bg-amber-100 p-2 rounded-sm ring-2 ring-amber-200 flex flex-col justify-center">
                                    <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest">延期天數 / DELAY</div>
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
                                <div className="bg-zinc-50 p-6 rounded-sm border border-zinc-100 space-y-4">
                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                                        <div className="flex items-center gap-2"><Clock size={12} /> 按下按鈕完成打卡 (儲存後顯示具體時間)</div>
                                        {(logForm.breaks?.length || 0) > 0 && <div className="text-zinc-950">今日休息紀錄: {logForm.breaks?.length} 次</div>}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <PunchButton
                                            label="開始施工"
                                            subLabel="START"
                                            icon={<Play size={18} />}
                                            active={!!logForm.startTime}
                                            onClick={() => setLogForm({ ...logForm, startTime: getCurrentTime() })}
                                        />
                                        <PunchButton
                                            label="休息開始"
                                            subLabel="BREAK-S"
                                            icon={<Pause size={18} />}
                                            active={isBreakActive}
                                            onClick={handleBreakStart}
                                        />
                                        <PunchButton
                                            label="休息結束"
                                            subLabel="BREAK-E"
                                            icon={<SkipForward size={18} />}
                                            active={logForm.breaks?.length > 0 && !isBreakActive}
                                            onClick={handleBreakEnd}
                                        />
                                        <PunchButton
                                            label="完工結束"
                                            subLabel="FINISH"
                                            icon={<Square size={18} />}
                                            active={!!logForm.endTime}
                                            onClick={() => setLogForm({ ...logForm, endTime: getCurrentTime() })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">施工前拍照 / BEFORE</label>
                                        <ImageUploader images={logForm.beforePhotos || []} onImagesChange={imgs => setLogForm({ ...logForm, beforePhotos: imgs })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">施工後拍照 / AFTER</label>
                                        <ImageUploader images={logForm.afterPhotos || []} onImagesChange={imgs => setLogForm({ ...logForm, afterPhotos: imgs })} />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 gap-4 items-end">
                            <Input
                                label="情況描述 / NOTES"
                                placeholder={logForm.isNoWorkDay ? "請在此輸入順延原因..." : "今日施作細節..."}
                                value={logForm.description}
                                onChange={e => setLogForm({ ...logForm, description: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" className="flex-1 py-4" onClick={() => setEditingLogId(null)}>放棄修改 / CANCEL</Button>
                            <Button className="flex-1 py-4" onClick={handleSave}><Save size={18} /> 儲存日誌內容 / SAVE</Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="relative pl-4 md:pl-8 border-l-2 border-zinc-100 space-y-8">
                {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} className="relative group">
                        <div className="absolute -left-[25px] md:-left-[41px] top-0 w-4 h-4 md:w-6 md:h-6 bg-white border-2 border-zinc-950 rounded-full flex items-center justify-center z-10">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-zinc-950 rounded-full"></div>
                        </div>
                        <div className={`bg-white border p-4 md:p-6 rounded-sm shadow-sm transition-all ${log.isNoWorkDay ? 'border-amber-200 bg-amber-50/20' : 'border-zinc-100'} hover:border-zinc-300`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[10px] md:text-sm font-black bg-zinc-950 text-white px-2 py-0.5 rounded-sm">{log.date}</span>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase">
                                        {log.weather === '雨天' ? <CloudRain size={12} /> : log.weather === '陰天' ? <Cloud size={12} /> : <Sun size={12} />} {log.weather}
                                    </div>
                                    {log.isNoWorkDay ? (
                                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 border border-amber-200 rounded-sm">
                                            工期順延 (當日不施工) +{log.delayDays}
                                        </span>
                                    ) : (
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
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startEdit(log)} className="text-zinc-300 hover:text-zinc-950 p-1"><Edit3 size={18} /></button>
                                    <button onClick={() => onUpdate(logs.filter(l => l.id !== log.id))} className="text-zinc-100 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm md:text-lg font-black text-zinc-950 mb-1">{log.action}</div>
                                <p className="text-[11px] md:text-sm text-zinc-500 leading-relaxed">{log.description}</p>
                            </div>

                            {!log.isNoWorkDay && (
                                <div className="grid grid-cols-2 gap-4">
                                    <PhotoGroup label="施工前 / BEFORE" photos={log.beforePhotos} />
                                    <PhotoGroup label="施工後 / AFTER" photos={log.afterPhotos} />
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center text-zinc-200 font-black tracking-widest uppercase text-[10px] italic">目前尚無紀錄 / NO RECORDS</div>
                )}
            </div>
        </div>
    );
};
