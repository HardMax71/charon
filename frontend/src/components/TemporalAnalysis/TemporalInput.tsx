import React, { useState, useRef, useEffect } from 'react';
import { GitBranch, Loader2, ArrowRight, Clock } from 'lucide-react';
import { TemporalAnalysisResponse } from '@/types/temporal';
import { logger } from '@/utils/logger';

interface TemporalInputProps {
  onAnalysisComplete: (data: TemporalAnalysisResponse) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

export const TemporalInput = ({
  onAnalysisComplete,
  isAnalyzing,
  setIsAnalyzing,
}: TemporalInputProps) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sampleStrategy, setSampleStrategy] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('weekly');
  const [error, setError] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProgressMessage('Initializing...');
    setProgress(0);

    if (!repoUrl) {
      setError('Repository URL is required.');
      return;
    }

    setIsAnalyzing(true);
    abortControllerRef.current = new AbortController();

    const response = await fetch('/api/temporal-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        repository_url: repoUrl,
        start_date: startDate || null,
        end_date: endDate || null,
        sample_strategy: sampleStrategy,
      }),
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('Stream connection failed');

    let buffer = '';
    const processLine = (line: string) => {
      if (!line || !line.startsWith('data:')) return;
      const payload = line.replace(/^(?:data:\s*)+/, '');
      if (!payload) return;

      try {
        const data = JSON.parse(payload);
        if (data.type === 'result') {
          onAnalysisComplete(data.data);
          setIsAnalyzing(false);
        } else if (data.type === 'error') {
          setError(data.message);
          setIsAnalyzing(false);
        } else if (data.type === 'progress') {
          setProgressMessage(data.message);
          if (data.step && data.total) setProgress((data.step / data.total) * 100);
        }
      } catch (e) { logger.error('Parse error:', e); }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        processLine(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 1);
      }
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-teal-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Temporal Analysis</h2>
          <p className="text-sm text-slate-600">
            Analyze how your codebase architecture evolved over time.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Repository URL */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Repository URL
              </label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="github.com/owner/repo"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-colors"
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-colors"
                  disabled={isAnalyzing}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-colors"
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            {/* Sample Strategy */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Sampling
              </label>
              <select
                value={sampleStrategy}
                onChange={(e) => setSampleStrategy(e.target.value as any)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-colors bg-white"
                disabled={isAnalyzing}
              >
                <option value="weekly">Weekly (Recommended)</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="all">All Commits (Slow)</option>
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                <span className="text-xs text-rose-700">{error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Progress */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {progressMessage || 'Processing...'}
                  </span>
                  <span className="font-medium text-teal-600">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            {!isAnalyzing && (
              <button
                type="submit"
                disabled={!repoUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Analysis
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};