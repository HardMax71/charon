import { useGraphStore } from '@/stores/graphStore';
import {
  Flame,
  Activity,
  HelpCircle,
  GitMerge,
  Box,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const GlobalMetrics = () => {
  const { globalMetrics } = useGraphStore();

  // Helper to safely format numbers
  const fmt = (val: number | undefined | null, decimals = 2) => {
    if (typeof val !== 'number') return '0';
    return val % 1 === 0 ? val.toString() : val.toFixed(decimals);
  };

  if (!globalMetrics) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 space-y-2 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
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
        <MetricCard title="Project Overview" icon={Box}>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <StatItem label="Total Files" value={globalMetrics.total_files || 0} />
            <StatItem label="Internal" value={globalMetrics.total_internal || 0} highlight />
            <StatItem label="External" value={globalMetrics.total_third_party || 0} />
          </div>
        </MetricCard>

        {/* 2. Coupling Analysis */}
        <MetricCard
          title="Coupling Metrics"
          icon={GitMerge}
          tooltip="Measures dependency density. High coupling indicates a rigid system."
        >
          <div className="space-y-3 mt-2">
            <RowItem label="Avg Afferent (Ca)" value={fmt(globalMetrics.avg_afferent_coupling)} />
            <RowItem label="Avg Efferent (Ce)" value={fmt(globalMetrics.avg_efferent_coupling)} />
            <RowItem label="Threshold" value={fmt(globalMetrics.coupling_threshold)} subValue="(Max)" />
          </div>
        </MetricCard>

        {/* 3. Complexity Analysis */}
        <MetricCard
          title="Code Complexity"
          icon={Activity}
          tooltip="Cyclomatic Complexity and Maintainability Index."
        >
          <div className="space-y-3 mt-2">
            <RowItem
              label="Avg Complexity"
              value={fmt(complexity)}
              highlight={complexity > 10}
            />
            <RowItem
              label="Maintainability"
              value={fmt(globalMetrics.avg_maintainability)}
            />
            <div className="pt-3 border-t border-slate-200">
               <RowItem label="Avg Instability" value={fmt(instability)} />
            </div>
          </div>
        </MetricCard>

        {/* 4. Critical Alerts (Dynamic) */}
        <MetricCard
          title="System Alerts"
          icon={AlertTriangle}
          alert={circularDeps.length > 0 || hotZones.length > 0}
        >
          <div className="space-y-3 mt-2">
            <AlertRow
              label="Circular Deps"
              count={circularDeps.length}
              critical={circularDeps.length > 0}
            />
            <AlertRow
              label="Hot Zones"
              count={hotZones.length}
              critical={hotZones.length > 0}
            />
            <AlertRow
              label="High Coupling"
              count={highCoupling.length}
              critical={false}
            />
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
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
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

const MetricCard = ({ title, icon: Icon, children, tooltip, alert }: any) => (
  <div className={`
    bg-white border rounded-xl p-5 transition-all hover:shadow-md
    ${alert ? 'border-rose-200 shadow-[0_0_0_1px_rgba(225,29,72,0.1)]' : 'border-slate-200 shadow-sm'}
  `}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Icon className={`w-4 h-4 ${alert ? 'text-rose-600' : 'text-teal-600'}`} />
        <h4 className="text-xs font-extrabold uppercase tracking-widest">{title}</h4>
      </div>

      {tooltip && (
        <div className="group relative">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-teal-600 cursor-help transition-colors" />
          <div className="absolute right-0 top-6 w-48 p-3 bg-slate-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50 pointer-events-none leading-relaxed border border-slate-700">
            {tooltip}
            <div className="absolute -top-1 right-1 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-700" />
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

const StatItem = ({ label, value, highlight }: any) => (
  <div className="text-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
    <div className={`text-xl font-black font-mono leading-none ${highlight ? 'text-teal-700' : 'text-slate-900'}`}>
      {value}
    </div>
    <div className="text-[9px] text-slate-500 uppercase font-bold mt-1.5 tracking-wide">{label}</div>
  </div>
);

const RowItem = ({ label, value, subValue, highlight }: any) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-600 font-medium">{label}</span>
    <div className="flex items-baseline gap-1.5">
      <span className={`font-mono font-bold ${highlight ? 'text-amber-600' : 'text-slate-900'}`}>
        {value}
      </span>
      {subValue && <span className="text-[9px] text-slate-400 font-medium">{subValue}</span>}
    </div>
  </div>
);

const AlertRow = ({ label, count, critical }: any) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-600 font-medium">{label}</span>
    <span className={`
      px-2.5 py-0.5 rounded text-[10px] font-mono font-bold
      ${critical 
        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
        : 'bg-slate-100 text-slate-600 border border-slate-200'
      }
    `}>
      {count}
    </span>
  </div>
);