
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, FolderOpen, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, Book, X, User, Phone, MessageSquare, MapPin, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { CaseData, CaseStatus, STATUS_LABELS } from '../types';
import { getCases, getInitialCase, saveCase, deleteCase, initDB, subscribeToCases, getCaseDetails } from '../services/storageService';
import { Button, Card, Input } from '../components/InputComponents';
import { Layout } from '../components/Layout';
import { TodayTasks } from '../components/TodayTasks';

interface DashboardProps {
  cases: CaseData[];
  onSelectCase: (c: CaseData) => void;
  onOpenKB: () => void;
  onNavigate?: (view: 'dashboard' | 'datacenter' | 'settings') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ cases = [], onSelectCase, onOpenKB, onNavigate }) => {
  // const [cases, setCases] = useState<CaseData[]>([]); // Removed: Lifted to App
  // const [loading, setLoading] = useState(true); // Removed: Handled by App (or ignored for Dashboard)
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLineId, setNewLineId] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Removed useEffect fetching logic


  const stats = useMemo(() => {
    const assessmentStatuses = [CaseStatus.ASSESSMENT, CaseStatus.NEW];
    const activeStatuses = [CaseStatus.DEPOSIT_RECEIVED, CaseStatus.PLANNING, CaseStatus.CONSTRUCTION, CaseStatus.FINAL_PAYMENT, CaseStatus.PROGRESS];
    const doneStatuses = [CaseStatus.COMPLETED, CaseStatus.WARRANTY, CaseStatus.DONE];

    return {
      assessment: cases.filter(c => assessmentStatuses.includes(c.status as CaseStatus)).length,
      progress: cases.filter(c => activeStatuses.includes(c.status as CaseStatus)).length,
      done: cases.filter(c => doneStatuses.includes(c.status as CaseStatus)).length,
      revenue: cases.reduce((sum, c) => sum + (c.finalPrice || 0), 0)
    };
  }, [cases]);

  // ... (keep handleSave)
  const handleSave = async () => {
    // ... (Keep existing handleSave implementation logic exactly, assume no changes needed inside)
    if (!newClient) return;
    try {
      let caseToSave: CaseData;

      if (editingCaseId) {
        const existingCase = cases.find(c => c.caseId === editingCaseId);
        if (!existingCase) throw new Error("Case not found");

        caseToSave = {
          ...existingCase,
          customerName: newClient,
          phone: newPhone,
          lineId: newLineId,
          address: newAddress,
        };
      } else {
        caseToSave = await getInitialCase(newClient, newPhone, newAddress, newLineId);
      }

      await saveCase(caseToSave);

      if (!editingCaseId) {
        onSelectCase(caseToSave);
      }

      setNewClient('');
      setNewPhone('');
      setNewLineId('');
      setNewAddress('');
      setEditingCaseId(null);
      setShowNewModal(false);
    } catch (e: any) {
      toast.error("儲存失敗: " + (e.message || "未知錯誤"), { duration: 5000 });
    }
  };


  const handleEdit = (c: CaseData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setEditingCaseId(c.caseId);
    setNewClient(c.customerName);
    setNewPhone(c.phone);
    setNewLineId(c.lineId || '');
    setNewAddress(c.address);
    setShowNewModal(true);
  };

  const handleDelete = async (caseId: string, caseName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (confirm(`確定要刪除案件「${caseName}」嗎？此動作無法復原！`)) {
      try {
        await deleteCase(caseId);
        // Data will reload via subscription
      } catch (err: any) {
        toast.error("刪除失敗: " + err.message, { duration: 5000 });
      }
    }
  };

  const handleCaseClick = async (caseId: string) => {
    setLoading(true);
    try {
      const fullData = await getCaseDetails(caseId);
      if (fullData) {
        onSelectCase(fullData);
      } else {
        throw new Error('Case data missing');
      }
    } catch (err) {
      toast.error('無法讀取案件詳細資料', { duration: 5000 });
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c =>
    c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.caseId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-8 h-8 md:w-12 md:h-12 border-[3px] md:border-4 border-zinc-100 border-t-zinc-950 rounded-full animate-spin mb-3"></div>
      <div className="text-zinc-400 text-[8px] md:text-[9px] font-black tracking-widest uppercase whitespace-nowrap">SYSTEM LOADING</div>
    </div>
  );

  if (error) {
    return (
      <Layout
        title="系統管理首頁 / DASHBOARD"
        onNavigate={onNavigate}
        currentView="dashboard"
      >
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-bold">{error}</span>
          <Button onClick={() => window.location.reload()} variant="outline" className="ml-auto text-xs">重試 / RETRY</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="系統管理首頁 / DASHBOARD"
      onNavigate={onNavigate}
      currentView="dashboard"
    >
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Today's Tasks Widget */}
        <TodayTasks cases={cases} onSelectCase={handleCaseClick} />

        {/* 數據卡片 / COMPACT STATS FOR MOBILE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatCard icon={<FolderOpen size={14} />} label="評估 / EVAL" value={stats.assessment} />
          <StatCard icon={<AlertCircle size={14} />} label="進行 / ACTIVE" value={stats.progress} dark />
          <StatCard icon={<CheckCircle2 size={14} />} label="完工 / DONE" value={stats.done} />
          <StatCard icon={<TrendingUp size={14} />} label="營收 / REVENUE" value={`$${parseFloat((stats.revenue / 1000).toFixed(1))}k`} />
        </div>

        {/* 操作按鈕 / COMPACT ACTIONS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-12">
          <QuickActionButton
            onClick={() => {
              setEditingCaseId(null);
              setNewClient('');
              setNewPhone('');
              setNewLineId('');
              setNewAddress('');
              setShowNewModal(true);
            }}
            icon={<Plus size={20} />}
            title="建立 / NEW"
            subtitle="新增檔案"
          />
          <QuickActionButton
            onClick={onOpenKB}
            icon={<Book size={20} />}
            title="知識 / KB"
            subtitle="技術手冊"
          />
          <div className="col-span-2 md:col-span-1 bg-white border border-zinc-200 rounded-sm p-3 md:p-5 flex flex-col justify-between shadow-sm">
            <div className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap leading-none">搜尋 / SEARCH</div>
            <div className="relative mt-1 md:mt-2">
              <Search className="absolute left-0 top-1 text-zinc-300" size={16} md:size={20} />
              <input
                className="w-full bg-transparent border-none focus:ring-0 pl-6 md:pl-8 text-sm md:text-base font-black placeholder-zinc-100 outline-none"
                placeholder="搜尋案件..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 清單標題 / HEADER */}
        <div className="flex items-end justify-between border-b md:border-b-2 border-zinc-950 pb-2 md:pb-3 mb-4 md:mb-6">
          <div className="whitespace-nowrap min-w-0">
            <h2 className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5 leading-none">PROJECT ARCHIVE</h2>
            <div className="text-lg md:text-2xl font-black text-zinc-950 tracking-tighter uppercase leading-none truncate">案件清單 / RECENT</div>
          </div>
          <div className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded-sm whitespace-nowrap">{filteredCases.length} 筆</div>
        </div>

        {/* 列表內容 / LIST - COMPACT FOR MOBILE */}
        <div className="space-y-2 md:space-y-3">
          {filteredCases.length > 0 ? filteredCases.map(c => (
            <div
              key={c.caseId}
              onClick={() => handleCaseClick(c.caseId)}
              className="group bg-white border border-zinc-100 rounded-sm p-3 md:p-5 hover:border-zinc-950 transition-all cursor-pointer flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-4 md:gap-6 min-w-0">
                <div className={`w-1 h-8 md:w-1.5 md:h-10 rounded-full shrink-0 ${c.status === CaseStatus.PROGRESS ? 'bg-zinc-950' : 'bg-zinc-100'}`}></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 whitespace-nowrap overflow-hidden">
                    <span className="font-black text-sm md:text-lg tracking-tight text-zinc-950 uppercase truncate">{c.customerName}</span>
                    {/* Status Badge */}
                    <span className={`text-[8px] md:text-[10px] px-2 py-0.5 rounded-sm border uppercase font-black tracking-widest ${[CaseStatus.DEPOSIT_RECEIVED, CaseStatus.PLANNING, CaseStatus.CONSTRUCTION, CaseStatus.FINAL_PAYMENT, CaseStatus.PROGRESS].includes(c.status as CaseStatus) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      [CaseStatus.COMPLETED, CaseStatus.DONE].includes(c.status as CaseStatus) ? 'bg-zinc-100 text-zinc-500 border-zinc-200' :
                        c.status === CaseStatus.WARRANTY ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-zinc-950 text-white border-zinc-950'
                      }`}>
                      {STATUS_LABELS[c.status] || (c.status as string).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-zinc-300 tracking-tight whitespace-nowrap opacity-60">
                    <MapPin size={8} md:size={10} /> <span className="truncate">{c.address || '未填寫地址'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                {/* 編輯/刪除按鈕 (Desktop shows on hover, Mobile always visible) */}
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleEdit(c, e)}
                    className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-950 transition-colors"
                    title="編輯案件"
                  >
                    <Edit size={14} md:size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(c.caseId, c.customerName, e)}
                    className="p-2 hover:bg-red-50 rounded-full text-zinc-400 hover:text-red-600 transition-colors"
                    title="刪除案件"
                  >
                    <Trash2 size={14} md:size={16} />
                  </button>
                </div>

                <div className="text-right whitespace-nowrap">
                  <div className="text-[12px] md:text-base font-black text-zinc-950 tracking-tighter leading-none">${(c.finalPrice || 0).toLocaleString()}</div>
                </div>
                <ArrowRight size={16} md:size={20} className="text-zinc-100 group-hover:text-zinc-950 transition-all" />
              </div>
            </div>
          )) : (
            <div className="text-center py-20 border border-dotted border-zinc-100 rounded-sm">
              <div className="text-zinc-200 font-black tracking-widest uppercase text-[8px] italic">NO RECORDS</div>
            </div>
          )}
        </div>

        {/* 新增彈窗 / COMPACT MODAL FOR MOBILE */}
        {showNewModal && (
          <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-3">
            <div className="bg-white rounded-sm shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-800 animate-in zoom-in-95 duration-200">
              <div className="bg-zinc-950 text-white px-5 py-4 flex justify-between items-center whitespace-nowrap">
                <div>
                  <h3 className="font-black text-base md:text-xl tracking-tight uppercase leading-none">
                    {editingCaseId ? '編輯檔案 / EDIT' : '建立檔案 / CREATE'}
                  </h3>
                </div>
                <button onClick={() => setShowNewModal(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-90">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 md:p-8 space-y-4 md:space-y-6 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithIcon icon={<User size={12} />} label="客戶姓名 / NAME *" placeholder="全名" value={newClient} onChange={e => setNewClient(e.target.value)} />
                  <InputWithIcon icon={<Phone size={12} />} label="聯絡電話 / PHONE" placeholder="09XX..." value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithIcon icon={<MessageSquare size={12} />} label="通訊識別 / LINE ID" placeholder="ID" value={newLineId} onChange={e => setNewLineId(e.target.value)} />
                  <InputWithIcon icon={<MapPin size={12} />} label="施工地址 / ADDRESS" placeholder="完整地點" value={newAddress} onChange={e => setNewAddress(e.target.value)} />
                </div>
                <div className="pt-4 flex gap-2 border-t border-zinc-50">
                  <Button variant="outline" className="flex-1" onClick={() => setShowNewModal(false)}>取消 / CANCEL</Button>
                  <Button className="flex-1" onClick={handleSave} disabled={!newClient}>
                    {editingCaseId ? '儲存變更 / SAVE' : '確認建立 / OK'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const StatCard = ({ icon, label, value, dark = false }: { icon: React.ReactNode, label: string, value: string | number, dark?: boolean }) => (
  <div className={`${dark ? 'bg-zinc-950 text-white border-zinc-900 shadow-md' : 'bg-white text-zinc-950 border-zinc-100'} p-3 md:p-5 rounded-sm border flex flex-col justify-between h-20 md:h-32 transition-all`}>
    <div className={`text-[7px] md:text-[9px] font-black flex items-center gap-1 md:gap-2 tracking-widest uppercase whitespace-nowrap leading-none ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
      {icon} {label.split(' / ')[0]}
    </div>
    <div className="text-xl md:text-3xl font-black tracking-tighter leading-none whitespace-nowrap">{value}</div>
  </div>
);

const QuickActionButton = ({ onClick, icon, title, subtitle }: { onClick: () => void, icon: React.ReactNode, title: string, subtitle: string }) => (
  <button onClick={onClick} className="group relative h-20 md:h-32 bg-white border border-zinc-200 rounded-sm p-4 md:p-6 text-left hover:border-zinc-950 transition-all shadow-sm active:scale-95 overflow-hidden">
    <div className="absolute top-4 right-4 text-zinc-100 md:group-hover:text-zinc-950 transition-all">{icon}</div>
    <div className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5 leading-none">{title}</div>
    <div className="text-sm md:text-lg font-black text-zinc-950 tracking-tighter uppercase whitespace-nowrap leading-none">{subtitle}</div>
  </button>
);

const InputWithIcon = ({ icon, label, ...props }: any) => (
  <div className="space-y-1">
    <label className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap leading-none">
      {icon} {label}
    </label>
    <Input {...props} className="font-black py-1.5 md:py-2.5 text-xs md:text-sm shadow-none" />
  </div>
);
