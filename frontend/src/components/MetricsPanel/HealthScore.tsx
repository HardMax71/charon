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
  BarChart3,
  HelpCircle
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
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <Loader className="w-6 h-6 animate-spin text-teal-500" />
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

  // --- HELPER FUNCTIONS ---
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-teal-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-600';
  };

  const getGradeColor = (grade: string) => {
    const map: Record<string, string> = {
      'A': 'bg-teal-50 text-teal-700 border-teal-200',
      'B': 'bg-blue-50 text-blue-700 border-blue-200',
      'C': 'bg-amber-50 text-amber-700 border-amber-200',
      'D': 'bg-orange-50 text-orange-700 border-orange-200',
      'F': 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return map[grade] || map['F'];
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

  const getComponentDesc = (key: string) => {
    const descs: Record<string, string> = {
      'circular_dependencies': 'Presence of circular import chains. These cause runtime errors and recursion risks.',
      'coupling_health': 'Measures how tightly connected modules are. Lower coupling means easier maintenance.',
      'complexity_health': 'Cyclomatic complexity average. High values indicate hard-to-test code.',
      'architecture_health': 'Adherence to layered architecture principles and separation of concerns.',
      'stability_distribution': 'Ratio of abstractness to instability across packages.',
    };
    return descs[key] || 'General code health metric.';
  };

  return (
    <div className="space-y-8">

      {/* 1. MAIN SCORE CARD */}
      <div className="flex items-center gap-8 p-8 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />

        <div className="relative w-28 h-28 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 z-10">
          <svg className="w-full h-full -rotate-90 p-1">
            <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#f1f5f9" strokeWidth="6" />
            <circle
              cx="50%" cy="50%" r="42%" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray="280"
              strokeDashoffset={280 * (1 - score / 100)}
              className={`transition-all duration-1000 ease-out ${colorClass}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black ${colorClass}`}>{score}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">/100</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Heart className={`w-5 h-5 ${colorClass}`} />
            <h3 className="text-xl font-bold text-slate-900">System Health</h3>
          </div>
          <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-4">
            {healthScore.summary}
          </p>
          <div className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide border ${getGradeColor(healthScore.overall_grade)}`}>
            Grade: {healthScore.overall_grade}
          </div>
        </div>
      </div>

      {/* 2. COMPONENT BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(healthScore.components).map(([key, comp]) => (
          <div
            key={key}
            className="group relative bg-white border border-slate-200 rounded-lg p-5 hover:border-teal-200 hover:shadow-sm transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-500">
                <div className={`p-1.5 rounded ${getScoreColor(comp.score)} bg-slate-50`}>
                  {getComponentIcon(key)}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider truncate max-w-[120px]">
                  {key.split('_')[0]}
                </span>

                {/* Tooltip */}
                <div className="relative ml-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-900 text-slate-50 text-xs leading-relaxed rounded-lg shadow-xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50 pointer-events-none">
                    {getComponentDesc(key)}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              </div>
            </div>

            {/* Score Row */}
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-mono font-bold tabular-nums ${getScoreColor(comp.score)}`}>
                  {comp.score.toFixed(0)}
                </span>
                <span className="text-[10px] text-slate-400">/100</span>
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getGradeColor(comp.grade)}`}>
                Grade {comp.grade}
              </div>
            </div>

            {/* Weight Bar */}
            <div className="mt-3 flex items-center gap-2">
               <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getScoreColor(comp.score).replace('text-', 'bg-')}`}
                    style={{ width: `${comp.score}%` }}
                  />
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. RECOMMENDATIONS */}
      {healthScore.recommendations?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Key Improvements</h4>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {healthScore.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 4. REFRESH ACTION */}
      <div className="flex justify-center pt-4">
        <button
          onClick={fetchHealthScore}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-teal-600 transition-colors shadow-sm hover:shadow-lg font-bold text-xs uppercase tracking-widest group"
        >
          <RefreshCw className={`w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
          Recalculate Metrics
        </button>
      </div>
    </div>
  );
};