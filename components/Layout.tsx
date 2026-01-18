
import React from 'react';
import { Home, FileText, Settings, ChevronLeft, TrendingUp, Map } from 'lucide-react';


interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  onNavigate?: (view: 'dashboard' | 'datacenter' | 'settings' | 'map') => void;
  currentView?: 'dashboard' | 'datacenter' | 'settings' | 'map';
}

export const Layout: React.FC<LayoutProps> = ({ children, title, onBack, onNavigate, currentView = 'dashboard' }) => {
  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans selection:bg-black selection:text-white">
      {/* 頂部導覽列 / OPTIMIZED HEADER FOR MOBILE */}
      <header className="bg-zinc-950 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-5 md:px-10 h-16 md:h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-10">
            {onBack ? (
              <button onClick={onBack} className="p-2 md:p-3.5 hover:bg-white/10 rounded-full transition-all group border border-zinc-800 shadow-lg active:scale-90">
                <ChevronLeft size={20} className="md:w-7 md:h-7 group-hover:-translate-x-1 transition-transform" />
              </button>
            ) : (
              // Make logo clickable to go home
              <button onClick={() => onNavigate?.('dashboard')} className="w-10 h-10 md:w-14 md:h-14 bg-white flex items-center justify-center rounded-sm shadow-xl transition-transform hover:rotate-12 cursor-pointer">
                <div className="w-5 h-5 md:w-8 md:h-8 border-[3px] md:border-[5px] border-black rotate-45"></div>
              </button>
            )}
            <div className="whitespace-nowrap">
              <h1 className="font-black text-lg md:text-2xl tracking-tighter uppercase leading-none">{title}</h1>
              <div className="text-[7px] md:text-[9px] uppercase font-black tracking-[0.3em] md:tracking-[0.5em] text-zinc-500 leading-none mt-1.5 md:mt-3">Island No. 7 / System</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-14 text-[10px] font-black tracking-[0.4em] uppercase whitespace-nowrap">
            <button
              onClick={() => onNavigate?.('dashboard')}
              className={`transition-colors ${currentView === 'dashboard' ? 'text-white border-b-2 border-white pb-1 cursor-default' : 'text-zinc-500 hover:text-white'}`}
            >
              管理首頁 / DASHBOARD
            </button>
            <button
              onClick={() => onNavigate?.('datacenter')}
              className={`transition-colors ${currentView === 'datacenter' ? 'text-white border-b-2 border-white pb-1 cursor-default' : 'text-zinc-500 hover:text-white'}`}
            >
              數據中心 / ANALYTICS
            </button>
            <button
              onClick={() => onNavigate?.('map')}
              className={`transition-colors ${currentView === 'map' ? 'text-white border-b-2 border-white pb-1 cursor-default' : 'text-zinc-500 hover:text-white'}`}
            >
              施工地圖 / MAP
            </button>
            <button
              onClick={() => onNavigate?.('settings')}
              className={`transition-colors ${currentView === 'settings' ? 'text-white border-b-2 border-white pb-1 cursor-default' : 'text-zinc-500 hover:text-white'}`}
            >
              系統設定 / SETTINGS
            </button>
          </div>
        </div>
      </header>

      {/* 核心內容 / MAIN CONTENT - REDUCED PADDING ON MOBILE */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-10 pb-48 md:pb-32">
        {children}
      </main>

      {/* 行動端導航列 / MOBILE NAVIGATION */}
      {/* 行動端導航列 / MOBILE NAVIGATION */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-3xl border-t border-zinc-100 flex justify-around py-4 pb-safe z-[60] md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavButton
          icon={<Home size={20} />}
          label="總覽 / DASHBOARD"
          active={currentView === 'dashboard'}
          onClick={() => onNavigate?.('dashboard')}
        />
        <NavButton
          icon={<TrendingUp size={20} />}
          label="數據 / ANALYTICS"
          active={currentView === 'datacenter'}
          onClick={() => onNavigate?.('datacenter')}
        />
        <NavButton
          icon={<Map size={20} />}
          label="地圖 / MAP"
          active={currentView === 'map'}
          onClick={() => onNavigate?.('map')}
        />
        <NavButton
          icon={<Settings size={20} />}
          label="設定 / SETTINGS"
          active={currentView === 'settings'}
          onClick={() => onNavigate?.('settings')}
        />
      </nav>
    </div>
  );
};

const NavButton = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all whitespace-nowrap ${active ? 'text-black scale-105' : 'text-zinc-300 hover:text-black'}`}>
    {icon}
    <span className="text-[8px] font-black uppercase tracking-[0.1em]">{label.split(' / ')[1]}</span>
    {active && <div className="w-1 h-1 bg-black rounded-full mt-0.5"></div>}
  </button>
);
