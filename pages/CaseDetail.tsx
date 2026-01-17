
import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2, Plus, Calculator, FileCheck, Edit3,
  Layers, Calendar as CalendarIcon, Save,
  Wand2, CheckCircle2, ChevronLeft, ChevronRight, MapPin, X, ChevronDown, ChevronUp,
  Clock, Info, FileText, Camera, CloudRain, Sun, Cloud, History, FastForward, Coffee, AlertTriangle, Play, Square, Pause, SkipForward, ShieldCheck, Eye
} from 'lucide-react';
import { CaseData, Zone, ScheduleTask, MethodItem, ServiceCategory, ConstructionLog, BreakPeriod, CaseStatus, STATUS_LABELS, MethodRecipe } from '../types';
import { getMethods, saveCase, getRecipes, getMaterials } from '../services/storageService';
import { generateContractPDF, generateEvaluationPDF, generateInvoicePDF } from '../services/pdfService';
import { Button, Card, Input, ImageUploader, Select } from '../components/InputComponents';
import { Layout } from '../components/Layout';
import { STANDARD_LOG_ACTIONS } from '../constants';

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 py-3 px-2 flex flex-col items-center border-b-2 transition-all relative ${active ? 'border-zinc-950 text-zinc-950 bg-white' : 'border-transparent text-zinc-300'}`}>
    <div className={`transition-transform mb-1 ${active ? 'scale-110' : 'scale-90 opacity-40'}`}>{icon}</div>
    <div className="flex flex-col leading-none">
      <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">{label.split(' / ')[0]}</span>
      <span className="text-[6px] font-black uppercase opacity-40 tracking-widest mt-0.5">{label.split(' / ')[1]}</span>
    </div>
    {active && <div className="absolute top-0 left-0 w-full h-0.5 bg-zinc-950"></div>}
  </button>
);

// --- 施工日誌分頁 / CONSTRUCTION LOG TAB ---

const ExportButton: React.FC<{ onClick: () => Promise<void>; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onClick();
    } catch (e) {
      alert("Export Failed: " + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className={`h-16 border-zinc-200 ${loading ? 'opacity-50 cursor-wait' : ''}`}
    >
      {loading ? <div className="animate-spin mr-2"><Wand2 size={20} /></div> : <span className="mr-2">{icon}</span>}
      {loading ? 'GENERATING...' : label}
    </Button>
  );
};

const MaterialList: React.FC<{ zones: Zone[] }> = ({ zones }) => {
  const [recipes, setRecipes] = useState<MethodRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getRecipes();
      setRecipes(data);
      setLoading(false);
    };
    load();
  }, []);

  const requirements = useMemo(() => {
    const totals: Record<string, { name: string, unit: string, qty: number, category: string, cost: number }> = {};

    zones.forEach(zone => {
      const zoneRecipes = recipes.filter(r => r.methodId === zone.methodId);
      const zoneArea = zone.items.reduce((sum, item) => sum + (item.areaPing || 0), 0) || 1;

      zoneRecipes.forEach(recipe => {
        const mat = recipe.material;
        if (!mat) return;

        if (!totals[mat.id]) {
          totals[mat.id] = { name: mat.name, unit: mat.unit, qty: 0, category: recipe.category, cost: 0 };
        }

        if (recipe.category === 'fixed') {
          // Fixed items (Tools) are calculated per Project (Max of any usage), not per Zone
          const needed = recipe.quantity || 1;
          if (needed > totals[mat.id].qty) {
            totals[mat.id].qty = needed;
            totals[mat.id].cost = needed * (mat.unitPrice || 0);
          }
        } else {
          // Variable items are summed up based on Area
          const amount = (recipe.consumptionRate || 0) * zoneArea;
          totals[mat.id].qty += amount;
          totals[mat.id].cost += amount * (mat.unitPrice || 0);
        }
      });
    });

    return Object.values(totals).sort((a, b) => a.category === 'fixed' ? 1 : -1);
  }, [zones, recipes]);

  if (loading) return <div className="text-center py-4 text-xs text-zinc-400">Loading materials...</div>;

  if (requirements.length === 0) return (
    <div className="text-center py-8 border border-dashed border-zinc-200 rounded-sm bg-zinc-50">
      <div className="text-zinc-400 text-xs">尚無備料資料 (請確認工法是否對應) / NO DATA</div>
    </div>
  );

  const totalCost = requirements.reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div className="text-xs font-black uppercase text-zinc-400">ESTIMATED MATERIALS / 預估用料</div>
        <div className="text-sm font-black">預估成本: ${Math.round(totalCost).toLocaleString()}</div>
      </div>
      <div className="border border-zinc-100 rounded-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[300px]">
          <thead className="bg-zinc-50 text-[10px] uppercase font-black text-zinc-400">
            <tr>
              <th className="p-3">材料 / NAME</th>
              <th className="p-3">類別 / TYPE</th>
              <th className="p-3 text-right">數量 / QTY</th>
              <th className="p-3 text-right">成本 / COST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {requirements.map((req, idx) => (
              <tr key={idx} className="bg-white hover:bg-zinc-50/50">
                <td className="p-3 font-bold text-zinc-700">{req.name}</td>
                <td className="p-3 text-[10px] uppercase text-zinc-400">{req.category === 'fixed' ? '工具 (TOOL)' : '耗材 (MAT)'}</td>
                <td className="p-3 text-right font-mono text-zinc-600">
                  {req.qty > 0 && req.qty < 1 ? req.qty.toFixed(2) : Math.ceil(req.qty)} <span className="text-[10px] text-zinc-300 ml-1">{req.unit}</span>
                </td>
                <td className="p-3 text-right font-mono text-zinc-400">${Math.round(req.cost).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ConstructionLogTab: React.FC<{
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

    // 若有延期，更新排程
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
      alert("目前所有排程皆已同步或尚無應施工項。");
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
    alert(`成功同步 ${autoLogs.length} 筆待紀錄日誌。`);
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
                onChange={e => setLogForm({ ...logForm, isNoWorkDay: e.target.checked, action: e.target.checked ? '工期順延 (當日不施工)' : STANDARD_LOG_ACTIONS[0] })}
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
                <div className="bg-amber-100 p-2 rounded-sm ring-2 ring-amber-200">
                  <Input label="順延天數 / DELAY DAYS" type="number" value={logForm.delayDays} onChange={e => setLogForm({ ...logForm, delayDays: parseInt(e.target.value) || 0 })} />
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

// --- 輔助小元件 / HELPER COMPONENTS ---

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

// --- 排程管理元件 / SCHEDULE MANAGER ---
const ProjectCalendar: React.FC<{ schedule: ScheduleTask[]; logs: ConstructionLog[] }> = ({ schedule, logs }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border-zinc-950 overflow-hidden shadow-xl" noPadding>
          <div className="bg-zinc-950 text-white p-4 flex justify-between items-center">
            <h3 className="font-black text-lg uppercase tracking-tight">{year} / {month + 1}月</h3>
            <div className="flex gap-2">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-white/10 rounded"><ChevronLeft size={20} /></button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-white/10 rounded"><ChevronRight size={20} /></button>
            </div>
          </div>
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
                <div key={i} onClick={() => setSelectedDate(dateKey)} className={`aspect-square border-b border-r border-zinc-50 p-1 cursor-pointer transition-colors ${selectedDate === dateKey ? 'bg-zinc-100 ring-2 ring-inset ring-zinc-950 z-10' : 'hover:bg-zinc-50'}`}>
                  <span className={`text-[10px] font-black ${isToday ? 'bg-zinc-950 text-white px-1.5 rounded-sm' : 'text-zinc-300'}`}>{i + 1}</span>
                  {dayTasks.length > 0 && <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full mx-auto mt-1"></div>}
                </div>
              );
            })}
          </div>
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

              <p className="text-[9px] text-zinc-400 italic leading-relaxed">
                * 系統將自動根據日誌填寫的「延期天數」推移剩餘任務日期。
              </p>
            </div>
          </Card>

          {selectedDate && tasksByDate[selectedDate] && (
            <Card title={`${selectedDate} 任務`}>
              <div className="space-y-2">
                {tasksByDate[selectedDate].map((t, idx) => (
                  <div key={idx} className="text-[10px] font-black border-b border-zinc-50 pb-2">
                    <div className="text-zinc-400">@{t.zoneName}</div>
                    <div className="text-zinc-950">{t.taskName}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 區域卡片元件 / ZONE CARD ---
const ZoneCard: React.FC<{ zone: Zone; methods: MethodItem[]; onUpdate: (z: Zone) => void; onDelete: () => void }> = ({ zone, methods, onUpdate, onDelete }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const filteredMethods = useMemo(() => methods.filter(m => m.category === zone.category), [methods, zone.category]);
  const isPing = zone.unit === '坪';

  const updateItem = (iIdx: number, field: string, value: any) => {
    const newItems = [...zone.items];
    const item = { ...newItems[iIdx], [field]: value };

    // Auto Calculate Area if L/W changes
    if (field === 'length' || field === 'width') {
      item.areaPing = Number(((item.length * item.width / 10000) * 0.3025).toFixed(2));
    }

    // Smart Price Logic: If Ping, use Area. Else use Quantity.
    const basis = isPing ? item.areaPing : item.quantity;
    item.itemPrice = Math.round(basis * zone.unitPrice * zone.difficultyCoefficient);

    newItems[iIdx] = item;
    onUpdate({ ...zone, items: newItems });
  };

  const TAG_MAP: Record<string, string[]> = {
    [ServiceCategory.WALL_CANCER]: ['主臥牆面', '客廳牆面', '廚房', '走道', '天花板', '樓梯間'],
    [ServiceCategory.WALL_WATERPROOF]: ['前陽台外牆', '後陽台外牆', '側面外牆', '頂樓女兒牆', '窗框周邊'],
    [ServiceCategory.ROOF_WATERPROOF]: ['頂樓地坪', '頂樓水塔區', '露台', '樓梯間屋頂'],
    [ServiceCategory.CRACK]: ['客廳牆面', '臥室牆面', '外牆裂縫', '窗角裂縫'],
    [ServiceCategory.STRUCTURE]: ['天花板鋼筋', '樑柱裂損', '承重牆', '陽台天花'],
    [ServiceCategory.SILICONE_BATH]: ['主臥衛浴', '客浴', '淋浴間', '浴缸周邊', '乾溼分離'],
    [ServiceCategory.SILICONE_WINDOW]: ['客廳落地窗', '主臥窗戶', '廚房窗戶', '陽台門框', '採光罩'],
    [ServiceCategory.CUSTOM]: ['儲藏室', '車庫', '地下室', '其他區域']
  };

  const currentTags = TAG_MAP[zone.category] || ['主臥', '客廳', '廚房', '陽台', '其他'];

  return (
    <Card className="border-t-4 border-t-zinc-950"
      title={
        <div className="flex items-center gap-3">
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 border border-zinc-100 rounded-full">{isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
          <div className="flex flex-col">
            <span className="text-base font-black uppercase">{zone.zoneName || "未命名區域"}</span>
            <span className="text-[7px] text-zinc-300 uppercase tracking-widest">{zone.methodName || "未選工法"} / {zone.items.length} ITEMS</span>
          </div>
        </div>
      }
      action={<button onClick={onDelete} className="text-zinc-200 hover:text-red-500"><Trash2 size={16} /></button>}
    >
      <div className={isCollapsed ? 'hidden' : 'space-y-6 animate-in fade-in duration-300'}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input label="區域名稱 / NAME" value={zone.zoneName} onChange={e => onUpdate({ ...zone, zoneName: e.target.value })} />
              {/* Engineer Quick Tags */}
              <div className="flex flex-wrap gap-1.5">
                {currentTags.map(tag => (
                  <button key={tag} onClick={() => onUpdate({ ...zone, zoneName: tag })} className="text-[9px] px-2 py-1 bg-zinc-50 border border-zinc-100 rounded-sm hover:bg-zinc-950 hover:text-white transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <Select label="服務大類 / CATEGORY" value={zone.category} onChange={e => onUpdate({ ...zone, category: e.target.value as ServiceCategory })}>
              {Object.values(ServiceCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">工法選擇 / METHOD</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {filteredMethods.map(m => (
              <button key={m.id} onClick={() => onUpdate({ ...zone, methodId: m.id, methodName: m.name, unit: m.defaultUnit, unitPrice: m.defaultUnitPrice })} className={`p-3 border rounded-sm text-left transition-all ${zone.methodId === m.id ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}>
                <div className="flex justify-between items-start">
                  <div className="text-[11px] font-black leading-tight">{m.name}</div>
                  <div className="text-[9px] opacity-60">${m.defaultUnitPrice}/{m.defaultUnit}</div>
                </div>
                <div className="text-[7px] font-black uppercase opacity-40 mt-1">{m.englishName}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Measurements */}
        <div className="pt-4 border-t border-zinc-50 space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">現勘數據 / MEASUREMENTS</div>
            <div className="text-[9px] font-bold text-zinc-400">計價單位: {zone.unit}</div>
          </div>

          {zone.items.map((item, iIdx) => (
            <div key={item.itemId} className="p-3 border border-zinc-50 rounded-sm bg-zinc-50/10 space-y-3 relative group">
              <button onClick={() => {
                const newItems = zone.items.filter((_, idx) => idx !== iIdx);
                onUpdate({ ...zone, items: newItems });
              }} className="absolute top-2 right-2 text-zinc-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>

              <div className="grid grid-cols-2 gap-3 pr-6">
                {isPing ? (
                  <>
                    <Input label="長 (cm) / L" type="number" value={item.length || ''} onChange={e => updateItem(iIdx, 'length', parseFloat(e.target.value) || 0)} />
                    <Input label="寬 (cm) / W" type="number" value={item.width || ''} onChange={e => updateItem(iIdx, 'width', parseFloat(e.target.value) || 0)} />
                  </>
                ) : (
                  <div className="col-span-2">
                    <Input label={`數量 (${zone.unit}) / QTY`} type="number" value={item.quantity || ''} onChange={e => updateItem(iIdx, 'quantity', parseFloat(e.target.value) || 0)} />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <div className="text-xl font-black text-zinc-950">
                    {isPing ? item.areaPing : item.quantity}
                    <span className="text-[10px] text-zinc-400 uppercase ml-1">{isPing ? 'PING' : zone.unit === '式' ? 'SET' : 'UNIT'}</span>
                  </div>
                  <div className="text-[10px] font-bold text-zinc-500">
                    單項價格: ${item.itemPrice?.toLocaleString()}
                  </div>
                </div>
                <ImageUploader images={item.photos} onImagesChange={imgs => updateItem(iIdx, 'photos', imgs)} maxImages={3} />
              </div>
            </div>
          ))}
          <Button onClick={() => onUpdate({ ...zone, items: [...zone.items, { itemId: `I-${Date.now()}`, length: 0, width: 0, areaPing: 0, quantity: 1, itemPrice: zone.unitPrice, photos: [] }] })} variant="outline" className="w-full text-[9px]"><Plus size={14} /> 新增測量項 / ADD ITEM</Button>
        </div>
      </div>
    </Card>
  );
};

