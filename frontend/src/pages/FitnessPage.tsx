import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGraphStore } from '@/stores/graphStore';
import { FitnessRule, FitnessValidationResult, FitnessViolation } from '@/types/fitness';
import { validateFitnessRules, getExampleFitnessConfig } from '@/services/api';
import { FitnessRuleCard } from '@/components/Fitness/FitnessRuleCard';
import { FitnessValidationResults } from '@/components/Fitness/FitnessValidationResults';
import { FitnessRuleModal } from '@/components/Fitness/FitnessRuleModal';
import {
  Play,
  Plus,
  Download,
  Upload,
  Github,
  Folder,
  FileJson,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Settings
} from 'lucide-react';

export const FitnessPage = () => {
  const { graph, globalMetrics, analysisSource } = useGraphStore();
  const navigate = useNavigate();

  const [rules, setRules] = useState<FitnessRule[]>([]);
  const [validationResult, setValidationResult] = useState<FitnessValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingExample, setIsLoadingExample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FitnessRule | null>(null);

  // Load example rules on mount
  useEffect(() => {
    loadExampleRules();
  }, []);

  const loadExampleRules = async () => {
    setIsLoadingExample(true);
    setError(null);
    try {
      const config = await getExampleFitnessConfig();
      setRules(config.rules);
    } catch (err) {
      setError('Failed to load example rules');
      console.error('Error loading example rules:', err);
    } finally {
      setIsLoadingExample(false);
    }
  };

  const handleValidate = async () => {
    if (!graph || !globalMetrics) return;

    setIsValidating(true);
    setError(null);
    try {
      const result = await validateFitnessRules(
        graph,
        globalMetrics,
        rules,
        true,
        false
      );
      setValidationResult(result);
    } catch (err) {
      setError('Validation failed: ' + (err as Error).message);
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
    setValidationResult(null);
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
    setValidationResult(null);
  };

  const handleEditRule = (rule: FitnessRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleSaveRule = (rule: FitnessRule) => {
    if (editingRule) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
    } else {
      setRules((prev) => [...prev, rule]);
    }
    setValidationResult(null);
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleViolationClick = (violation: FitnessViolation) => {
    console.log('Violation clicked:', violation);
    // TODO: Implement highlighting affected nodes
  };

  const handleSaveConfig = () => {
    const config = { version: '1.0', rules };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fitness_rules.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const config = JSON.parse(text);
        setRules(config.rules || []);
        setValidationResult(null);
      } catch (err) {
        setError('Failed to load config file');
        console.error('Error loading config:', err);
      }
    };
    input.click();
  };

  const sourceIcon = {
    github: <Github className="w-4 h-4" />,
    local: <Folder className="w-4 h-4" />,
    import: <FileJson className="w-4 h-4" />,
  };

  // --- EMPTY STATE ---
  if (!graph || !globalMetrics) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-10 max-w-lg w-full text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-slate-400" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Architecture Enforcement
          </h2>

          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Define and validate strict architectural rules (e.g. "No circular dependencies", "Max coupling"). Analyze a project first to begin.
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-teal-600 transition-colors"
          >
            Analyze Project <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

      {/* --- TOOLBAR --- */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center justify-between">

          {/* Source Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md border border-slate-200 text-xs font-medium text-slate-600">
              {analysisSource && sourceIcon[analysisSource.type]}
              <span className="font-mono truncate max-w-[200px]">
                {analysisSource?.url || analysisSource?.fileName || 'Unknown Source'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={handleLoadConfig} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Load Config">
              <Upload className="w-4 h-4" />
            </button>
            <button onClick={handleSaveConfig} disabled={rules.length === 0} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" title="Save Config">
              <Download className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-200 mx-2" />

            <button
              onClick={handleValidate}
              disabled={isValidating || rules.filter((r) => r.enabled).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Run Validation</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN SPLIT VIEW --- */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Rule Editor */}
        <div className="w-1/2 border-r border-slate-200 bg-slate-50/50 overflow-y-auto p-6 custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" />
                Fitness Functions
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {rules.filter((r) => r.enabled).length} active rules configured
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={loadExampleRules} disabled={isLoadingExample} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:border-slate-300 transition-colors">
                {isLoadingExample ? <Loader2 className="w-3 h-3 animate-spin inline mr-1"/> : <RefreshCw className="w-3 h-3 inline mr-1"/>}
                Reset
              </button>
              <button onClick={handleAddRule} className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> New Rule
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {rules.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-sm text-slate-400">No rules defined.</p>
              </div>
            ) : (
              rules.map((rule) => (
                <FitnessRuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggleRule}
                  onDelete={handleDeleteRule}
                  onEdit={handleEditRule}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Results Console */}
        <div className="w-1/2 overflow-y-auto p-6 bg-white custom-scrollbar">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Validation Report</h2>
            <p className="text-xs text-slate-500 mt-1">Real-time architectural compliance check</p>
          </div>

          {validationResult ? (
            <FitnessValidationResults
              result={validationResult}
              onViolationClick={handleViolationClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-100 rounded-xl">
              <div className="p-4 bg-slate-50 rounded-full mb-3">
                <Play className="w-6 h-6 text-slate-300 ml-1" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Ready to validate</p>
              <p className="text-xs text-slate-300 mt-1">
                Click "Run Validation" to execute active rules
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      <FitnessRuleModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRule(null); }}
        onSave={handleSaveRule}
        editingRule={editingRule}
      />
    </div>
  );
};