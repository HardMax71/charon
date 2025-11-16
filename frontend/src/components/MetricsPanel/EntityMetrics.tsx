import { useGraphStore } from '@/stores/graphStore';

export const EntityMetrics = () => {
  const { selectedNode } = useGraphStore();

  if (!selectedNode) {
    return (
      <div className="p-4 text-gray-500 text-center">
        Select a node to view its metrics
      </div>
    );
  }

  const { metrics } = selectedNode;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="font-semibold mb-1">{selectedNode.label}</h4>
        <p className="text-xs text-gray-500">{selectedNode.id}</p>
      </div>

      <div>
        <h5 className="text-sm font-medium mb-2">Coupling Metrics</h5>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Afferent Coupling (Ca):</span>
            <span className="font-medium">{metrics.afferent_coupling}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Efferent Coupling (Ce):</span>
            <span className="font-medium">{metrics.efferent_coupling}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Instability:</span>
            <span className="font-medium">{metrics.instability.toFixed(3)}</span>
          </div>
        </div>
      </div>

      <div>
        <h5 className="text-sm font-medium mb-2">Analysis</h5>
        <div className="space-y-1 text-xs">
          {metrics.is_circular && (
            <div className="bg-red-50 text-red-700 p-2 rounded">
              ⚠ Part of circular dependency
            </div>
          )}
          {metrics.is_high_coupling && (
            <div className="bg-orange-50 text-orange-700 p-2 rounded">
              ⚠ High coupling (top 20%)
            </div>
          )}
          {!metrics.is_circular && !metrics.is_high_coupling && (
            <div className="bg-green-50 text-green-700 p-2 rounded">
              ✓ No issues detected
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        <p><strong>Afferent:</strong> # of modules depending on this</p>
        <p><strong>Efferent:</strong> # of modules this depends on</p>
        <p><strong>Instability:</strong> Ce / (Ca + Ce)</p>
      </div>
    </div>
  );
};
