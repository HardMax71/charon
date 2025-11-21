import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import {
  X,
  Network,
  AlertTriangle,
  CheckCircle2,
  Share2,
  GitMerge,
  Activity,
  Code,
  Flame,
  Layers,
  Box
} from 'lucide-react';

export const NodeMetricsModal = () => {
  const { selectedNode, setSelectedNode, impactAnalysis } = useGraphStore();
  const { setShowImpactModal } = useUIStore();

  if (!selectedNode) return null;

  const { metrics, label, id, module, type } = selectedNode;

  return (
    // Floating HUD Panel (z-50 to sit above everything)
    <div className="fixed top-20 left-6 z-50 w-80 animate-in slide-in-from-left-4 duration-300">

      <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">

        {/* --- HEADER --- */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-start justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm flex-shrink-0 text-teal-600">
              <Box className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate leading-tight" title={label}>
                {label}
              </h3>
              <p className="text-[10px] font-mono text-slate-400 truncate leading-tight mt-0.5" title={id}>
                {type.toUpperCase()} • {module}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5">

          {/* 1. COUPLING METRICS */}
          <div>
            <SectionHeader icon={GitMerge} label="Coupling Data" />
            <div className="grid grid-cols-2 gap-3">
              <MetricBox
                label="Afferent (Ca)"
                value={metrics.afferent_coupling}
                desc="Incoming"
              />
              <MetricBox
                label="Efferent (Ce)"
                value={metrics.efferent_coupling}
                desc="Outgoing"
              />
            </div>

            {/* Instability Bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between items-end text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <span>Instability</span>
                <span className="font-mono text-slate-900">{metrics.instability.toFixed(2)}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metrics.instability > 0.7 ? 'bg-amber-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${metrics.instability * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. COMPLEXITY METRICS */}
          <div>
            <SectionHeader icon={Code} label="Code Complexity" />
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
              <RowMetric
                label="Cyclomatic Complexity"
                value={metrics.cyclomatic_complexity}
                grade={metrics.complexity_grade}
              />
              <RowMetric
                label="Maintainability Index"
                value={metrics.maintainability_index}
                grade={metrics.maintainability_grade}
              />
              <div className="flex justify-between items-center pt-1 text-xs">
                <span className="text-slate-500 font-medium">Lines of Code</span>
                <span className="font-mono font-bold text-slate-700">{metrics.lines_of_code}</span>
              </div>
            </div>
          </div>

          {/* 3. ANALYSIS STATUS */}
          <div>
            <SectionHeader icon={Activity} label="System Status" />
            <div className="space-y-2">
              {metrics.is_hot_zone && (
                <AlertBox
                  type="critical"
                  title={`Hot Zone (${metrics.hot_zone_severity})`}
                  desc={metrics.hot_zone_reason}
                />
              )}
              {metrics.is_circular && (
                <AlertBox
                  type="critical"
                  title="Circular Dependency"
                  desc="Part of a recursive import cycle."
                />
              )}
              {metrics.is_high_coupling && !metrics.is_hot_zone && (
                <AlertBox
                  type="warning"
                  title="High Coupling"
                  desc="Top 20% most coupled modules."
                />
              )}
              {!metrics.is_hot_zone && !metrics.is_circular && !metrics.is_high_coupling && (
                <div className="flex items-center gap-3 p-2.5 bg-teal-50 border border-teal-100 rounded-lg text-xs text-teal-800">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span className="font-bold">Structure Nominal</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* --- FOOTER ACTION --- */}
        {impactAnalysis && (
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => setShowImpactModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm hover:shadow-md group btn"
            >
              <Network className="w-4 h-4 group-hover:scale-110 transition-transform" />
              View Impact Graph
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

/* --- SUB-COMPONENTS --- */

const SectionHeader = ({ icon: Icon, label }: any) => (
  <div className="flex items-center gap-2 mb-2.5 pb-1 border-b border-slate-100">
    <Icon className="w-3.5 h-3.5 text-slate-400" />
    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</h5>
  </div>
);

const MetricBox = ({ label, value, desc }: any) => (
  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">{label}</div>
    <div className="text-lg font-black text-slate-800 font-mono leading-none">{value}</div>
    <div className="text-[9px] text-slate-400 mt-1">{desc}</div>
  </div>
);

const RowMetric = ({ label, value, grade }: any) => {
  const getGradeColor = (g: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-teal-100 text-teal-800',
      'B': 'bg-blue-100 text-blue-800',
      'C': 'bg-amber-100 text-amber-800',
      'D': 'bg-orange-100 text-orange-800',
      'F': 'bg-rose-100 text-rose-800',
    };
    return colors[g] || colors['F'];
  };

  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-slate-900">{value}</span>
        {grade && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getGradeColor(grade)}`}>
            {grade}
          </span>
        )}
      </div>
    </div>
  );
};

const AlertBox = ({ type, title, desc }: any) => {
  const styles = type === 'critical'
    ? 'bg-rose-50 border-rose-200 text-rose-900'
    : 'bg-amber-50 border-amber-200 text-amber-900';

  const Icon = type === 'critical' ? Flame : AlertTriangle;
  const iconColor = type === 'critical' ? 'text-rose-600' : 'text-amber-600';

  return (
    <div className={`p-3 rounded-lg border ${styles}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-0.5">{title}</div>
          <div className="text-[10px] leading-snug opacity-90">{desc}</div>
        </div>
      </div>
    </div>
  );
};