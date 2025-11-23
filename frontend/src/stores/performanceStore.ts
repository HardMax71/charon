import { create } from 'zustand';
import {
  PerformanceAnalysisResult,
  PerformanceBottleneck,
  PriorityWeights,
  DEFAULT_PRIORITY_WEIGHTS,
} from '@/types/performance';

interface PerformanceState {
  // Performance analysis data
  analysis: PerformanceAnalysisResult | null;
  isLoading: boolean;
  error: string | null;

  // UI state
  showPerformanceOverlay: boolean;
  selectedBottleneck: PerformanceBottleneck | null;
  customWeights: PriorityWeights;

  // Actions
  setAnalysis: (analysis: PerformanceAnalysisResult | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setShowPerformanceOverlay: (show: boolean) => void;
  setSelectedBottleneck: (bottleneck: PerformanceBottleneck | null) => void;
  setCustomWeights: (weights: PriorityWeights) => void;
  reset: () => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
  // Initial state
  analysis: null,
  isLoading: false,
  error: null,
  showPerformanceOverlay: false,
  selectedBottleneck: null,
  customWeights: DEFAULT_PRIORITY_WEIGHTS,

  // Actions
  setAnalysis: (analysis) => set({ analysis, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setShowPerformanceOverlay: (showPerformanceOverlay) => set({ showPerformanceOverlay }),
  setSelectedBottleneck: (selectedBottleneck) => set({ selectedBottleneck }),
  setCustomWeights: (customWeights) => set({ customWeights }),

  reset: () =>
    set({
      analysis: null,
      isLoading: false,
      error: null,
      showPerformanceOverlay: false,
      selectedBottleneck: null,
      customWeights: DEFAULT_PRIORITY_WEIGHTS,
    }),
}));
