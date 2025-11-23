import { useState, useRef, useEffect, useCallback } from 'react';
import { GlobalMetrics } from './GlobalMetrics';
import { HealthScore } from './HealthScore';
import { RefactoringSuggestions } from '../RefactoringSuggestions/RefactoringSuggestions';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { TabButton } from '@/components/ui/TabButton';
import {
  BarChart3,
  Activity,
  Lightbulb,
  GripHorizontal
} from 'lucide-react';

type TabType = 'global' | 'health' | 'refactoring';

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 800;

export const MetricsPanel = () => {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [isResizing, setIsResizing] = useState(false);
  const globalMetrics = useGraphStore(state => state.globalMetrics);
  const metricsPanelHeight = useUIStore(state => state.metricsPanelHeight);
  const setMetricsPanelHeight = useUIStore(state => state.setMetricsPanelHeight);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const refactoringSuggestionsCount = globalMetrics?.refactoring_suggestions?.length || 0;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
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
      className="bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col flex-shrink-0 relative z-20"
      style={{ height: `${metricsPanelHeight}px` }}
    >
      {/* --- RESIZE HANDLE --- */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          h-2 w-full cursor-ns-resize flex items-center justify-center border-b border-slate-100 transition-colors group
          ${isResizing ? 'bg-styx-100' : 'bg-white hover:bg-slate-50'}
        `}
        title="Drag to resize panel"
      >
        <GripHorizontal className={`w-8 h-3 transition-colors ${isResizing ? 'text-styx-600' : 'text-slate-200 group-hover:text-slate-400'}`} />
      </div>

      {/* --- NAVIGATION RAIL --- */}
      <div className="flex items-center justify-between px-8 bg-white border-b border-slate-200 flex-shrink-0">

        {/* Tabs Container */}
        <div className="flex gap-8 h-full">
          <TabButton
            active={activeTab === 'global'}
            onClick={() => setActiveTab('global')}
            icon={BarChart3}
            label="Global Metrics"
          />
          <TabButton
            active={activeTab === 'health'}
            onClick={() => setActiveTab('health')}
            icon={Activity}
            label="Health Score"
          />
          <TabButton
            active={activeTab === 'refactoring'}
            onClick={() => setActiveTab('refactoring')}
            icon={Lightbulb}
            label="Refactoring"
            count={refactoringSuggestionsCount}
          />
        </div>

        {/* Technical Deco Right */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 bg-styx-600 rounded-full animate-pulse shadow-[0_0_5px_rgba(20,184,166,0.5)]" />
            <span>Live Diagnostics</span>
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/30">
        <div className="p-6 max-w-7xl mx-auto">
          {activeTab === 'global' && <GlobalMetrics />}
          {activeTab === 'health' && <HealthScore />}
          {activeTab === 'refactoring' && <RefactoringSuggestions />}
        </div>
      </div>
    </div>
  );
};