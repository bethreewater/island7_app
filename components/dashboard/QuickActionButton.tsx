import React from 'react';

export const QuickActionButton = React.memo(({ onClick, icon, title, subtitle }: { onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) => (
  <button onClick={onClick} className="group relative h-20 md:h-32 bg-white border border-zinc-200 rounded-sm p-4 md:p-6 text-left hover:border-zinc-950 transition-all shadow-sm active:scale-95 overflow-hidden">
    <div className="absolute top-4 right-4 text-zinc-100 md:group-hover:text-zinc-950 transition-all">{icon}</div>
    <div className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5 leading-none">{title}</div>
    <div className="text-sm md:text-lg font-black text-zinc-950 tracking-tighter uppercase whitespace-nowrap leading-none">{subtitle}</div>
  </button>
));
