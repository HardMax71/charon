import { useState, useMemo, useEffect } from 'react';
import { TimelineSlider } from './TimelineSlider';
import { ChurnHeatmap } from './ChurnHeatmap';
import { CircularDepsTimeline } from './CircularDepsTimeline';
import { Graph3D } from '@/components/Graph3D/Graph3D';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { Play, Pause, BarChart3, Network, ExternalLink } from 'lucide-react';
import { Node, Edge } from '@/types/graph';
import { buildGitHubCommitUrl } from '@/utils/githubUtils';

interface TemporalVisualizationProps {
  data: any;
}

export const TemporalVisualization = ({ data }: TemporalVisualizationProps) => {
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'heatmap' | 'graph'>('graph');
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per frame

  const { setGraph } = useGraphStore();
  const { setCurrentLayout } = useUIStore();

  const currentSnapshot = useMemo(
    () => data.snapshots[currentSnapshotIndex] || null,
    [data.snapshots, currentSnapshotIndex]
  );

  // Convert snapshot to graph format and update store
  useEffect(() => {
    if (!currentSnapshot || !currentSnapshot.graph_snapshot) {
      return;
    }

    const { nodes: rawNodes, edges: rawEdges } = currentSnapshot.graph_snapshot;

    // Convert to proper Node format
    const nodes: Node[] = rawNodes.map((node: any) => {
      const metrics = node.metrics || {};
      const position = node.position || { x: 0, y: 0, z: 0 };

      return {
        id: node.id,
        label: node.label || node.id.split('/').pop() || node.id,
        type: node.type || 'internal' as const,
        module: node.module || node.id.split('/').slice(0, -1).join('/') || 'root',
        position: {
          x: position.x,
          y: position.y,
          z: position.z,
        },
        color: metrics.is_circular ? '#ef4444' : '#3b82f6',
        metrics: {
          afferent_coupling: metrics.afferent_coupling || 0,
          efferent_coupling: metrics.efferent_coupling || 0,
          instability: metrics.instability || 0,
          is_circular: metrics.is_circular || false,
          is_high_coupling: metrics.is_high_coupling || false,
          cyclomatic_complexity: metrics.cyclomatic_complexity || 0,
          max_complexity: metrics.max_complexity || 0,
          maintainability_index: metrics.maintainability_index || 0,
          lines_of_code: metrics.lines_of_code || 0,
          complexity_grade: metrics.complexity_grade || 'A',
          maintainability_grade: metrics.maintainability_grade || 'A',
          is_hot_zone: metrics.is_hot_zone || false,
          hot_zone_severity: metrics.hot_zone_severity || 'ok',
          hot_zone_score: metrics.hot_zone_score || 0,
          hot_zone_reason: metrics.hot_zone_reason || '',
        },
        cluster_id: null,
      };
    });

    // Convert to proper Edge format
    const edges: Edge[] = rawEdges.map((edge: any, index: number) => {
      const weight = edge.weight || 1;
      const thickness = Math.min(weight * 0.5, 5.0);

      return {
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        imports: edge.imports || [],
        weight: weight,
        thickness: thickness,
      };
    });

    // Update graph store
    setGraph({ nodes, edges });

    // Force hierarchical layout
    setCurrentLayout('hierarchical');
  }, [currentSnapshot, setGraph, setCurrentLayout]);

  // Auto-play functionality
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

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, data.snapshots.length]);

  return (
    <div className="h-full flex flex-col">
      {/* Controls Bar */}
      <div className="bg-surface border-b border-border-light px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                isPlaying
                  ? 'bg-amber-600 text-white shadow-md hover:bg-amber-700'
                  : 'bg-background text-text-primary hover:bg-border-light'
              }`}
              disabled={currentSnapshotIndex >= data.snapshots.length - 1}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-secondary">Speed:</label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="px-3 py-2 border border-border-medium rounded-lg bg-surface text-text-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={250}>4x</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                viewMode === 'graph'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-background text-text-secondary hover:bg-border-light hover:text-text-primary'
              }`}
            >
              <Network className="w-4 h-4" />
              Graph View
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                viewMode === 'heatmap'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-background text-text-secondary hover:bg-border-light hover:text-text-primary'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Heatmap View
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Timeline & Stats */}
        <div className="w-80 border-r border-border-light bg-surface overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Current Commit Info */}
            {currentSnapshot && (
              <div className="bg-background rounded-lg p-4 border border-border-light">
                <h3 className="text-sm font-bold text-text-primary mb-3">Current Commit</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-text-tertiary">SHA:</span>
                    <a
                      href={buildGitHubCommitUrl(data.repository, currentSnapshot.commit_sha)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 font-mono text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 transition-colors"
                    >
                      {currentSnapshot.commit_sha.substring(0, 7)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Date:</span>
                    <span className="ml-2 font-mono text-text-primary">
                      {new Date(currentSnapshot.commit_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Author:</span>
                    <span className="ml-2 text-text-primary">{currentSnapshot.author}</span>
                  </div>
                  <div className="pt-2 border-t border-border-light">
                    <p className="text-text-secondary italic">{currentSnapshot.commit_message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics */}
            {currentSnapshot && (
              <div className="bg-background rounded-lg p-4 border border-border-light">
                <h3 className="text-sm font-bold text-text-primary mb-3">Metrics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Nodes:</span>
                    <span className="font-mono font-bold text-text-primary tabular-nums">
                      {currentSnapshot.node_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Edges:</span>
                    <span className="font-mono font-bold text-text-primary tabular-nums">
                      {currentSnapshot.edge_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Circular Deps:</span>
                    <span className={`font-mono font-bold tabular-nums ${
                      currentSnapshot.circular_count > 0 ? 'text-error' : 'text-success'
                    }`}>
                      {currentSnapshot.circular_count}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Circular Dependencies Timeline */}
            <CircularDepsTimeline
              timeline={data.circular_deps_timeline}
              currentCommitSha={currentSnapshot?.commit_sha}
              repositoryUrl={data.repository}
            />
          </div>
        </div>

        {/* Right Panel - Visualization */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Visualization */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'graph' ? (
              <Graph3D hideLayoutSelector={true} />
            ) : (
              <ChurnHeatmap data={data.churn_data} currentSnapshot={currentSnapshot} repositoryUrl={data.repository} />
            )}
          </div>

          {/* Timeline Slider */}
          <div className="border-t border-border-light bg-surface p-6">
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
