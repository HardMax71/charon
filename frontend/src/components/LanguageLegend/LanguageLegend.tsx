import { useMemo, useState, useEffect, useRef } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { Layers, ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  LANGUAGE_COLORS,
  LANGUAGE_LABELS,
  STATUS_COLORS,
  THIRD_PARTY_COLOR,
} from '@/utils/constants';
import { Language } from '@/types/graph';

interface LanguageLegendItemProps {
  color: string;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

const LanguageLegendItem = ({ color, label, count, isActive, onClick }: LanguageLegendItemProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded transition-all cursor-pointer ${
      isActive
        ? 'bg-slate-100 ring-2 ring-slate-400 ring-offset-1'
        : 'hover:bg-slate-50'
    }`}
  >
    <div
      className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
      style={{ backgroundColor: color }}
    />
    <span className="text-xs text-slate-700 flex-grow text-left">{label}</span>
    <span className="text-xs text-slate-600 font-mono">{count}</span>
  </button>
);

interface StatusLegendItemProps {
  color: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  clickable?: boolean;
}

const StatusLegendItem = ({ color, label, isActive, onClick, clickable = true }: StatusLegendItemProps) => {
  const content = (
    <>
      {/* Ring indicator to match 3D visualization */}
      <div
        className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ border: `2.5px solid ${color}` }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      </div>
      <span className="text-xs text-slate-600">{label}</span>
    </>
  );

  if (!clickable || !onClick) {
    return <div className="flex items-center gap-2 px-2 py-1 opacity-50">{content}</div>;
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1 w-full rounded transition-all cursor-pointer ${
        isActive
          ? 'bg-slate-100 ring-2 ring-slate-400 ring-offset-1'
          : 'hover:bg-slate-50'
      }`}
    >
      {content}
    </button>
  );
};

