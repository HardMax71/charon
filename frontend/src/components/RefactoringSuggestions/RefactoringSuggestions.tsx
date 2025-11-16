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
  const { globalMetrics } = useGraphStore();
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
      if (!grouped.has(pattern)) {
        grouped.set(pattern, []);
      }
      grouped.get(pattern)!.push(suggestion);
    });
    return grouped;
  }, [filteredSuggestions]);

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
        <Sparkles className="w-10 h-10 mx-auto mb-3 text-green-600" />
        <h3 className="text-lg font-bold text-green-800 mb-2">No Issues Detected!</h3>
        <p className="text-sm text-green-600">
          Your codebase follows good architectural practices.
        </p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const SeverityIcon = ({ severity, className = "w-4 h-4" }: { severity: string; className?: string }) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className={className} />;
      case 'warning':
        return <AlertTriangle className={className} />;
      case 'info':
        return <Info className={className} />;
      default:
        return <Info className={className} />;
    }
  };

  const PatternIcon = ({ pattern, className = "w-5 h-5" }: { pattern: string; className?: string }) => {
    switch (pattern) {
      case 'God Object':
        return <Octagon className={className} />;
      case 'Feature Envy':
        return <GitBranch className={className} />;
      case 'Inappropriate Intimacy':
        return <Link2Off className={className} />;
      case 'Circular Dependency':
        return <RefreshCw className={className} />;
      case 'Hub Module':
        return <Target className={className} />;
      case 'Potential Dead Code':
        return <Skull className={className} />;
      case 'Unstable Dependency':
        return <Zap className={className} />;
      default:
        return <Package className={className} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      {summary && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Refactoring Opportunities</h3>
              <p className="text-sm text-gray-600 mt-1">
                <span className="tabular-nums">{summary.total_suggestions}</span> suggestions found in <span className="tabular-nums">{summary.modules_analyzed}</span> modules
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSeverity('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all tabular-nums ${
                  selectedSeverity === 'all'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-300'
                }`}
              >
                All ({summary.total_suggestions})
              </button>
              {Object.entries(summary.by_severity).map(([severity, count]) => (
                <button
                  key={severity}
                  onClick={() => setSelectedSeverity(severity)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    selectedSeverity === severity
                      ? getSeverityColor(severity) + ' shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <SeverityIcon severity={severity} className="w-3.5 h-3.5" />
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Pattern Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(summary.by_pattern).map(([pattern, count]) => (
              <div
                key={pattern}
                className="bg-white border border-amber-100 rounded-lg p-3 text-center"
              >
                <PatternIcon pattern={pattern} className="w-8 h-8 mx-auto mb-1 text-amber-600" />
                <div className="text-xs font-semibold text-gray-700">{pattern}</div>
                <div className="text-lg font-bold text-amber-600 tabular-nums">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <div className="space-y-3">
        {Array.from(suggestionsByPattern.entries()).map(([pattern, patternSuggestions]) => (
          <div key={pattern} className="space-y-2">
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 px-2">
              <PatternIcon pattern={pattern} className="w-4 h-4" />
              {pattern} ({patternSuggestions.length})
            </h4>
            {patternSuggestions.map((suggestion) => {
              const globalIdx = suggestions.indexOf(suggestion);
              const isExpanded = expandedSuggestion === globalIdx;

              return (
                <div
                  key={globalIdx}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    getSeverityColor(suggestion.severity).replace('text-', 'border-')
                  }`}
                >
                  {/* Suggestion Header */}
                  <button
                    onClick={() => setExpandedSuggestion(isExpanded ? null : globalIdx)}
                    className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <SeverityIcon severity={suggestion.severity} className="w-4 h-4" />
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${getSeverityColor(suggestion.severity)}`}>
                            {suggestion.severity.toUpperCase()}
                          </span>
                          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                            {suggestion.module}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{suggestion.description}</p>
                        <div className="flex items-start gap-1.5 mt-1">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-gray-600">{suggestion.recommendation}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <ChevronDown
                          className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className={`border-t p-4 ${getSeverityColor(suggestion.severity).replace('text-', 'bg-').replace('100', '50')}`}>
                      {/* Suggested Refactoring */}
                      <div className="mb-4">
                        <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <Wrench className="w-4 h-4" />
                          Suggested Refactoring
                        </h5>
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <p className="text-sm font-semibold text-amber-700">
                            {suggestion.suggested_refactoring}
                          </p>
                        </div>
                      </div>

                      {/* Detailed Steps */}
                      <div className="mb-4">
                        <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <ClipboardList className="w-4 h-4" />
                          Detailed Steps
                        </h5>
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
                            {suggestion.details}
                          </pre>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div>
                        <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Metrics
                        </h5>
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(suggestion.metrics).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>{' '}
                                <span className="font-semibold text-gray-900">
                                  {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
