import { useState, useEffect } from 'react';
import { FitnessRule, RuleType, Severity } from '@/types/fitness';
import { X, Settings } from 'lucide-react';

interface FitnessRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: FitnessRule) => void;
  editingRule?: FitnessRule | null;
}

const ruleTypeOptions: { value: RuleType; label: string; description: string }[] = [
  { value: 'import_restriction', label: 'Import Restriction', description: 'Prevent specific modules from importing from other modules' },
  { value: 'max_coupling', label: 'Maximum Coupling', description: 'Limit the number of dependencies a module can have' },
  { value: 'no_circular', label: 'No Circular Dependencies', description: 'Detect and prevent circular dependencies' },
  { value: 'max_third_party_percent', label: 'Third-Party Limit', description: 'Limit the percentage of third-party dependencies' },
  { value: 'max_depth', label: 'Maximum Dependency Depth', description: 'Limit the length of dependency chains' },
  { value: 'max_complexity', label: 'Maximum Complexity', description: 'Enforce complexity limits on modules' },
];

export const FitnessRuleModal = ({ isOpen, onClose, onSave, editingRule }: FitnessRuleModalProps) => {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    rule_type: RuleType;
    severity: Severity;
    enabled: boolean;
    parameters: Record<string, any>;
  }>({
    name: '',
    description: '',
    rule_type: 'no_circular',
    severity: 'error',
    enabled: true,
    parameters: {},
  });

  useEffect(() => {
    if (editingRule) {
      setFormData({
        name: editingRule.name,
        description: editingRule.description,
        rule_type: editingRule.rule_type,
        severity: editingRule.severity,
        enabled: editingRule.enabled,
        parameters: editingRule.parameters,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        rule_type: 'no_circular',
        severity: 'error',
        enabled: true,
        parameters: {},
      });
    }
  }, [editingRule, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editingRule?.id || `rule-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      rule_type: formData.rule_type,
      severity: formData.severity,
      enabled: formData.enabled,
      parameters: formData.parameters,
    });
    onClose();
  };

  const updateParameter = (key: string, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, parameters: { ...prev.parameters, [key]: value } }));
  };

  const renderParameterInputs = () => {
    const inputClass = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all";
    const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1";
    const hintClass = "text-[10px] text-slate-600 mt-1";

    switch (formData.rule_type) {
      case 'import_restriction':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Forbidden Source (Regex)</label>
              <input type="text" className={inputClass} placeholder="/api/" value={formData.parameters.forbidden_source_pattern || ''} onChange={(e) => updateParameter('forbidden_source_pattern', e.target.value)} />
              <p className={hintClass}>Modules matching this cannot import</p>
            </div>
            <div>
              <label className={labelClass}>Forbidden Target (Regex)</label>
              <input type="text" className={inputClass} placeholder="/database/" value={formData.parameters.forbidden_target_pattern || ''} onChange={(e) => updateParameter('forbidden_target_pattern', e.target.value)} />
              <p className={hintClass}>Modules matching this cannot be imported</p>
            </div>
          </div>
        );
      case 'max_coupling':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Max Efferent</label>
              <input type="number" className={inputClass} placeholder="10" value={formData.parameters.max_efferent || ''} onChange={(e) => updateParameter('max_efferent', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Max Total (Opt)</label>
              <input type="number" className={inputClass} placeholder="20" value={formData.parameters.max_total || ''} onChange={(e) => updateParameter('max_total', e.target.value ? parseInt(e.target.value) : undefined)} />
            </div>
            <div className="col-span-full">
              <label className={labelClass}>Module Pattern (Opt)</label>
              <input type="text" className={inputClass} placeholder=".*" value={formData.parameters.module_pattern || ''} onChange={(e) => updateParameter('module_pattern', e.target.value)} />
            </div>
          </div>
        );
      case 'no_circular':
        return (
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-700">
            <span className="font-bold">Auto-Configured:</span> This rule automatically detects all circular dependencies. No parameters required.
          </div>
        );
      case 'max_third_party_percent':
        return (
          <div>
            <label className={labelClass}>Max Percentage (0-100)</label>
            <input type="number" className={inputClass} placeholder="20" min="0" max="100" value={formData.parameters.max_percent || ''} onChange={(e) => updateParameter('max_percent', parseInt(e.target.value) || 0)} />
          </div>
        );
      case 'max_depth':
        return (
          <div>
            <label className={labelClass}>Max Depth</label>
            <input type="number" className={inputClass} placeholder="5" min="1" value={formData.parameters.max_depth || ''} onChange={(e) => updateParameter('max_depth', parseInt(e.target.value) || 1)} />
          </div>
        );
      case 'max_complexity':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Max Cyclomatic</label>
              <input type="number" className={inputClass} placeholder="15" value={formData.parameters.max_cyclomatic || ''} onChange={(e) => updateParameter('max_cyclomatic', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Min Maintainability</label>
              <input type="number" className={inputClass} placeholder="20" value={formData.parameters.min_maintainability || ''} onChange={(e) => updateParameter('min_maintainability', e.target.value ? parseInt(e.target.value) : undefined)} />
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-none">
                {editingRule ? 'Configure Rule' : 'New Fitness Rule'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">Define architectural constraints</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close rule editor" title="Close" className="text-slate-600 hover:text-slate-700 hover:bg-slate-200 rounded p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Main Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Rule Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-teal-500 transition-all"
                  placeholder="e.g., API Isolation"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-teal-500 transition-all resize-none h-20"
                  placeholder="Describe the architectural constraint..."
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Rule Logic</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-teal-500 transition-all cursor-pointer"
                  value={formData.rule_type}
                  onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as RuleType, parameters: {} })}
                >
                  {ruleTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-600 mt-1 leading-tight">
                  {ruleTypeOptions.find(o => o.value === formData.rule_type)?.description}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Severity Level</label>
                <div className="flex gap-2">
                  {(['error', 'warning', 'info'] as Severity[]).map((sev) => (
                    <label key={sev} className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all
                      ${formData.severity === sev 
                        ? (sev === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : sev === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700') 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }
                    `}>
                      <input type="radio" name="severity" value={sev} checked={formData.severity === sev} onChange={(e) => setFormData({ ...formData, severity: e.target.value as Severity })} className="hidden" />
                      <span className="text-xs font-bold uppercase">{sev}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Parameters */}
            <div className="pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6 py-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Settings className="w-3 h-3 text-teal-600" /> Parameter Configuration
              </h3>
              {renderParameterInputs()}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-slate-700">Rule Active</span>
              </label>

              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-slate-900 hover:bg-teal-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                  Save Configuration
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};