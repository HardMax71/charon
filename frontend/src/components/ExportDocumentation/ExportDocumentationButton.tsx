import { useState } from 'react';
import { FileText, FileJson, FileCode, Loader2 } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';

export const ExportDocumentationButton = () => {
  const { graph, globalMetrics } = useGraphStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'md' | 'html' | 'pdf') => {
    if (!graph) return;
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graph: { nodes: graph.nodes, edges: graph.edges },
          global_metrics: globalMetrics,
          format: format,
          project_name: 'Project',
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentation.${format}`;
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
          ${isOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-900 text-white border-slate-900 hover:bg-teal-600 hover:border-teal-600 shadow-md'}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        <span className="text-[9px] font-bold uppercase tracking-wider">Reports</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          {/* Dropdown: Opens DOWN from RIGHT edge with high Z-index */}
          <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-slate-200 rounded-lg shadow-2xl z-[200] p-1 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
            <div className="space-y-0.5">
              <FormatOption
                label="Markdown"
                icon={FileCode}
                onClick={() => handleExport('md')}
              />
              <FormatOption
                label="HTML Report"
                icon={FileCode}
                onClick={() => handleExport('html')}
              />
              <FormatOption
                label="PDF Document"
                icon={FileJson}
                onClick={() => handleExport('pdf')}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const FormatOption = ({ label, icon: Icon, onClick }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-700 rounded transition-colors text-left group btn-secondary btn-sm"
  >
    <Icon className="w-3.5 h-3.5 group-hover:text-teal-600" />
    <span>{label}</span>
  </button>
);