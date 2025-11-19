import { useEffect, useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { calculateHealthScore } from '@/services/api';
import { HealthScore as HealthScoreType } from '@/types/metrics';
import {
  Heart,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader,
  RefreshCw,
  Flame,
  Link as LinkIcon,
  Code,
  Shield,
  BarChart3
} from 'lucide-react';

export const HealthScore = () => {
  const { graph, globalMetrics } = useGraphStore();
  const [healthScore, setHealthScore] = useState<HealthScoreType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthScore = async () => {
    if (!graph || !globalMetrics) {
      setError('No analysis data available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const score = await calculateHealthScore(graph, globalMetrics);
      setHealthScore(score);
    } catch (err) {
      setError('Failed to calculate health score');
      console.error('Health score error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (graph && globalMetrics) {
      fetchHealthScore();
    }
  }, [graph, globalMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-text-secondary">Calculating health score...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
        <button
          onClick={fetchHealthScore}
          className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!healthScore) {
    return (
      <div className="p-4 text-text-secondary text-center">
        No health score data available
      </div>
    );
  }

  const getGradeColor = (grade: string) => {
    const colors = {
      'A': 'text-green-600 bg-green-50 border-green-200',
      'B': 'text-blue-600 bg-blue-50 border-blue-200',
      'C': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'D': 'text-orange-600 bg-orange-50 border-orange-200',
      'F': 'text-red-600 bg-red-50 border-red-200',
    };
    return colors[grade as keyof typeof colors] || colors['F'];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getComponentIcon = (component: string) => {
    const icons = {
      'circular_dependencies': <RefreshCw className="w-5 h-5" />,
      'coupling_health': <LinkIcon className="w-5 h-5" />,
      'complexity_health': <Flame className="w-5 h-5" />,
      'architecture_health': <Shield className="w-5 h-5" />,
      'stability_distribution': <BarChart3 className="w-5 h-5" />,
    };
    return icons[component as keyof typeof icons] || <Code className="w-5 h-5" />;
  };

  const formatComponentName = (name: string) => {
    return name.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getWeightKey = (componentKey: string): keyof typeof healthScore.weights => {
    const mapping: Record<string, keyof typeof healthScore.weights> = {
      'circular_dependencies': 'circular',
      'coupling_health': 'coupling',
      'complexity_health': 'complexity',
      'architecture_health': 'architecture',
      'stability_distribution': 'stability',
    };
    return mapping[componentKey] || 'circular';
  };

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Overall Health Score Card */}
      <div className={`relative overflow-hidden rounded-xl border-2 p-6 ${getGradeColor(healthScore.overall_grade)}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-6 h-6" />
              <h3 className="text-lg font-bold">Overall Health Score</h3>
            </div>

            <div className="flex items-baseline gap-3 mt-3">
              <span className={`text-6xl font-extrabold tabular-nums ${getScoreColor(healthScore.overall_score)}`}>
                {healthScore.overall_score.toFixed(1)}
              </span>
              <span className="text-2xl text-text-secondary">/100</span>
            </div>

            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white bg-opacity-60 rounded-full border">
              <span className="text-sm font-bold">Grade: {healthScore.overall_grade}</span>
            </div>
          </div>

          <div className="hidden md:block">
            {healthScore.overall_grade === 'A' && <CheckCircle2 className="w-16 h-16 opacity-30" />}
            {healthScore.overall_grade === 'F' && <AlertCircle className="w-16 h-16 opacity-30" />}
            {!['A', 'F'].includes(healthScore.overall_grade) && <TrendingUp className="w-16 h-16 opacity-30" />}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed opacity-90">
          {healthScore.summary}
        </p>
      </div>

      {/* Component Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(healthScore.components).map(([key, component]) => (
          <div
            key={key}
            className="bg-surface border border-border-light rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={getScoreColor(component.score)}>
                {getComponentIcon(key)}
              </div>
              <h4 className="font-semibold text-sm text-text-primary truncate">
                {formatComponentName(key)}
              </h4>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-bold tabular-nums ${getScoreColor(component.score)}`}>
                {component.score.toFixed(1)}
              </span>
              <span className="text-sm text-text-secondary">/100</span>
            </div>

            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getGradeColor(component.grade)}`}>
              Grade {component.grade}
            </div>

            {/* Weight indicator */}
            <div className="mt-3 pt-3 border-t border-border-light">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Weight</span>
                <span className="font-mono font-semibold text-text-primary">
                  {(healthScore.weights[getWeightKey(key)] * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations Section */}
      {healthScore.recommendations && healthScore.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-blue-900">Recommendations</h4>
          </div>

          <ul className="space-y-2">
            {healthScore.recommendations.map((recommendation, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-blue-900"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={fetchHealthScore}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Recalculate Health Score
        </button>
      </div>
    </div>
  );
};
