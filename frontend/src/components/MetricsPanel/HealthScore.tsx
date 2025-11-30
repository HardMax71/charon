import { useEffect, useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { calculateHealthScore } from '@/services/api';
import { HealthScore as HealthScoreType } from '@/types/metrics';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import {
  Heart,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  Flame,
  Link as LinkIcon,
  Code,
  Shield,
  BarChart3,
  HelpCircle,
  CheckSquare
} from 'lucide-react';

export const HealthScore = () => {
  const graph = useGraphStore(state => state.graph);
  const globalMetrics = useGraphStore(state => state.globalMetrics);
  const [healthScore, setHealthScore] = useState<HealthScoreType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { loading, execute: fetchHealthScore } = useAsyncOperation(
    async () => {
      if (!graph || !globalMetrics) {
        setError('No analysis data available');
        return;
      }
      setError(null);
      return calculateHealthScore(graph, globalMetrics);
    },
    {
      onSuccess: (score) => {
        if (score) setHealthScore(score);
      }
    }
  );

  useEffect(() => {
    if (graph && globalMetrics) {
      fetchHealthScore();
    }
  }, [graph, globalMetrics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-600 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        <span className="text-xs font-mono uppercase tracking-widest">Calibrating Metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-lg text-center">
        <div className="flex items-center justify-center gap-2 text-rose-700 mb-4">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-wide">Calculation Failed</span>
        </div>
        <button
          onClick={fetchHealthScore}
          className="px-4 py-2 bg-white border border-rose-200 text-rose-700 rounded text-xs font-bold uppercase tracking-wider hover:bg-rose-50 transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!healthScore) return null;

  // --- STYLING HELPERS ---
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-styx-600';
    if (score >= 50) return 'text-obol-500';
    return 'text-blood-700';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-styx-600';
    if (score >= 50) return 'bg-obol-500';
    return 'bg-blood-700';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'B': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'C': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'D': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'F': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const score = Math.round(healthScore.overall_score);
  const colorClass = getScoreColor(score);

  const getComponentIcon = (key: string) => {
    const icons: Record<string, any> = {
      'circular_dependencies': RefreshCw,
      'coupling_health': LinkIcon,
      'complexity_health': Flame,
      'architecture_health': Shield,
      'stability_distribution': BarChart3,
    };
    const Icon = icons[key] || Code;
    return <Icon className="w-4 h-4" />;
  };

  const getComponentLabel = (key: string) => {
    const labels: Record<string, string> = {
      'circular_dependencies': 'Cycles',
      'coupling_health': 'Coupling',
      'complexity_health': 'Complexity',
      'architecture_health': 'Architecture',
      'stability_distribution': 'Stability',
    };
    return labels[key] || key;
  };

  const getComponentDesc = (key: string) => {
    const descs: Record<string, string> = {
      'circular_dependencies': 'Impact of circular imports on graph acyclicity.',
      'coupling_health': 'Ratio of tight coupling to loose coupling.',
      'complexity_health': 'Cyclomatic complexity distribution.',
      'architecture_health': 'Adherence to modular boundaries.',
      'stability_distribution': 'Abstractness vs Instability balance.',
    };
    return descs[key] || 'Metric analysis.';
  };

  return (
    <div className="space-y-6">

      {/* --- SECTION 1: SCORE & RECOMMENDATIONS (Split Grid) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Main Score Card (Span 4) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '12px 12px' }}
          />

          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
            <svg className="w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle
                cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="8"
                strokeDasharray="283"
                strokeDashoffset={283 * (1 - score / 100)}
                className={`transition-all duration-1000 ease-out ${colorClass}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${colorClass}`}>{healthScore.overall_grade}</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase mt-1">Grade</span>
            </div>
          </div>

          <div className="text-center relative z-10">
            <h3 className="text-lg font-bold text-styx-900">System Health</h3>
            <p className="text-xs text-stone-500 mt-2 leading-relaxed max-w-[250px]">
              {healthScore.summary}
            </p>
          </div>
        </div>

        {/* RIGHT: Recommendations (Span 8) */}
        <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
            <TrendingUp className="w-4 h-4 text-styx-600" />
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-widest">Optimization Plan</h4>
          </div>

          {healthScore.recommendations && healthScore.recommendations.length > 0 ? (
            <ul className="space-y-3 flex-1">
              {healthScore.recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-stone-600 group">
                  <CheckSquare className="w-4 h-4 mt-0.5 text-stone-400 group-hover:text-styx-600 transition-colors" />
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic">
              No immediate recommendations found.
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 2: METRICS ARRAY (5-Column Grid) --- */}
      {/* This layout solves the "space thrashing" by fitting all 5 items in one row on large screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.entries(healthScore.components).map(([key, comp]) => (
          <div
            key={key}
            className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-teal-300 hover:shadow-md transition-all"
          >
            {/* Metric Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-slate-50 rounded-md text-stone-500 group-hover:text-styx-600 group-hover:bg-styx-100 transition-colors">
                {getComponentIcon(key)}
              </div>

              {/* Tooltip */}
              <div className="relative">
                <HelpCircle className="w-3.5 h-3.5 text-stone-300 hover:text-styx-600 cursor-help transition-colors" />
                <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-styx-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50 pointer-events-none leading-relaxed border border-stone-700">
                  {getComponentDesc(key)}
                </div>
              </div>
            </div>

            {/* Metric Label */}
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              {getComponentLabel(key)}
            </div>

            {/* Metric Score */}
            <div className="flex items-baseline justify-between">
              <div className={`text-2xl font-black font-mono ${getScoreColor(comp.score)}`}>
                {comp.score.toFixed(0)}
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getGradeColor(comp.grade)}`}>
                {comp.grade}
              </span>
            </div>

            {/* Mini Bar */}
            <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${getScoreBgColor(comp.score)}`}
                style={{ width: `${comp.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* --- FOOTER ACTION --- */}
      <div className="flex justify-end pt-2">
        <button
          onClick={fetchHealthScore}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-stone-500 hover:text-styx-600 hover:bg-styx-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </button>
      </div>
    </div>
  );
};