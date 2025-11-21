import { useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGraphStore } from '@/stores/graphStore';
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

export const LayoutSelector = () => {
  const {
    currentLayout,
    setCurrentLayout,
    selectedModule,
    setSelectedModule,
    showClusters,
    setShowClusters,
    setShowClusterModal,
    layoutSelectorExpanded,
    setLayoutSelectorExpanded,
  } = useUIStore();
  const { graph, globalMetrics } = useGraphStore();

  const layouts: Array<{ value: 'hierarchical' | 'force' | 'circular'; label: string }> = [
    { value: 'hierarchical', label: 'Hierarchical Tree' },
    { value: 'force', label: 'Force Directed' },
    { value: 'circular', label: 'Circular Ring' },
  ];

  // Extract unique modules
  const modules = useMemo(() => {
    if (!graph) return [];
    const uniqueModules = new Set<string>();
    graph.nodes.forEach((node) => {
      if (node.module) uniqueModules.add(node.module);
    });
    return Array.from(uniqueModules).sort();
  }, [graph]);

  // Collapsed State
  if (!layoutSelectorExpanded) {
    return (
      <button
        onClick={() => setLayoutSelectorExpanded(true)}
        className="fixed top-20 right-6 z-40 bg-white hover:bg-slate-50 text-slate-600 hover:text-teal-600 p-2.5 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl group"
        title="Configure View"
      >
        <Settings className="w-5 h-5 transition-transform group-hover:rotate-90" />
      </button>
    );
  }

  // Expanded State
  return (
    // FIXED: Changed 'overflow-hidden' to 'overflow-visible' so dropdowns can appear
    <div className="fixed top-20 right-6 z-40 w-72 bg-white/95 backdrop-blur-md rounded-lg shadow-2xl border border-slate-200 overflow-visible animate-in slide-in-from-top-2 duration-300">

      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between select-none h-9 rounded-t-lg">
        <div className="flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest text-slate-500">
          <Settings className="w-3 h-3" />
          <span>View Config</span>
        </div>
        <button
          onClick={() => setLayoutSelectorExpanded(false)}
          className="text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/50 p-0.5 transition-colors"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">

        {/* 1. Layout Selector */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block pl-0.5">
            Topology Layout
          </label>
          <div className="relative group">
            <Layout className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
            <select
              value={currentLayout}
              onChange={(e) => setCurrentLayout(e.target.value as any)}
              className="input-select"
            >
              {layouts.map((layout) => (
                <option key={layout.value} value={layout.value}>
                  {layout.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* 2. Module Filter */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block pl-0.5">
            Scope Filter
          </label>
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
            <input
              list="modules-list"
              value={selectedModule || ''}
              onChange={(e) => setSelectedModule(e.target.value || null)}
              placeholder="Select module..."
              className="input-text"
            />
            <datalist id="modules-list">
              {modules.map((module) => (
                <option key={module} value={module} />
              ))}
            </datalist>
            {selectedModule && (
              <button
                onClick={() => setSelectedModule(null)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded p-0.5 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Clusters Toggle */}
        {globalMetrics?.clusters && globalMetrics.clusters.length > 0 && (
          <div className="bg-slate-50 rounded border border-slate-200 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Communities</span>
                <span className="text-[9px] text-slate-400 leading-none">{globalMetrics.clusters.length} detected</span>
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
          <ExportDiagramButton />
          <ExportDocumentationButton />
        </div>

      </div>
    </div>
  );
};