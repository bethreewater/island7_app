import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator, FileCheck, Layers, Calendar as CalendarIcon,
  Wand2, CheckCircle2, ChevronRight, ChevronDown, Plus, Eye,
  FileText, ShieldCheck, Package, Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import { geocodeAddress } from '../services/geocodingService';
import { CaseData, MethodItem, ServiceCategory, CaseStatus, STATUS_LABELS, ScheduleTask, ConstructionLog, NavigationView, normalizeCaseStatus, WarrantyRecord, ChangeOrder } from '../types';
import { getMethods, saveCase, formalizeCase, getCaseDetails } from '../services/storageService';
import { Button, Card, Input, ImageUploader } from '../components/InputComponents';
import { Layout } from '../components/Layout';

// Modular Components
import { MaterialList } from '../components/case-detail/MaterialList';
import { ProjectCalendar } from '../components/case-detail/ProjectCalendar';
import { ConstructionLogTab } from '../components/case-detail/ConstructionLogTab';
import { ExportButton } from '../components/case-detail/ExportButton';
import { ZoneCard } from '../components/case-detail/ZoneCard';

const STATUS_ORDER = [
  CaseStatus.ASSESSMENT,
  CaseStatus.DEPOSIT_RECEIVED,
  CaseStatus.PLANNING,
  CaseStatus.CONSTRUCTION,
  CaseStatus.FINAL_PAYMENT,
  CaseStatus.COMPLETED,
  CaseStatus.WARRANTY,
];

const FIXED_DEPOSIT_RATIO = 0.7;
const FIXED_FINAL_RATIO = 0.3;

const addDays = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const nextWorkday = (dateString: string) => {
  let cursor = dateString;
  while (new Date(`${cursor}T12:00:00`).getDay() === 0) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
};

