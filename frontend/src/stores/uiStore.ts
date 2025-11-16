import { create } from 'zustand';

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
}

export const useUIStore = create<UIState>((set) => ({
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
  layoutSelectorExpanded: true,
  controlsLegendExpanded: true,

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
}));
