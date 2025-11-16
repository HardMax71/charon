import { useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGraphStore } from '@/stores/graphStore';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { ExportDiagramButton } from '../ExportDiagram/ExportDiagramButton';

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
    { value: 'hierarchical', label: 'Hierarchical' },
    { value: 'force', label: 'Force-Directed' },
    { value: 'circular', label: 'Circular' },
  ];

  // Extract unique modules from graph
  const modules = useMemo(() => {
    if (!graph) return [];
    const uniqueModules = new Set<string>();
    graph.nodes.forEach((node) => {
      if (node.module) {
        uniqueModules.add(node.module);
      }
    });
    return Array.from(uniqueModules).sort();
  }, [graph]);

  // Collapsed state - just a button
  if (!layoutSelectorExpanded) {
    return (
      <button
        onClick={() => setLayoutSelectorExpanded(true)}
        className="fixed top-20 right-4 bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl shadow-lg border border-amber-700 transition-all hover:shadow-xl group z-10 animate-slide-down"
        title="Expand controls"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
    );
  }

  // Expanded state - full panel
  return (
    <div className="fixed top-20 right-4 bg-surface/95 backdrop-blur-md rounded-xl shadow-lg border border-border-light p-5 space-y-5 max-w-sm z-10 animate-slide-down">
      {/* Layout Selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-sm md:text-base font-bold text-text-primary tracking-tight">
            Layout
          </label>
          <button
            onClick={() => setLayoutSelectorExpanded(false)}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-background rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
        <select
          value={currentLayout}
          onChange={(e) => setCurrentLayout(e.target.value as any)}
          className="w-full text-base border border-border-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all cursor-pointer hover:border-border-dark bg-surface text-text-primary font-medium"
        >
          {layouts.map((layout) => (
            <option key={layout.value} value={layout.value}>
              {layout.label}
            </option>
          ))}
        </select>
      </div>

      {/* Module Filter */}
      <div>
        <label className="text-sm md:text-base font-bold text-text-primary block mb-2.5 tracking-tight">
          Filter by Module
        </label>
        <div className="relative">
          <input
            list="modules-list"
            value={selectedModule || ''}
            onChange={(e) => setSelectedModule(e.target.value || null)}
            placeholder="Search or select module..."
            className="w-full text-base border border-border-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all hover:border-border-dark bg-surface text-text-primary font-medium placeholder:text-text-tertiary"
          />
          <datalist id="modules-list">
            {modules.map((module) => (
              <option key={module} value={module} />
            ))}
          </datalist>
          {selectedModule && (
            <button
              onClick={() => setSelectedModule(null)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors p-1 hover:bg-background rounded"
              title="Clear filter"
              aria-label="Clear filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cluster Visualization Toggle */}
      {globalMetrics?.clusters && globalMetrics.clusters.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-3 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={showClusters}
                onChange={(e) => setShowClusters(e.target.checked)}
                className="w-5 h-5 rounded border-border-medium text-amber-600 focus:ring-2 focus:ring-amber-500/20 cursor-pointer flex-shrink-0"
              />
              <span className="text-sm md:text-base font-bold text-text-primary tracking-tight">
                Show Clusters <span className="tabular-nums">({globalMetrics.clusters.length})</span>
              </span>
            </label>
            <button
              onClick={() => setShowClusterModal(true)}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md flex-shrink-0"
            >
              Details
            </button>
          </div>
          <p className="text-xs md:text-sm text-text-secondary mt-2 ml-8">
            Visualize detected communities
          </p>
        </div>
      )}

      {/* Export Diagram */}
      <div>
        <ExportDiagramButton />
      </div>
    </div>
  );
};
