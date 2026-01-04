import { FitnessRule, Severity } from '@/types/fitness';
import { Trash2, Power, Edit2, Settings, Activity, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface FitnessRuleCardProps {
  rule: FitnessRule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (rule: FitnessRule) => void;
}

const severityConfig: Record<Severity, { border: string; badge: string; icon: React.ElementType }> = {
  error: {
    border: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: AlertCircle
  },
  warning: {
    border: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertTriangle
  },
  info: {
    border: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Info
  },
};

const ruleTypeLabels: Record<string, string> = {
  import_restriction: 'Import Restriction',
  max_coupling: 'Max Coupling',
  no_circular: 'No Circular Deps',
  max_third_party_percent: '3rd Party Limit',
  max_depth: 'Max Depth',
  max_complexity: 'Max Complexity',
};

export const FitnessRuleCard = ({ rule, onToggle, onDelete, onEdit }: FitnessRuleCardProps) => {
  const config = severityConfig[rule.severity];
  const SeverityIcon = config.icon;

  return (
    <div
      className={`
        group relative bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-200
        ${rule.enabled ? 'shadow-sm hover:shadow-md hover:border-slate-300' : 'opacity-60 grayscale bg-slate-50'}
      `}
    >
      {/* Status Strip (Left Border) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${rule.enabled ? config.border : 'bg-slate-300'}`} />

      <div className="p-4 pl-5">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">

            {/* Badges Row */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`
                flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium uppercase
                ${rule.enabled ? config.badge : 'bg-slate-100 text-slate-600 border-slate-200'}
              `}>
                <SeverityIcon className="w-3 h-3" />
                {rule.severity}
              </span>

              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border bg-slate-50 border-slate-200 text-slate-500 text-xs font-medium">
                <Activity className="w-3 h-3" />
                {ruleTypeLabels[rule.rule_type] || rule.rule_type}
              </span>
            </div>

            <h3 className={`text-sm font-semibold truncate ${rule.enabled ? 'text-slate-900' : 'text-slate-600'}`}>
              {rule.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              {rule.description}
            </p>
          </div>

          {/* Actions Toolbar */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
            <ActionButton
              onClick={() => onToggle(rule.id)}
              active={rule.enabled}
              activeColor="text-teal-600 bg-white shadow-sm"
              icon={Power}
              title={rule.enabled ? "Disable Rule" : "Enable Rule"}
            />
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <ActionButton
              onClick={() => onEdit(rule)}
              icon={Edit2}
              title="Edit Configuration"
            />
            <ActionButton
              onClick={() => onDelete(rule.id)}
              hoverColor="hover:text-rose-600 hover:bg-rose-50"
              icon={Trash2}
              title="Delete Rule"
            />
          </div>
        </div>

        {/* Parameters Grid */}
        {Object.keys(rule.parameters).length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(rule.parameters).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs"
                >
                  <span className="text-slate-500 mr-1.5">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* --- SUB-COMPONENT: Action Button --- */
interface ActionButtonProps {
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  active?: boolean;
  activeColor?: string;
  hoverColor?: string;
}

const ActionButton = ({
  onClick,
  icon: Icon,
  title,
  active,
  activeColor = "",
  hoverColor = "hover:text-slate-900 hover:bg-white hover:shadow-sm"
}: ActionButtonProps) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    aria-label={title}
    title={title}
    className={`
      p-1.5 rounded-md transition-all duration-200
      ${active
        ? activeColor
        : `text-slate-600 ${hoverColor}`
      }
    `}
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);