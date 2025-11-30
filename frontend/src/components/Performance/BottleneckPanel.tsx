import { useState } from 'react';
import { usePerformanceStore } from '@/stores/performanceStore';
import {
  PerformanceBottleneck,
  getBottleneckColor,
  getDifficultyColor,
  formatTime,
  formatMemory,
} from '@/types/performance';
import {
  Flame,
  Cpu,
  MemoryStick,
  HardDrive,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

interface BottleneckCardProps {
  bottleneck: PerformanceBottleneck;
  rank: number;
}

const BottleneckCard = ({ bottleneck, rank }: BottleneckCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(bottleneck.module_path);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  const getBottleneckIcon = () => {
    switch (bottleneck.bottleneck_type) {
      case 'cpu':
        return <Cpu className="w-4 h-4" />;
      case 'memory':
        return <MemoryStick className="w-4 h-4" />;
      case 'io':
        return <HardDrive className="w-4 h-4" />;
      default:
        return <Flame className="w-4 h-4" />;
    }
  };

  const getImpactBadge = () => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-rose-100 text-rose-700 border-rose-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return colors[bottleneck.estimated_impact];
  };

  const getDifficultyBadge = () => {
    const colors = {
      easy: 'bg-teal-100 text-teal-700 border-teal-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      hard: 'bg-rose-100 text-rose-700 border-rose-200',
      very_hard: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[bottleneck.optimization_difficulty];
  };

  return (
    <div
      className={`
        border rounded-xl p-4 transition-all cursor-pointer
        ${isExpanded
          ? 'border-teal-300 bg-teal-50/50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
        }
      `}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Rank Badge */}
        <div
          className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform duration-300 hover:scale-110"
          style={{ backgroundColor: getBottleneckColor(bottleneck) }}
        >
          #{rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-medium text-slate-900 truncate">
              {bottleneck.module_path.split('/').pop()}
            </h4>
            <button
              onClick={handleCopyPath}
              className="flex-shrink-0 p-1 hover:bg-slate-200 rounded transition-colors group"
              title="Copy full path"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-600" />
              )}
            </button>
            <div className="flex items-center gap-1 text-xs text-slate-600">
              {getBottleneckIcon()}
              <span className="uppercase font-medium">{bottleneck.bottleneck_type}</span>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="flex items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-600 flex-wrap">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className="font-mono">{bottleneck.time_percentage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span className="font-mono">{bottleneck.priority_score.toFixed(0)}/100</span>
            </div>
            {bottleneck.is_hot_zone && (
              <div className="flex items-center gap-1 text-rose-600 animate-pulse">
                <Flame className="w-3 h-3" />
                <span className="font-semibold">HOT ZONE</span>
              </div>
            )}
            {bottleneck.is_circular && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-semibold">CIRCULAR</span>
              </div>
            )}
          </div>
        </div>

        {/* Impact & Difficulty Badges - Vertically Centered */}
        <div className="hidden sm:flex flex-col gap-1">
          <span className={`px-2 py-1 text-[10px] font-medium rounded border flex items-center justify-center ${getImpactBadge()}`}>
            {bottleneck.estimated_impact}
          </span>
          <span className={`px-2 py-1 text-[10px] font-medium rounded border flex items-center justify-center ${getDifficultyBadge()}`}>
            {bottleneck.optimization_difficulty.replace('_', ' ')}
          </span>
        </div>

        {/* Chevron Icon */}
        <div className="flex-shrink-0">
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
          {/* Performance Details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Execution Time</span>
              <span className="font-mono font-semibold text-slate-900">
                {formatTime(bottleneck.execution_time)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Calls</span>
              <span className="font-mono font-semibold text-slate-900">
                {bottleneck.call_count.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Coupling</span>
              <span className="font-mono font-semibold text-slate-900">
                {bottleneck.coupling_score.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Complexity</span>
              <span className="font-mono font-semibold text-slate-900">
                {bottleneck.complexity_score.toFixed(1)}
              </span>
            </div>
            {bottleneck.memory_usage_mb !== null && (
              <div className="col-span-2 flex justify-between">
                <span className="text-slate-600">Memory</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatMemory(bottleneck.memory_usage_mb)}
                </span>
              </div>
            )}
          </div>

          {/* Recommendation */}
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
            <p className="text-xs font-semibold text-teal-800 mb-1">Recommendation</p>
            <p className="text-xs text-teal-700">{bottleneck.recommendation}</p>
          </div>

          {/* Affected Modules */}
          {bottleneck.affected_modules.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">
                Affected Modules <span className="text-slate-600">({bottleneck.affected_modules.length})</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {bottleneck.affected_modules.slice(0, 5).map((module) => (
                  <span
                    key={module}
                    className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md font-mono"
                  >
                    {module.split('/').pop()}
                  </span>
                ))}
                {bottleneck.affected_modules.length > 5 && (
                  <span className="px-2 py-1 text-xs text-slate-600">
                    +{bottleneck.affected_modules.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BottleneckPanel = () => {
  const analysis = usePerformanceStore((state) => state.analysis);

  if (!analysis) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Flame className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-600">No analysis yet</p>
          <p className="text-sm text-slate-600 mt-1">Upload a profiling file to identify bottlenecks</p>
        </div>
      </div>
    );
  }

  const { bottlenecks, critical_bottlenecks, high_bottlenecks } = analysis;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Bottlenecks</h3>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-slate-600">
              <span className="font-semibold text-slate-700 tabular-nums">{bottlenecks.length}</span> total
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-600">
              <span className="font-semibold text-red-600 tabular-nums">{critical_bottlenecks}</span> critical
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-600">
              <span className="font-semibold text-rose-500 tabular-nums">{high_bottlenecks}</span> high
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Time %</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Priority</span>
          </div>
        </div>
      </div>

      {/* Bottleneck List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {bottlenecks.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">No bottlenecks detected!</p>
            <p className="text-sm text-slate-600 mt-1">Your code is performing well</p>
          </div>
        ) : (
          bottlenecks.map((bottleneck) => (
            <BottleneckCard
              key={bottleneck.module_path}
              bottleneck={bottleneck}
              rank={bottleneck.priority_rank}
            />
          ))
        )}
      </div>
    </div>
  );
};
