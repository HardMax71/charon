import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitHubInput } from './GitHubInput';
import { DragDropZone } from './DragDropZone';
import { analyzeCode } from '@/services/api';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { FileInput } from '@/types/api';
import { Github, FolderOpen, Upload } from 'lucide-react';

export const InputForm = () => {
  const [activeTab, setActiveTab] = useState<'github' | 'local' | 'import'>('github');
  const { setGraph, setGlobalMetrics, setWarnings, setAnalysisSource } = useGraphStore();
  const { setLoading, setLoadingProgress } = useUIStore();
  const navigate = useNavigate();

  const handleGitHubSubmit = (url: string) => {
    setLoading(true);

    analyzeCode(
      { source: 'github', url },
      (event) => {
        if (event.message && event.progress !== undefined) {
          setLoadingProgress(event.progress, event.message);
        }
      },
      (result) => {
        setGraph({ nodes: result.graph.nodes, edges: result.graph.edges });
        setGlobalMetrics(result.global_metrics);
        setWarnings(result.warnings || []);
        setAnalysisSource({ type: 'github', url, timestamp: new Date().toISOString() });
        setLoading(false);
        navigate('/results');
      },
      (error) => {
        alert(`Error: ${error}`);
        setLoading(false);
      }
    );
  };

  const handleLocalFiles = (files: FileInput[]) => {
    setLoading(true);

    analyzeCode(
      { source: 'local', files },
      (event) => {
        if (event.message && event.progress !== undefined) {
          setLoadingProgress(event.progress, event.message);
        }
      },
      (result) => {
        setGraph({ nodes: result.graph.nodes, edges: result.graph.edges });
        setGlobalMetrics(result.global_metrics);
        setWarnings(result.warnings || []);
        setAnalysisSource({ type: 'local', fileName: `${files.length} files`, timestamp: new Date().toISOString() });
        setLoading(false);
        navigate('/results');
      },
      (error) => {
        alert(`Error: ${error}`);
        setLoading(false);
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      setGraph(data.graph);
      setGlobalMetrics(data.global_metrics);
      setWarnings([]);
      setAnalysisSource({ type: 'import', fileName: file.name, timestamp: new Date().toISOString() });
      navigate('/results');
    } catch (err) {
      alert('Failed to load file');
    }
  };

  return (
    <div className="marble-panel p-8 md:p-10 w-full mx-auto animate-fade-in relative overflow-hidden">
      {/* Decorative top highlight */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-teal-500 opacity-50" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
            Analyze Project
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Select your source to begin autopsy
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center border border-teal-100">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100/80 rounded-xl mb-8 border border-slate-200/50 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('github')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'github'
            ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
        >
          <Github className="w-4 h-4" />
          GitHub
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'local'
            ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
        >
          <FolderOpen className="w-4 h-4" />
          Local
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'import'
            ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
      </div>

      {/* Content */}
      <div className="relative min-h-[120px]">
        {activeTab === 'github' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <GitHubInput onSubmit={handleGitHubSubmit} />
          </div>
        )}

        {activeTab === 'local' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <DragDropZone onFilesProcessed={handleLocalFiles} />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative group">
              <input
                type="file"
                accept=".json,.toml"
                onChange={handleFileUpload}
                className="w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all file:hidden cursor-pointer bg-slate-50/50 hover:bg-teal-50/30 text-center text-slate-500 font-medium"
              />
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 group-hover:text-teal-600 transition-colors">
                <Upload className="w-8 h-8 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm">Click to upload JSON/TOML</span>
              </div>
            </div>
            <p className="text-xs text-center text-slate-400 font-mono">
              Supports Charon Export Format v1.0
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