interface ServiceLegendItemProps {
  service: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

const ServiceLegendItem = ({ service, count, isActive, onClick }: ServiceLegendItemProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-2 py-1 w-full rounded transition-all cursor-pointer ${
      isActive
        ? 'bg-slate-100 ring-2 ring-slate-400 ring-offset-1'
        : 'hover:bg-slate-50'
    }`}
  >
    <span className="text-xs text-slate-600 flex-grow truncate text-left" title={service}>
      {service}
    </span>
    <span className="text-xs text-slate-600 font-mono">{count}</span>
  </button>
);

export const LanguageLegend = () => {
  const nodes = useGraphStore(state => state.graph?.nodes);
  const selectedNode = useGraphStore(state => state.selectedNode);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter state from UI store
  const graphFilters = useUIStore(state => state.graphFilters);
  const toggleLanguageFilter = useUIStore(state => state.toggleLanguageFilter);
  const toggleServiceFilter = useUIStore(state => state.toggleServiceFilter);
  const toggleStatusFilter = useUIStore(state => state.toggleStatusFilter);
  const toggleThirdPartyFilter = useUIStore(state => state.toggleThirdPartyFilter);
  const clearAllFilters = useUIStore(state => state.clearAllFilters);
  const hasActiveFilters = useUIStore(state => state.hasActiveFilters);

  // Track previous selection state to detect changes
  const prevSelectedRef = useRef<boolean>(false);

  // Auto-collapse when node selected, auto-expand when deselected
  useEffect(() => {
    const wasSelected = prevSelectedRef.current;
    const isNowSelected = selectedNode !== null;

    if (!wasSelected && isNowSelected) {
      setIsExpanded(false);
    } else if (wasSelected && !isNowSelected) {
      setIsExpanded(true);
    }

    prevSelectedRef.current = isNowSelected;
  }, [selectedNode]);

  // Calculate stats from nodes
  const stats = useMemo(() => {
    const byLanguage: Record<string, number> = {};
    const byService: Record<string, number> = {};
    const byStatus = {
      hotZone: 0,
      circular: 0,
      highCoupling: 0,
    };
    let thirdPartyCount = 0;

    if (!nodes || nodes.length === 0) {
      return { byLanguage, byService, byStatus, thirdPartyCount };
    }

    for (const node of nodes) {
      if (node.type === 'third_party') {
        thirdPartyCount++;
        continue;
      }

      const lang = node.language || 'unknown';
      byLanguage[lang] = (byLanguage[lang] || 0) + 1;

      if (node.service) {
        byService[node.service] = (byService[node.service] || 0) + 1;
      }

      if (node.metrics.is_hot_zone) byStatus.hotZone++;
      if (node.metrics.is_circular) byStatus.circular++;
      if (node.metrics.is_high_coupling) byStatus.highCoupling++;
    }

    return { byLanguage, byService, byStatus, thirdPartyCount };
  }, [nodes]);

  const activeLanguages = Object.entries(stats.byLanguage)
    .filter(([lang]) => lang !== 'unknown' && lang in LANGUAGE_COLORS)
    .sort((a, b) => b[1] - a[1]);

  const activeServices = Object.entries(stats.byService)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!nodes || nodes.length === 0) return null;

  const filtersActive = hasActiveFilters();

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden w-[220px] transition-all duration-200">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-slate-50 px-3 py-2 flex items-center justify-between select-none hover:bg-slate-100 transition-colors ${
          isExpanded ? 'border-b border-slate-200' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 panel-title-icon" />
          <span className="panel-title">Legend</span>
          {filtersActive && (
            <span className="w-2 h-2 rounded-full bg-teal-500" title="Filters active" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
        )}
      </button>

      {isExpanded && (
        <div className="p-2 space-y-3">
          {/* Clear filters button */}
          {filtersActive && (
            <button
              onClick={clearAllFilters}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
            >
              <X className="w-3 h-3" />
              Clear all filters
            </button>
          )}

          {/* Languages Section */}
          {activeLanguages.length > 0 && (
            <div>
              <div className="section-label px-2 mb-1">
                Languages
              </div>
              <div className="space-y-0.5">
                {activeLanguages.map(([lang, count]) => (
                  <LanguageLegendItem
                    key={lang}
                    color={LANGUAGE_COLORS[lang as Language] || '#F97316'}
                    label={LANGUAGE_LABELS[lang as Language] || lang}
                    count={count}
                    isActive={graphFilters.languages.includes(lang as Language)}
                    onClick={() => toggleLanguageFilter(lang as Language)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Status Rings Section - only show if there are problematic nodes */}
          {(stats.byStatus.hotZone > 0 || stats.byStatus.circular > 0 || stats.byStatus.highCoupling > 0) && (
          <div>
            <div className="section-label px-2 mb-1">
              Status Rings
            </div>
            <div className="space-y-0.5">
              {stats.byStatus.hotZone > 0 && (
                <StatusLegendItem
                  color={STATUS_COLORS.hot_critical}
                  label={`Hot Zone (${stats.byStatus.hotZone})`}
                  isActive={graphFilters.statuses.includes('hotZone')}
                  onClick={() => toggleStatusFilter('hotZone')}
                />
              )}
              {stats.byStatus.circular > 0 && (
                <StatusLegendItem
                  color={STATUS_COLORS.circular}
                  label={`Circular (${stats.byStatus.circular})`}
                  isActive={graphFilters.statuses.includes('circular')}
                  onClick={() => toggleStatusFilter('circular')}
                />
              )}
              {stats.byStatus.highCoupling > 0 && (
                <StatusLegendItem
                  color={STATUS_COLORS.high_coupling}
                  label={`High Coupling (${stats.byStatus.highCoupling})`}
                  isActive={graphFilters.statuses.includes('highCoupling')}
                  onClick={() => toggleStatusFilter('highCoupling')}
                />
              )}
            </div>
          </div>
          )}

          {/* Services Section */}
          {activeServices.length > 0 && (
            <div>
              <div className="section-label px-2 mb-1">
                Services
              </div>
              <div className="space-y-0.5">
                {activeServices.map(([service, count]) => (
                  <ServiceLegendItem
                    key={service}
                    service={service}
                    count={count}
                    isActive={graphFilters.services.includes(service)}
                    onClick={() => toggleServiceFilter(service)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Third Party */}
          {stats.thirdPartyCount > 0 && (
            <div>
              <div className="section-label px-2 mb-1">
                Dependencies
              </div>
              <button
                onClick={toggleThirdPartyFilter}
                className={`flex items-center gap-2 px-2 py-1 w-full rounded transition-all cursor-pointer ${
                  graphFilters.thirdPartyOnly
                    ? 'bg-slate-100 ring-2 ring-slate-400 ring-offset-1'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: THIRD_PARTY_COLOR }}
                />
                <span className="text-xs text-slate-600 flex-grow text-left">Third Party</span>
                <span className="text-xs text-slate-600 font-mono">{stats.thirdPartyCount}</span>
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="border-t border-slate-100 pt-2 px-2">
            <div className="caption text-center">
              {nodes.length} total nodes
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
