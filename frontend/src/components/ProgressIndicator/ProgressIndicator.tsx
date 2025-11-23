import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Network, Timer, Cpu } from 'lucide-react';

export const ProgressIndicator = () => {
  const isLoading = useUIStore(state => state.isLoading);
  const loadingProgress = useUIStore(state => state.loadingProgress);
  const loadingMessage = useUIStore(state => state.loadingMessage);
  const [elapsed, setElapsed] = useState(0);

  // Precision Timer
  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => setElapsed(p => p + 0.01), 10); // 10ms for smooth decimals
    return () => clearInterval(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">

      {/* 1. THE VEIL: High opacity white to completely neutralize the heavy homepage typography */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-xl animate-in fade-in duration-300" />

      {/* 2. THE SYSTEM WINDOW */}
      <div className="relative w-full max-w-[480px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

        {/* Subtle Grid Texture Inside */}
        <div className="absolute inset-0 opacity-50 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />

        {/* Top Status Bar */}
        <div className="relative flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </div>
            <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-500">
              Processing
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-400">
            <Timer className="w-3 h-3" />
            <span>{elapsed.toFixed(2)}s</span>
          </div>
        </div>

        <div className="p-8 relative">

          {/* Main Visual & Title */}
          <div className="flex gap-5 mb-8">
            {/* The Icon: A Technical "Chip/Node" container instead of a naked spinner */}
            <div className="relative w-12 h-12 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
               <Network className="w-6 h-6 text-teal-600 animate-pulse" strokeWidth={1.5} />
               {/* Spinning ring around icon */}
               <div className="absolute inset-0 rounded-lg border border-teal-500/20 border-t-teal-500 animate-[spin_3s_linear_infinite]" />
            </div>

            <div className="flex-1 pt-1">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Analyzing Topology
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                Charon is extracting AST nodes and resolving import paths...
              </p>
            </div>
          </div>

          {/* The Data Stream (Progress) */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                Compute Load
              </span>
              <span className="font-mono text-sm font-bold text-teal-600">
                {Math.round(loadingProgress).toString().padStart(3, '0')}%
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-100 rounded-sm overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300 ease-out relative"
                style={{ width: `${loadingProgress}%` }}
              >
                 {/* Moving stripe effect */}
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem] animate-[spin_1s_linear_infinite]" />
              </div>
            </div>
          </div>

          {/* The Log Strip (Light, Technical, Clean) */}
          <div className="border-t border-slate-100 pt-4 -mx-2 px-2">
            <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2.5 flex items-center gap-3 shadow-sm">
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
              <span className="font-mono text-xs text-slate-600 truncate flex-1">
                {loadingMessage || "Initializing sequence..."}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};