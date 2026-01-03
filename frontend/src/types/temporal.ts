import type { NodeMetrics, Position3D } from './graph';

export interface TemporalGraphSnapshotNode {
  id: string;
  type: 'internal' | 'third_party';
  label: string;
  module: string;
  position: Position3D;
  metrics: NodeMetrics;
}

export interface TemporalGraphSnapshotEdge {
  source: string;
  target: string;
  imports: string[];
  weight: number;
}

export interface TemporalGraphSnapshot {
  nodes: TemporalGraphSnapshotNode[];
  edges: TemporalGraphSnapshotEdge[];
}

export interface TemporalDependencyChange {
  node: string;
  added: string[];
  removed: string[];
}

export interface TemporalSnapshotChanges {
  added_nodes: string[];
  removed_nodes: string[];
  modified_dependencies: TemporalDependencyChange[];
  node_count_delta: number;
  edge_count_delta: number;
  circular_count_delta: number;
}

export interface TemporalSnapshotMetrics {
  average_coupling: number;
  max_coupling: number;
  total_complexity: number;
  avg_afferent_coupling: number;
  avg_efferent_coupling: number;
}

export interface TemporalSnapshotData {
  commit_sha: string;
  commit_date: string;
  commit_message: string;
  author: string;
  node_count: number;
  edge_count: number;
  dependencies: Record<string, string[]>;
  circular_nodes: string[];
  circular_count: number;
  global_metrics: TemporalSnapshotMetrics;
  changes?: TemporalSnapshotChanges | null;
  graph_snapshot: TemporalGraphSnapshot;
}

export interface ChurnData {
  date: string;
  commit_sha: string;
  churn_count: number;
  nodes_changed: string[];
}

export interface CircularDependencyTimelineEvent {
  commit_sha: string;
  date: string;
  commit_message: string;
  new_circular_nodes: string[];
  total_circular: number;
}

export interface ChurnHeatmapData {
  node_churn: Record<string, number>;
  total_changes: number;
  average_churn_per_snapshot: number;
  top_churning_nodes: Array<[string, number]>;
  churn_heatmap?: ChurnData[];
}

export interface TemporalAnalysisResponse {
  analysis_id: string;
  repository: string;
  start_date: string | null;
  end_date: string | null;
  total_commits: number;
  analyzed_commits: number;
  sample_strategy: string;
  snapshots: TemporalSnapshotData[];
  churn_data: ChurnHeatmapData;
  circular_deps_timeline: CircularDependencyTimelineEvent[];
}

export interface TemporalAnalysisRequest {
  repository_url: string;
  start_date?: string | null;
  end_date?: string | null;
  sample_strategy?: 'all' | 'daily' | 'weekly' | 'monthly';
}
