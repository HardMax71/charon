import { useMemo } from 'react';
import { TrendingUp, Package, ExternalLink } from 'lucide-react';
import { buildGitHubCommitUrl } from '@/utils/githubUtils';

interface ChurnHeatmapProps {
  data: any;
  currentSnapshot?: any;
  repositoryUrl: string;
}

export const ChurnHeatmap = ({ data, currentSnapshot, repositoryUrl }: ChurnHeatmapProps) => {
  const maxChurn = useMemo(() => {
    return Math.max(...Object.values(data.node_churn as Record<string, number>), 1);
  }, [data.node_churn]);

  const getChurnColor = (churnCount: number) => {
    const intensity = churnCount / maxChurn;
    if (intensity > 0.7) return 'bg-red-500';
    if (intensity > 0.5) return 'bg-orange-500';
    if (intensity > 0.3) return 'bg-amber-500';
    if (intensity > 0.1) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getChurnLabel = (churnCount: number) => {
    const intensity = churnCount / maxChurn;
    if (intensity > 0.7) return 'Very High';
    if (intensity > 0.5) return 'High';
    if (intensity > 0.3) return 'Medium';
    if (intensity > 0.1) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="h-full overflow-auto p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-primary">Dependency Churn Heatmap</h2>
              <p className="text-sm text-text-secondary">
                Modules with frequent dependency changes
              </p>
            </div>
            {currentSnapshot && (
              <div className="bg-surface rounded-lg px-4 py-2 border border-border-light">
                <div className="text-xs text-text-tertiary">Viewing</div>
                <a
                  href={buildGitHubCommitUrl(repositoryUrl, currentSnapshot.commit_sha)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 transition-colors"
                >
                  {currentSnapshot.commit_sha.substring(0, 7)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface rounded-lg p-3 border border-border-light">
              <div className="flex items-center justify-between gap-2">
                <div className="text-text-tertiary text-xs">Total Changes</div>
                <div className="text-xl font-bold text-text-primary tabular-nums">
                  {data.total_changes}
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-3 border border-border-light">
              <div className="flex items-center justify-between gap-2">
                <div className="text-text-tertiary text-xs whitespace-nowrap">Avg. Churn</div>
                <div className="text-xl font-bold text-text-primary tabular-nums">
                  {data.average_churn_per_snapshot}
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-3 border border-border-light">
              <div className="flex items-center justify-between gap-2">
                <div className="text-text-tertiary text-xs whitespace-nowrap">Modules</div>
                <div className="text-xl font-bold text-text-primary tabular-nums">
                  {Object.keys(data.node_churn).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-surface rounded-lg p-3 border border-border-light">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-bold text-text-primary whitespace-nowrap">Churn Intensity</div>
            <div className="flex items-center gap-3 flex-wrap">
              {['Very Low', 'Low', 'Medium', 'High', 'Very High'].map((label, index) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className={`w-3 h-3 rounded ${
                      ['bg-green-500', 'bg-yellow-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500'][index]
                    }`}
                  />
                  <span className="text-xs text-text-secondary">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Churning Nodes */}
        <div className="bg-surface rounded-lg border border-border-light overflow-hidden">
          <div className="px-6 py-4 border-b border-border-light">
            <h3 className="text-lg font-bold text-text-primary">Top Churning Modules</h3>
            <p className="text-sm text-text-secondary">
              Modules with the most dependency changes over time
            </p>
          </div>

          <div className="divide-y divide-border-light">
            {data.top_churning_nodes.slice(0, 20).map(([nodeId, churnCount]: [string, number], index: number) => (
              <div
                key={nodeId}
                className="px-6 py-4 hover:bg-background transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-600 text-white' :
                    index === 1 ? 'bg-amber-500 text-white' :
                    index === 2 ? 'bg-amber-400 text-white' :
                    'bg-background text-text-tertiary'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Module Icon */}
                  <div className="flex-shrink-0 p-2 bg-background rounded-lg">
                    <Package className="w-5 h-5 text-text-tertiary" />
                  </div>

                  {/* Module Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold text-text-primary truncate">
                      {nodeId}
                    </div>
                  </div>

                  {/* Churn Bar */}
                  <div className="flex-shrink-0 w-48">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-6 bg-border-light rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getChurnColor(churnCount)} transition-all`}
                          style={{ width: `${(churnCount / maxChurn) * 100}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono font-bold text-sm text-text-primary tabular-nums">
                        {churnCount}
                      </span>
                    </div>
                    <div className="text-xs text-text-tertiary text-right mt-1">
                      {getChurnLabel(churnCount)} churn
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
