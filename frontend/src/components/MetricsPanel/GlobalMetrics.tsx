import { useGraphStore } from '@/stores/graphStore';
import { Flame, Activity } from 'lucide-react';

export const GlobalMetrics = () => {
  const { globalMetrics } = useGraphStore();

  if (!globalMetrics) {
    return <div className="p-4 text-gray-500">No metrics available</div>;
  }

  return (
    <div className="p-3 md:p-4">
      {/* Row 1: Overview, Coupling Metrics, High Coupling (3 columns on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        {/* Project Overview */}
        <div className="bg-surface border border-border-light rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-bold mb-2.5 text-text-primary text-sm tracking-tight">Project Overview</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-primary tabular-nums break-words">{globalMetrics.total_files}</div>
              <div className="text-xs text-text-secondary mt-1 font-medium">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extrabold text-success tabular-nums break-words">{globalMetrics.total_internal}</div>
              <div className="text-xs text-text-secondary mt-1 font-medium">Internal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extrabold text-info tabular-nums break-words">{globalMetrics.total_third_party}</div>
              <div className="text-xs text-text-secondary mt-1 font-medium">3rd Party</div>
            </div>
          </div>
        </div>

        {/* Coupling Metrics */}
        <div className="bg-surface border border-border-light rounded-lg p-3 relative shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2.5">
            <h4 className="font-bold text-text-primary text-sm tracking-tight">Coupling Metrics</h4>
            <div className="group relative flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-background border border-border-medium text-text-secondary text-xs font-bold flex items-center justify-center cursor-help hover:bg-primary hover:text-text-inverse hover:border-primary transition-all">
                ?
              </div>
              <div className="absolute right-0 top-6 w-64 bg-text-primary text-text-inverse text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl border border-border-dark">
                <p className="font-bold mb-1.5 text-sm">Definitions:</p>
                <p className="mb-1.5 leading-relaxed"><strong>Ca:</strong> # modules depending on this</p>
                <p className="mb-1.5 leading-relaxed"><strong>Ce:</strong> # modules this depends on</p>
                <p className="leading-relaxed"><strong>Instability:</strong> Ce / (Ca + Ce)</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center gap-2">
              <span className="text-text-secondary text-xs truncate">Avg Afferent:</span>
              <span className="font-mono font-bold text-text-primary tabular-nums text-base flex-shrink-0">{globalMetrics.avg_afferent_coupling}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-text-secondary text-xs truncate">Avg Efferent:</span>
              <span className="font-mono font-bold text-text-primary tabular-nums text-base flex-shrink-0">{globalMetrics.avg_efferent_coupling}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-text-secondary text-xs truncate">Threshold:</span>
              <span className="font-mono font-bold text-text-primary tabular-nums text-base flex-shrink-0">{globalMetrics.coupling_threshold}</span>
            </div>
          </div>
        </div>

        {/* High Coupling Files */}
        {globalMetrics.high_coupling_files.length > 0 && (
          <div className="bg-warning-bg border border-warning/30 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold mb-2 text-warning text-sm tracking-tight">
              High Coupling <span className="tabular-nums">({globalMetrics.high_coupling_files.length})</span>
            </h4>
            <div className="max-h-20 overflow-y-auto pr-1 custom-scrollbar">
              <ul className="text-xs space-y-1 text-warning/90">
                {globalMetrics.high_coupling_files.map((file, idx) => (
                  <li key={idx} className="truncate font-mono">
                    • {file}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Complexity Metrics (1/3) + Hot Zone Files (2/3) on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        {/* Complexity Metrics */}
        <div className="bg-surface border border-border-light rounded-lg p-3 relative shadow-sm hover:shadow-md transition-shadow lg:col-span-1">
          <div className="flex justify-between items-start mb-2.5">
            <h4 className="font-bold text-text-primary text-sm tracking-tight">Complexity Metrics</h4>
            <div className="group relative flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-background border border-border-medium text-text-secondary text-xs font-bold flex items-center justify-center cursor-help hover:bg-primary hover:text-text-inverse hover:border-primary transition-all">
                ?
              </div>
              <div className="absolute right-0 top-6 w-64 bg-text-primary text-text-inverse text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl border border-border-dark">
                <p className="font-bold mb-1.5 text-sm">Definitions:</p>
                <p className="mb-1.5 leading-relaxed"><strong>Cyclomatic Complexity:</strong> Measure of code paths (lower is better)</p>
                <p className="leading-relaxed"><strong>Maintainability Index:</strong> 0-100 score (higher is better)</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-text-secondary text-xs truncate">Avg Complexity:</span>
              </div>
              <span className="font-mono font-bold text-text-primary tabular-nums text-base flex-shrink-0">{globalMetrics.avg_complexity}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Activity className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-text-secondary text-xs truncate">Avg Maintainability:</span>
              </div>
              <span className="font-mono font-bold text-text-primary tabular-nums text-base flex-shrink-0">{globalMetrics.avg_maintainability}</span>
            </div>
          </div>
        </div>

        {/* Hot Zone Files */}
        {globalMetrics.hot_zone_files && globalMetrics.hot_zone_files.length > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300/50 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Flame className="w-5 h-5 text-red-600 flex-shrink-0" />
              <h4 className="font-bold text-red-700 text-sm tracking-tight">
                Hot Zone Files <span className="tabular-nums">({globalMetrics.hot_zone_files.length})</span>
              </h4>
              <span className="text-xs text-red-600/80 font-medium">High Complexity + High Coupling</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {globalMetrics.hot_zone_files.map((file, idx) => (
                <div key={idx} className={`text-xs bg-white/80 border p-2.5 rounded font-mono ${
                  file.severity === 'critical' ? 'border-red-300 bg-red-50/50' :
                  file.severity === 'warning' ? 'border-orange-300 bg-orange-50/50' :
                  'border-amber-300 bg-amber-50/50'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
                    <span className={`font-semibold truncate min-w-0 flex-1 ${
                      file.severity === 'critical' ? 'text-red-700' :
                      file.severity === 'warning' ? 'text-orange-700' :
                      'text-amber-700'
                    }`}>
                      {file.file}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap flex-shrink-0 ${
                      file.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      file.severity === 'warning' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {file.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1 break-words">{file.reason}</div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-gray-500 whitespace-nowrap">
                      <strong>Score:</strong> <span className="tabular-nums font-mono">{file.score}/100</span>
                    </span>
                    <span className="text-gray-500 whitespace-nowrap">
                      <strong>Complexity:</strong> <span className="tabular-nums font-mono">{file.complexity}</span>
                    </span>
                    <span className="text-gray-500 whitespace-nowrap">
                      <strong>Coupling:</strong> <span className="tabular-nums font-mono">{file.coupling}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Circular Dependencies - Full width */}
      {globalMetrics.circular_dependencies.length > 0 && (
        <div className="bg-error-bg border border-error/30 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-bold mb-2 text-error text-sm tracking-tight">
            Circular Dependencies <span className="tabular-nums">({globalMetrics.circular_dependencies.length})</span>
          </h4>
          <div className="max-h-20 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {globalMetrics.circular_dependencies.map((dep, idx) => (
              <div key={idx} className="text-xs bg-surface border border-error/20 p-2 rounded font-mono text-error/90 break-words">
                {dep.cycle.join(' → ')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
