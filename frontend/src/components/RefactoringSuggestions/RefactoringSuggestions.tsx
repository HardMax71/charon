import { useState, useMemo } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { RefactoringSuggestion } from '@/types/metrics';
import {
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Info,
  Skull,
  Link2Off,
  RefreshCw,
  Target,
  Zap,
  Package,
  Wrench,
  ClipboardList,
  BarChart3,
  Lightbulb,
  ChevronDown,
  Octagon,
  GitBranch,
} from 'lucide-react';

export const RefactoringSuggestions = () => {
  const globalMetrics = useGraphStore(state => state.globalMetrics);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const suggestions = globalMetrics?.refactoring_suggestions || [];
  const summary = globalMetrics?.refactoring_summary;

  // Filter suggestions by severity
  const filteredSuggestions = useMemo(() => {
    if (selectedSeverity === 'all') return suggestions;
    return suggestions.filter(s => s.severity === selectedSeverity);
  }, [suggestions, selectedSeverity]);

  // Group suggestions by pattern
  const suggestionsByPattern = useMemo(() => {
    const grouped = new Map<string, RefactoringSuggestion[]>();
    filteredSuggestions.forEach(suggestion => {
      const pattern = suggestion.pattern;
      if (!grouped.has(pattern)) grouped.set(pattern, []);
      grouped.get(pattern)!.push(suggestion);
    });
    return grouped;
  }, [filteredSuggestions]);

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-teal-200 bg-teal-50/30 rounded-xl text-center">
        <Sparkles className="w-12 h-12 mb-4 text-teal-500" />
        <h3 className="text-lg font-black text-teal-900">Architecture Optimal</h3>
        <p className="text-sm text-teal-700/80 mt-1 max-w-md">
          No critical anti-patterns detected. Codebase health is within nominal parameters.
        </p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const SeverityIcon = ({ severity, className = "w-4 h-4" }: { severity: string; className?: string }) => {
    if (severity === 'critical') return <AlertCircle className={className} />;
    if (severity === 'warning') return <AlertTriangle className={className} />;
    return <Info className={className} />;
  };

  const PatternIcon = ({ pattern, className = "w-5 h-5" }: { pattern: string; className?: string }) => {
    const icons: Record<string, any> = {
      'God Object': Octagon,
      'Feature Envy': GitBranch,
      'Inappropriate Intimacy': Link2Off,
      'Circular Dependency': RefreshCw,
      'Hub Module': Target,
      'Potential Dead Code': Skull,
      'Unstable Dependency': Zap,
    };
    const Icon = icons[pattern] || Package;
    return <Icon className={className} />;
  };

  return (
    <div className="space-y-6">

      {/* --- SUMMARY HEADER --- */}
      {summary && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                Refactoring Opportunities
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Detected <span className="font-bold text-slate-900">{summary.total_suggestions}</span> issues across <span className="font-bold text-slate-900">{summary.modules_analyzed}</span> modules
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {['all', 'critical', 'warning', 'info'].map((sev) => {
                const count = sev === 'all' ? summary.total_suggestions : summary.by_severity[sev] || 0;
                if (count === 0 && sev !== 'all') return null;

                return (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`
                      px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all flex items-center gap-1.5
                      ${selectedSeverity === sev 
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                      }
                    `}
                  >
                    {sev !== 'all' && <div className={`w-1.5 h-1.5 rounded-full ${sev === 'critical' ? 'bg-rose-500' : sev === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />}
                    {sev} <span className="opacity-50">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pattern Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.by_pattern).map(([pattern, count]) => (
              <div key={pattern} className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-lg hover:border-amber-200 transition-colors group">
                <PatternIcon pattern={pattern} className="w-6 h-6 mb-2 text-slate-400 group-hover:text-amber-600 transition-colors" />
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight text-center">{pattern}</div>
                <div className="text-xl font-black text-slate-900 tabular-nums">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUGGESTIONS LIST --- */}
      <div className="space-y-6">
        {Array.from(suggestionsByPattern.entries()).map(([pattern, patternSuggestions]) => (
          <div key={pattern} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

            {/* Pattern Section Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <PatternIcon pattern={pattern} className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                {pattern}
              </h4>
              <span className="ml-auto text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                {patternSuggestions.length} CASES
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {patternSuggestions.map((suggestion) => {
                const globalIdx = suggestions.indexOf(suggestion);
                const isExpanded = expandedSuggestion === globalIdx;

                return (
                  <div key={globalIdx} className="group">
                    <button
                      onClick={() => setExpandedSuggestion(isExpanded ? null : globalIdx)}
                      className="w-full px-5 py-4 bg-white hover:bg-slate-50/80 transition-colors text-left flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <SeverityIcon severity={suggestion.severity} className={
                            suggestion.severity === 'critical' ? 'text-rose-500' :
                            suggestion.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                          } />
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getSeverityColor(suggestion.severity)}`}>
                            {suggestion.severity}
                          </span>
                          <span className="text-xs font-mono text-slate-500 truncate bg-slate-100 px-1.5 py-0.5 rounded">
                            {suggestion.module}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{suggestion.description}</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 bg-slate-50/50">
                        <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">

                          {/* 1. Recommendation (Highlighted Action) */}
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-3">
                            <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                              <h5 className="text-[10px] font-bold text-amber-800 uppercase tracking-wide flex-shrink-0">
                                Recommendation:
                              </h5>
                              <p className="text-xs text-amber-900 font-medium">
                                {suggestion.recommendation}
                              </p>
                            </div>
                          </div>

                          {/* 2. Technical Grid (Inline Layouts) */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                            {/* Refactoring Plan */}
                            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2 flex-shrink-0">
                                <Wrench className="w-3 h-3" /> Plan:
                              </h5>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {suggestion.suggested_refactoring}
                              </p>
                            </div>

                            {/* Detected Metrics (Inline) */}
                            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2 flex-shrink-0">
                                <BarChart3 className="w-3 h-3" /> Metrics:
                              </h5>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px]">
                                {Object.entries(suggestion.metrics).map(([key, val]) => (
                                  <div key={key} className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-medium">{key.split('_')[0]}:</span>
                                    <span className="text-slate-900 font-bold">{typeof val === 'number' ? val.toFixed(2) : val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 3. Context Analysis */}
                          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2 flex-shrink-0">
                              <ClipboardList className="w-3 h-3" /> Context:
                            </h5>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-mono">
                              {suggestion.details}
                            </p>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};