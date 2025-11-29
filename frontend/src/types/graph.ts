export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface NodeMetrics {
  afferent_coupling: number;
  efferent_coupling: number;
  instability: number;
  is_circular: boolean;
  is_high_coupling: boolean;
  // Complexity metrics
  cyclomatic_complexity: number;
  max_complexity: number;
  maintainability_index: number;
  lines_of_code: number;
  complexity_grade: string;
  maintainability_grade: string;
  // Hot zone detection
  is_hot_zone: boolean;
  hot_zone_severity: 'critical' | 'warning' | 'info' | 'ok';
  hot_zone_score: number;
  hot_zone_reason: string;
}

export type Language = 'python' | 'javascript' | 'typescript' | 'go' | 'java' | 'rust' | null;
export type NodeKind = 'module' | 'package' | 'class' | 'interface' | 'function' | 'method' | 'variable' | 'struct' | 'trait' | 'enum' | 'type_alias' | 'component' | 'hook' | 'service' | 'library';

export interface Node {
  id: string;
  label: string;
  type: 'internal' | 'third_party';
  module: string;
  position: Position3D;
  color: string;
  metrics: NodeMetrics;
  cluster_id?: number | null;
  // Multi-language & monorepo support
  language?: Language;
  node_kind?: NodeKind;
  file_path?: string | null;
  service?: string | null;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  imports: string[];
  weight: number;
  thickness: number;
  color?: string;
}

export interface DependencyGraph {
  nodes: Node[];
  edges: Edge[];
}
