import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  GitBranch,
  Loader2,
  Activity,
  Terminal,
  ChevronRight,
  Layers,
  Clock
} from 'lucide-react';

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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProgressMessage('Initializing system...');
    setProgress(0);

    if (!repoUrl) {
      setError('Target repository is undefined.');
      return;
    }

    setIsAnalyzing(true);
    abortControllerRef.current = new AbortController();

    try {
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
        throw new Error(`System Error (${response.status}): ${errorText}`);
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
        } catch (e) { console.error('Parse error:', e); }
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
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Analysis sequence failed.');
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-6 relative overflow-hidden bg-white text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">

      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
           style={{ backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}
      />

      <div className="w-full max-w-3xl relative z-10">

        {/* --- THE BLUEPRINT CARD --- */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-500">

          {/* Header Strip */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between relative">
             {/* Scanline Effect on Header */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.02)_50%)] bg-[size:100%_4px] pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-widest uppercase leading-none">
                  Temporal Analysis
                </h2>
                <p className="text-[10px] font-mono text-slate-400 mt-1">
                  MODULE ID: TMP-09X
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded border ${isAnalyzing ? 'bg-teal-50 border-teal-100' : 'bg-white border-slate-200'}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`} />
               <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isAnalyzing ? 'text-teal-700' : 'text-slate-500'}`}>
                 {isAnalyzing ? 'Running' : 'Standby'}
               </span>
            </div>
          </div>

          <div className="p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* 1. REPOSITORY INPUT */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Terminal className="w-3 h-3" /> Target Source</span>
                  <span className="text-teal-600/80 font-mono">REQUIRED</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="github.com/owner/repo"
                    className="input-text bg-slate-50 placeholder:text-slate-400 focus:bg-white"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>

              {/* 2. CONFIGURATION GRID */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Dates (Span 7) */}
                <div className="md:col-span-7 space-y-2">
                   <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Calendar className="w-3 h-3" /> Scan Interval
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">FROM</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input-base bg-white pl-12 pr-3 py-2.5 text-xs font-mono text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none"
                        disabled={isAnalyzing}
                      />
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">TO</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input-base bg-white pl-8 pr-3 py-2.5 text-xs font-mono text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none"
                        disabled={isAnalyzing}
                      />
                    </div>
                  </div>
                </div>

                {/* Strategy (Span 5) */}
                <div className="md:col-span-5 space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Layers className="w-3 h-3" /> Granularity
                  </label>
                  <div className="relative">
                    <select
                      value={sampleStrategy}
                      onChange={(e) => setSampleStrategy(e.target.value as any)}
                      className="input-select uppercase"
                      disabled={isAnalyzing}
                    >
                      <option value="all">Full History (Slow)</option>
                      <option value="daily">Daily Snapshot</option>
                      <option value="weekly">Weekly (Recommended)</option>
                      <option value="monthly">Monthly Overview</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. EXECUTION & STATUS */}
              <div className="border-t border-slate-100 pt-6 mt-2">

                {isAnalyzing ? (
                  /* PROGRESS STATE */
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        PROCESSING...
                      </span>
                      <span className="font-bold text-teal-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 transition-all duration-300 ease-out relative"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 truncate">
                      Log: {progressMessage || "Initializing..."}
                    </p>
                  </div>
                ) : (
                  /* ERROR STATE */
                  error ? (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-between animate-in slide-in-from-top-1">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-rose-500 rounded-full" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Critical Error</h4>
                          <p className="text-xs text-rose-600 font-medium mt-0.5">{error}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setError('')}
                        className="px-3 py-1 bg-white border border-rose-200 text-rose-600 text-[10px] font-bold rounded hover:bg-rose-50 transition-colors"
                      >
                        RESET
                      </button>
                    </div>
                  ) : null
                )}

                {/* ACTION BUTTON */}
                {!isAnalyzing && (
                  <button
                    type="submit"
                    disabled={!repoUrl}
                    className={`
                      w-full group relative overflow-hidden rounded-lg p-4 transition-all
                      ${!repoUrl ? 'bg-slate-100 cursor-not-allowed opacity-70' : 'bg-slate-900 hover:bg-teal-600 shadow-lg hover:shadow-teal-500/20'}
                    `}
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2 text-sm font-bold text-white uppercase tracking-widest">
                      <span>Execute Analysis</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${repoUrl ? 'group-hover:translate-x-1' : ''}`} />
                    </div>
                  </button>
                )}
              </div>
            </form>
          </div>

        </div>

        {/* Footer Metadata */}
        <div className="mt-6 flex justify-between text-[10px] font-mono text-slate-400 uppercase tracking-widest px-4">
          <span>Secure Connection</span>
          <span>v2.4.0-stable</span>
        </div>

      </div>
    </div>
  );
};