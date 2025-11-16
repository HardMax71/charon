import { useState } from 'react';
import { Calendar, GitBranch, Loader2 } from 'lucide-react';

interface TemporalInputProps {
  onAnalysisComplete: (data: any) => void;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProgressMessage('');
    setProgress(0);

    if (!repoUrl) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/temporal-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          repository_url: repoUrl,
          start_date: startDate || null,
          end_date: endDate || null,
          sample_strategy: sampleStrategy,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to read response');
      }

      let buffer = '';

      const processLine = (line: string) => {
        if (!line) return;
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) return;
        if (!trimmed.startsWith('data:')) return;

        const payload = trimmed.replace(/^(?:data:\s*)+/, '');
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
            if (data.step && data.total) {
              setProgress((data.step / data.total) * 100);
            }
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          processLine(line);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze repository. Please try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="bg-surface rounded-2xl shadow-xl border border-border-light p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
              <GitBranch className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Start Temporal Analysis
            </h2>
            <p className="text-text-secondary">
              Analyze how dependencies evolved over your repository's git history
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Repository URL */}
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">
                GitHub Repository URL
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full px-4 py-3 border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all bg-surface text-text-primary font-mono text-sm"
                disabled={isAnalyzing}
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-text-primary mb-2">
                  Start Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all bg-surface text-text-primary"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-text-primary mb-2">
                  End Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all bg-surface text-text-primary"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>
            </div>

            {/* Sample Strategy */}
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">
                Sampling Strategy
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['all', 'daily', 'weekly', 'monthly'] as const).map((strategy) => (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => setSampleStrategy(strategy)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      sampleStrategy === strategy
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-background text-text-secondary hover:bg-border-light hover:text-text-primary'
                    }`}
                    disabled={isAnalyzing}
                  >
                    {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                {sampleStrategy === 'all' && 'Analyze every commit (may be slow for large repositories)'}
                {sampleStrategy === 'daily' && 'Sample one commit per day'}
                {sampleStrategy === 'weekly' && 'Sample one commit per week (recommended)'}
                {sampleStrategy === 'monthly' && 'Sample one commit per month'}
              </p>
            </div>

            {/* Progress Indicator */}
            {isAnalyzing && progressMessage && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{progressMessage}</span>
                  <span className="font-mono font-bold text-amber-600">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-border-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-error-bg border border-error/20 rounded-lg">
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAnalyzing || !repoUrl}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-border-light disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Repository...
                </>
              ) : (
                <>
                  <GitBranch className="w-5 h-5" />
                  Start Analysis
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-tertiary mt-6">
          Note: Analysis may take several minutes depending on repository size and commit count.
        </p>
      </div>
    </div>
  );
};
