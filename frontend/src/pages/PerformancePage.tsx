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
        <div className="bg-white border border-slate-200 rounded-xl p-10 max-w-lg w-full text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
            <Flame className="w-8 h-8 text-orange-500" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Performance Profiling
          </h2>

          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Identify optimization targets by combining runtime performance data (cProfile, py-spy) with architectural metrics (coupling, complexity). Analyze a project first to begin.
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-teal-600 transition-colors"
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
          {/* Page Title */}
          <div className="mb-4 sm:mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500 animate-pulse" />
                Performance Profiling
              </h1>
              <div className="group relative">
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                <div className="absolute left-0 top-8 w-80 p-4 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-white mb-1">1. Profile your code</p>
                      <p className="text-slate-300">Use cProfile or py-spy to generate profiling data</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">2. Upload & analyze</p>
                      <p className="text-slate-300">We combine performance with coupling/complexity metrics</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">3. Prioritize optimization</p>
                      <p className="text-slate-300">Get ranked bottlenecks with actionable recommendations</p>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                      <p className="font-mono text-slate-400 text-[10px]">
                        priority = 40% time + 30% coupling + 15% complexity + 10% memory + 5% calls
                      </p>
                      <p className="font-mono text-slate-400 text-[10px] mt-1">
                        × boosters (1.2× circular, 1.3× hot zone)
                      </p>
                    </div>
                  </div>
                  {/* Arrow pointer */}
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-slate-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Identify optimization targets by combining runtime performance data with architectural metrics
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 pb-6 items-start">
            {/* Left Column: Upload & Info */}
            <div className="space-y-4 sm:space-y-6">
              {/* Upload Card */}
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-slate-200 animate-in fade-in slide-in-from-left-4 duration-500">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Code className="w-4 h-4 sm:w-5 sm:h-5 text-styx-600" />
                  Upload Profiling Data
                </h2>
                <PerformanceUpload />
              </div>

              {/* Stats Card */}
              {analysis && (
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-slate-200 animate-in fade-in slide-in-from-left-4 duration-700">
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    Analysis Stats
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded transition-all hover:shadow-md hover:scale-105 duration-300">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                        {analysis.total_execution_time.toFixed(2)}s
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Total Runtime</p>
                    </div>

                    <div className="text-center p-3 bg-slate-50 rounded transition-all hover:shadow-md hover:scale-105 duration-300">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Code className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                        {analysis.total_modules_profiled}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Modules</p>
                    </div>

                    <div className="text-center p-3 bg-red-50 rounded transition-all hover:shadow-md hover:scale-105 duration-300">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Flame className="w-4 h-4 text-red-600 animate-pulse" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-red-600 tabular-nums">
                        {analysis.critical_bottlenecks}
                      </p>
                      <p className="text-xs text-red-700 mt-1">Critical</p>
                    </div>

                    <div className="text-center p-3 bg-orange-50 rounded transition-all hover:shadow-md hover:scale-105 duration-300">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">
                        {analysis.high_bottlenecks}
                      </p>
                      <p className="text-xs text-orange-700 mt-1">High Priority</p>
                    </div>
                  </div>

                  {/* Profiler Info */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Profiler:</span>
                      <span className="font-medium text-slate-900 uppercase">
                        {analysis.profiler_type}
                      </span>
                    </div>
                    {analysis.total_samples && (
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-600">Samples:</span>
                        <span className="font-medium text-slate-900">
                          {analysis.total_samples.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Bottleneck Panel (2 columns width) */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 self-stretch">
              <BottleneckPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
