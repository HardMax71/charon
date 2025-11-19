export interface CircularDependency {
  cycle: string[];
}

export interface ClusterMetrics {
  cluster_id: number;
  size: number;
  internal_edges: number;
  external_edges: number;
  cohesion: number;
  modularity_contribution: number;
  avg_internal_coupling: number;
  is_package_candidate: boolean;
  nodes: string[];
}

export interface PackageSuggestion {
  cluster_id: number;
  suggested_package_name: string;
  modules: string[];
  size: number;
  cohesion: number;
  reason: string;
}

export interface RefactoringSuggestion {
  module: string;
  severity: 'critical' | 'warning' | 'info';
  pattern: string;
  description: string;
  metrics: Record<string, any>;
  recommendation: string;
  details: string;
  suggested_refactoring: string;
}

export interface RefactoringSummary {
  total_suggestions: number;
  by_severity: Record<string, number>;
  by_pattern: Record<string, number>;
  modules_analyzed: number;
}

export interface HotZoneFile {
  file: string;
  severity: 'critical' | 'warning' | 'info' | 'ok';
  score: number;
  reason: string;
  complexity: number;
  coupling: number;
}

export interface GlobalMetrics {
  total_files: number;
  total_internal: number;
  total_third_party: number;
  avg_afferent_coupling: number;
  avg_efferent_coupling: number;
  circular_dependencies: CircularDependency[];
  high_coupling_files: string[];
  coupling_threshold: number;
  // Complexity metrics
  avg_complexity: number;
  avg_maintainability: number;
  hot_zone_files: HotZoneFile[];
  // Clustering
  clusters?: ClusterMetrics[];
  package_suggestions?: PackageSuggestion[];
  refactoring_suggestions?: RefactoringSuggestion[];
  refactoring_summary?: RefactoringSummary;
}

export interface ImpactAnalysis {
  selected_node: {
    id: string;
    label: string;
    module: string;
  };
  affected_nodes: Record<string, number>; // node_id -> distance
  impact_levels: Record<string, string[]>; // distance -> node_ids
  affected_node_details: Array<{
    id: string;
    label: string;
    module: string;
    type: string;
    distance: number;
    color: string;
  }>;
  metrics: {
    total_nodes: number;
    total_affected: number;
    impact_percentage: number;
    max_depth_reached: number;
    distance_breakdown: Record<string, {
      count: number;
      percentage: number;
      label: string;
    }>;
  };
}

export interface HealthScoreComponent {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: Record<string, any>;
}

export interface HealthScoreComponents {
  circular_dependencies: HealthScoreComponent;
  coupling_health: HealthScoreComponent;
  complexity_health: HealthScoreComponent;
  architecture_health: HealthScoreComponent;
  stability_distribution: HealthScoreComponent;
}

export interface HealthScoreWeights {
  circular: number;
  coupling: number;
  complexity: number;
  architecture: number;
  stability: number;
}

export interface HealthScore {
  overall_score: number;
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: HealthScoreComponents;
  weights: HealthScoreWeights;
  summary: string;
  recommendations: string[];
}

export interface AnalysisResult {
  graph: {
    nodes: any[];
    edges: any[];
  };
  global_metrics: GlobalMetrics;
  warnings: string[];
}
