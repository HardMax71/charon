import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGraphStore } from '@/stores/graphStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { PerformanceUpload } from '@/components/Performance/PerformanceUpload';
import { BottleneckPanel } from '@/components/Performance/BottleneckPanel';
import {
  Flame,
  TrendingUp,
  Clock,
  Code,
  Target,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export const PerformancePage = () => {
  const graph = useGraphStore((state) => state.graph);
  const analysis = usePerformanceStore((state) => state.analysis);
  const reset = usePerformanceStore((state) => state.reset);

  // Reset performance state when leaving the page
  useEffect(() => {
    return () => reset();
  }, [reset]);

  // Empty state when no graph is loaded
  if (!graph) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
            <Flame className="w-6 h-6 text-teal-600" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Performance Profiling
          </h2>

          <p className="text-sm text-slate-600 mb-6">
            Combine runtime profiling data with architectural metrics to find optimization targets. Analyze a project first.
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-teal-600 transition-colors"
          >
            Analyze Project <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-y-auto">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <Flame className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Performance Profiling</h1>
                <p className="text-sm text-slate-600">
                  Combine <span className="font-medium text-slate-700">runtime data</span> with architectural metrics
                </p>
              </div>
              <div className="group relative ml-1">
                <HelpCircle className="w-4 h-4 text-slate-600 hover:text-slate-600 cursor-help transition-colors" />
                <div className="absolute left-0 top-8 w-72 p-4 bg-slate-900 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-white mb-1">1. Profile your code</p>
                      <p className="text-slate-300">Use <span className="text-teal-400 font-mono">cProfile</span> or <span className="text-teal-400 font-mono">py-spy</span></p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">2. Upload & analyze</p>
                      <p className="text-slate-300">Combines performance with coupling metrics</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">3. Get recommendations</p>
                      <p className="text-slate-300">Ranked bottlenecks with actionable fixes</p>
                    </div>
                  </div>
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-slate-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Upload & Stats */}
            <div className="space-y-5">
              {/* Upload Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Code className="w-4 h-4 text-teal-600" />
                  Upload Profiling Data
                </h2>
                <PerformanceUpload />
              </div>

              {/* Stats Card */}
              {analysis && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-teal-600" />
                    Analysis Summary
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-2xl font-bold text-slate-900 tabular-nums">
                        {analysis.total_execution_time.toFixed(2)}<span className="text-base font-medium text-slate-600">s</span>
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 font-medium">Total Runtime</p>
                    </div>

                    <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-2xl font-bold text-slate-900 tabular-nums">
                        {analysis.total_modules_profiled}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 font-medium">Modules</p>
                    </div>

                    <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-2xl font-bold text-red-600 tabular-nums">
                        {analysis.critical_bottlenecks}
                      </p>
                      <p className="text-[11px] text-red-600 mt-1 font-medium">Critical</p>
                    </div>

                    <div className="text-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <p className="text-2xl font-bold text-rose-600 tabular-nums">
                        {analysis.high_bottlenecks}
                      </p>
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">High Priority</p>
                    </div>
                  </div>

                  {/* Profiler Info */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Profiler</span>
                      <span className="font-semibold text-slate-900 uppercase tracking-wide">
                        {analysis.profiler_type}
                      </span>
                    </div>
                    {analysis.total_samples && (
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-600">Samples</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {analysis.total_samples.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Bottleneck Panel (2 columns width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col self-stretch">
              <BottleneckPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
