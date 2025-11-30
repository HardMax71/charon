import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useGraphStore } from '@/stores/graphStore';
import { Minimize2, Command, MousePointer2 } from 'lucide-react';

export const ControlsLegend = () => {
  const controlsLegendExpanded = useUIStore(state => state.controlsLegendExpanded);
  const setControlsLegendExpanded = useUIStore(state => state.setControlsLegendExpanded);
  const selectedNode = useGraphStore(state => state.selectedNode);

  // Auto-retract when a node is selected to clear view
  useEffect(() => {
    if (selectedNode && controlsLegendExpanded) {
      setControlsLegendExpanded(false);
    }
  }, [selectedNode]);

  // Collapsed state - Floating Action Button
  if (!controlsLegendExpanded) {
    return (
      <button
        onClick={() => setControlsLegendExpanded(true)}
        aria-label="Show controls"
        title="Show controls"
        className="group bg-white hover:bg-slate-50 text-slate-600 hover:text-teal-600 p-3 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      >
        <Command className="w-5 h-5" />
      </button>
    );
  }

  // Expanded state - Input Mapping Panel
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 overflow-hidden w-[320px] animate-in slide-in-from-bottom-4 fade-in duration-300 origin-bottom-left">

      {/* Header Strip */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest text-slate-600">
          <MousePointer2 className="w-3.5 h-3.5" />
          <span>Input Mapping</span>
        </div>
        <button
          onClick={() => setControlsLegendExpanded(false)}
          aria-label="Minimize controls"
          title="Minimize"
          className="text-slate-600 hover:text-slate-600 hover:bg-slate-200 rounded p-1 transition-colors"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content Table */}
      <div className="p-4 space-y-3 text-xs">

        <ControlRow
          label="Left Drag"
          action="Rotate View"
        />
        <ControlRow
          label="Right Drag"
          action="Pan Camera"
        />
        <ControlRow
          label="Scroll"
          action="Zoom Level"
        />

        <div className="h-px bg-slate-100 my-2" />

        <ControlRow
          label="Click Node"
          action="Select / Metrics"
          highlight
        />
        <ControlRow
          label="Drag Node"
          action="Reposition Logic"
          highlight
        />
        <ControlRow
          label="Click Void"
          action="Deselect"
        />

      </div>

      {/* Footer Hint */}
      <div className="bg-slate-50 border-t border-slate-100 p-2 text-center">
        <p className="text-[9px] text-slate-600 font-mono">
          DOUBLE-CLICK TO RESET CAMERA
        </p>
      </div>
    </div>
  );
};

// Helper Component for rows
const ControlRow = ({ label, action, highlight = false }: { label: string, action: string, highlight?: boolean }) => (
  <div className="flex items-center justify-between group">
    <span className={`
      font-mono font-bold px-2 py-1 rounded border text-[10px] uppercase tracking-tight min-w-[80px] text-center
      ${highlight 
        ? 'bg-teal-50 border-teal-200 text-teal-700' 
        : 'bg-slate-100 border-slate-200 text-slate-600 group-hover:border-slate-300'
      }
    `}>
      {label}
    </span>
    <span className="text-slate-600 font-medium text-[11px]">
      {action}
    </span>
  </div>
);