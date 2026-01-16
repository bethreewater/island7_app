
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, FolderOpen, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, Book, X, User, Phone, MessageSquare, MapPin } from 'lucide-react';
import { CaseData, CaseStatus } from '../types';
import { getCases, getInitialCase, saveCase, initDB, subscribeToCases } from '../services/storageService';
import { Button, Card, Input } from '../components/InputComponents';
import { Layout } from '../components/Layout';

interface DashboardProps {
  onSelectCase: (c: CaseData) => void;
  onOpenKB: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectCase, onOpenKB }) => {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLineId, setNewLineId] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        await initDB();
        const loadedCases = await getCases();
        setCases(loadedCases.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
      } catch (e: any) {
        console.error("Failed to load cases", e);
        setError(e.message || "無法載入資料，請檢查網路連線");
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // 訂閱即時更新
    const subscription = subscribeToCases(() => {
      loadData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const stats = useMemo(() => ({
    total: cases.length,
    progress: cases.filter(c => c.status === CaseStatus.PROGRESS).length,
    done: cases.filter(c => c.status === CaseStatus.DONE).length,
    revenue: cases.reduce((sum, c) => sum + (c.finalPrice || 0), 0)
  }), [cases]);

  const handleCreate = async () => {
    if (!newClient) return;
    try {
      const newCase = await getInitialCase(newClient, newPhone, newAddress, newLineId);
      await saveCase(newCase);
      onSelectCase(newCase);
      setNewClient('');
      setNewPhone('');
      setNewLineId('');
      setNewAddress('');
      setShowNewModal(false);
      setNewAddress('');
      setShowNewModal(false);
    } catch (e: any) {
      alert("建立失敗: " + (e.message || "未知錯誤"));
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

  return (
    <Layout title="管理總覽 / DASHBOARD">

      {/* 錯誤提示 / ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-4 flex items-center gap-2">
          <AlertCircle size={20} />
          <span className="font-bold text-sm">{error}</span>
          <button onClick={() => window.location.reload()} className="ml-auto text-xs underline">重試</button>
        </div>
      )}

      {/* 數據卡片 / COMPACT STATS FOR MOBILE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard icon={<FolderOpen size={14} />} label="案件 / TOTAL" value={stats.total} />
        <StatCard icon={<AlertCircle size={14} />} label="進度 / ACTIVE" value={stats.progress} dark />
        <StatCard icon={<CheckCircle2 size={14} />} label="完工 / DONE" value={stats.done} />
        <StatCard icon={<TrendingUp size={14} />} label="營收 / REVENUE" value={`$${(stats.revenue / 10000).toFixed(0)}W`} />
      </div>

      {/* 操作按鈕 / COMPACT ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-12">
        <QuickActionButton
          onClick={() => setShowNewModal(true)}
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
            onClick={() => onSelectCase(c)}
            className="group bg-white border border-zinc-100 rounded-sm p-3 md:p-5 hover:border-zinc-950 transition-all cursor-pointer flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-4 md:gap-6 min-w-0">
              <div className={`w-1 h-8 md:w-1.5 md:h-10 rounded-full shrink-0 ${c.status === CaseStatus.PROGRESS ? 'bg-zinc-950' : 'bg-zinc-100'}`}></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 whitespace-nowrap overflow-hidden">
                  <span className="font-black text-sm md:text-lg tracking-tight text-zinc-950 uppercase truncate">{c.customerName}</span>
                  <span className={`text-[6px] md:text-[8px] px-1.5 py-0.5 rounded-sm border uppercase font-black tracking-widest ${c.status === CaseStatus.NEW ? 'bg-zinc-950 text-white' : 'text-zinc-400'}`}>
                    {c.status === CaseStatus.NEW ? 'NEW' : c.status === CaseStatus.PROGRESS ? 'RUN' : 'END'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-zinc-300 tracking-tight whitespace-nowrap opacity-60">
                  <MapPin size={8} md:size={10} /> <span className="truncate">{c.address || '未填寫地址'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
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
                <h3 className="font-black text-base md:text-xl tracking-tight uppercase leading-none">建立檔案 / CREATE</h3>
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
                <Button className="flex-1" onClick={handleCreate} disabled={!newClient}>確認建立 / OK</Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
