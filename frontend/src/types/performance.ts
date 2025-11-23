/**
 * Performance profiling types.
 *
 * Mirrors backend Pydantic models from app/core/parsing_models.py
 */

export type ProfilerType = 'cprofile' | 'pyspy' | 'scalene' | 'unknown';

export type BottleneckType = 'cpu' | 'memory' | 'io' | 'combined';

export type PerformanceSeverity = 'critical' | 'high' | 'medium' | 'low' | 'normal';

export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'very_hard';

/**
 * Performance profile for a single function.
 */
export interface FunctionProfile {
  function_name: string;
  module: string;
  filename: string;
  lineno: number;

  // Time metrics (in seconds)
  total_time: number;
  self_time: number;
  cumulative_time: number;
  avg_time_per_call: number;
  time_percentage: number;

  // Call metrics
  call_count: number;
  primitive_calls: number;

  // Memory metrics (optional)
  memory_usage_mb: number | null;
  memory_peak_mb: number | null;
}

/**
 * Aggregated performance metrics for a module.
 */
export interface ModulePerformance {
  module_path: string;

  // Aggregated time metrics
  total_execution_time: number;
  self_execution_time: number;
  time_percentage: number;

  // Call metrics
  total_calls: number;
  unique_functions: number;

  // Memory metrics
  total_memory_mb: number | null;

  // Function details
  functions: FunctionProfile[];

  // Bottleneck classification
  is_cpu_bottleneck: boolean;
  is_memory_bottleneck: boolean;
  is_io_bottleneck: boolean;
  performance_severity: PerformanceSeverity;
}

/**
 * Configurable weights for priority scoring algorithm.
 */
export interface PriorityWeights {
  execution_time: number; // default: 0.40
  coupling: number; // default: 0.30
  complexity: number; // default: 0.15
  memory_usage: number; // default: 0.10
  call_frequency: number; // default: 0.05
}

/**
 * Detected performance bottleneck with priority scoring.
 */
export interface PerformanceBottleneck {
  module_path: string;

  // Bottleneck classification
  bottleneck_type: BottleneckType;

  // Performance metrics
  execution_time: number;
  time_percentage: number;
  memory_usage_mb: number | null;
  call_count: number;

  // Architectural metrics (from dependency graph)
  coupling_score: number;
  complexity_score: number;
  is_circular: boolean;
  is_hot_zone: boolean;

  // Priority scoring
  priority_score: number; // 0-100
  priority_rank: number;

  // Impact estimation
  estimated_impact: ImpactLevel;
  optimization_difficulty: DifficultyLevel;

  // Recommendations
  recommendation: string;
  affected_modules: string[];
}

/**
 * Complete performance analysis result.
 */
export interface PerformanceAnalysisResult {
  // Metadata
  profiler_type: ProfilerType;
  total_execution_time: number;
  total_samples: number | null;
  timestamp: string;

  // Performance data
  module_performance: Record<string, ModulePerformance>;

  // Bottleneck analysis
  bottlenecks: PerformanceBottleneck[];

  // Statistics
  total_modules_profiled: number;
  critical_bottlenecks: number;
  high_bottlenecks: number;

  // Configuration
  weights_used: PriorityWeights;
}

/**
 * Default priority weights.
 */
export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  execution_time: 0.40,
  coupling: 0.30,
  complexity: 0.15,
  memory_usage: 0.10,
  call_frequency: 0.05,
};

/**
 * Helper to get bottleneck severity color.
 */
export const getBottleneckColor = (bottleneck: PerformanceBottleneck): string => {
  switch (bottleneck.estimated_impact) {
    case 'critical':
      return '#ef4444'; // red-500
    case 'high':
      return '#f97316'; // orange-500
    case 'medium':
      return '#f59e0b'; // amber-500
    case 'low':
      return '#84cc16'; // lime-500
    default:
      return '#6b7280'; // gray-500
  }
};

/**
 * Helper to get difficulty badge color.
 */
export const getDifficultyColor = (difficulty: DifficultyLevel): string => {
  switch (difficulty) {
    case 'easy':
      return '#10b981'; // green-500
    case 'medium':
      return '#f59e0b'; // amber-500
    case 'hard':
      return '#f97316'; // orange-500
    case 'very_hard':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
};

/**
 * Helper to format time duration.
 */
export const formatTime = (seconds: number): string => {
  if (seconds < 0.001) {
    return `${(seconds * 1_000_000).toFixed(0)}μs`;
  } else if (seconds < 1) {
    return `${(seconds * 1000).toFixed(2)}ms`;
  } else {
    return `${seconds.toFixed(3)}s`;
  }
};

/**
 * Helper to format memory size.
 */
export const formatMemory = (mb: number | null): string => {
  if (mb === null || mb === undefined) {
    return 'N/A';
  }
  if (mb < 1) {
    return `${(mb * 1024).toFixed(2)} KB`;
  } else if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  } else {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
};
