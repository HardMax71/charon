import { useState } from 'react';
import { FileText, Download, Loader } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';

interface ExportDocumentationProps {
  globalMetrics: any;
  projectName?: string;
}

export const ExportDocumentation = ({ globalMetrics, projectName = 'Project' }: ExportDocumentationProps) => {
  const { graph } = useGraphStore();
  const [format, setFormat] = useState<'md' | 'html' | 'pdf'>('md');
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
    <div className="bg-surface rounded-lg p-4 border border-border-light">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-amber-600" />
        <h3 className="text-sm font-bold text-text-primary">Export Documentation</h3>
      </div>

      <div className="space-y-3">
        {/* Format Selector */}
        <div>
          <label className="text-xs text-text-tertiary mb-2 block">Format:</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'md' | 'html' | 'pdf')}
            className="w-full px-3 py-2 border border-border-medium rounded-lg bg-background text-text-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            disabled={isExporting}
          >
            <option value="md">Markdown (.md)</option>
            <option value="html">HTML (.html)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || !graph}
          className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            isExporting || !graph
              ? 'bg-border-light text-text-tertiary cursor-not-allowed'
              : 'bg-amber-600 text-white hover:bg-amber-700 shadow-md'
          }`}
        >
          {isExporting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Documentation
            </>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="text-xs text-error bg-error-bg p-2 rounded">
            {error}
          </div>
        )}

        {/* Info Text */}
        <div className="text-xs text-text-tertiary">
          Includes module dependencies, coupling reports, circular dependencies, and third-party library usage.
        </div>
      </div>
    </div>
  );
};
