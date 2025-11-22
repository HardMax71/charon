import { useState, useMemo, useEffect } from 'react';
import { TimelineSlider } from './TimelineSlider';
import { ChurnHeatmap } from './ChurnHeatmap';
import { CircularDepsTimeline } from './CircularDepsTimeline';
import { Graph3D } from '@/components/Graph3D/Graph3D';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import {
  Play,
  Pause,
  BarChart3,
  Network,
  ExternalLink,
  Calendar,
  User,
  GitCommit,
  Clock
} from 'lucide-react';
import { Node, Edge } from '@/types/graph';
import { buildGitHubCommitUrl } from '@/utils/githubUtils';

interface TemporalVisualizationProps {
  data: any;
}

export const TemporalVisualization = ({ data }: TemporalVisualizationProps) => {
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'heatmap' | 'graph'>('graph');
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  const { setGraph, setImpactAnalysis, setSelectedNode } = useGraphStore();
  const { setCurrentLayout } = useUIStore();

  const currentSnapshot = useMemo(
    () => data.snapshots[currentSnapshotIndex] || null,
    [data.snapshots, currentSnapshotIndex]
  );

  // --- GRAPH CONVERSION LOGIC ---
  useEffect(() => {
    if (!currentSnapshot || !currentSnapshot.graph_snapshot) return;

    // Clear any existing impact analysis and selections to prevent interference
    setImpactAnalysis(null);
    setSelectedNode(null);

    const { nodes: rawNodes, edges: rawEdges } = currentSnapshot.graph_snapshot;

    // Create node map to track circular status
    const nodeCircularMap = new Map<string, boolean>();

    const nodes: Node[] = rawNodes.map((node: any) => {
      const metrics = node.metrics || {};
      const position = node.position || { x: 0, y: 0, z: 0 };
      const isCircular = Boolean(metrics.is_circular);

      nodeCircularMap.set(node.id, isCircular);

      return {
        id: node.id,
        label: node.label || node.id.split('/').pop() || node.id,
        type: node.type || 'internal' as const,
        module: node.module || node.id.split('/').slice(0, -1).join('/') || 'root',
        position: { x: position.x, y: position.y, z: position.z },
        color: isCircular ? '#ef4444' : '#3b82f6',
        metrics: {
          afferent_coupling: metrics.afferent_coupling || 0,
          efferent_coupling: metrics.efferent_coupling || 0,
          instability: metrics.instability || 0,
          is_circular: isCircular,
          is_high_coupling: Boolean(metrics.is_high_coupling),
          cyclomatic_complexity: metrics.cyclomatic_complexity || 0,
          max_complexity: metrics.max_complexity || 0,
          maintainability_index: metrics.maintainability_index || 0,
          lines_of_code: metrics.lines_of_code || 0,
          complexity_grade: metrics.complexity_grade || 'A',
          maintainability_grade: metrics.maintainability_grade || 'A',
          is_hot_zone: Boolean(metrics.is_hot_zone),
          hot_zone_severity: metrics.hot_zone_severity || 'ok',
          hot_zone_score: metrics.hot_zone_score || 0,
          hot_zone_reason: metrics.hot_zone_reason || '',
        },
        cluster_id: null,
      };
    });

    const edges: Edge[] = rawEdges.map((edge: any, index: number) => {
      const weight = edge.weight || 1;
      const sourceCircular = nodeCircularMap.get(edge.source) || false;
      const targetCircular = nodeCircularMap.get(edge.target) || false;
      const isCircularEdge = sourceCircular && targetCircular;

      return {
        id: `edge-${currentSnapshotIndex}-${index}`,
        source: edge.source,
        target: edge.target,
        imports: edge.imports || [],
        weight: weight,
        thickness: Math.min(weight * 0.5, 5.0),
        color: isCircularEdge ? '#ef4444' : undefined,
      };
    });

    // Force complete graph replacement by creating new object
    setGraph({ nodes: [...nodes], edges: [...edges] });
    setCurrentLayout('hierarchical');
  }, [currentSnapshot, currentSnapshotIndex, setGraph, setCurrentLayout, setImpactAnalysis, setSelectedNode]);

  // --- AUTOPLAY LOGIC (Unchanged) ---
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSnapshotIndex((prev) => {
          if (prev >= data.snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, playbackSpeed, data.snapshots.length]);

  return (
    <div className="h-full flex flex-col bg-white">

      {/* --- CONTROLS HEADER --- */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">

        {/* Playback */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`
              h-10 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2
              ${isPlaying
                ? 'bg-slate-900 text-white hover:bg-teal-600 shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }
            `}
            disabled={currentSnapshotIndex >= data.snapshots.length - 1}
          >
            {isPlaying ? (
              <> <Pause className="w-3.5 h-3.5" /> Pause </>
            ) : (
              <> <Play className="w-3.5 h-3.5" /> Play </>
            )}
          </button>

          <div className="relative h-10">
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="input-select h-full text-xs font-bold uppercase"
            >
              <option value={2000}>0.5x Speed</option>
              <option value={1000}>1x Speed</option>
              <option value={500}>2x Speed</option>
              <option value={250}>4x Speed</option>
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* View Mode Switch */}
        <div className="flex bg-slate-200/50 p-1 rounded-lg h-10">
          <button
            onClick={() => setViewMode('graph')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'graph'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Topology
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'heatmap'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Heatmap
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 overflow-hidden flex">

        {/* Left Sidebar: Metadata */}
        <div className="w-80 border-r border-slate-200 bg-slate-50/50 overflow-y-auto custom-scrollbar p-5 space-y-5">

          {/* Commit Details Card */}
          {currentSnapshot && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Snapshot Data</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                    {currentSnapshot.commit_sha.substring(0, 7)}
                  </span>
                  <a
                    href={buildGitHubCommitUrl(data.repository, currentSnapshot.commit_sha)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-teal-600 hover:underline flex items-center gap-1"
                  >
                    VIEW DIFF <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(currentSnapshot.commit_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentSnapshot.author}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 italic leading-relaxed">
                    "{currentSnapshot.commit_message}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Snapshot Metrics */}
          {currentSnapshot && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                State Metrics
              </h4>
              <div className="space-y-2">
                <MetricRow label="Nodes" value={currentSnapshot.node_count} />
                <MetricRow label="Edges" value={currentSnapshot.edge_count} />
                <MetricRow
                  label="Circular Cycles"
                  value={currentSnapshot.circular_count}
                  highlight={currentSnapshot.circular_count > 0}
                />
              </div>
            </div>
          )}

          {/* Timeline Component */}
          <div className="pt-2">
            <CircularDepsTimeline
              timeline={data.circular_deps_timeline}
              currentCommitSha={currentSnapshot?.commit_sha}
              repositoryUrl={data.repository}
            />
          </div>
        </div>

        {/* Right Panel: Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white relative">

          {/* Graph/Heatmap Area */}
          <div className="flex-1 overflow-hidden relative">
            {viewMode === 'graph' ? (
              <Graph3D
                key={`graph-${currentSnapshotIndex}`}
                hideLayoutSelector={true}
                nodeMetricsPosition="absolute"
              />
            ) : (
              <ChurnHeatmap data={data.churn_data} currentSnapshot={currentSnapshot} repositoryUrl={data.repository} />
            )}
          </div>

          {/* Timeline Footer */}
          <div className="border-t border-slate-200 bg-white p-6 z-10 relative">
            <TimelineSlider
              snapshots={data.snapshots}
              currentIndex={currentSnapshotIndex}
              onIndexChange={setCurrentSnapshotIndex}
              repositoryUrl={data.repository}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT ---
const MetricRow = ({ label, value, highlight }: any) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className={`font-mono font-bold ${highlight ? 'text-rose-600' : 'text-slate-900'}`}>
      {value}
    </span>
  </div>
);