const CaseStatusStepper: React.FC<{ currentStatus: CaseStatus | string; onSetStatus: (s: CaseStatus) => void }> = ({ currentStatus, onSetStatus }) => {
  const normalizedStatus = normalizeCaseStatus(currentStatus);
  const currentIndex = STATUS_ORDER.indexOf(normalizedStatus as CaseStatus);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  const getNextAction = () => {
    switch (normalizedStatus) {
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

// 手機版底部 Tab 按鈕
const MobileTabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 py-3 px-5 transition-all shrink-0 min-w-[90px] ${active
      ? 'text-blue-600 scale-105'
      : 'text-zinc-400 hover:text-zinc-700'
      }`}
  >
    {icon}
    <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
      {label}
    </span>
    {active && (
      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
    )}
  </button>
);

// --- 主詳情頁面 / CASE DETAIL PAGE ---
export const CaseDetail: React.FC<{
  caseData: CaseData;
  initialTab?: 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty';
  onBack: () => void;
  onUpdate: (u: CaseData) => void;
  onNavigate: (view: NavigationView) => void;
}> = ({ caseData, initialTab, onBack, onUpdate, onNavigate }) => {
  const getRecommendedTab = useCallback((data: CaseData): 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty' => {
    const status = normalizeCaseStatus(data.status);
    if (status === CaseStatus.CONSTRUCTION) return 'log';
    if (status === CaseStatus.WARRANTY) return 'warranty';
    if (status === CaseStatus.FINAL_PAYMENT) return 'quote';
    if (status === CaseStatus.PLANNING) return 'schedule';
    return 'eval';
  }, []);

  const [activeTab, setActiveTab] = useState<'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty'>(() => initialTab || getRecommendedTab(caseData));
  const [localData, setLocalData] = useState<CaseData>(caseData);
  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [loading, setLoading] = useState(caseData.zones === undefined);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [showFormalizeConfirm, setShowFormalizeConfirm] = useState(false);

  // Ref to track if the update originated from this component
  const isSelfUpdate = React.useRef(false);
  // Ref for debounce timer
  const saveTimer = React.useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = React.useRef<CaseData>(caseData);
  const latestOnUpdateRef = React.useRef(onUpdate);

  useEffect(() => {
    latestDataRef.current = localData;
  }, [localData]);

  useEffect(() => {
    latestOnUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const load = async () => {
      // Always load methods
      getMethods().then(setMethods);

      if (isSelfUpdate.current) {
        isSelfUpdate.current = false;
        return;
      }

      // Check if we received full details or need to fetch
      if (!caseData.isPartial && caseData.zones && caseData.logs) {
        setLocalData(caseData);
        setLoading(false);
      } else {
        setLoading(true);
        const full = await getCaseDetails(caseData.caseId);
        if (full) {
          setLocalData(full);
        }
        setLoading(false);
      }
    };
    load();
  }, [caseData]);

  useEffect(() => {
    setActiveTab(initialTab || getRecommendedTab(caseData));
  }, [caseData.caseId, caseData.status, getRecommendedTab, initialTab]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (!saveTimer.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const pending = latestDataRef.current;
      void saveCase(pending)
        .then(() => latestOnUpdateRef.current(pending))
        .catch((error) => {
          console.error('Failed to flush pending case save on unmount:', error);
        });
    };
  }, []);

  const handleUpdate = useCallback((newData: CaseData) => {
    // 1. Recalculate Final Price
    const baseTotal = newData.zones.reduce((sum, zone) =>
      sum + zone.items.reduce((zSum, item) => zSum + (item.itemPrice || 0), 0), 0
    );
    const updatedData = {
      ...newData,
      depositPercentage: FIXED_DEPOSIT_RATIO,
      finalPrice: baseTotal + (newData.manualPriceAdjustment || 0),
    };

    latestDataRef.current = updatedData;
    setLocalData(updatedData);
    isSelfUpdate.current = true;

    // Debounce the heavy save operation and parent update
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      await saveCase(updatedData);
      onUpdate(updatedData);
      saveTimer.current = null;
    }, 1000); // 1 second debounce
  }, [onUpdate]);

  const flushAndBack = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const latest = latestDataRef.current;
      void saveCase(latest)
        .then(() => {
          onUpdate(latest);
          onBack();
        })
        .catch((error) => {
          toast.error('儲存失敗，請稍後再試');
          console.error('Failed to save before exit:', error);
        });
      return;
    }

    onBack();
  }, [onBack, onUpdate]);

  const calculatedTotal = useMemo(() => {
    if (!localData.zones) return 0;
    return localData.zones.reduce((sum, zone) => sum + (zone.items || []).reduce((zSum, item) => zSum + (item.itemPrice || 0), 0), 0);
  }, [localData?.zones]);

  const liveFinalPrice = calculatedTotal + (localData.manualPriceAdjustment || 0);
  const frozenQuotePrice = localData.formalQuotedPrice || liveFinalPrice;
  const depositAmount = Math.round(frozenQuotePrice * FIXED_DEPOSIT_RATIO);
  const finalPaymentAmount = Math.round(frozenQuotePrice * FIXED_FINAL_RATIO);
  const activeWarrantyCount = (localData.warrantyRecords || []).filter((item) => item.responsibility !== 'chargeable').length;
  const pendingWarrantyCount = (localData.warrantyRecords || []).filter((item) => item.nextVisitDate && !item.result?.trim()).length;
  const overdueWarrantyCount = (localData.warrantyRecords || []).filter((item) => item.nextVisitDate && item.nextVisitDate < new Date().toISOString().slice(0, 10) && !item.result?.trim()).length;

  const generateAutoSchedule = useCallback(() => {
    if (!localData.startDate) {
      toast.error("請先設定開工日期");
      return;
    }
    // Parse date correctly: "YYYY-MM-DD" -> local date (avoid UTC offset issues)
    const [sy, sm, sd] = localData.startDate.split('-').map(Number);
    const baseDate = new Date(sy, sm - 1, sd);
    const newSchedule: ScheduleTask[] = [];

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let cursorDate = formatDate(baseDate);
    if (localData.zones) {
      localData.zones.forEach(zone => {
        const method = methods.find(m => m.id === zone.methodId);
        if (!method) return;
        method.steps.forEach((step, sIdx) => {
          cursorDate = nextWorkday(cursorDate);
          newSchedule.push({
            taskId: `${zone.zoneId}-${sIdx}`,
            date: cursorDate,
            zoneId: zone.zoneId,
            zoneName: zone.zoneName,
            taskName: step.name,
            methodName: zone.methodName,
            isCompleted: false
          });
          cursorDate = addDays(cursorDate, 1);
        });
        cursorDate = addDays(cursorDate, 1);
      });
    }
    // Auto-sync: create construction log entries for past/today scheduled dates
    const today = formatDate(new Date());
    const existingLogDates = new Set((localData.logs || []).map(l => l.date));
    const autoLogs: ConstructionLog[] = newSchedule
      .filter(task => task.date <= today && !existingLogDates.has(task.date))
        .map(task => ({
          id: `LOG-AUTO-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          date: task.date,
          taskId: task.taskId,
          zoneId: task.zoneId,
          zoneName: task.zoneName,
          weather: '晴天',
          action: `${task.taskName} / ${task.zoneName}`,
          description: '[系統自動生成] 請點擊編輯補充內容。',
          issueType: 'normal',
          evidenceNote: '',
          crewLabel: '',
          customerSignedOff: false,
          beforePhotos: [], afterPhotos: [],
          startTime: '', breaks: [], endTime: '',
          delayDays: 0, isNoWorkDay: false, materialsUsed: []
      }));

    const mergedLogs = [...autoLogs, ...(localData.logs || [])].sort((a, b) => b.date.localeCompare(a.date));
    handleUpdate({ ...localData, schedule: newSchedule, logs: mergedLogs });

    const logMsg = autoLogs.length > 0 ? `，同步 ${autoLogs.length} 筆日誌` : '';
    toast.success(`排程 ${newSchedule.length} 筆已產出${logMsg}`, { icon: '📅' });
  }, [localData, methods, handleUpdate]);


  const handleStatusChange = async (newStatus: CaseStatus) => {
    const currentStatus = normalizeCaseStatus(localData.status);
    const today = new Date().toISOString().slice(0, 10);

    // Formalization Logic: Assessment -> Deposit Received (Move EVAL- to Formal ID)
    if (newStatus === CaseStatus.DEPOSIT_RECEIVED &&
      currentStatus === CaseStatus.ASSESSMENT &&
      localData.caseId.startsWith('EVAL-')) {
      setShowFormalizeConfirm(true);
      return;
    }

    handleUpdate({
      ...localData,
      status: newStatus,
      depositReceivedDate: newStatus === CaseStatus.DEPOSIT_RECEIVED ? (localData.depositReceivedDate || today) : localData.depositReceivedDate,
      completionAcceptedDate: (newStatus === CaseStatus.COMPLETED || newStatus === CaseStatus.WARRANTY)
        ? (localData.completionAcceptedDate || today)
        : localData.completionAcceptedDate,
    });
  };

  const getPDFService = useCallback(async () => import('../services/pdfService'), []);

  const confirmFormalizeCase = useCallback(async () => {
    try {
      const formalized = await formalizeCase({ ...localData, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO });
      onUpdate(formalized);
      setShowFormalizeConfirm(false);
      toast.success(`案件正式成立！正式編號: ${formalized.caseId}`, {
        duration: 5000,
        icon: '🎉',
      });
    } catch (e) {
      toast.error("轉正失敗: " + e, { duration: 5000 });
    }
  }, [localData, onUpdate]);
  const workflowReference = useMemo(() => {
    return (localData.zones || []).map((zone) => {
      const method = methods.find((item) => item.id === zone.methodId);
      return {
        zoneName: zone.zoneName || '未命名區域',
        methodName: zone.methodName || method?.name || '未設定工法',
        steps: method?.steps || [],
      };
    });
  }, [localData.zones, methods]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 animate-in fade-in space-y-4">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
        <div className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Loading Case...</div>
      </div>
    );
  }

  return (
    <Layout title={localData.customerName} onBack={flushAndBack} onNavigate={onNavigate} hideMobileNav>
      <div className="max-w-7xl mx-auto px-0 md:px-0 pt-2 mb-2">
        <CaseStatusStepper currentStatus={localData.status} onSetStatus={handleStatusChange} />
      </div>

      {/* 頂部 Tab - 桌面版專用 */}
      <div className="hidden lg:flex border-b border-zinc-100 mb-6 sticky top-16 md:top-28 bg-[#fcfcfc]/90 backdrop-blur-md z-40 shadow-sm overflow-x-auto no-scrollbar">
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
              <Button onClick={() => handleUpdate({ ...localData, zones: [...localData.zones, { zoneId: `Z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, zoneName: '新區域', category: ServiceCategory.WALL_CANCER, methodId: '', methodName: '', unit: '坪', unitPrice: 0, difficultyCoefficient: 1, items: [] }] })}><Plus size={14} /> 新增區域 / ADD</Button>
            </div>

            {/* 客戶基本資訊 */}
            <Card title="客戶基本資訊 / CUSTOMER INFO">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="客戶姓名 / CUSTOMER NAME"
                    value={localData.customerName}
                    onChange={(e) => setLocalData({ ...latestDataRef.current, customerName: e.target.value })}
                    onBlur={(e) => handleUpdate({ ...latestDataRef.current, customerName: e.target.value, invoiceTitle: latestDataRef.current.invoiceTitle || e.target.value, siteContactName: latestDataRef.current.siteContactName || e.target.value })}
                  />
                  <Input
                    label="聯絡電話 / PHONE"
                    value={localData.phone}
                    onChange={(e) => setLocalData({ ...latestDataRef.current, phone: e.target.value })}
                    onBlur={(e) => handleUpdate({ ...latestDataRef.current, phone: e.target.value, siteContactPhone: latestDataRef.current.siteContactPhone || e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="現場聯絡人 / SITE CONTACT"
                    value={localData.siteContactName || ''}
                    onChange={(e) => setLocalData({ ...latestDataRef.current, siteContactName: e.target.value })}
                    onBlur={(e) => handleUpdate({ ...latestDataRef.current, siteContactName: e.target.value })}
                  />
                  <Input
                    label="現場電話 / SITE PHONE"
                    value={localData.siteContactPhone || ''}
                    onChange={(e) => setLocalData({ ...latestDataRef.current, siteContactPhone: e.target.value })}
                    onBlur={(e) => handleUpdate({ ...latestDataRef.current, siteContactPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    label="施工地址 / ADDRESS"
                    value={localData.address || ''}
                    onChange={(e) => {
                      setLocalData({ ...latestDataRef.current, address: e.target.value });
                    }}
                    onBlur={async (e) => {
                      // 當失去焦點時，才進行地址轉經緯度
                      const address = e.target.value.trim();
                      if (!address || address.length < 8) return;

                      console.log('🔍 開始地址轉經緯度:', address);
                      toast.loading('正在解析地址...', { id: 'geocoding' });

                      try {
                        const result = await geocodeAddress(address);
                        if (result) {
                          const latest = latestDataRef.current;
                          handleUpdate({
                            ...latest,
                            address,
                            latitude: result.latitude,
                            longitude: result.longitude
                          });
                          toast.success(`✓ 地址座標已自動設定\n${result.displayName}`, {
                            id: 'geocoding',
                            icon: '📍',
                            duration: 4000
                          });
                        } else {
                          // 解析失敗，但不清除地址文字
                          toast.error(
                            '💡 提示：精確門牌可能無法解析\n' +
                            '建議使用：區域 + 主要道路\n' +
                            '例如「中和區建八路」或「大安區忠孝東路」',
                            {
                              id: 'geocoding',
                              duration: 6000
                            }
                          );
                        }
                      } catch (error) {
                        console.error('Geocoding 錯誤:', error);
                        toast.error('地址解析服務暫時無法使用\n請稍後再試', {
                          id: 'geocoding',
                          duration: 4000
                        });
                      }
                    }}
                    placeholder="例：台北市大安區忠孝東路三段100號"
                  />
                  {localData.latitude && localData.longitude && (
                    <div className="flex items-center gap-2 text-xs text-green-600 font-bold bg-green-50 px-3 py-2 rounded">
                      <span>✓ 座標已設定</span>
                      <span className="text-green-500 font-mono">
                        {localData.latitude.toFixed(6)}, {localData.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                  {localData.address && !localData.latitude && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded">
                      <span>⚠ 尚未取得地址座標，請輸入完整地址</span>
                    </div>
                  )}
                </div>
                <Input
                  label="地址備註 / ADDRESS NOTE (選填)"
                  value={localData.addressNote || ''}
                  onChange={(e) => setLocalData({ ...latestDataRef.current, addressNote: e.target.value })}
                  onBlur={(e) => handleUpdate({ ...latestDataRef.current, addressNote: e.target.value })}
                  placeholder="例：3樓、後棟、B1 停車場旁"
                />
                <Input
                  label="建物/樓層資訊 / BUILDING CONTEXT"
                  value={localData.buildingContext || ''}
                  onChange={(e) => setLocalData({ ...latestDataRef.current, buildingContext: e.target.value })}
                  onBlur={(e) => handleUpdate({ ...latestDataRef.current, buildingContext: e.target.value })}
                  placeholder="例：社區A棟 12F 頂樓露台、透天 3F 外牆"
                />

                {/* 手動設定座標（當自動解析失敗時） */}
                {localData.address && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded space-y-3">
                    <div className="text-xs font-bold text-blue-800">
                      🗺️ {localData.latitude ? '座標資訊' : '手動設定座標（可選）'}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="緯度 / LATITUDE"
                        type="number"
                        step="0.000001"
                        value={localData.latitude ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          handleUpdate({
                            ...localData,
                            latitude: val ? parseFloat(val) : undefined
                          });
                        }}
                        placeholder="25.033"
                      />
                      <Input
                        label="經度 / LONGITUDE"
                        type="number"
                        step="0.000001"
                        value={localData.longitude ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          handleUpdate({
                            ...localData,
                            longitude: val ? parseFloat(val) : undefined
                          });
                        }}
                        placeholder="121.565"
                      />
                    </div>
                    <div className="text-[10px] text-blue-600">
                      提示：可使用 Google Maps 查詢座標，在地圖上點右鍵即可看到經緯度
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="現勘重點 / ASSESSMENT NOTES">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">漏水症狀 / LEAK SYMPTOMS</label>
                    <textarea
                      className="w-full min-h-28 border border-zinc-200 rounded-sm px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 font-medium"
                      value={localData.leakSymptoms || ''}
                      onChange={(e) => setLocalData({ ...latestDataRef.current, leakSymptoms: e.target.value })}
                      onBlur={(e) => handleUpdate({ ...latestDataRef.current, leakSymptoms: e.target.value })}
                      placeholder="例：窗框滲水、頂樓積水、浴室牆角返潮"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">漏水源判定 / ROOT CAUSE</label>
                    <textarea
                      className="w-full min-h-28 border border-zinc-200 rounded-sm px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 font-medium"
                      value={localData.leakSourceDiagnosis || ''}
                      onChange={(e) => setLocalData({ ...latestDataRef.current, leakSourceDiagnosis: e.target.value })}
                      onBlur={(e) => handleUpdate({ ...latestDataRef.current, leakSourceDiagnosis: e.target.value })}
                      placeholder="例：女兒牆裂縫、窗框矽利康老化、上游住戶未處理"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">施工限制 / ACCESS CONSTRAINTS</label>
                    <textarea
                      className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 font-medium"
                      value={localData.accessConstraints || ''}
                      onChange={(e) => setLocalData({ ...latestDataRef.current, accessConstraints: e.target.value })}
                      onBlur={(e) => handleUpdate({ ...latestDataRef.current, accessConstraints: e.target.value })}
                      placeholder="例：僅週末可施工、需通知管委會、需吊料"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">備註 / SPECIAL NOTE</label>
                    <textarea
                      className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 font-medium"
                      value={localData.specialNote || ''}
                      onChange={(e) => setLocalData({ ...latestDataRef.current, specialNote: e.target.value })}
                      onBlur={(e) => handleUpdate({ ...latestDataRef.current, specialNote: e.target.value })}
                      placeholder="例：住戶要求先做測試區、材料需低味道"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {localData.zones.map((zone, zIdx) => (
              <ZoneCard key={zone.zoneId} zone={zone} methods={methods} onUpdate={uz => { const nz = [...localData.zones]; nz[zIdx] = uz; handleUpdate({ ...localData, zones: nz }); }} onDelete={() => handleUpdate({ ...localData, zones: localData.zones.filter((_, i) => i !== zIdx) })} />
            ))}
          </div>
        )}

        {/* TAB 2: QUOTATION */}
        {activeTab === 'quote' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
            <Card title="商務控制 / COMMERCIAL CONTROL">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="報價版本 / QUOTE VERSION" type="number" value={localData.quoteVersion || 1} onChange={(e) => handleUpdate({ ...localData, quoteVersion: parseInt(e.target.value, 10) || 1 })} />
                <Input label="簽約日期 / CONTRACT SIGNED" type="date" value={localData.contractSignedDate || ''} onChange={(e) => handleUpdate({ ...localData, contractSignedDate: e.target.value })} />
                <Input label="發票抬頭 / INVOICE TITLE" value={localData.invoiceTitle || ''} onChange={(e) => handleUpdate({ ...localData, invoiceTitle: e.target.value })} />
                <Input label="統一編號 / TAX ID" value={localData.invoiceTaxId || ''} onChange={(e) => handleUpdate({ ...localData, invoiceTaxId: e.target.value })} />
                <Input label="收到頭期日 / DEPOSIT RECEIVED" type="date" value={localData.depositReceivedDate || ''} onChange={(e) => handleUpdate({ ...localData, depositReceivedDate: e.target.value, status: e.target.value ? CaseStatus.DEPOSIT_RECEIVED : localData.status })} />
                <Input label="收到尾款日 / FINAL RECEIVED" type="date" value={localData.finalPaymentReceivedDate || ''} onChange={(e) => handleUpdate({ ...localData, finalPaymentReceivedDate: e.target.value })} />
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                <Button
                  variant={localData.depositReceivedDate ? 'outline' : 'primary'}
                  onClick={() => handleUpdate({
                    ...localData,
                    depositReceivedDate: localData.depositReceivedDate || new Date().toISOString().slice(0, 10),
                    status: normalizeCaseStatus(localData.status) === CaseStatus.ASSESSMENT ? CaseStatus.DEPOSIT_RECEIVED : localData.status,
                  })}
                >
                  {localData.depositReceivedDate ? '已記頭期' : '登記頭期'}
                </Button>
                <Button
                  variant={normalizeCaseStatus(localData.status) === CaseStatus.PLANNING ? 'primary' : 'outline'}
                  onClick={() => handleUpdate({ ...localData, status: CaseStatus.PLANNING })}
                >
                  轉備料/規劃
                </Button>
                <Button
                  variant={normalizeCaseStatus(localData.status) === CaseStatus.FINAL_PAYMENT && !localData.finalPaymentReceivedDate ? 'primary' : 'outline'}
                  onClick={() => handleUpdate({ ...localData, status: CaseStatus.FINAL_PAYMENT })}
                >
                  發起尾款
                </Button>
                <Button
                  variant={localData.finalPaymentReceivedDate ? 'outline' : 'primary'}
                  onClick={() => handleUpdate({
                    ...localData,
                    finalPaymentReceivedDate: localData.finalPaymentReceivedDate || new Date().toISOString().slice(0, 10),
                    status: CaseStatus.COMPLETED,
                    completionAcceptedDate: localData.completionAcceptedDate || new Date().toISOString().slice(0, 10),
                  })}
                >
                  {localData.finalPaymentReceivedDate ? '已記尾款' : '尾款入帳'}
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-zinc-100 bg-zinc-50 rounded-sm p-4">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">固定頭期 70%</div>
                  <div className="text-xl font-black mt-2">${depositAmount.toLocaleString()}</div>
                </div>
                <div className="border border-zinc-100 bg-zinc-50 rounded-sm p-4">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">固定尾款 30%</div>
                  <div className="text-xl font-black mt-2">${finalPaymentAmount.toLocaleString()}</div>
                </div>
                <div className="border border-zinc-100 bg-zinc-50 rounded-sm p-4">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">目前凍結報價</div>
                  <div className="text-xl font-black mt-2">${frozenQuotePrice.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">收款/請款備註 / PAYMENT NOTE</label>
                <textarea
                  className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 font-medium"
                  value={localData.paymentNote || ''}
                  onChange={(e) => setLocalData({ ...latestDataRef.current, paymentNote: e.target.value })}
                  onBlur={(e) => handleUpdate({ ...latestDataRef.current, paymentNote: e.target.value })}
                  placeholder="例：頭期款簽約當日現金收、尾款驗收後三日內匯款"
                />
              </div>
            </Card>

            <Card title="最終報價結算 / QUOTATION">
              <div className="space-y-6">
                <div className="flex justify-between text-[11px] font-black text-zinc-400 uppercase bg-zinc-50 px-4 py-3 border border-zinc-100">
                  <span>BASE VALUATION / 系統估值</span>
                  <span className="text-zinc-950 text-sm font-black">${calculatedTotal.toLocaleString()}</span>
                </div>
                <Input label="手動調整 (折讓或補償) / ADJUSTMENT" type="number" value={localData.manualPriceAdjustment || ''} onChange={e => handleUpdate({ ...localData, manualPriceAdjustment: parseInt(e.target.value) || 0 })} />
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => handleUpdate({ ...localData, formalQuotedPrice: liveFinalPrice })}>凍結為正式報價 / FREEZE QUOTE</Button>
                  <div className="text-xs text-zinc-500">正式報價：${frozenQuotePrice.toLocaleString()}</div>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-zinc-950">
                  <div className="text-[10px] font-black text-zinc-400 uppercase">FINAL PRICE / 總報價</div>
                  <span className="text-3xl font-black text-zinc-950">${liveFinalPrice.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            <Card title="追加減工程 / CHANGE ORDERS">
              <div className="space-y-3">
                {(localData.changeOrders || []).length === 0 && <div className="text-sm text-zinc-400">尚無追加減紀錄</div>}
                {(localData.changeOrders || []).map((item) => (
                  <div key={item.id} className="border border-zinc-100 rounded-sm p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                    <Input label="日期" type="date" value={item.createdAt} onChange={(e) => handleUpdate({ ...localData, changeOrders: localData.changeOrders.map((entry) => entry.id === item.id ? { ...entry, createdAt: e.target.value } : entry) })} />
                    <Input label="原因" value={item.reason} onChange={(e) => handleUpdate({ ...localData, changeOrders: localData.changeOrders.map((entry) => entry.id === item.id ? { ...entry, reason: e.target.value } : entry) })} />
                    <Input label="金額" type="number" value={item.amount} onChange={(e) => handleUpdate({ ...localData, changeOrders: localData.changeOrders.map((entry) => entry.id === item.id ? { ...entry, amount: parseInt(e.target.value, 10) || 0 } : entry) })} />
                    <Button variant={item.status === 'approved' ? 'primary' : 'outline'} onClick={() => handleUpdate({ ...localData, changeOrders: localData.changeOrders.map((entry) => entry.id === item.id ? { ...entry, status: entry.status === 'approved' ? 'draft' : 'approved', approvedAt: entry.status === 'approved' ? undefined : new Date().toISOString().slice(0, 10) } : entry) })}>{item.status === 'approved' ? '已核准' : '待核准'}</Button>
                    <Button variant="danger" onClick={() => handleUpdate({ ...localData, changeOrders: localData.changeOrders.filter((entry) => entry.id !== item.id) })}>刪除</Button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => handleUpdate({ ...localData, changeOrders: [...(localData.changeOrders || []), { id: `CO-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), reason: '', amount: 0, status: 'draft' as ChangeOrder['status'] }] })}><Plus size={14} /> 新增追加減</Button>
              </div>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ExportButton
                onClick={async () => {
                  const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                  const { generateEvaluationPDF } = await getPDFService();
                  return generateEvaluationPDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽評估 / EVAL"
              />
              <ExportButton
                onClick={async () => {
                  const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                  const { generateQuotationPDF } = await getPDFService();
                  return generateQuotationPDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽報價 / QUOTE"
              />
              <ExportButton
                onClick={async () => {
                  const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                  const { generateContractPDF } = await getPDFService();
                  return generateContractPDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽合約 / CONTRACT"
              />
              <ExportButton
                onClick={async () => {
                  const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                  const { generateInvoicePDF } = await getPDFService();
                  return generateInvoicePDF(realParams, 'DEPOSIT', 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽頭期 / DEPOSIT"
              />
              <ExportButton
                onClick={async () => {
                  const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                  const { generateInvoicePDF } = await getPDFService();
                  return generateInvoicePDF(realParams, 'FINAL', 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽尾款 / FINAL"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ExportButton
                onClick={async () => {
                  const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                  const { generateCompletionPDF } = await getPDFService();
                  return generateCompletionPDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽完工 / COMPLETION"
              />
              <ExportButton
                onClick={async () => {
                  const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                  const { generateWarrantyCertificatePDF } = await getPDFService();
                  return generateWarrantyCertificatePDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽保固 / WARRANTY"
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

            <Card className="p-0 border-0 shadow-none border-transparent" title={null}>
              <MaterialList zones={localData.zones} />
            </Card>
          </div>
        )}

        {/* TAB 4: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
            <Card title="自動排程引擎 / AUTO SCHEDULER">
              <div className="space-y-4">
                <Input label="開工預定日 / START DATE" type="date" value={localData.startDate || ''} onChange={e => handleUpdate({ ...localData, startDate: e.target.value })} />
                <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-sm p-3">
                  目前排程規則：依區域順序串接、每道工序佔 1 個工作天、自動略過星期日，避免所有區域同日平行施工造成失真。
                </div>
                <Button onClick={generateAutoSchedule} className="w-full py-3"><Wand2 size={18} /> 生成自動排程 / GENERATE</Button>
              </div>
            </Card>

            <Card title="待處理例外 / OPERATION EXCEPTIONS">
              <div className="space-y-2 text-sm">
                {!localData.latitude && localData.address && <div className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-sm">地址已有，但尚未完成座標定位</div>}
                {!localData.depositReceivedDate && normalizeCaseStatus(localData.status) !== CaseStatus.ASSESSMENT && <div className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-sm">案件已進入正式流程，但尚未登記頭期收款日</div>}
                {localData.status === CaseStatus.FINAL_PAYMENT && !localData.finalPaymentReceivedDate && <div className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-sm">目前狀態為請領尾款，但尚未登記尾款收款日</div>}
                {(localData.schedule || []).filter((task) => !task.isCompleted && task.blockedReason).length > 0 && <div className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-sm">有 {(localData.schedule || []).filter((task) => !task.isCompleted && task.blockedReason).length} 筆排程因異常被延後</div>}
                {!localData.accessConstraints && <div className="px-3 py-2 border border-zinc-200 bg-zinc-50 rounded-sm">尚未填寫施工限制，建議進場前確認</div>}
              </div>
            </Card>

            <ProjectCalendar
              schedule={localData.schedule || []}
              logs={localData.logs || []}
              onUpdate={(s) => handleUpdate({ ...localData, schedule: s })}
            />
          </div>
        )}

        {/* TAB 5: LOG */}
        {activeTab === 'log' && (
          <div className="space-y-6">
            <Card title="現場模式 / FIELD MODE">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-zinc-100 rounded-sm p-4 bg-zinc-50">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">今日待辦</div>
                  <div className="text-2xl font-black mt-2">{(localData.schedule || []).filter((task) => task.date === new Date().toISOString().slice(0, 10) && !task.isCompleted).length}</div>
                </div>
                <div className="border border-zinc-100 rounded-sm p-4 bg-zinc-50">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">現場聯絡</div>
                  <div className="text-base font-black mt-2">{localData.siteContactName || localData.customerName}</div>
                  <div className="text-sm text-zinc-500">{localData.siteContactPhone || localData.phone || '未填寫'}</div>
                </div>
                <div className="border border-zinc-100 rounded-sm p-4 bg-zinc-50">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">進場限制</div>
                  <div className="text-sm font-medium mt-2 text-zinc-600">{localData.accessConstraints || localData.addressNote || '未填寫'}</div>
                </div>
              </div>
            </Card>
            <div className="bg-white border border-zinc-100 rounded-sm shadow-sm">
              <button
                onClick={() => setWorkflowOpen(!workflowOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 transition-colors"
              >
                <span className="text-sm font-black text-zinc-950 uppercase tracking-tight">工法流程對照 / WORKFLOW REFERENCE</span>
                <ChevronDown size={18} className={`text-zinc-400 transition-transform duration-200 ${workflowOpen ? '' : '-rotate-90'}`} />
              </button>
              {workflowOpen && (
                <div className="border-t border-zinc-100 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {workflowReference.length === 0 && (
                    <div className="text-sm text-zinc-400">尚未設定區域與工法，無法對照流程。</div>
                  )}
                  {workflowReference.map((item, index) => (
                    <div key={`${item.zoneName}-${index}`} className="border border-zinc-100 rounded-sm p-3 space-y-2">
                      <div className="text-[11px] font-black text-zinc-900">
                        {item.zoneName} / {item.methodName}
                      </div>
                      <div className="text-xs text-zinc-600 flex flex-wrap gap-2">
                        {item.steps.length > 0
                          ? item.steps.map((step, stepIndex) => (
                            <span key={`${step.name}-${stepIndex}`} className="px-2 py-1 bg-zinc-50 border border-zinc-100 rounded-sm">
                              {stepIndex + 1}. {step.name}
                            </span>
                          ))
                          : <span className="text-zinc-400">未找到工法步驟</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ConstructionLogTab
              schedule={localData.schedule || []}
              logs={localData.logs || []}
              onUpdate={(newLogs, updatedSchedule) => {
                const newData = { ...localData, logs: newLogs };
                if (updatedSchedule) {
                  newData.schedule = updatedSchedule;
                }
                handleUpdate(newData);
              }}
            />
          </div>
        )}

        {/* TAB 6: WARRANTY */}
        {activeTab === 'warranty' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-zinc-100 rounded-sm p-4">
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">保固紀錄</div>
                <div className="text-2xl font-black mt-2">{localData.warrantyRecords.length}</div>
              </div>
              <div className="bg-white border border-zinc-100 rounded-sm p-4">
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">保內/觀察中</div>
                <div className="text-2xl font-black mt-2">{activeWarrantyCount}</div>
              </div>
              <div className="bg-white border border-zinc-100 rounded-sm p-4">
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">待回訪</div>
                <div className="text-2xl font-black mt-2">{pendingWarrantyCount}</div>
              </div>
              <div className={`border rounded-sm p-4 ${overdueWarrantyCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-zinc-100'}`}>
                <div className={`text-[9px] font-black uppercase tracking-widest ${overdueWarrantyCount > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>已逾期</div>
                <div className="text-2xl font-black mt-2">{overdueWarrantyCount}</div>
              </div>
            </div>

            <Card title="保固快捷 / WARRANTY QUICK ACTIONS">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-zinc-100 rounded-sm p-4 bg-zinc-50">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">完工日期</div>
                  <div className="text-base font-black mt-2">{localData.completionAcceptedDate ? new Date(localData.completionAcceptedDate).toLocaleDateString('zh-TW') : '未填寫'}</div>
                </div>
                <div className="border border-zinc-100 rounded-sm p-4 bg-zinc-50">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">保固狀態</div>
                  <div className="text-base font-black mt-2">{normalizeCaseStatus(localData.status) === CaseStatus.WARRANTY ? '保固進行中' : '尚未切入保固'}</div>
                </div>
                <div className="border border-zinc-100 rounded-sm p-4 bg-zinc-50">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">最近回訪</div>
                  <div className="text-base font-black mt-2">{localData.warrantyRecords[0]?.recordedAt ? new Date(localData.warrantyRecords[0].recordedAt).toLocaleDateString('zh-TW') : '尚無紀錄'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <ExportButton
                  onClick={async () => {
                    const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                    const { generateCompletionPDF } = await getPDFService();
                    return generateCompletionPDF(realParams, 'preview');
                  }}
                  icon={<Eye size={18} />}
                  label="驗收單 / COMPLETION"
                />
                <ExportButton
                  onClick={async () => {
                    const realParams = { ...localData, finalPrice: liveFinalPrice, formalQuotedPrice: frozenQuotePrice, depositPercentage: FIXED_DEPOSIT_RATIO };
                    const { generateWarrantyCertificatePDF } = await getPDFService();
                    return generateWarrantyCertificatePDF(realParams, 'preview');
                  }}
                  icon={<Eye size={18} />}
                  label="保固書 / WARRANTY"
                />
              </div>
            </Card>

            <Card title="保固紀錄 / WARRANTY RECORD">
              <div className="space-y-4">
                {(localData.warrantyRecords || []).length === 0 && (
                  <div className="text-center py-10 text-zinc-400 text-sm font-bold">尚未建立保固案件</div>
                )}
                {(localData.warrantyRecords || []).map((record) => {
                  const isOverdue = Boolean(record.nextVisitDate && record.nextVisitDate < new Date().toISOString().slice(0, 10) && !record.result?.trim());
                  return (
                  <div key={record.id} className={`border rounded-sm p-4 space-y-3 ${isOverdue ? 'border-rose-200 bg-rose-50/40' : 'border-zinc-100'}`}>
                    {isOverdue && <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest">回訪逾期 / OVERDUE</div>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input label="紀錄日期" type="date" value={record.recordedAt} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, recordedAt: e.target.value } : entry) })} />
                      <Input label="回訪日期" type="date" value={record.nextVisitDate || ''} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, nextVisitDate: e.target.value } : entry) })} />
                      <Input label="區域 ID / ZONE" value={record.zoneId || ''} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, zoneId: e.target.value } : entry) })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">類型</label>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">責任歸屬</label>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">原因分類</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select className="border border-zinc-200 rounded-sm px-3 py-2" value={record.type || 'callback'} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, type: e.target.value as WarrantyRecord['type'] } : entry) })}>
                        <option value="callback">客訴回報</option>
                        <option value="inspection">現勘複查</option>
                        <option value="repair">保固修補</option>
                        <option value="closed">結案</option>
                      </select>
                      <select className="border border-zinc-200 rounded-sm px-3 py-2" value={record.responsibility || 'warranty'} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, responsibility: e.target.value as WarrantyRecord['responsibility'] } : entry) })}>
                        <option value="warranty">保固處理</option>
                        <option value="chargeable">保外計價</option>
                        <option value="monitoring">觀察追蹤</option>
                      </select>
                      <select className="border border-zinc-200 rounded-sm px-3 py-2" value={record.causeCategory || 'unknown'} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, causeCategory: e.target.value as WarrantyRecord['causeCategory'] } : entry) })}>
                        <option value="same_defect">同一缺失</option>
                        <option value="new_leak_point">新漏點</option>
                        <option value="upstream_issue">上游漏水源</option>
                        <option value="customer_damage">人為/第三方</option>
                        <option value="unknown">待判定</option>
                      </select>
                    </div>
                    <Input label="問題摘要 / ISSUE SUMMARY" value={record.issueSummary || ''} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, issueSummary: e.target.value } : entry) })} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">處理結果 / RESULT</label>
                        <textarea className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2" value={record.result || ''} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, result: e.target.value } : entry) })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">備註 / NOTE</label>
                        <textarea className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2" value={record.note || ''} onChange={(e) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, note: e.target.value } : entry) })} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">回訪照片 / PHOTOS</label>
                      <ImageUploader images={record.photos || []} onImagesChange={(imgs) => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, photos: imgs } : entry) })} maxImages={4} />
                    </div>
                    <div className="flex justify-end">
                      <Button variant="danger" onClick={() => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.filter((entry) => entry.id !== record.id) })}>刪除紀錄</Button>
                    </div>
                  </div>
                )})}
                <Button variant="outline" onClick={() => handleUpdate({ ...localData, warrantyRecords: [...(localData.warrantyRecords || []), { id: `WR-${Date.now()}`, recordedAt: new Date().toISOString().slice(0, 10), type: 'callback', responsibility: 'warranty', causeCategory: 'unknown', issueSummary: '', result: '', note: '', photos: [] }] })}><Plus size={14} /> 新增保固紀錄</Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {showFormalizeConfirm && (
        <div className="fixed inset-0 z-[120] bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-sm shadow-2xl p-6 space-y-5">
            <div>
              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">FORMALIZATION CONFIRM</div>
              <h3 className="text-lg font-black text-zinc-950 mt-1">確認案件正式成立？</h3>
              <p className="text-sm text-zinc-500 mt-2">
                系統將自動生成正式合約編號（YYYYMMDD-XXX），並移除 EVAL 標記。
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowFormalizeConfirm(false)}>取消 / CANCEL</Button>
              <Button className="flex-1" onClick={confirmFormalizeCase}>確認轉正 / CONFIRM</Button>
            </div>
          </div>
        </div>
      )}

      {/* 手機版底部 Tab 導航 - 可滑動 */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-zinc-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] lg:hidden z-[80]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex overflow-x-auto no-scrollbar px-2 h-20">
          <MobileTabButton
            icon={<Calculator size={24} />}
            label="評估"
            active={activeTab === 'eval'}
            onClick={() => setActiveTab('eval')}
          />
          <MobileTabButton
            icon={<FileCheck size={24} />}
            label="報價"
            active={activeTab === 'quote'}
            onClick={() => setActiveTab('quote')}
          />
          <MobileTabButton
            icon={<Edit size={24} />}
            label="日誌"
            active={activeTab === 'log'}
            onClick={() => setActiveTab('log')}
          />
          <MobileTabButton
            icon={<Package size={24} />}
            label="備料"
            active={activeTab === 'mats'}
            onClick={() => setActiveTab('mats')}
          />
          <MobileTabButton
            icon={<CalendarIcon size={24} />}
            label="工期"
            active={activeTab === 'schedule'}
            onClick={() => setActiveTab('schedule')}
          />
          <MobileTabButton
            icon={<ShieldCheck size={24} />}
            label="保固"
            active={activeTab === 'warranty'}
            onClick={() => setActiveTab('warranty')}
          />
        </div>
      </nav>

      {/* 桌面版底部總價欄 */}
      <div className="hidden lg:flex fixed bottom-0 left-0 w-full bg-white border-t border-zinc-950 p-4 z-[70] md:max-w-7xl md:mx-auto justify-between items-center gap-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col">
          <div className="text-[7px] text-zinc-400 font-black uppercase tracking-widest leading-none mb-1">FINAL TOTAL / 結算</div>
          <div className="font-black text-xl text-zinc-950 leading-none">${liveFinalPrice.toLocaleString()}</div>
        </div>
        <button onClick={flushAndBack} className="flex-1 py-3 px-6 text-[11px] font-black bg-zinc-950 text-white rounded-sm uppercase active:scale-95 shadow-lg">儲存並返回 / SAVE & EXIT</button>
      </div>
    </Layout>
  );
};
