import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    label: string;
    count?: number;
}

export const TabButton = ({ active, onClick, icon: Icon, label, count }: TabButtonProps) => (
    <button
        onClick={onClick}
        className={`
      group relative flex items-center gap-2 py-4 section-label transition-all duration-200 select-none btn-ghost
      ${active
                ? 'text-styx-600'
                : 'text-slate-500'
            }
    `}
    >
        <Icon
            className={`w-4 h-4 transition-colors ${active ? 'text-styx-600' : 'text-slate-500 group-hover:text-stone-500'}`}
            strokeWidth={active ? 2.5 : 2}
        />

        <span className="leading-none pt-px">{label}</span>

        {/* Counter Badge - Perfectly Aligned */}
        {count !== undefined && count > 0 && (
            <span className={`
        ml-1 font-mono text-xs leading-none flex items-center
        ${active ? 'text-obol-500 font-bold' : 'text-slate-500 group-hover:text-stone-500'}
      `}>
                [{count}]
            </span>
        )}

        {/* Active Indicator Line */}
        <div
            className={`
        absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300
        ${active ? 'bg-styx-600 opacity-100' : 'bg-slate-200 opacity-0 group-hover:opacity-50'}
      `}
        />
    </button>
);
