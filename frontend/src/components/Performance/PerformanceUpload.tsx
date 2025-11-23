import { useState } from 'react';
import { FileCode, Loader2, AlertCircle } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { analyzePerformance } from '@/services/api';

export const PerformanceUpload = () => {
  const graph = useGraphStore((state) => state.graph);
  const setAnalysis = usePerformanceStore((state) => state.setAnalysis);
  const setLoading = usePerformanceStore((state) => state.setLoading);
  const setError = usePerformanceStore((state) => state.setError);
  const isLoading = usePerformanceStore((state) => state.isLoading);
  const error = usePerformanceStore((state) => state.error);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file type
      const validExtensions = ['.prof', '.json'];
      const ext = file.name.substring(file.name.lastIndexOf('.'));

      if (!validExtensions.includes(ext)) {
        setError(`Invalid file type. Supported: ${validExtensions.join(', ')}`);
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !graph) {
      setError('Please select a profiling file and ensure graph is loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await analyzePerformance(selectedFile, graph);
      setAnalysis(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze performance';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <label className="block border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 hover:border-gray-400 cursor-pointer">
        <input
          type="file"
          accept=".prof,.json"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <p className="text-gray-600 mb-2">
          {selectedFile ? selectedFile.name : 'Click to upload profiling file'}
        </p>
        <p className="text-xs text-gray-400">
          Supports .prof (cProfile), .json (py-spy)
        </p>
      </label>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!selectedFile || !graph || isLoading}
        className={`
          w-full py-3 px-4 rounded-lg font-medium text-sm
          flex items-center justify-center gap-2
          transition-all duration-200
          ${selectedFile && graph && !isLoading
            ? 'bg-styx-600 hover:bg-styx-700 text-white shadow-sm hover:shadow'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing performance...
          </>
        ) : (
          <>
            <FileCode className="w-4 h-4" />
            Analyze Performance
          </>
        )}
      </button>
    </div>
  );
};
