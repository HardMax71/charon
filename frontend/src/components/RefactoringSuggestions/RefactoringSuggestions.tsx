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
  Lightbulb,
  ChevronDown,
  Octagon,
  GitBranch,
  X,
} from 'lucide-react';

export const RefactoringSuggestions = () => {
  const globalMetrics = useGraphStore(state => state.globalMetrics);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  const suggestions = globalMetrics?.refactoring_suggestions || [];
  const summary = globalMetrics?.refactoring_summary;

  // Filter suggestions by severity and pattern
  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions;
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(s => s.severity === selectedSeverity);
    }
    if (selectedPattern) {
      filtered = filtered.filter(s => s.pattern === selectedPattern);
    }
    return filtered;
  }, [suggestions, selectedSeverity, selectedPattern]);

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

  // Handle pattern click
  const handlePatternClick = (pattern: string) => {
    setSelectedPattern(selectedPattern === pattern ? null : pattern);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedSeverity('all');
    setSelectedPattern(null);
  };

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 border border-dashed border-teal-200 bg-teal-50/30 rounded-xl text-center">
        <Sparkles className="w-10 h-10 mb-3 text-teal-500" />
        <h3 className="text-sm font-semibold text-teal-800">Architecture Optimal</h3>
        <p className="text-xs text-teal-600 mt-1 max-w-sm">
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

      {/* --- COMPACT FILTER BAR --- */}
      {summary && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          {/* Top Row: Title + Severity Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-800">
                {filteredSuggestions.length} {filteredSuggestions.length === 1 ? 'Issue' : 'Issues'}
              </h3>
              {(selectedSeverity !== 'all' || selectedPattern) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Severity Filters */}
            <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {['all', 'critical', 'warning', 'info'].map((sev) => {
                const count = sev === 'all' ? summary.total_suggestions : summary.by_severity[sev] || 0;
                if (count === 0 && sev !== 'all') return null;

                return (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`
                      px-2 py-1 text-xs rounded transition-all flex items-center gap-1.5
                      ${selectedSeverity === sev
                        ? 'bg-white text-slate-700 font-medium shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:bg-slate-200/50'
                      }
                    `}
                  >
                    {sev !== 'all' && <div className={`w-1.5 h-1.5 rounded-full ${sev === 'critical' ? 'bg-rose-500' : sev === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />}
                    <span className="capitalize">{sev}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pattern Grid - Clickable Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(summary.by_pattern).map(([pattern, count]) => {
              const isActive = selectedPattern === pattern;
              const patternCount = selectedSeverity === 'all'
                ? count
                : suggestions.filter(s => s.pattern === pattern && (selectedSeverity === 'all' || s.severity === selectedSeverity)).length;

              return (
                <button
                  key={pattern}
                  onClick={() => handlePatternClick(pattern)}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg border transition-all text-left
                    ${isActive
                      ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                      : 'bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-slate-100'
                    }
                  `}
                >
                  <PatternIcon pattern={pattern} className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-600' : 'text-slate-600'}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[10px] leading-tight truncate ${isActive ? 'text-amber-700' : 'text-slate-600'}`}>{pattern}</div>
                    <div className={`text-sm font-semibold tabular-nums ${isActive ? 'text-amber-800' : 'text-slate-700'}`}>{patternCount}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* --- SUGGESTIONS LIST --- */}
      <div className="space-y-3">
        {Array.from(suggestionsByPattern.entries()).map(([pattern, patternSuggestions]) => (
          <div key={pattern} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

            {/* Pattern Section Header */}
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
              <PatternIcon pattern={pattern} className="w-3.5 h-3.5 text-slate-600" />
              <h4 className="text-xs font-medium text-slate-600">{pattern}</h4>
              <span className="ml-auto text-[10px] text-slate-600">
                {patternSuggestions.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {patternSuggestions.map((suggestion) => {
                const globalIdx = suggestions.indexOf(suggestion);
                const isExpanded = expandedSuggestion === globalIdx;

                return (
                  <div key={globalIdx}>
                    <button
                      onClick={() => setExpandedSuggestion(isExpanded ? null : globalIdx)}
                      className="w-full px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors text-left"
                    >
                      {/* Row 1: Severity + Module */}
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityIcon severity={suggestion.severity} className={`w-3.5 h-3.5 flex-shrink-0 ${
                          suggestion.severity === 'critical' ? 'text-rose-500' :
                          suggestion.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                        }`} />
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getSeverityColor(suggestion.severity)}`}>
                          {suggestion.severity}
                        </span>
                        <span className="text-[11px] text-slate-600 truncate flex-1">{suggestion.module}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-600 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>

                      {/* Row 2: Description */}
                      <p className="text-xs text-slate-700 mb-1.5">{suggestion.description}</p>

                      {/* Row 3: Recommendation Preview */}
                      <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50/50 rounded px-2 py-1">
                        <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-500" />
                        <span className="line-clamp-1">{suggestion.recommendation}</span>
                      </div>
                    </button>

                    {/* Expanded Details - Consolidated */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-slate-50/30">
                        <div className="border-t border-slate-100 pt-3 space-y-3">

                          {/* Action Section: Recommendation + Plan Combined */}
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs text-slate-700">{suggestion.recommendation}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                              <Wrench className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-slate-600">{suggestion.suggested_refactoring}</p>
                            </div>
                          </div>

                          {/* Metrics - Inline Pills */}
                          {Object.keys(suggestion.metrics).length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] text-slate-600 uppercase font-medium">Metrics:</span>
                              {Object.entries(suggestion.metrics).map(([key, val]) => (
                                <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                                  <span className="text-slate-600">{key.split('_')[0]}</span>
                                  <span className="text-slate-700 font-medium tabular-nums">{typeof val === 'number' ? val.toFixed(1) : val}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Context - Collapsible or Short */}
                          {suggestion.details && (
                            <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                              <span className="whitespace-pre-wrap">{suggestion.details}</span>
                            </div>
                          )}

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