import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator, FileCheck, Layers, Calendar as CalendarIcon,
  Wand2, CheckCircle2, ChevronRight, ChevronDown, Plus, Eye,
  FileText, ShieldCheck, Package, Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import { geocodeAddress } from '../services/geocodingService';
import { CaseData, MethodItem, ServiceCategory, CaseStatus, STATUS_LABELS, ScheduleTask, ConstructionLog, NavigationView, normalizeCaseStatus, WarrantyRecord, ChangeOrder, Zone } from '../types';
import { getMethods, saveCase, formalizeCase, getCaseDetails } from '../services/storageService';
import { Button, Card, Input, ImageUploader } from '../components/InputComponents';
import { Layout } from '../components/Layout';
import { getPaymentBreakdown, normalizeDepositRatio } from '../utils/payment';

// Modular Components
import { MaterialList } from '../components/case-detail/MaterialList';
import { ProjectCalendar } from '../components/case-detail/ProjectCalendar';
import { ConstructionLogTab } from '../components/case-detail/ConstructionLogTab';
import { ZoneCard } from '../components/case-detail/ZoneCard';
import { CaseCommercialTab } from '../components/case-detail/CaseCommercialTab';
import { CaseWarrantyTab } from '../components/case-detail/CaseWarrantyTab';

const STATUS_ORDER = [
  CaseStatus.ASSESSMENT,
  CaseStatus.DEPOSIT_RECEIVED,
  CaseStatus.PLANNING,
  CaseStatus.CONSTRUCTION,
  CaseStatus.FINAL_PAYMENT,
  CaseStatus.COMPLETED,
  CaseStatus.WARRANTY,
];

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
      depositPercentage: normalizeDepositRatio(newData.depositPercentage),
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

  const patchDraft = useCallback((patch: Partial<CaseData>) => {
    setLocalData({ ...latestDataRef.current, ...patch });
  }, []);

  const patchCase = useCallback((patch: Partial<CaseData>) => {
    handleUpdate({ ...latestDataRef.current, ...patch });
  }, [handleUpdate]);

  const replaceZones = useCallback((zones: CaseData['zones']) => {
    patchCase({ zones });
  }, [patchCase]);

  const addZone = useCallback(() => {
    replaceZones([
      ...latestDataRef.current.zones,
      {
        zoneId: `Z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        zoneName: '新區域',
        category: ServiceCategory.WALL_CANCER,
        methodId: '',
        methodName: '',
        unit: '坪',
        unitPrice: 0,
        difficultyCoefficient: 1,
        items: [],
      },
    ]);
  }, [replaceZones]);

  const updateZone = useCallback((index: number, zone: Zone) => {
    const nextZones = [...latestDataRef.current.zones];
    nextZones[index] = zone;
    replaceZones(nextZones);
  }, [replaceZones]);

  const removeZone = useCallback((index: number) => {
    replaceZones(latestDataRef.current.zones.filter((_, i) => i !== index));
  }, [replaceZones]);

  const calculatedTotal = useMemo(() => {
    if (!localData.zones) return 0;
    return localData.zones.reduce((sum, zone) => sum + (zone.items || []).reduce((zSum, item) => zSum + (item.itemPrice || 0), 0), 0);
  }, [localData?.zones]);

  const liveFinalPrice = calculatedTotal + (localData.manualPriceAdjustment || 0);
  const frozenQuotePrice = localData.formalQuotedPrice || liveFinalPrice;
  const { depositRatio, finalRatio, depositAmount, finalAmount: finalPaymentAmount, depositPercent, finalPercent } = useMemo(
    () => getPaymentBreakdown(frozenQuotePrice, localData.depositPercentage),
    [frozenQuotePrice, localData.depositPercentage]
  );
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
    patchCase({ schedule: newSchedule, logs: mergedLogs });

    const logMsg = autoLogs.length > 0 ? `，同步 ${autoLogs.length} 筆日誌` : '';
    toast.success(`排程 ${newSchedule.length} 筆已產出${logMsg}`, { icon: '📅' });
  }, [localData, methods, patchCase]);


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

    patchCase({
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
      const formalized = await formalizeCase({ ...localData, formalQuotedPrice: frozenQuotePrice, depositPercentage: depositRatio });
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
              <Button onClick={addZone}><Plus size={14} /> 新增區域 / ADD</Button>
            </div>

            {/* 客戶基本資訊 */}
            <Card title="客戶基本資訊 / CUSTOMER INFO">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="客戶姓名 / CUSTOMER NAME"
                    value={localData.customerName}
                    onChange={(e) => patchDraft({ customerName: e.target.value })}
                    onBlur={(e) => patchCase({ customerName: e.target.value, invoiceTitle: latestDataRef.current.invoiceTitle || e.target.value, siteContactName: latestDataRef.current.siteContactName || e.target.value })}
                  />
                  <Input
                    label="聯絡電話 / PHONE"
                    value={localData.phone}
                    onChange={(e) => patchDraft({ phone: e.target.value })}
                    onBlur={(e) => patchCase({ phone: e.target.value, siteContactPhone: latestDataRef.current.siteContactPhone || e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="現場聯絡人 / SITE CONTACT"
                    value={localData.siteContactName || ''}
                    onChange={(e) => patchDraft({ siteContactName: e.target.value })}
                    onBlur={(e) => patchCase({ siteContactName: e.target.value })}
                  />
                  <Input
                    label="現場電話 / SITE PHONE"
                    value={localData.siteContactPhone || ''}
                    onChange={(e) => patchDraft({ siteContactPhone: e.target.value })}
                    onBlur={(e) => patchCase({ siteContactPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    label="施工地址 / ADDRESS"
                    value={localData.address || ''}
                    onChange={(e) => {
                      patchDraft({ address: e.target.value });
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
                           handleUpdate({ ...latest, address, latitude: result.latitude, longitude: result.longitude });
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
                  onChange={(e) => patchDraft({ addressNote: e.target.value })}
                  onBlur={(e) => patchCase({ addressNote: e.target.value })}
                  placeholder="例：3樓、後棟、B1 停車場旁"
                />
                <Input
                  label="建物/樓層資訊 / BUILDING CONTEXT"
                  value={localData.buildingContext || ''}
                  onChange={(e) => patchDraft({ buildingContext: e.target.value })}
                  onBlur={(e) => patchCase({ buildingContext: e.target.value })}
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
                          patchCase({ latitude: val ? parseFloat(val) : undefined });
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
                          patchCase({ longitude: val ? parseFloat(val) : undefined });
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
                      onChange={(e) => patchDraft({ leakSymptoms: e.target.value })}
                      onBlur={(e) => patchCase({ leakSymptoms: e.target.value })}
                      placeholder="例：窗框滲水、頂樓積水、浴室牆角返潮"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">漏水源判定 / ROOT CAUSE</label>
                    <textarea
                      className="w-full min-h-28 border border-zinc-200 rounded-sm px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 font-medium"
                      value={localData.leakSourceDiagnosis || ''}
                      onChange={(e) => patchDraft({ leakSourceDiagnosis: e.target.value })}
                      onBlur={(e) => patchCase({ leakSourceDiagnosis: e.target.value })}
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
                      onChange={(e) => patchDraft({ accessConstraints: e.target.value })}
                      onBlur={(e) => patchCase({ accessConstraints: e.target.value })}
                      placeholder="例：僅週末可施工、需通知管委會、需吊料"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">備註 / SPECIAL NOTE</label>
                    <textarea
                      className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 font-medium"
                      value={localData.specialNote || ''}
                      onChange={(e) => patchDraft({ specialNote: e.target.value })}
                      onBlur={(e) => patchCase({ specialNote: e.target.value })}
                      placeholder="例：住戶要求先做測試區、材料需低味道"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {localData.zones.map((zone, zIdx) => (
              <ZoneCard key={zone.zoneId} zone={zone} methods={methods} onUpdate={(uz) => updateZone(zIdx, uz)} onDelete={() => removeZone(zIdx)} />
            ))}
          </div>
        )}

        {/* TAB 2: QUOTATION */}
        {activeTab === 'quote' && (
          <CaseCommercialTab
            localData={localData}
            calculatedTotal={calculatedTotal}
            liveFinalPrice={liveFinalPrice}
            frozenQuotePrice={frozenQuotePrice}
            depositRatio={depositRatio}
            depositAmount={depositAmount}
            finalPaymentAmount={finalPaymentAmount}
            depositPercent={depositPercent}
            finalPercent={finalPercent}
            setLocalData={setLocalData}
            latestDataRef={latestDataRef}
            handleUpdate={handleUpdate}
            getPDFService={getPDFService}
          />
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
                <Input label="開工預定日 / START DATE" type="date" value={localData.startDate || ''} onChange={e => patchCase({ startDate: e.target.value })} />
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
              onUpdate={(s) => patchCase({ schedule: s })}
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
              onExportPdf={async () => {
                const { generateConstructionLogPDF } = await getPDFService();
                return generateConstructionLogPDF(localData, 'save');
              }}
              onExportDailyPdf={async (date) => {
                const dayLogs = (localData.logs || []).filter((log) => log.date === date);
                if (dayLogs.length === 0) {
                  toast.error('該日期沒有施工日誌可匯出');
                  return;
                }
                const { generateConstructionLogPDF } = await getPDFService();
                return generateConstructionLogPDF(localData, 'save', { targetDate: date });
              }}
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
          <CaseWarrantyTab
            localData={localData}
            liveFinalPrice={liveFinalPrice}
            frozenQuotePrice={frozenQuotePrice}
            depositRatio={depositRatio}
            activeWarrantyCount={activeWarrantyCount}
            pendingWarrantyCount={pendingWarrantyCount}
            overdueWarrantyCount={overdueWarrantyCount}
            handleUpdate={handleUpdate}
            getPDFService={getPDFService}
          />
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
