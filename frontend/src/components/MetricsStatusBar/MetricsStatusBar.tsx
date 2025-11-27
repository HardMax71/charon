import { useState, useEffect } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { calculateHealthScore } from '@/services/api';
import { HealthScore as HealthScoreType } from '@/types/metrics';
import { Modal } from '@/components/ui/Modal';
import { GlobalMetrics } from '@/components/MetricsPanel/GlobalMetrics';
import { HealthScore } from '@/components/MetricsPanel/HealthScore';
import { RefactoringSuggestions } from '@/components/RefactoringSuggestions/RefactoringSuggestions';
import {
  Heart,
  Box,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

type ModalType = 'health' | 'metrics' | 'refactoring' | null;

export const MetricsStatusBar = () => {
  const graph = useGraphStore(state => state.graph);
  const globalMetrics = useGraphStore(state => state.globalMetrics);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [healthScore, setHealthScore] = useState<HealthScoreType | null>(null);

  // Fetch health score on mount
  useEffect(() => {
    if (graph && globalMetrics) {
      calculateHealthScore(graph, globalMetrics)
        .then(setHealthScore)
        .catch(() => setHealthScore(null));
    }
  }, [graph, globalMetrics]);

  const refactoringSuggestionsCount = globalMetrics?.refactoring_suggestions?.length || 0;
  const criticalIssues = (globalMetrics?.circular_dependencies?.length || 0) +
                         (globalMetrics?.hot_zone_files?.length || 0);
  const totalFiles = globalMetrics?.total_files || 0;

  const getModalTitle = (type: ModalType) => {
    switch (type) {
      case 'health': return 'System Health';
      case 'metrics': return 'Global Metrics';
      case 'refactoring': return 'Refactoring Suggestions';
      default: return '';
    }
  };

  const getHealthColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-emerald-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-amber-500';
      case 'D': return 'text-orange-500';
      case 'F': return 'text-rose-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <>
      {/* Status Bar */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] flex-shrink-0 z-20">
        <div className="h-11 px-6 flex items-center justify-center gap-2 max-w-7xl mx-auto">

          {/* Health */}
          <button
            onClick={() => setActiveModal('health')}
            className="h-8 flex items-center gap-2 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <Heart className={`w-4 h-4 flex-shrink-0 ${getHealthColor(healthScore?.overall_grade || '?')}`} />
            <span className={`text-xs font-bold leading-none ${getHealthColor(healthScore?.overall_grade || '?')}`}>
              {healthScore?.overall_grade || '?'}
            </span>
            <span className="text-xs text-slate-400 font-medium leading-none">Health</span>
          </button>

          {/* Divider */}
          <div className="h-4 w-px bg-slate-200 flex-shrink-0" />

          {/* Metrics: Files + Issues */}
          <button
            onClick={() => setActiveModal('metrics')}
            className="h-8 flex items-center gap-3 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-styx-600 transition-colors" />
              <span className="text-xs font-bold text-slate-700 tabular-nums leading-none">{totalFiles}</span>
              <span className="text-xs text-slate-400 font-medium leading-none">Files</span>
            </div>
            <div className="h-3 w-px bg-slate-200 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                criticalIssues > 0 ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-500'
              }`} />
              <span className={`text-xs font-bold tabular-nums leading-none ${
                criticalIssues > 0 ? 'text-rose-600' : 'text-slate-700'
              }`}>{criticalIssues}</span>
              <span className="text-xs text-slate-400 font-medium leading-none">Issues</span>
            </div>
          </button>

          {/* Divider */}
          <div className="h-4 w-px bg-slate-200 flex-shrink-0" />

          {/* Refactoring Suggestions */}
          <button
            onClick={() => setActiveModal('refactoring')}
            className="h-8 flex items-center gap-2 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <Lightbulb className={`w-4 h-4 flex-shrink-0 ${
              refactoringSuggestionsCount > 0 ? 'text-amber-500' : 'text-slate-400'
            }`} />
            <span className={`text-xs font-bold tabular-nums leading-none ${
              refactoringSuggestionsCount > 0 ? 'text-amber-600' : 'text-slate-700'
            }`}>{refactoringSuggestionsCount}</span>
            <span className="text-xs text-slate-400 font-medium leading-none">Suggestions</span>
          </button>

        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={activeModal === 'health'}
        onClose={() => setActiveModal(null)}
        title={getModalTitle('health')}
        maxWidth="max-w-5xl"
      >
        <HealthScore />
      </Modal>

      <Modal
        isOpen={activeModal === 'metrics'}
        onClose={() => setActiveModal(null)}
        title={getModalTitle('metrics')}
        maxWidth="max-w-5xl"
      >
        <GlobalMetrics />
      </Modal>

      <Modal
        isOpen={activeModal === 'refactoring'}
        onClose={() => setActiveModal(null)}
        title={getModalTitle('refactoring')}
        maxWidth="max-w-5xl"
      >
        <RefactoringSuggestions />
      </Modal>
    </>
  );
};
