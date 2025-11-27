import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitHubInput } from './GitHubInput';
import { DragDropZone } from './DragDropZone';
import { analyzeCode } from '@/services/api';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { useToast } from '@/stores/toastStore';
import { FileInput } from '@/types/api';
import { Github, FolderOpen, Upload } from 'lucide-react';

export const InputForm = () => {
  const [activeTab, setActiveTab] = useState<'github' | 'local' | 'import'>('github');
  const setGraph = useGraphStore(state => state.setGraph);
  const setGlobalMetrics = useGraphStore(state => state.setGlobalMetrics);
  const setWarnings = useGraphStore(state => state.setWarnings);
  const setAnalysisSource = useGraphStore(state => state.setAnalysisSource);
  const setLoading = useUIStore(state => state.setLoading);
  const setLoadingProgress = useUIStore(state => state.setLoadingProgress);
  const toast = useToast();
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
        toast.error(`Failed to analyze repository: ${error}`);
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
        toast.error(`Failed to analyze files: ${error}`);
        setLoading(false);
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);

    setGraph(data.graph);
    setGlobalMetrics(data.global_metrics);
    setWarnings([]);
    setAnalysisSource({ type: 'import', fileName: file.name, timestamp: new Date().toISOString() });
    navigate('/results');
  };

  return (
    <div className="marble-panel p-8 md:p-10 w-full mx-auto animate-fade-in relative overflow-hidden">
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
          Analyze Project
        </h2>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Select your source to begin autopsy
        </p>
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
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <label className="block border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 hover:border-gray-400 cursor-pointer">
              <input
                type="file"
                accept=".json,.toml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-gray-600 mb-2">
                Click to upload JSON/TOML
              </p>
              <p className="text-xs text-gray-400">Charon export format</p>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
