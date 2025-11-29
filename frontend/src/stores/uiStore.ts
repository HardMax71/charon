import { create } from 'zustand';
import { Language } from '@/types/graph';

// Graph highlight/filter state
export type StatusFilter = 'hotZone' | 'circular' | 'highCoupling';

export interface GraphFilters {
  languages: Language[];
  services: string[];
  statuses: StatusFilter[];
  thirdPartyOnly: boolean;
}

interface UIState {
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  activeMetricsTab: 'global' | 'entity';
  showDependencyModal: boolean;
  showNodeMetricsModal: boolean;
  showFilterPanel: boolean;
  showClusterModal: boolean;
  showImpactModal: boolean;
  currentLayout: 'hierarchical' | 'force' | 'circular';
  selectedModule: string | null;
  isDraggingNode: boolean;
  showClusters: boolean;
  metricsPanelHeight: number;
  layoutSelectorExpanded: boolean;
  controlsLegendExpanded: boolean;

  // Graph highlight filters
  graphFilters: GraphFilters;

  setLoading: (isLoading: boolean) => void;
  setLoadingProgress: (progress: number, message: string) => void;
  setActiveMetricsTab: (tab: 'global' | 'entity') => void;
  setShowDependencyModal: (show: boolean) => void;
  setShowNodeMetricsModal: (show: boolean) => void;
  setShowFilterPanel: (show: boolean) => void;
  setShowClusterModal: (show: boolean) => void;
  setShowImpactModal: (show: boolean) => void;
  setCurrentLayout: (layout: 'hierarchical' | 'force' | 'circular') => void;
  setSelectedModule: (module: string | null) => void;
  setIsDraggingNode: (isDragging: boolean) => void;
  setShowClusters: (show: boolean) => void;
  setMetricsPanelHeight: (height: number) => void;
  setLayoutSelectorExpanded: (expanded: boolean) => void;
  setControlsLegendExpanded: (expanded: boolean) => void;

  // Graph filter actions
  toggleLanguageFilter: (language: Language) => void;
  toggleServiceFilter: (service: string) => void;
  toggleStatusFilter: (status: StatusFilter) => void;
  toggleThirdPartyFilter: () => void;
  clearAllFilters: () => void;
  hasActiveFilters: () => boolean;
}

const emptyFilters: GraphFilters = {
  languages: [],
  services: [],
  statuses: [],
  thirdPartyOnly: false,
};

export const useUIStore = create<UIState>((set, get) => ({
  isLoading: false,
  loadingProgress: 0,
  loadingMessage: '',
  activeMetricsTab: 'global',
  showDependencyModal: false,
  showNodeMetricsModal: false,
  showFilterPanel: false,
  showClusterModal: false,
  showImpactModal: false,
  currentLayout: 'hierarchical',
  selectedModule: null,
  isDraggingNode: false,
  showClusters: false,
  metricsPanelHeight: 300,
  layoutSelectorExpanded: false,
  controlsLegendExpanded: false,
  graphFilters: { ...emptyFilters },

  setLoading: (isLoading) => set({ isLoading }),
  setLoadingProgress: (loadingProgress, loadingMessage) => set({ loadingProgress, loadingMessage }),
  setActiveMetricsTab: (activeMetricsTab) => set({ activeMetricsTab }),
  setShowDependencyModal: (showDependencyModal) => set({ showDependencyModal }),
  setShowNodeMetricsModal: (showNodeMetricsModal) => set({ showNodeMetricsModal }),
  setShowFilterPanel: (showFilterPanel) => set({ showFilterPanel }),
  setShowClusterModal: (showClusterModal) => set({ showClusterModal }),
  setShowImpactModal: (showImpactModal) => set({ showImpactModal }),
  setCurrentLayout: (currentLayout) => set({ currentLayout }),
  setSelectedModule: (selectedModule) => set({ selectedModule }),
  setIsDraggingNode: (isDraggingNode) => set({ isDraggingNode }),
  setShowClusters: (showClusters) => set({ showClusters }),
  setMetricsPanelHeight: (metricsPanelHeight) => set({ metricsPanelHeight }),
  setLayoutSelectorExpanded: (layoutSelectorExpanded) => set({ layoutSelectorExpanded }),
  setControlsLegendExpanded: (controlsLegendExpanded) => set({ controlsLegendExpanded }),

  // Graph filter actions
  toggleLanguageFilter: (language) => set((state) => {
    const languages = state.graphFilters.languages.includes(language)
      ? state.graphFilters.languages.filter(l => l !== language)
      : [...state.graphFilters.languages, language];
    return { graphFilters: { ...state.graphFilters, languages } };
  }),

  toggleServiceFilter: (service) => set((state) => {
    const services = state.graphFilters.services.includes(service)
      ? state.graphFilters.services.filter(s => s !== service)
      : [...state.graphFilters.services, service];
    return { graphFilters: { ...state.graphFilters, services } };
  }),

  toggleStatusFilter: (status) => set((state) => {
    const statuses = state.graphFilters.statuses.includes(status)
      ? state.graphFilters.statuses.filter(s => s !== status)
      : [...state.graphFilters.statuses, status];
    return { graphFilters: { ...state.graphFilters, statuses } };
  }),

  toggleThirdPartyFilter: () => set((state) => ({
    graphFilters: { ...state.graphFilters, thirdPartyOnly: !state.graphFilters.thirdPartyOnly }
  })),

  clearAllFilters: () => set({ graphFilters: { ...emptyFilters } }),

  hasActiveFilters: () => {
    const { graphFilters } = get();
    return (
      graphFilters.languages.length > 0 ||
      graphFilters.services.length > 0 ||
      graphFilters.statuses.length > 0 ||
      graphFilters.thirdPartyOnly
    );
  },
}));
