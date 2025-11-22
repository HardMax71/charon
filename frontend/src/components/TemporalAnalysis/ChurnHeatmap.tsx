import { useMemo } from 'react';
import { Activity, Package, ExternalLink } from 'lucide-react';
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
    if (intensity > 0.7) return 'bg-rose-500';
    if (intensity > 0.5) return 'bg-orange-500';
    if (intensity > 0.3) return 'bg-amber-500';
    if (intensity > 0.1) return 'bg-teal-400';
    return 'bg-teal-600';
  };

  const getChurnLabel = (churnCount: number) => {
    const intensity = churnCount / maxChurn;
    if (intensity > 0.7) return 'Critical';
    if (intensity > 0.5) return 'High';
    if (intensity > 0.3) return 'Medium';
    if (intensity > 0.1) return 'Low';
    return 'Minimal';
  };

  return (
    <div className="h-full overflow-auto p-6 bg-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.02)_50%)] bg-[size:100%_4px] pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-widest uppercase leading-none">
                  Dependency Churn
                </h2>
                <p className="text-[10px] font-mono text-slate-400 mt-1">
                  HEATMAP VIEW
                </p>
              </div>
            </div>

            {currentSnapshot && (
              <div className="bg-white rounded border border-slate-200 px-3 py-2 relative z-10">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Current</div>
                <a
                  href={buildGitHubCommitUrl(repositoryUrl, currentSnapshot.commit_sha)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
                >
                  {currentSnapshot.commit_sha.substring(0, 7)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="p-6 grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Changes</div>
              <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                {data.total_changes}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Avg. Churn</div>
              <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                {data.average_churn_per_snapshot}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Modules</div>
              <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                {Object.keys(data.node_churn).length}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Intensity Scale</div>
            <div className="flex items-center gap-4 flex-wrap">
              {['Minimal', 'Low', 'Medium', 'High', 'Critical'].map((label, index) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      ['bg-teal-600', 'bg-teal-400', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500'][index]
                    }`}
                  />
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Churning Nodes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-black text-slate-900 tracking-widest uppercase leading-none">
              Top Churning Modules
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Most frequently modified dependencies
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {data.top_churning_nodes.slice(0, 20).map(([nodeId, churnCount]: [string, number], index: number) => (
              <div
                key={nodeId}
                className="px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center font-bold text-xs font-mono ${
                    index === 0 ? 'bg-teal-600 text-white' :
                    index === 1 ? 'bg-teal-500 text-white' :
                    index === 2 ? 'bg-teal-400 text-white' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Module Icon */}
                  <div className="flex-shrink-0 p-2 bg-slate-50 rounded border border-slate-200">
                    <Package className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Module Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-bold text-slate-900 truncate" title={nodeId}>
                      {nodeId}
                    </div>
                  </div>

                  {/* Churn Bar */}
                  <div className="flex-shrink-0 w-48">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full ${getChurnColor(churnCount)} transition-all`}
                          style={{ width: `${(churnCount / maxChurn) * 100}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono font-bold text-sm text-slate-900 tabular-nums">
                        {churnCount}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right mt-1">
                      {getChurnLabel(churnCount)}
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
