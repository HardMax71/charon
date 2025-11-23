import React from 'react';

interface TechCellProps {
  index: string;
  icon: React.ReactElement;
  label: string;
  title: string;
  desc: string;
}

export const TechCell = ({ index, icon, label, title, desc }: TechCellProps) => (
  <div className="px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r last:border-b-0 sm:last:border-r-0 flex flex-col gap-1.5 sm:gap-2 group hover:bg-slate-50 transition-colors border-slate-200">
    <div className="flex items-start justify-between mb-1 sm:mb-2">
      <span className="font-mono text-base sm:text-xl text-slate-300 group-hover:text-slate-400 transition-colors">
        {index}
      </span>
      <div className="p-1 sm:p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 14, className: 'sm:w-4 sm:h-4' })}
      </div>
    </div>

    <span className="inline-block font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-500 mb-1 sm:mb-1.5 border border-slate-200 px-1.5 py-0.5 rounded bg-white w-fit">
      {label}
    </span>
    <h3 className="text-xs sm:text-sm font-bold mb-1 sm:mb-1.5 text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
      {title}
    </h3>
    <p className="text-[10px] sm:text-xs text-slate-600 leading-snug">
      {desc}
    </p>
  </div>
);
