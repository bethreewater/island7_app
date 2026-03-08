import React from 'react';

export const QuickActionButton = React.memo(({
  onClick,
  icon,
  title,
  subtitle,
  badge,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) => (
  <button onClick={onClick} className="group relative min-h-[112px] rounded-sm border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:border-zinc-950 active:scale-95 md:min-h-[132px] md:p-5">
    <div className="absolute right-4 top-4 text-zinc-200 transition-colors group-hover:text-zinc-950">{icon}</div>
    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">{title}</div>
    <div className="mt-2 text-lg font-black tracking-tight text-zinc-950">{subtitle}</div>
    {badge && <div className="mt-4 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{badge}</div>}
  </button>
));
