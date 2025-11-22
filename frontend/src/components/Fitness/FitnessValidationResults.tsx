import { FitnessValidationResult, FitnessViolation } from '@/types/fitness';
import { AlertCircle, AlertTriangle, Info, CheckCircle, ChevronDown, ChevronRight, ListChecks } from 'lucide-react';
import { useState } from 'react';

interface FitnessValidationResultsProps {
  result: FitnessValidationResult;
  onViolationClick?: (violation: FitnessViolation) => void;
}

export const FitnessValidationResults = ({ result, onViolationClick }: FitnessValidationResultsProps) => {
  const [expandedViolations, setExpandedViolations] = useState<Set<number>>(new Set());

  const toggleViolation = (index: number) => {
    const newSet = new Set(expandedViolations);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedViolations(newSet);
  };

  const severityIcon = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  return (
    <div className="space-y-6">

      {/* --- SUMMARY CARD --- */}
      <div
        className={`
          border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6
          ${result.passed 
            ? 'bg-white border-teal-200 shadow-sm' 
            : 'bg-white border-rose-200 shadow-sm'
          }
        `}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${result.passed ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
            {result.passed ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <div>
            <h3 className={`text-lg font-black tracking-tight ${result.passed ? 'text-teal-900' : 'text-rose-900'}`}>
              {result.passed ? 'Architecture Validated' : 'Validation Failed'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              {result.summary}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <StatBadge label="Total" value={result.total_rules} color="bg-white text-slate-700" />
          {result.errors > 0 && <StatBadge label="Errors" value={result.errors} color="bg-rose-100 text-rose-700" />}
          {result.warnings > 0 && <StatBadge label="Warnings" value={result.warnings} color="bg-amber-100 text-amber-700" />}
          {result.infos > 0 && <StatBadge label="Info" value={result.infos} color="bg-blue-100 text-blue-700" />}
        </div>
      </div>

      {/* --- VIOLATIONS LIST --- */}
      {result.violations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            <ListChecks className="w-4 h-4" />
            <span>Violation Report</span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
              {result.violations.length}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
            {result.violations.map((violation, index) => {
              const isExpanded = expandedViolations.has(index);
              const Icon = severityIcon[violation.severity];

              const severityStyles = {
                error: 'text-rose-600 bg-rose-50 border-rose-200',
                warning: 'text-amber-600 bg-amber-50 border-amber-200',
                info: 'text-blue-600 bg-blue-50 border-blue-200',
              };

              return (
                <div
                  key={index}
                  className={`group transition-colors ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}
                >
                  {/* Violation Header */}
                  <div
                    className="p-4 flex items-start gap-4 cursor-pointer"
                    onClick={() => toggleViolation(index)}
                  >
                    <div className={`mt-1 p-1.5 rounded-md border ${severityStyles[violation.severity]}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${severityStyles[violation.severity]}`}>
                          {violation.severity}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {violation.rule_name}
                        </h4>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">
                        {violation.message}
                      </p>

                      {/* Affected Modules Tags */}
                      {violation.affected_modules.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {violation.affected_modules.slice(0, 4).map((module, idx) => (
                            <span key={idx} className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              {module}
                            </span>
                          ))}
                          {violation.affected_modules.length > 4 && (
                            <span className="text-[10px] font-medium text-slate-400 px-1">
                              +{violation.affected_modules.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && Object.keys(violation.details).length > 0 && (
                    <div className="px-4 pb-4 pl-[3.75rem]">
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Technical Context
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {Object.entries(violation.details).map(([key, value]) => (
                            <div key={key} className="flex items-baseline gap-2 text-xs font-mono">
                              <span className="text-slate-500 flex-shrink-0">{key}:</span>
                              <span className="text-slate-900 font-bold break-all">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const StatBadge = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-md shadow-sm min-w-[80px] ${color}`}>
    <span className="text-xl font-black leading-none mb-1">{value}</span>
    <span className="text-[9px] font-bold uppercase opacity-80">{label}</span>
  </div>
);