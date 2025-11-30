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
      <label className={`block border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
        selectedFile
          ? 'border-teal-300 bg-teal-50/50'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}>
        <input
          type="file"
          accept=".prof,.json"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <FileCode className={`w-8 h-8 mx-auto mb-2 ${selectedFile ? 'text-teal-600' : 'text-slate-600'}`} />
        <p className={`text-sm mb-1 ${selectedFile ? 'font-medium text-teal-700' : 'text-slate-600'}`}>
          {selectedFile ? selectedFile.name : 'Click to upload profiling file'}
        </p>
        <p className="text-sm text-slate-600">
          Supports <span className="font-mono font-medium">.prof</span> (cProfile), <span className="font-mono font-medium">.json</span> (py-spy)
        </p>
      </label>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!selectedFile || !graph || isLoading}
        className={`
          w-full py-2.5 px-4 rounded-xl font-medium text-sm
          flex items-center justify-center gap-2
          transition-colors
          ${selectedFile && graph && !isLoading
            ? 'bg-slate-900 hover:bg-teal-600 text-white'
            : 'bg-slate-100 text-slate-600 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
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
