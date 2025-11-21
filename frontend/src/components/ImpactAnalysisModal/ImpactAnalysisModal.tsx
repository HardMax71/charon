import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import {
  X,
  AlertTriangle,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  Layers
} from 'lucide-react';

export const ImpactAnalysisModal = () => {
  const { impactAnalysis } = useGraphStore();
  const { showImpactModal, setShowImpactModal } = useUIStore();

  if (!showImpactModal || !impactAnalysis) return null;

  const handleClose = () => setShowImpactModal(false);

  const { selected_node, metrics, affected_node_details } = impactAnalysis;

  // Sort distance breakdown by distance
  const sortedDistances = Object.entries(metrics.distance_breakdown)
    .map(([distance, data]) => ({ distance: parseInt(distance), ...data }))
    .sort((a, b) => a.distance - b.distance);

  return (
    <div
      className="modal-overlay bg-white/80"
      onClick={handleClose}
    >
      <div
        className="modal-panel w-full max-w-3xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >

        {/* --- HEADER --- */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-start">
          <div className="flex gap-4">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Blast Radius Analysis
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Target: <span className="font-mono text-slate-700 bg-slate-200/50 px-1.5 py-0.5 rounded">{selected_node.label}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">

          {/* --- KEY METRICS GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

            {/* Total Affected */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-slate-500">
                <Target className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Scope</span>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono leading-none mb-1">
                {metrics.total_affected}
              </div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                Files Impacted
              </div>
            </div>

            {/* Impact Percentage */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-slate-500">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Severity</span>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono leading-none mb-1">
                {metrics.impact_percentage}%
              </div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                Codebase Coverage
              </div>
            </div>

            {/* Max Depth */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-slate-500">
                <Activity className="w-4 h-4 text-teal-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Depth</span>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono leading-none mb-1">
                {metrics.max_depth_reached}
              </div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                Propagation Hops
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* --- LEFT: DISTANCE BREAKDOWN --- */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Propagation Stages
                </h4>
              </div>

              <div className="space-y-3">
                {sortedDistances.map(({ distance, count, percentage, label }) => (
                  <div key={distance} className="group">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-xs font-bold text-slate-600">{label}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        <span className="text-slate-900 font-bold">{count}</span> files • {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          distance === 1 ? 'bg-rose-500' : 
                          distance === 2 ? 'bg-orange-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- RIGHT: AFFECTED FILE LIST --- */}
            <div className="flex flex-col h-full min-h-[300px]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                    Affected Modules
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                  {affected_node_details.length} ITEMS
                </span>
              </div>

              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg overflow-y-auto custom-scrollbar p-1 max-h-[300px]">
                {affected_node_details
                  .sort((a, b) => a.distance - b.distance)
                  .map((node) => (
                    <div
                      key={node.id}
                      className="group flex items-center justify-between p-2.5 hover:bg-white hover:shadow-sm rounded-md transition-all border border-transparent hover:border-slate-100"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shadow-sm flex-shrink-0"
                            style={{ backgroundColor: node.color }}
                          />
                          <span className="text-xs font-bold text-slate-700 font-mono truncate">
                            {node.label}
                          </span>
                        </div>
                        {node.module && (
                          <p className="text-[10px] text-slate-400 ml-4 truncate mt-0.5">
                            {node.module}
                          </p>
                        )}
                      </div>

                      <span className={`
                        text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border flex-shrink-0
                        ${node.distance === 0 
                          ? 'bg-slate-900 text-white border-slate-900' 
                          : 'bg-white text-slate-500 border-slate-200'
                        }
                      `}>
                        {node.distance === 0 ? 'SOURCE' : `${node.distance}-HOP`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="bg-slate-50 p-3 border-t border-slate-200 text-center">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            End of Analysis Report
          </p>
        </div>

      </div>
    </div>
  );
};