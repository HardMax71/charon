import { DependencyGraph, Node, Edge } from './graph';
import { GlobalMetrics } from './metrics';

export interface RefactoringScenario {
  id: string;
  name: string;
  description: string;
  originalGraph: DependencyGraph;
  modifiedGraph: DependencyGraph;
  originalMetrics: GlobalMetrics;
  modifiedMetrics: GlobalMetrics | null;
  changes: RefactoringChange[];
  timestamp: string;
}

export type RefactoringChangeType =
  | 'remove_node'
  | 'remove_edge'
  | 'add_edge'
  | 'merge_nodes';

export type RefactoringChangeData =
  | { nodeId: string }
  | { edgeId: string; source: string; target: string }
  | { sourceNodeId: string; targetNodeId: string; newNodeId: string };

export interface RefactoringChange {
  id: string;
  type: RefactoringChangeType;
  description: string;
  data: RefactoringChangeData;
  timestamp: string;
}

export interface MetricsDelta {
  metric: string;
  before: number;
  after: number;
  delta: number;
  deltaPercent: number;
  improved: boolean;
}
