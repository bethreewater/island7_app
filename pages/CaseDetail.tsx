import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator, FileCheck, Layers, Calendar as CalendarIcon,
  Wand2, CheckCircle2, ChevronRight, Plus, Eye,
  FileText, ShieldCheck, Package, Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import { geocodeAddress } from '../services/geocodingService';
import { CaseData, MethodItem, ServiceCategory, CaseStatus, STATUS_LABELS, ScheduleTask } from '../types';
import { getMethods, saveCase, formalizeCase, getCaseDetails } from '../services/storageService';
import { generateContractPDF, generateEvaluationPDF, generateInvoicePDF } from '../services/pdfService';
import { Button, Card, Input } from '../components/InputComponents';
import { Layout } from '../components/Layout';

// Modular Components
import { MaterialList } from '../components/case-detail/MaterialList';
import { ProjectCalendar } from '../components/case-detail/ProjectCalendar';
import { ConstructionLogTab } from '../components/case-detail/ConstructionLogTab';
import { ExportButton } from '../components/case-detail/ExportButton';
import { ZoneCard } from '../components/case-detail/ZoneCard';

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
  onBack: () => void;
  onUpdate: (u: CaseData) => void;
  onNavigate: (view: 'dashboard' | 'datacenter' | 'settings' | 'map') => void;
}> = ({ caseData, onBack, onUpdate, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'eval' | 'log' | 'quote' | 'schedule' | 'warranty'>('eval');
  const [localData, setLocalData] = useState<CaseData>(caseData);
  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [loading, setLoading] = useState(!caseData.zones);

  // Ref to track if the update originated from this component
  const isSelfUpdate = React.useRef(false);
  // Ref for debounce timer
  const saveTimer = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const load = async () => {
      // Always load methods
      getMethods().then(setMethods);

      if (isSelfUpdate.current) {
        isSelfUpdate.current = false;
        return;
      }

      // Check if we received full details or need to fetch
      if (caseData.zones && caseData.logs) {
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

  const calculatedTotal = useMemo(() => {
    if (!localData.zones) return 0;
    return localData.zones.reduce((sum, zone) => sum + (zone.items || []).reduce((zSum, item) => zSum + (item.itemPrice || 0), 0), 0);
  }, [localData?.zones]);

  const generateAutoSchedule = () => {
    if (!localData.startDate) {
      toast.error("請先設定開工日期");
      return;
    }
    const baseDate = new Date(localData.startDate);
    const newSchedule: ScheduleTask[] = [];

    if (localData.zones) {
      localData.zones.forEach(zone => {
        const method = methods.find(m => m.id === zone.methodId);
        if (!method) return;
        method.steps.forEach((step, sIdx) => {
          const taskDate = new Date(baseDate);
          taskDate.setDate(taskDate.getDate() + sIdx);
          newSchedule.push({ taskId: `${zone.zoneId}-${sIdx}`, date: taskDate.toISOString().slice(0, 10), zoneName: zone.zoneName, taskName: step.name, isCompleted: false });
        });
      });
    }
    handleUpdate({ ...localData, schedule: newSchedule });
    toast.success("排程已根據工法步驟自動產出", {
      icon: '📅',
    });
  };


  const handleStatusChange = async (newStatus: CaseStatus) => {
    // Formalization Logic: Assessment -> Deposit Received (Move EVAL- to Formal ID)
    if (newStatus === CaseStatus.DEPOSIT_RECEIVED &&
      localData.status === CaseStatus.ASSESSMENT &&
      localData.caseId.startsWith('EVAL-')) {

      if (confirm("【確認案件正式成立】\n\n是否確認將此評估單轉為正式案件？\n系統將自動生成正式合約編號 (YYYYMMDD-XXX)，並移除 EVAL 標記。")) {
        try {
          const formalized = await formalizeCase(localData);
          onUpdate(formalized);
          toast.success(`案件正式成立！正式編號: ${formalized.caseId}`, {
            duration: 5000,
            icon: '🎉',
          });
          return;
        } catch (e) {
          toast.error("轉正失敗: " + e, { duration: 5000 });
          return;
        }
      } else {
        return; // Cancelled
      }
    }

    handleUpdate({ ...localData, status: newStatus });
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

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 animate-in fade-in space-y-4">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
        <div className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Loading Case...</div>
      </div>
    );
  }

  return (
    <Layout title={localData.customerName} onBack={onBack} onNavigate={onNavigate}>
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
              <Button onClick={() => handleUpdate({ ...localData, zones: [...localData.zones, { zoneId: `Z-${Date.now()}`, zoneName: '新區域', category: ServiceCategory.WALL_CANCER, methodId: '', methodName: '', unit: '坪', unitPrice: 0, difficultyCoefficient: 1, items: [] }] })}><Plus size={14} /> 新增區域 / ADD</Button>
            </div>

            {/* 客戶基本資訊 */}
            <Card title="客戶基本資訊 / CUSTOMER INFO">
              <div className="space-y-4">
                <Input
                  label="客戶姓名 / CUSTOMER NAME"
                  value={localData.customerName}
                  onChange={e => handleUpdate({ ...localData, customerName: e.target.value })}
                />
                <Input
                  label="聯絡電話 / PHONE"
                  value={localData.phone}
                  onChange={e => handleUpdate({ ...localData, phone: e.target.value })}
                />
                <div className="space-y-2">
                  <Input
                    label="施工地址 / ADDRESS"
                    value={localData.address || ''}
                    onChange={(e) => {
                      // 只更新地址文字，不觸發 geocoding
                      handleUpdate({ ...localData, address: e.target.value });
                    }}
                    onBlur={async (e) => {
                      // 當失去焦點時，才進行地址轉經緯度
                      const address = e.target.value.trim();
                      if (!address || address.length < 8) return;

                      // 如果已有座標且地址未改變，不重複轉換
                      if (localData.latitude && localData.longitude && localData.address === address) {
                        return;
                      }

                      console.log('🔍 開始地址轉經緯度:', address);
                      toast.loading('正在解析地址...', { id: 'geocoding' });

                      try {
                        const result = await geocodeAddress(address);
                        if (result) {
                          handleUpdate({
                            ...localData,
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
                  onChange={e => handleUpdate({ ...localData, addressNote: e.target.value })}
                  placeholder="例：3樓、後棟、B1 停車場旁"
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
                  return generateEvaluationPDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽評估 / EVAL"
              />
              <ExportButton
                onClick={() => {
                  const realParams = { ...localData, finalPrice: calculatedTotal + (localData.manualPriceAdjustment || 0) };
                  return generateContractPDF(realParams, 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽合約 / CONTRACT"
              />
              <ExportButton
                onClick={() => {
                  const realParams = { ...localData, finalPrice: calculatedTotal + (localData.manualPriceAdjustment || 0) };
                  return generateInvoicePDF(realParams, 'DEPOSIT', 'preview');
                }}
                icon={<Eye size={20} />}
                label="預覽頭期 / DEPOSIT"
              />
              <ExportButton
                onClick={() => {
                  const realParams = { ...localData, finalPrice: calculatedTotal + (localData.manualPriceAdjustment || 0) };
                  return generateInvoicePDF(realParams, 'FINAL', 'preview');
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
                <Button onClick={generateAutoSchedule} className="w-full py-3"><Wand2 size={18} /> 生成自動排程 / GENERATE</Button>
              </div>
            </Card>

            <ProjectCalendar
              schedule={localData.schedule}
              logs={localData.logs || []}
              onUpdate={(s) => handleUpdate({ ...localData, schedule: s })}
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

      {/* 手機版底部 Tab 導航 - 可滑動 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-zinc-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] lg:hidden z-[80] safe-area-inset-bottom">
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
          <div className="font-black text-xl text-zinc-950 leading-none">${(calculatedTotal + localData.manualPriceAdjustment).toLocaleString()}</div>
        </div>
        <button onClick={onBack} className="flex-1 py-3 px-6 text-[11px] font-black bg-zinc-950 text-white rounded-sm uppercase active:scale-95 shadow-lg">儲存並返回 / SAVE & EXIT</button>
      </div>
    </Layout>
  );
};
