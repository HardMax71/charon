import { GlobalMetrics } from '@/types/metrics';
import { calculateMetricDeltas } from '@/utils/metricsCalculator';
import { ArrowRight, Minus, AlertCircle } from 'lucide-react';

interface MetricsComparisonProps {
  original: GlobalMetrics;
  modified: GlobalMetrics | null;
}

export const MetricsComparison = ({ original, modified }: MetricsComparisonProps) => {
  if (!modified) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-600 border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
        <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
        <p className="text-xs font-medium text-center">
          Modify the graph to generate<br/>an impact analysis
        </p>
      </div>
    );
  }

  const deltas = calculateMetricDeltas(original, modified);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50/80 backdrop-blur border-b border-slate-200 px-3 py-2 flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          Metric
        </h3>
        <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
          Impact
        </h3>
      </div>

      {/* Scrollable List */}
      <div className="overflow-y-auto divide-y divide-slate-100">
        {Object.entries(deltas).map(([key, data]: [string, any]) => (
          <MetricRow key={key} data={data} />
        ))}
      </div>
    </div>
  );
};

interface MetricRowProps {
  data: {
    label: string;
    before: number;
    after: number;
    delta: number;
    deltaPercent?: number;
    improved: boolean;
  };
}

const MetricRow = ({ data }: MetricRowProps) => {
  const { label, before, after, delta, deltaPercent, improved } = data;
  const hasChange = delta !== 0;

  // Visual Styles
  const rowOpacity = hasChange ? 'opacity-100' : 'opacity-60 grayscale-[0.5]';
  const deltaBg = hasChange
    ? (improved ? 'bg-emerald-100/50' : 'bg-rose-100/50')
    : 'bg-slate-100';
  const deltaText = hasChange
    ? (improved ? 'text-emerald-700' : 'text-rose-700')
    : 'text-slate-600';
  const borderHighlight = hasChange
    ? (improved ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-rose-500')
    : 'border-l-2 border-l-transparent pl-[2px]'; // compensate layout shift

  return (
    <div className={`group flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors ${rowOpacity} ${borderHighlight}`}>

      {/* Left: Label */}
      <div className="min-w-0 pr-4 flex-1">
        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide truncate" title={label}>
          {label.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Right: Numbers & Badge */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Before / After Logic */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-600 font-medium">
            {typeof before === 'number' ? before.toFixed(2).replace(/\.00$/, '') : before}
          </span>

          {hasChange && (
            <>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-900 font-bold">
                {typeof after === 'number' ? after.toFixed(2).replace(/\.00$/, '') : after}
              </span>
            </>
          )}
        </div>

        {/* Delta Badge */}
        <div className={`flex flex-col items-end justify-center min-w-[50px] px-1.5 py-0.5 rounded ${deltaBg} ${deltaText}`}>
          <div className="flex items-center text-[11px] font-bold font-mono leading-none">
            {hasChange ? (
              <>
                {delta > 0 ? '+' : ''}
                {typeof delta === 'number' ? delta.toFixed(2).replace(/\.00$/, '') : delta}
              </>
            ) : (
              <Minus className="w-3 h-3" />
            )}
          </div>

          {/* Percentage (Only show if significant) */}
          {hasChange && deltaPercent !== undefined && Math.abs(deltaPercent) > 0.1 && (
            <span className="text-[9px] font-medium opacity-80 leading-tight">
               {delta > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};