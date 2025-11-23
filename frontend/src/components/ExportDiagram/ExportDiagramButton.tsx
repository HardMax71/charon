import { useState } from 'react';
import { Network, Boxes, GitGraph, Workflow, Package, PenTool } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';

type DiagramFormat = 'plantuml' | 'c4' | 'mermaid' | 'uml' | 'drawio';

export const ExportDiagramButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { graph } = useGraphStore();

  const handleExport = async (format: DiagramFormat) => {
    if (!graph) return;
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph_data: graph, format, system_name: 'Software System' }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!graph}
        className={`
          flex flex-col items-center justify-center gap-1 w-full p-2.5 rounded-lg transition-all border
          ${isOpen ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:border-teal-500 hover:text-teal-700'}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <Network className="w-4 h-4" />
        <span className="text-[9px] font-bold uppercase tracking-wider">Diagrams</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          {/* Z-Index bumped to 200 to ensure visibility */}
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-2xl z-[200] p-1 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
            <div className="space-y-0.5">
              <FormatOption
                label="PlantUML"
                icon={Boxes}
                onClick={() => handleExport('plantuml')}
                loading={isExporting}
              />
              <FormatOption
                label="C4 Model"
                icon={GitGraph}
                onClick={() => handleExport('c4')}
                loading={isExporting}
              />
              <FormatOption
                label="Mermaid"
                icon={Workflow}
                onClick={() => handleExport('mermaid')}
                loading={isExporting}
              />
              <FormatOption
                label="UML Pkg"
                icon={Package}
                onClick={() => handleExport('uml')}
                loading={isExporting}
              />
              <FormatOption
                label="Draw.io"
                icon={PenTool}
                onClick={() => handleExport('drawio')}
                loading={isExporting}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const FormatOption = ({ label, icon: Icon, onClick, loading }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded transition-colors disabled:opacity-50 text-left"
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);