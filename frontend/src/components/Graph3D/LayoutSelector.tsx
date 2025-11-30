import { useMemo, ChangeEvent } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGraphStore } from '@/stores/graphStore';
import { DependencyGraph } from '@/types/graph';
import { GlobalMetrics } from '@/types/metrics';

type LayoutType = 'hierarchical' | 'force' | 'circular';
import {
  X,
  Minimize2,
  Settings,
  Layout,
  Search,
  Layers,
  ChevronDown
} from 'lucide-react';
import { ExportDiagramButton } from '../ExportDiagram/ExportDiagramButton';
import { ExportDocumentationButton } from '../ExportDocumentation/ExportDocumentationButton';

interface LayoutSelectorProps {
  // Allow overriding global state for "What-If" scenarios
  customGraph?: DependencyGraph | null;
  customMetrics?: GlobalMetrics | null;
  // Allow overriding default fixed positioning
  className?: string;
}

export const LayoutSelector = ({ customGraph, customMetrics, className }: LayoutSelectorProps) => {
  const currentLayout = useUIStore(state => state.currentLayout);
  const setCurrentLayout = useUIStore(state => state.setCurrentLayout);
  const selectedModule = useUIStore(state => state.selectedModule);
  const setSelectedModule = useUIStore(state => state.setSelectedModule);
  const showClusters = useUIStore(state => state.showClusters);
  const setShowClusters = useUIStore(state => state.setShowClusters);
  const layoutSelectorExpanded = useUIStore(state => state.layoutSelectorExpanded);
  const setLayoutSelectorExpanded = useUIStore(state => state.setLayoutSelectorExpanded);
  const globalGraph = useGraphStore(state => state.graph);
  const globalMetricsStore = useGraphStore(state => state.globalMetrics);

  // Resolve which data to display (Props > Store)
  const activeGraph = customGraph !== undefined ? customGraph : globalGraph;
  const activeMetrics = customMetrics !== undefined ? customMetrics : globalMetricsStore;

  const layouts: Array<{ value: 'hierarchical' | 'force' | 'circular'; label: string }> = [
    { value: 'hierarchical', label: 'Hierarchical Tree' },
    { value: 'force', label: 'Force Directed' },
    { value: 'circular', label: 'Circular Ring' },
  ];

  // Extract unique modules
  const modules = useMemo(() => {
    if (!activeGraph) return [];
    const uniqueModules = new Set<string>();
    activeGraph.nodes.forEach((node) => {
      if (node.module) uniqueModules.add(node.module);
    });
    return Array.from(uniqueModules).sort();
  }, [activeGraph]);

  // Default positioning if no className provided (Maintains backward compatibility)
  const positionClass = className || "fixed top-20 right-6 z-40";

  // Collapsed State
  if (!layoutSelectorExpanded) {
    return (
      <button
        onClick={() => setLayoutSelectorExpanded(true)}
        aria-label="Configure view"
        title="Configure View"
        className={`${positionClass} bg-white hover:bg-slate-50 text-slate-600 hover:text-teal-600 p-2.5 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl group`}
      >
        <Settings className="w-5 h-5 transition-transform group-hover:rotate-90" />
      </button>
    );
  }

  // Expanded State
  return (
    <div className={`${positionClass} w-72 bg-white/95 backdrop-blur-md rounded-lg shadow-2xl border border-slate-200 overflow-visible animate-in slide-in-from-top-2 duration-300`}>

      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between select-none h-9 rounded-t-lg">
        <div className="flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest text-slate-600">
          <Settings className="w-3 h-3" />
          <span>View Config</span>
        </div>
        <button
          onClick={() => setLayoutSelectorExpanded(false)}
          aria-label="Collapse view config"
          title="Collapse"
          className="text-slate-600 hover:text-slate-700 rounded hover:bg-slate-200/50 p-0.5 transition-colors"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">

        {/* 1. Layout Selector */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block pl-0.5">
            Topology Layout
          </label>
          <div className="relative group">
            <Layout className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-teal-600 transition-colors" />
            <select
              value={currentLayout}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setCurrentLayout(e.target.value as LayoutType)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer hover:bg-white transition-colors"
            >
              {layouts.map((layout) => (
                <option key={layout.value} value={layout.value}>
                  {layout.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* 2. Module Filter */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block pl-0.5">
            Scope Filter
          </label>
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-teal-600 transition-colors" />
            <input
              list="modules-list"
              value={selectedModule || ''}
              onChange={(e) => setSelectedModule(e.target.value || null)}
              placeholder="Select module..."
              className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-6 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors placeholder:text-slate-600"
            />
            <datalist id="modules-list">
              {modules.map((module) => (
                <option key={module} value={module} />
              ))}
            </datalist>
            {selectedModule && (
              <button
                onClick={() => setSelectedModule(null)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-rose-500 rounded p-0.5 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Clusters Toggle */}
        {activeMetrics?.clusters && activeMetrics.clusters.length > 0 && (
          <div className="bg-slate-50 rounded border border-slate-200 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Clusters</span>
                <span className="text-[9px] text-slate-600 leading-none">{activeMetrics.clusters.length} detected</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showClusters}
                onChange={(e) => setShowClusters(e.target.checked)}
              />
              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        )}

        {/* 4. Actions Grid */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          {/* Note: Diagram Buttons might need props to handle customGraph export if they support it,
              otherwise they will export the original graph. For UI fixes, this is sufficient. */}
          <ExportDiagramButton />
          <ExportDocumentationButton />
        </div>

      </div>
    </div>
  );
};