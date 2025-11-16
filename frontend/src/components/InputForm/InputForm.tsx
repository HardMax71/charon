import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitHubInput } from './GitHubInput';
import { DragDropZone } from './DragDropZone';
import { analyzeCode } from '@/services/api';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { FileInput } from '@/types/api';

export const InputForm = () => {
  const [activeTab, setActiveTab] = useState<'github' | 'local' | 'import'>('github');
  const { setGraph, setGlobalMetrics, setWarnings } = useGraphStore();
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
      navigate('/results');
    } catch (err) {
      alert('Failed to load file');
    }
  };

  return (
    <div className="bg-surface rounded-2xl shadow-lg border border-border-light p-8 md:p-10 lg:p-12 max-w-3xl w-full mx-auto animate-fade-in">
      <h2 className="text-xl md:text-2xl font-extrabold mb-1.5 text-text-primary tracking-tight">
        Analyze Python Project
      </h2>
      <p className="text-text-secondary mb-6 text-sm md:text-base">
        Visualize dependencies and detect architectural issues
      </p>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 border-b border-border-light">
        <button
          onClick={() => setActiveTab('github')}
          className={`px-6 py-3 font-semibold text-sm md:text-base rounded-t-lg transition-all ${
            activeTab === 'github'
              ? 'bg-background border-b-2 border-primary text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-background/50'
          }`}
        >
          GitHub
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`px-6 py-3 font-semibold text-sm md:text-base rounded-t-lg transition-all ${
            activeTab === 'local'
              ? 'bg-background border-b-2 border-primary text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-background/50'
          }`}
        >
          Local Folder
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-6 py-3 font-semibold text-sm md:text-base rounded-t-lg transition-all ${
            activeTab === 'import'
              ? 'bg-background border-b-2 border-primary text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-background/50'
          }`}
        >
          Import
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'github' && <GitHubInput onSubmit={handleGitHubSubmit} />}
        {activeTab === 'local' && <DragDropZone onFilesProcessed={handleLocalFiles} />}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <input
              type="file"
              accept=".json,.toml"
              onChange={handleFileUpload}
              className="w-full px-4 py-3.5 border-2 border-border-medium rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:bg-primary file:text-text-inverse file:font-semibold file:text-sm hover:file:bg-primary-hover file:cursor-pointer cursor-pointer"
            />
            <p className="text-sm text-text-secondary">
              Upload a previously exported JSON or TOML file
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
