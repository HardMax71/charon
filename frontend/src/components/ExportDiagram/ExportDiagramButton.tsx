import { useState } from 'react';
import { Network, Workflow, GitGraph, Boxes, Package, PenTool } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';

type DiagramFormat = 'plantuml' | 'c4' | 'mermaid' | 'uml' | 'drawio';

interface FormatOption {
  value: DiagramFormat;
  label: string;
  icon: React.ReactNode;
}

export const ExportDiagramButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { graph } = useGraphStore();

  const formats: FormatOption[] = [
    {
      value: 'plantuml',
      label: 'PlantUML',
      icon: <Boxes className="w-5 h-5" />,
    },
    {
      value: 'c4',
      label: 'C4 Diagram',
      icon: <GitGraph className="w-5 h-5" />,
    },
    {
      value: 'mermaid',
      label: 'Mermaid',
      icon: <Workflow className="w-5 h-5" />,
    },
    {
      value: 'uml',
      label: 'UML Package',
      icon: <Package className="w-5 h-5" />,
    },
    {
      value: 'drawio',
      label: 'Draw.io',
      icon: <PenTool className="w-5 h-5" />,
    },
  ];

  const handleExport = async (format: DiagramFormat) => {
    if (!graph) return;

    setIsExporting(true);
    try {
      const response = await fetch('/api/export-diagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          graph_data: graph,
          format,
          system_name: 'Software System',
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `diagram.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export diagram. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!graph) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white text-base font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isExporting}
        title="Export Diagram"
      >
        <Network className="w-5 h-5" />
        <span>Export Diagram</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-2 w-full bg-surface border border-border-light rounded-lg shadow-xl z-[200] p-1 animate-slide-down">
            <div className="space-y-0.5">
              {formats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => handleExport(format.value)}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-background transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex-shrink-0 text-amber-600">
                    {format.icon}
                  </div>
                  <div className="text-sm font-medium text-text-primary">
                    {format.label}
                  </div>
                </button>
              ))}
            </div>

            {isExporting && (
              <div className="mt-2 px-3 py-2 text-center">
                <div className="text-xs text-text-secondary">Exporting...</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
