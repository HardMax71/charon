export interface TemporalSnapshotData {
  commit_sha: string;
  commit_date: string;
  commit_message: string;
  author: string;
  files_analyzed: number;
  dependencies_count: number;
  circular_dependencies: number;
  avg_coupling: number;
  metrics: Record<string, number | string>;
}

export interface ChurnData {
  file_path: string;
  churn_count: number;
}

export interface CircularDependencyTimelineEvent {
  commit_sha: string;
  date: string;
  commit_message: string;
  new_circular_nodes: string[];
}

export interface ChurnHeatmapData {
  node_churn: Record<string, number>;
  total_changes: number;
  average_churn_per_snapshot: number;
  top_churning_nodes: Array<[string, number]>;
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
