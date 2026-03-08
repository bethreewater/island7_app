import React from 'react';

export const StatCard = React.memo(({
  icon,
  label,
  value,
  helper,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'default' | 'dark' | 'blue' | 'amber' | 'emerald' | 'rose';
}) => {
  const toneClass = {
    default: 'border-zinc-200 bg-white text-zinc-950',
    dark: 'border-zinc-950 bg-zinc-950 text-white',
    blue: 'border-blue-200 bg-blue-50/70 text-blue-950',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-950',
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
    rose: 'border-rose-200 bg-rose-50/70 text-rose-950',
  }[tone];

  const labelClass = tone === 'dark' ? 'text-zinc-400' : 'text-zinc-400';
  const helperClass = tone === 'dark' ? 'text-zinc-500' : 'text-zinc-500';

  return (
    <div className={`flex min-h-[128px] flex-col justify-between rounded-sm border p-4 shadow-sm transition-all md:p-5 ${toneClass}`}>
      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] ${labelClass}`}>
        {icon} {label}
      </div>
      <div>
        <div className="text-2xl font-black tracking-tight md:text-3xl">{value}</div>
        {helper && <div className={`mt-2 text-xs ${helperClass}`}>{helper}</div>}
      </div>
    </div>
  );
});
