import React from 'react';

export const StatCard = React.memo(({ icon, label, value, dark = false }: { icon: React.ReactNode; label: string; value: string | number; dark?: boolean }) => (
  <div className={`${dark ? 'bg-zinc-950 text-white border-zinc-900 shadow-md' : 'bg-white text-zinc-950 border-zinc-100'} p-3 md:p-5 rounded-sm border flex flex-col justify-between h-20 md:h-32 transition-all`}>
    <div className={`text-[7px] md:text-[9px] font-black flex items-center gap-1 md:gap-2 tracking-widest uppercase whitespace-nowrap leading-none ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
      {icon} {label.split(' / ')[0]}
    </div>
    <div className="text-xl md:text-3xl font-black tracking-tighter leading-none whitespace-nowrap">{value}</div>
  </div>
));
