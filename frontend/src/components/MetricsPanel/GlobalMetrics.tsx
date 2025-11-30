import { useGraphStore } from '@/stores/graphStore';
import { IconComponent } from '@/types/common';
import {
  Flame,
  Activity,
  GitMerge,
  Box,
  AlertTriangle,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

export const GlobalMetrics = () => {
  const globalMetrics = useGraphStore(state => state.globalMetrics);

  // Helper to safely format numbers
  const fmt = (val: number | undefined | null, decimals = 2) => {
    if (typeof val !== 'number') return '0';
    return val % 1 === 0 ? val.toString() : val.toFixed(decimals);
  };

  if (!globalMetrics) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600 space-y-2 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
        <span className="text-xs font-mono uppercase tracking-widest font-bold">System Offline</span>
      </div>
    );
  }

  // Extract values safely
  const instability = globalMetrics.average_instability ?? 0;
  const complexity = globalMetrics.avg_complexity ?? 0;
  const circularDeps = globalMetrics.circular_dependencies || [];
  const hotZones = globalMetrics.hot_zone_files || [];
  const highCoupling = globalMetrics.high_coupling_files || [];

  return (
    <div className="space-y-6">

      {/* --- ROW 1: KEY METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* 1. Project Overview */}
        <MetricCard
          title="Project Overview"
          icon={Box}
          tooltip="Total count of analyzed files in the project."
        >
          <div className="space-y-2.5">
            <MetricRow label="Total Files" value={globalMetrics.total_files || 0} />
            <MetricRow label="Internal" value={globalMetrics.total_internal || 0} highlight />
            <MetricRow label="External" value={globalMetrics.total_third_party || 0} />
          </div>
        </MetricCard>

        {/* 2. Coupling Analysis */}
        <MetricCard
          title="Coupling Metrics"
          icon={GitMerge}
          tooltip="Measures dependency density. High coupling indicates a rigid system."
        >
          <div className="space-y-2.5">
            <MetricRow label="Avg Afferent (Ca)" value={fmt(globalMetrics.avg_afferent_coupling)} />
            <MetricRow label="Avg Efferent (Ce)" value={fmt(globalMetrics.avg_efferent_coupling)} />
            <MetricRow label="Threshold (Max)" value={fmt(globalMetrics.coupling_threshold)} />
          </div>
        </MetricCard>

        {/* 3. Complexity Analysis */}
        <MetricCard
          title="Code Complexity"
          icon={Activity}
          tooltip="Cyclomatic Complexity and Maintainability Index."
        >
          <div className="space-y-2.5">
            <MetricRow label="Avg Complexity" value={fmt(complexity)} highlight={complexity > 10} />
            <MetricRow label="Maintainability" value={fmt(globalMetrics.avg_maintainability)} />
            <MetricRow label="Avg Instability" value={fmt(instability)} />
          </div>
        </MetricCard>

        {/* 4. System Alerts */}
        <MetricCard
          title="System Alerts"
          icon={AlertTriangle}
          alert={circularDeps.length > 0 || hotZones.length > 0}
          tooltip="Critical issues detected in the codebase that need attention."
        >
          <div className="space-y-2.5">
            <MetricRow label="Circular Deps" value={circularDeps.length} critical={circularDeps.length > 0} />
            <MetricRow label="Hot Zones" value={hotZones.length} critical={hotZones.length > 0} />
            <MetricRow label="High Coupling" value={highCoupling.length} />
          </div>
        </MetricCard>

      </div>

      {/* --- ROW 2: DETAILED LISTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* A. Hot Zone Files */}
        {hotZones.length > 0 && (
          <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-rose-50 px-5 py-3 border-b border-rose-200 flex justify-between items-center">
              <div className="flex items-center gap-2 text-rose-800">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-extrabold uppercase tracking-wide">Hot Zones</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded text-rose-700 border border-rose-200 shadow-sm">
                {hotZones.length} FILES
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-rose-50/10">
              {hotZones.map((file, i) => (
                <div key={i} className="bg-white border border-rose-100 p-3 rounded-lg shadow-sm hover:border-rose-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-rose-950 font-mono break-all leading-relaxed">
                      {file.file}
                    </span>
                    <span className="ml-2 text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
                      {file.severity}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 border-t border-slate-100 pt-2">
                    <div>Cmplx: <strong className="text-slate-900">{fmt(file.complexity)}</strong></div>
                    <div>Cplng: <strong className="text-slate-900">{fmt(file.coupling)}</strong></div>
                    <div>Score: <strong className="text-slate-900">{fmt(file.score)}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* B. Circular Dependencies */}
        {circularDeps.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex justify-between items-center">
              <div className="flex items-center gap-2 text-amber-800">
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-extrabold uppercase tracking-wide">Circular Cycles</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded text-amber-700 border border-amber-200 shadow-sm">
                {circularDeps.length} CYCLES
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-amber-50/10">
              {circularDeps.map((dep, i) => (
                <div key={i} className="bg-white border border-amber-100 p-3 rounded-lg shadow-sm hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-700 break-all leading-relaxed">
                    <span className="text-amber-500 font-black text-sm">●</span>
                    {dep.cycle.join(' → ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

/* --- SUB-COMPONENTS --- */

interface MetricCardProps {
  title: string;
  icon: IconComponent;
  children: React.ReactNode;
  alert?: boolean;
  tooltip?: string;
}

const MetricCard = ({ title, icon: Icon, children, alert, tooltip }: MetricCardProps) => (
  <div className={`
    bg-white border rounded-xl p-4 transition-all hover:shadow-md
    ${alert ? 'border-rose-200 shadow-[0_0_0_1px_rgba(225,29,72,0.1)]' : 'border-slate-200 shadow-sm'}
  `}>
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${alert ? 'text-rose-500' : 'text-slate-600'}`} />
        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{title}</h4>
      </div>
      {tooltip && (
        <div className="group relative">
          <HelpCircle className="w-3.5 h-3.5 text-slate-600 hover:text-slate-600 cursor-help transition-colors" />
          <div className="absolute right-0 top-5 w-44 p-2.5 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50 pointer-events-none leading-relaxed">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

interface MetricRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  critical?: boolean;
}

const MetricRow = ({ label, value, highlight, critical }: MetricRowProps) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-slate-600">{label}</span>
    <span className={`text-xs font-semibold tabular-nums ${
      critical ? 'text-rose-600' :
      highlight ? 'text-teal-600' :
      'text-slate-700'
    }`}>
      {value}
    </span>
  </div>
);