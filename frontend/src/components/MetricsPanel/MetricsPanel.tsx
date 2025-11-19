import { useState, useRef, useEffect, useCallback } from 'react';
import { GlobalMetrics } from './GlobalMetrics';
import { HealthScore } from './HealthScore';
import { RefactoringSuggestions } from '../RefactoringSuggestions/RefactoringSuggestions';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { GripHorizontal } from 'lucide-react';

type TabType = 'global' | 'health' | 'refactoring';

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 800;

export const MetricsPanel = () => {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [isResizing, setIsResizing] = useState(false);
  const { globalMetrics } = useGraphStore();
  const { metricsPanelHeight, setMetricsPanelHeight } = useUIStore();
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const refactoringSuggestionsCount = globalMetrics?.refactoring_suggestions?.length || 0;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    // When dragging UP (decreasing clientY), we want to INCREASE height
    // When dragging DOWN (increasing clientY), we want to DECREASE height
    const deltaY = startYRef.current - e.clientY;
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeightRef.current + deltaY));

    setMetricsPanelHeight(newHeight);
  }, [isResizing, setMetricsPanelHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = metricsPanelHeight;
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="bg-surface border-t border-border-light shadow-lg flex flex-col flex-shrink-0"
      style={{ height: `${metricsPanelHeight}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`h-2 bg-background hover:bg-primary/20 border-t-2 border-border-medium cursor-ns-resize transition-colors flex items-center justify-center group relative ${
          isResizing ? 'bg-primary/30 border-primary' : ''
        }`}
        title="Drag to resize panel"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <GripHorizontal className={`w-10 h-4 transition-colors ${
            isResizing ? 'text-primary' : 'text-text-tertiary group-hover:text-primary'
          }`} />
        </div>
      </div>

      {/* Header with Tabs */}
      <div className="flex border-b border-border-light bg-background flex-shrink-0">
        <button
          onClick={() => setActiveTab('global')}
          className={`px-6 py-2.5 text-sm font-bold tracking-tight transition-all ${
            activeTab === 'global'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Global Metrics
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`px-6 py-2.5 text-sm font-bold tracking-tight transition-all ${
            activeTab === 'health'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Health Score
        </button>
        <button
          onClick={() => setActiveTab('refactoring')}
          className={`px-6 py-2.5 text-sm font-bold tracking-tight transition-all flex items-center gap-2 ${
            activeTab === 'refactoring'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Refactoring Suggestions
          {refactoringSuggestionsCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold tabular-nums">
              {refactoringSuggestionsCount}
            </span>
          )}
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'global' && <GlobalMetrics />}
        {activeTab === 'health' && <HealthScore />}
        {activeTab === 'refactoring' && (
          <div className="p-3 md:p-4">
            <RefactoringSuggestions />
          </div>
        )}
      </div>
    </div>
  );
};