// --- 主詳情頁面 / CASE DETAIL PAGE ---
export const CaseDetail: React.FC<{ caseData: CaseData; onBack: () => void; onUpdate: (u: CaseData) => void }> = ({ caseData, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'eval' | 'log' | 'quote' | 'schedule' | 'warranty'>('eval');
  const [localData, setLocalData] = useState<CaseData>(caseData);
  const [methods, setMethods] = useState<MethodItem[]>([]);

  // Ref to track if the update originated from this component
  const isSelfUpdate = React.useRef(false);
  // Ref for debounce timer
  const saveTimer = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only update local state from props if it's NOT a self-triggered update
    // ensuring we don't overwrite user input during the debounce cycle
    if (isSelfUpdate.current) {
      isSelfUpdate.current = false;
      return;
    }
    setLocalData(caseData);
    getMethods().then(setMethods);
  }, [caseData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleUpdate = async (newData: CaseData) => {
    // 1. Recalculate Final Price
    const baseTotal = newData.zones.reduce((sum, zone) =>
      sum + zone.items.reduce((zSum, item) => zSum + (item.itemPrice || 0), 0), 0
    );
    newData.finalPrice = baseTotal + (newData.manualPriceAdjustment || 0);

    setLocalData(newData);
    isSelfUpdate.current = true;

    // Debounce the heavy save operation and parent update
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      await saveCase(newData);
      onUpdate(newData);
    }, 1000); // 1 second debounce
  };

  const calculatedTotal = useMemo(() => localData.zones.reduce((sum, zone) => sum + zone.items.reduce((zSum, item) => zSum + item.itemPrice, 0), 0), [localData.zones]);

  const generateAutoSchedule = () => {
    const baseDate = localData.startDate ? new Date(localData.startDate) : new Date();
    const newSchedule: ScheduleTask[] = [];
    localData.zones.forEach(zone => {
      const method = methods.find(m => m.id === zone.methodId);
      if (!method) return;
      method.steps.forEach((step, sIdx) => {
        const taskDate = new Date(baseDate);
        taskDate.setDate(taskDate.getDate() + sIdx);
        newSchedule.push({ taskId: `${zone.zoneId}-${sIdx}`, date: taskDate.toISOString().slice(0, 10), zoneName: zone.zoneName, taskName: step.name, isCompleted: false });
      });
    });
    handleUpdate({ ...localData, schedule: newSchedule });
    alert("排程已根據工法步驟自動產出。");
  };


  const STATUS_ORDER = [
    CaseStatus.ASSESSMENT,
    CaseStatus.DEPOSIT_RECEIVED,
    CaseStatus.PLANNING,
    CaseStatus.CONSTRUCTION,
    CaseStatus.FINAL_PAYMENT,
    CaseStatus.COMPLETED,
    CaseStatus.WARRANTY
  ];

  const CaseStatusStepper: React.FC<{ currentStatus: CaseStatus; onSetStatus: (s: CaseStatus) => void }> = ({ currentStatus, onSetStatus }) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus as CaseStatus);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;

    const getNextAction = () => {
      switch (currentStatus) {
        case CaseStatus.ASSESSMENT: return "請確認報價並收取訂金";
        case CaseStatus.DEPOSIT_RECEIVED: return "請開始規劃行程與備料";
        case CaseStatus.PLANNING: return "準備進場施工";
        case CaseStatus.CONSTRUCTION: return "施工至期中，請申請尾款";
        case CaseStatus.FINAL_PAYMENT: return "尾款確認後繼續完工";
        case CaseStatus.COMPLETED: return "進入保固服務期";
        case CaseStatus.WARRANTY: return "案件已結案";
        default: return "";
      }
    };

    return (
      <div className="mb-6 bg-white border border-zinc-100 p-4 rounded-sm shadow-sm space-y-4">
        <div className="flex justify-between items-center overflow-x-auto no-scrollbar gap-2">
          {STATUS_ORDER.map((step, idx) => {
            const isActive = idx === safeIndex;
            const isDone = idx < safeIndex;
            return (
              <div key={step} className="flex items-center shrink-0">
                <div
                  onClick={() => onSetStatus(step)}
                  className={`flex flex-col items-center cursor-pointer transition-all ${isActive ? 'opacity-100 scale-105' : isDone ? 'opacity-60 hover:opacity-100' : 'opacity-30 hover:opacity-60'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border mb-1.5 ${isActive ? 'bg-zinc-950 text-white border-zinc-950' :
                    isDone ? 'bg-emerald-500 text-white border-emerald-500' :
                      'bg-white text-zinc-300 border-zinc-200'
                    }`}>
                    {isDone ? <CheckCircle2 size={12} /> : idx + 1}
                  </div>
                  <div className="text-[9px] font-black uppercase whitespace-nowrap">{STATUS_LABELS[step]}</div>
                </div>
                {idx < STATUS_ORDER.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${isDone ? 'bg-emerald-200' : 'bg-zinc-100'}`}></div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] bg-zinc-50 p-2 rounded-sm border border-zinc-100">
          <div className="font-bold text-zinc-500">
            <span className="bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-xs mr-2 text-[9px] uppercase font-black">NEXT</span>
            {getNextAction()}
          </div>
          {safeIndex < STATUS_ORDER.length - 1 && (
            <Button onClick={() => onSetStatus(STATUS_ORDER[safeIndex + 1])} className="h-6 py-0 px-3 text-[9px]">
              進入下一階段 <ChevronRight size={10} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout title={localData.customerName} onBack={onBack}>
      <div className="max-w-7xl mx-auto px-0 md:px-0 pt-2 mb-2">
        <CaseStatusStepper currentStatus={localData.status} onSetStatus={(s) => handleUpdate({ ...localData, status: s })} />
      </div>

      <div className="flex border-b border-zinc-100 mb-6 sticky top-16 md:top-28 bg-[#fcfcfc]/90 backdrop-blur-md z-40 shadow-sm overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'eval'} onClick={() => setActiveTab('eval')} icon={<Calculator size={16} />} label="現場評估 / EVAL" />
        <TabButton active={activeTab === 'quote'} onClick={() => setActiveTab('quote')} icon={<FileCheck size={16} />} label="報價結算 / QUOTE" />
        <TabButton active={activeTab === 'mats'} onClick={() => setActiveTab('mats')} icon={<Layers size={16} />} label="備料清單 / MATERIALS" />
        <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<CalendarIcon size={16} />} label="工期管理 / SCHEDULE" />
        <TabButton active={activeTab === 'log'} onClick={() => setActiveTab('log')} icon={<FileText size={16} />} label="施工日誌 / LOG" />
        <TabButton active={activeTab === 'warranty'} onClick={() => setActiveTab('warranty')} icon={<ShieldCheck size={16} />} label="保固服務 / WARRANTY" />
      </div>

      <div className="pb-40">
        {/* TAB 1: EVALUATION (ZONES) */}
        {activeTab === 'eval' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-[8px] font-black uppercase text-zinc-400 mb-0.5 leading-none">Job Setup</h2>
                <div className="text-xl font-black text-zinc-950 uppercase leading-none">區域配置 / ZONES</div>
              </div>
              <Button onClick={() => handleUpdate({ ...localData, zones: [...localData.zones, { zoneId: `Z-${Date.now()}`, zoneName: '新區域', category: ServiceCategory.WALL_CANCER, methodId: '', methodName: '', unit: '坪', unitPrice: 0, difficultyCoefficient: 1, items: [] }] })}><Plus size={14} /> 新增區域 / ADD</Button>
            </div>
            {localData.zones.map((zone, zIdx) => (
              <ZoneCard key={zone.zoneId} zone={zone} methods={methods} onUpdate={uz => { const nz = [...localData.zones]; nz[zIdx] = uz; handleUpdate({ ...localData, zones: nz }); }} onDelete={() => handleUpdate({ ...localData, zones: localData.zones.filter((_, i) => i !== zIdx) })} />
            ))}
          </div>
        )}

        {/* TAB 2: QUOTATION */}
        {activeTab === 'quote' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
            <Card title="最終報價結算 / QUOTATION">
              <div className="space-y-6">
                <div className="flex justify-between text-[11px] font-black text-zinc-400 uppercase bg-zinc-50 px-4 py-3 border border-zinc-100">
                  <span>BASE VALUATION / 系統估值</span>
                  <span className="text-zinc-950 text-sm font-black">${calculatedTotal.toLocaleString()}</span>
                </div>
                <Input label="手動調整 (折讓或補償) / ADJUSTMENT" type="number" value={localData.manualPriceAdjustment || ''} onChange={e => handleUpdate({ ...localData, manualPriceAdjustment: parseInt(e.target.value) || 0 })} />
                <div className="flex justify-between items-center pt-6 border-t border-zinc-950">
                  <div className="text-[10px] font-black text-zinc-400 uppercase">FINAL PRICE / 總報價</div>
                  <span className="text-3xl font-black text-zinc-950">${(calculatedTotal + localData.manualPriceAdjustment).toLocaleString()}</span>
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ExportButton
                onClick={() => {
                  const realParams = { ...localData, finalPrice: calculatedTotal + (localData.manualPriceAdjustment || 0) };
                  generateEvaluationPDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽評估 / EVAL"
              />
              <ExportButton
                onClick={() => {
                  const realParams = { ...localData, finalPrice: calculatedTotal + (localData.manualPriceAdjustment || 0) };
                  generateContractPDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽合約 / CONTRACT"
              />
              <ExportButton
                onClick={() => {
                  const realParams = { ...localData, finalPrice: calculatedTotal + (localData.manualPriceAdjustment || 0) };
                  generateInvoicePDF(realParams, 'DEPOSIT', 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽頭期 / DEPOSIT"
              />
              <ExportButton
                onClick={() => {
                  const realParams = { ...localData, finalPrice: calculatedTotal + (localData.manualPriceAdjustment || 0) };
                  generateInvoicePDF(realParams, 'FINAL', 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽尾款 / FINAL"
              />
            </div>
          </div>
        )}

        {/* TAB 3: MATERIALS (New Dedicated Tab) */}
        {activeTab === 'mats' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-[8px] font-black uppercase text-zinc-400 mb-0.5 leading-none">Preparation</h2>
                <div className="text-xl font-black text-zinc-950 uppercase leading-none">備料清單 / MATERIALS</div>
              </div>
            </div>

            <Card title="自動備料試算 / MATERIAL CALCULATOR">
              <MaterialList zones={localData.zones} />
            </Card>

            <div className="bg-zinc-50 p-4 rounded-sm border border-zinc-100">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-zinc-400 mt-0.5" />
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  系統根據「各區域 (Zone)」選擇的「工法 (Method)」自動計算所需材料總量。<br />
                  計算公式：<br />
                  • 固定器材 (Fixed) = 1 Set per Recipe Use (不隨坪數增加)<br />
                  • 變動耗材 (Variable) = 單坪消耗率 × 區域總坪數
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
            <Card title="自動排程引擎 / AUTO SCHEDULER">
              <div className="space-y-4">
                <Input label="開工預定日 / START DATE" type="date" value={localData.startDate || ''} onChange={e => handleUpdate({ ...localData, startDate: e.target.value })} />
                <Button onClick={generateAutoSchedule} className="w-full py-3"><Wand2 size={18} /> 生成自動排程 / GENERATE</Button>
              </div>
            </Card>

            {/* Material List Removed from here */}

            <ProjectCalendar
              schedule={localData.schedule}
              logs={localData.logs || []}
            />
          </div>
        )}

        {/* TAB 5: LOG */}
        {activeTab === 'log' && (
          <ConstructionLogTab
            schedule={localData.schedule}
            logs={localData.logs || []}
            onUpdate={(newLogs, updatedSchedule) => {
              const newData = { ...localData, logs: newLogs };
              if (updatedSchedule) {
                newData.schedule = updatedSchedule;
              }
              handleUpdate(newData);
            }}
          />
        )}

        {/* TAB 6: WARRANTY */}
        {activeTab === 'warranty' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
            <Card title="保固紀錄 / WARRANTY RECORD">
              <div className="text-center py-12 text-zinc-400 text-xs font-black uppercase tracking-widest">
                No Warranty Records Found
                <br />
                <span className="opacity-50">保固功能即將開放</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-950 p-4 z-[70] md:max-w-7xl md:mx-auto flex justify-between items-center gap-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col">
          <div className="text-[7px] text-zinc-400 font-black uppercase tracking-widest leading-none mb-1">FINAL TOTAL / 結算</div>
          <div className="font-black text-xl text-zinc-950 leading-none">${(calculatedTotal + localData.manualPriceAdjustment).toLocaleString()}</div>
        </div>
        <button onClick={onBack} className="flex-1 py-3 px-6 text-[11px] font-black bg-zinc-950 text-white rounded-sm uppercase active:scale-95 shadow-lg">儲存並返回 / SAVE & EXIT</button>
      </div>
    </Layout>
  );
};


