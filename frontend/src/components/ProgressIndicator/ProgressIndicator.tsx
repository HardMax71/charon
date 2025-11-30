import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Loader2 } from 'lucide-react';

export const ProgressIndicator = () => {
  const isLoading = useUIStore(state => state.isLoading);
  const loadingProgress = useUIStore(state => state.loadingProgress);
  const loadingMessage = useUIStore(state => state.loadingMessage);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => setElapsed(p => p + 0.1), 100);
    return () => clearInterval(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Analyzing Project
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Parsing AST and resolving dependencies...
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">{loadingMessage || 'Processing...'}</span>
            <span className="font-medium text-teal-600">{Math.round(loadingProgress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="text-xs text-slate-600 text-center">
            {elapsed.toFixed(1)}s elapsed
          </div>
        </div>
      </div>
    </div>
  );
};