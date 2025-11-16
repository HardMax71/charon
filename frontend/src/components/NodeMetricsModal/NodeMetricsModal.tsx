import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { Network, AlertTriangle } from 'lucide-react';

export const NodeMetricsModal = () => {
  const { selectedNode, setSelectedNode, impactAnalysis } = useGraphStore();
  const { setShowImpactModal } = useUIStore();

  if (!selectedNode) return null;

  const { metrics } = selectedNode;

  const handleClose = () => {
    setSelectedNode(null);
  };

  const handleOpenImpact = () => {
    setShowImpactModal(true);
  };

  return (
    <div className="w-80 sm:w-96 animate-slide-down">
      <div className="bg-surface/95 backdrop-blur-md rounded-xl shadow-xl border border-border-light p-5">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-base font-bold text-text-primary tracking-tight">Node Metrics</h3>
          <button
            onClick={handleClose}
            className="text-text-tertiary hover:text-text-primary transition-colors text-xl leading-none p-1 hover:bg-background rounded-md"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-base mb-1.5 text-text-primary">{selectedNode.label}</h4>
            <p className="text-xs text-text-tertiary font-mono">{selectedNode.id}</p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-text-secondary">
                Module: <span className="font-mono font-semibold text-text-primary">{selectedNode.module}</span>
              </p>
              <p className="text-xs text-text-secondary">
                Type: <span className="font-mono font-semibold text-text-primary">{selectedNode.type}</span>
              </p>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-bold mb-2 text-text-primary">Coupling Metrics</h5>
            <div className="bg-background rounded-lg p-3 space-y-2 text-xs border border-border-light">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Afferent (Ca):</span>
                <span className="font-mono font-bold text-text-primary tabular-nums">{metrics.afferent_coupling}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Efferent (Ce):</span>
                <span className="font-mono font-bold text-text-primary tabular-nums">{metrics.efferent_coupling}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Instability:</span>
                <span className="font-mono font-bold text-text-primary tabular-nums">{metrics.instability.toFixed(3)}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-bold mb-2 text-text-primary">Complexity Metrics</h5>
            <div className="bg-background rounded-lg p-3 space-y-2 text-xs border border-border-light">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Cyclomatic Complexity:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-text-primary tabular-nums">{metrics.cyclomatic_complexity}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                    metrics.complexity_grade === 'A' ? 'bg-green-100 text-green-700' :
                    metrics.complexity_grade === 'B' ? 'bg-blue-100 text-blue-700' :
                    metrics.complexity_grade === 'C' ? 'bg-amber-100 text-amber-700' :
                    metrics.complexity_grade === 'D' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {metrics.complexity_grade}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Maintainability Index:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-text-primary tabular-nums">{metrics.maintainability_index}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                    metrics.maintainability_grade === 'A' ? 'bg-green-100 text-green-700' :
                    metrics.maintainability_grade === 'B' ? 'bg-blue-100 text-blue-700' :
                    metrics.maintainability_grade === 'C' ? 'bg-amber-100 text-amber-700' :
                    metrics.maintainability_grade === 'D' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {metrics.maintainability_grade}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Lines of Code:</span>
                <span className="font-mono font-bold text-text-primary tabular-nums">{metrics.lines_of_code}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-bold mb-2 text-text-primary">Analysis</h5>
            <div className="space-y-2 text-xs">
              {metrics.is_hot_zone && (
                <div className={`p-2.5 rounded-lg font-medium border ${
                  metrics.hot_zone_severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                  metrics.hot_zone_severity === 'warning' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  'bg-amber-100 text-amber-700 border-amber-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold mb-1">Hot Zone ({metrics.hot_zone_severity.toUpperCase()})</div>
                      <div className="text-xs">{metrics.hot_zone_reason}</div>
                      <div className="text-xs mt-1 opacity-75">Score: {metrics.hot_zone_score}/100</div>
                    </div>
                  </div>
                </div>
              )}
              {metrics.is_circular && (
                <div className="bg-error-bg text-error p-2.5 rounded-lg font-medium border border-error/20">
                  ⚠ Part of circular dependency
                </div>
              )}
              {metrics.is_high_coupling && (
                <div className="bg-warning-bg text-warning p-2.5 rounded-lg font-medium border border-warning/20">
                  ⚠ High coupling (top 20%)
                </div>
              )}
              {!metrics.is_circular && !metrics.is_high_coupling && !metrics.is_hot_zone && (
                <div className="bg-success-bg text-success p-2.5 rounded-lg font-medium border border-success/20">
                  ✓ No issues detected
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Impact Analysis Button - Lower Right */}
        {impactAnalysis && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleOpenImpact}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-semibold text-sm"
              title="View Dependency Impact Analysis"
            >
              <Network className="w-4 h-4" />
              Impact Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
