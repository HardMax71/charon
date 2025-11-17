import { useState } from 'react';
import { Download, Loader } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';

export const ExportDocumentationButton = () => {
  const { graph, globalMetrics } = useGraphStore();
  const [format, setFormat] = useState<'markdown' | 'html' | 'pdf'>('markdown');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!graph) {
      setError('No graph data available');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const projectName = (globalMetrics as any)?.project_name || 'Project';

      const response = await fetch('/api/export-documentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          graph: {
            nodes: graph.nodes,
            edges: graph.edges,
          },
          global_metrics: globalMetrics,
          format: format,
          project_name: projectName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${projectName.replace(/\s+/g, '_')}_documentation.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
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
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err: any) {
      setError(err.message || 'Failed to export documentation');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm md:text-base font-bold text-text-primary block tracking-tight">
        Export Documentation
      </label>

      {/* Format Selector */}
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value as 'markdown' | 'html' | 'pdf')}
        className="w-full text-base border border-border-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all cursor-pointer hover:border-border-dark bg-surface text-text-primary font-medium"
        disabled={isExporting}
      >
        <option value="markdown">Markdown (.md)</option>
        <option value="html">HTML (.html)</option>
        <option value="pdf">PDF (.pdf)</option>
      </select>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting || !graph}
        className={`w-full px-4 py-3 rounded-lg font-semibold text-base transition-all flex items-center justify-center gap-2 ${
          isExporting || !graph
            ? 'bg-border-light text-text-tertiary cursor-not-allowed'
            : 'bg-amber-600 text-white hover:bg-amber-700 shadow-md hover:shadow-lg'
        }`}
      >
        {isExporting ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Export
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="text-xs text-error bg-error-bg p-2 rounded border border-error/20">
          {error}
        </div>
      )}

      {/* Info Text */}
      <p className="text-xs md:text-sm text-text-secondary">
        Includes module dependencies, coupling reports, circular dependencies, and library usage
      </p>
    </div>
  );
};
