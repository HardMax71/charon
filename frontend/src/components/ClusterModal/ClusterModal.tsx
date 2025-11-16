import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { X, Activity, Link, Link2, Boxes } from 'lucide-react';

export const ClusterModal = () => {
  const { globalMetrics, graph } = useGraphStore();
  const { showClusterModal, setShowClusterModal } = useUIStore();

  if (!showClusterModal || !globalMetrics?.clusters || !graph) return null;

  const handleClose = () => setShowClusterModal(false);

  // Find package suggestions for clusters
  const getPackageSuggestion = (clusterId: number) => {
    return globalMetrics.package_suggestions?.find(
      (s) => s.cluster_id === clusterId
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full border border-gray-100 transform transition-all max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Detected Clusters</h3>
            <p className="text-sm text-gray-500 mt-1">
              {globalMetrics.clusters.length} communities found via Louvain algorithm
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {globalMetrics.clusters.map((cluster) => {
            const suggestion = getPackageSuggestion(cluster.cluster_id);
            const clusterNodes = graph.nodes.filter(
              (n) => n.cluster_id === cluster.cluster_id
            );

            return (
              <div
                key={cluster.cluster_id}
                className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                {/* Cluster Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-gray-900">
                        Cluster {cluster.cluster_id}
                      </h4>
                      {cluster.is_package_candidate && (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Package Candidate
                        </span>
                      )}
                    </div>
                    {suggestion && (
                      <p className="text-sm font-medium text-blue-600 mt-1">
                        Suggested: {suggestion.suggested_package_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">{cluster.size} nodes</p>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Boxes className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-xs font-medium text-blue-600">Cohesion</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">
                      {(cluster.cohesion * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity className="w-3.5 h-3.5 text-amber-600" />
                      <p className="text-xs font-medium text-amber-600">Modularity</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">
                      {cluster.modularity_contribution.toFixed(3)}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Link className="w-3.5 h-3.5 text-green-600" />
                      <p className="text-xs font-medium text-green-600">Internal Edges</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">
                      {cluster.internal_edges}
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Link2 className="w-3.5 h-3.5 text-orange-600" />
                      <p className="text-xs font-medium text-orange-600">External Edges</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">
                      {cluster.external_edges}
                    </p>
                  </div>
                </div>

                {/* Package Suggestion Reason */}
                {suggestion && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Recommendation</p>
                    <p className="text-sm text-gray-700">{suggestion.reason}</p>
                  </div>
                )}

                {/* Nodes List */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Nodes in Cluster ({clusterNodes.length})
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <ul className="space-y-1.5">
                      {clusterNodes.map((node) => (
                        <li key={node.id} className="text-sm text-gray-700">
                          <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200">
                            {node.label}
                          </span>
                          {node.module && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({node.module})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
