import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { X, AlertTriangle, Target, TrendingUp, BarChart3 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full border border-gray-100 transform transition-all max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <h3 className="text-xl font-bold text-gray-900">Dependency Impact Analysis</h3>
            </div>
            <p className="text-sm text-gray-500">
              Understanding the blast radius of changes to <span className="font-mono font-semibold text-gray-900">{selected_node.label}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Impact Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-blue-700">Total Affected</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">
              {metrics.total_affected}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              out of {metrics.total_nodes} total files
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-700">Impact %</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">
              {metrics.impact_percentage}%
            </p>
            <p className="text-xs text-amber-600 mt-1">
              of codebase affected
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-green-700">Max Depth</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">
              {metrics.max_depth_reached}
            </p>
            <p className="text-xs text-green-600 mt-1">
              dependency hops
            </p>
          </div>
        </div>

        {/* Impact Breakdown by Distance */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Impact by Distance</h4>
          <div className="space-y-2">
            {sortedDistances.map(({ distance, count, percentage, label }) => (
              <div key={distance} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <span className="text-sm font-mono font-bold text-gray-900 tabular-nums">
                    {count} files ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Affected Files List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h4 className="text-sm font-bold text-gray-700 mb-3">
            Affected Files ({affected_node_details.length})
          </h4>
          <div className="flex-1 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="space-y-2">
              {affected_node_details
                .sort((a, b) => a.distance - b.distance)
                .map((node) => (
                  <div
                    key={node.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: node.color }}
                          />
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {node.label}
                          </span>
                        </div>
                        {node.module && (
                          <p className="text-xs text-gray-500 mt-1 ml-5">
                            {node.module}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold tabular-nums">
                          {node.distance === 0 ? 'Selected' : `${node.distance}-hop`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
