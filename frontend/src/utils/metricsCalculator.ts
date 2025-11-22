import { DependencyGraph, Node, Edge } from '@/types/graph';
import { GlobalMetrics, NodeMetrics } from '@/types/metrics';

/**
 * Simplified client-side metrics recalculation for "what if" scenarios
 * Note: This is approximate - server-side calculation is more accurate
 */
export const recalculateMetrics = (graph: DependencyGraph): GlobalMetrics => {
  // Build adjacency map for quick lookups
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  // Initialize all nodes
  graph.nodes.forEach(node => {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  });

  // Calculate degrees from edges
  graph.edges.forEach(edge => {
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Detect simple circular dependencies (nodes that have paths to themselves)
  const circularDeps = detectCircularDependencies(graph);

  // Calculate averages for internal nodes only
  const internalNodes = graph.nodes.filter(n => n.type === 'internal');
  const thirdPartyNodes = graph.nodes.filter(n => n.type === 'third_party');

  const avgAfferent = internalNodes.length > 0
    ? internalNodes.reduce((sum, n) => sum + (inDegree.get(n.id) || 0), 0) / internalNodes.length
    : 0;

  const avgEfferent = internalNodes.length > 0
    ? internalNodes.reduce((sum, n) => sum + (outDegree.get(n.id) || 0), 0) / internalNodes.length
    : 0;

  // Calculate coupling threshold (80th percentile of efferent coupling)
  const efferentValues = internalNodes.map(n => outDegree.get(n.id) || 0).sort((a, b) => a - b);
  const threshold80Index = Math.floor(efferentValues.length * 0.8);
  const couplingThreshold = efferentValues[threshold80Index] || 0;

  // Identify high coupling files
  const highCouplingFiles = internalNodes
    .filter(n => (outDegree.get(n.id) || 0) >= couplingThreshold)
    .map(n => n.id);

  return {
    total_files: graph.nodes.length,
    total_internal: internalNodes.length,
    total_third_party: thirdPartyNodes.length,
    avg_afferent_coupling: Math.round(avgAfferent * 100) / 100,
    avg_efferent_coupling: Math.round(avgEfferent * 100) / 100,
    circular_dependencies: circularDeps.map(cycle => ({ cycle })),
    high_coupling_files: highCouplingFiles,
    coupling_threshold: Math.round(couplingThreshold * 100) / 100,
    avg_complexity: 0, // Complexity requires code analysis
    avg_maintainability: 0,
    hot_zone_files: [],
    clusters: [],
    package_suggestions: [],
    refactoring_suggestions: [],
    refactoring_summary: null,
  };
};

/**
 * Simple cycle detection using DFS
 */
const detectCircularDependencies = (graph: DependencyGraph): string[][] => {
  const adjList = new Map<string, string[]>();

  // Build adjacency list
  graph.nodes.forEach(node => adjList.set(node.id, []));
  graph.edges.forEach(edge => {
    const neighbors = adjList.get(edge.source) || [];
    neighbors.push(edge.target);
    adjList.set(edge.source, neighbors);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  const dfs = (node: string, path: string[]): void => {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          if (cycle.length >= 2) {
            cycles.push(cycle);
          }
        }
      }
    }

    recStack.delete(node);
  };

  graph.nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  });

  // Remove duplicate cycles
  return Array.from(new Set(cycles.map(c => JSON.stringify(c)))).map(c => JSON.parse(c));
};

/**
 * Calculate deltas between two sets of metrics
 */
export const calculateMetricDeltas = (
  before: GlobalMetrics,
  after: GlobalMetrics
): Record<string, any> => {
  const deltas: Record<string, any> = {};

  // Numeric comparisons
  const metrics = [
    { key: 'total_files', label: 'Total Files' },
    { key: 'total_internal', label: 'Internal Files' },
    { key: 'total_third_party', label: 'Third-Party Deps' },
    { key: 'avg_afferent_coupling', label: 'Avg Afferent Coupling' },
    { key: 'avg_efferent_coupling', label: 'Avg Efferent Coupling' },
    { key: 'coupling_threshold', label: 'Coupling Threshold' },
  ];

  metrics.forEach(({ key, label }) => {
    const beforeVal = (before as any)[key] || 0;
    const afterVal = (after as any)[key] || 0;
    const delta = afterVal - beforeVal;
    const deltaPercent = beforeVal !== 0 ? (delta / beforeVal) * 100 : 0;

    deltas[key] = {
      label,
      before: beforeVal,
      after: afterVal,
      delta: Math.round(delta * 100) / 100,
      deltaPercent: Math.round(deltaPercent * 10) / 10,
      improved: determineImprovement(key, delta),
    };
  });

  // Array comparisons
  deltas.circular_dependencies = {
    label: 'Circular Dependencies',
    before: before.circular_dependencies.length,
    after: after.circular_dependencies.length,
    delta: after.circular_dependencies.length - before.circular_dependencies.length,
    improved: after.circular_dependencies.length < before.circular_dependencies.length,
  };

  deltas.high_coupling_files = {
    label: 'High Coupling Files',
    before: before.high_coupling_files.length,
    after: after.high_coupling_files.length,
    delta: after.high_coupling_files.length - before.high_coupling_files.length,
    improved: after.high_coupling_files.length < before.high_coupling_files.length,
  };

  return deltas;
};

/**
 * Determine if a change is an improvement based on the metric
 */
const determineImprovement = (metric: string, delta: number): boolean => {
  // For these metrics, lower is better
  const lowerIsBetter = [
    'avg_efferent_coupling',
    'coupling_threshold',
    'total_third_party',
  ];

  if (lowerIsBetter.includes(metric)) {
    return delta < 0;
  }

  // For most other metrics, change neutral or context-dependent
  return false;
};
