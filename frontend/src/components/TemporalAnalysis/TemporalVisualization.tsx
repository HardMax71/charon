import { useState, useMemo, useEffect } from 'react';
import { TimelineSlider } from './TimelineSlider';
import { ChurnHeatmap } from './ChurnHeatmap';
import { TemporalControls } from './TemporalControls';
import { TemporalSidebar } from './TemporalSidebar';
import { Graph3D } from '@/components/Graph3D/Graph3D';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { Node, Edge } from '@/types/graph';
import { TemporalAnalysisResponse } from '@/types/temporal';

interface TemporalVisualizationProps {
  data: TemporalAnalysisResponse;
}

export const TemporalVisualization = ({ data }: TemporalVisualizationProps) => {
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'heatmap' | 'graph'>('graph');
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  const setGraph = useGraphStore(state => state.setGraph);
  const setImpactAnalysis = useGraphStore(state => state.setImpactAnalysis);
  const setSelectedNode = useGraphStore(state => state.setSelectedNode);
  const setCurrentLayout = useUIStore(state => state.setCurrentLayout);

  const currentSnapshot = useMemo(
    () => data.snapshots[currentSnapshotIndex] || null,
    [data.snapshots, currentSnapshotIndex]
  );

  useEffect(() => {
    if (!currentSnapshot || !currentSnapshot.graph_snapshot) return;

    setImpactAnalysis(null);
    setSelectedNode(null);

    const { nodes: rawNodes, edges: rawEdges } = currentSnapshot.graph_snapshot;

    const nodeCircularMap = new Map<string, boolean>();

    const nodes: Node[] = rawNodes.map((node) => {
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

    const edges: Edge[] = rawEdges.map((edge, index: number) => {
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

    setGraph({ nodes: [...nodes], edges: [...edges] });
    setCurrentLayout('hierarchical');
  }, [currentSnapshot, currentSnapshotIndex, setGraph, setCurrentLayout, setImpactAnalysis, setSelectedNode]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
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

      <TemporalControls
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        currentSnapshotIndex={currentSnapshotIndex}
        totalSnapshots={data.snapshots.length}
        viewMode={viewMode}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onSpeedChange={setPlaybackSpeed}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 overflow-hidden flex">

        <TemporalSidebar
          currentSnapshot={currentSnapshot}
          timeline={data.circular_deps_timeline}
          repositoryUrl={data.repository}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-white relative">

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
