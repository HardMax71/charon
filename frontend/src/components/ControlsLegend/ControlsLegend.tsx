import { useUIStore } from '@/stores/uiStore';
import { Minimize2, Maximize2 } from 'lucide-react';

export const ControlsLegend = () => {
  const { controlsLegendExpanded, setControlsLegendExpanded } = useUIStore();

  // Collapsed state - just a button
  if (!controlsLegendExpanded) {
    return (
      <button
        onClick={() => setControlsLegendExpanded(true)}
        className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl shadow-lg border border-amber-700 transition-all hover:shadow-xl group"
        title="Show controls"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
    );
  }

  // Expanded state - full panel
  return (
    <div className="bg-surface/95 backdrop-blur-md rounded-xl shadow-lg border border-border-light p-4 text-xs max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-text-primary text-sm tracking-tight">Controls</h4>
        <button
          onClick={() => setControlsLegendExpanded(false)}
          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-background rounded transition-colors"
          title="Minimize"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2 text-text-secondary">
        <div className="flex items-start gap-3">
          <span className="font-mono font-semibold bg-background px-2 py-1 rounded-md text-xs min-w-[90px] text-text-primary border border-border-light">
            Left Drag
          </span>
          <span className="leading-relaxed">Rotate camera</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono font-semibold bg-background px-2 py-1 rounded-md text-xs min-w-[90px] text-text-primary border border-border-light">
            Right Drag
          </span>
          <span className="leading-relaxed">Pan camera</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono font-semibold bg-background px-2 py-1 rounded-md text-xs min-w-[90px] text-text-primary border border-border-light">
            Scroll
          </span>
          <span className="leading-relaxed">Zoom in/out</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono font-semibold bg-background px-2 py-1 rounded-md text-xs min-w-[90px] text-text-primary border border-border-light">
            Click Node
          </span>
          <span className="leading-relaxed">Select & show metrics</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono font-semibold bg-background px-2 py-1 rounded-md text-xs min-w-[90px] text-text-primary border border-border-light">
            Drag Node
          </span>
          <span className="leading-relaxed">Move selected node</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono font-semibold bg-background px-2 py-1 rounded-md text-xs min-w-[90px] text-text-primary border border-border-light">
            Click Outside
          </span>
          <span className="leading-relaxed">Deselect node</span>
        </div>
      </div>
    </div>
  );
};
