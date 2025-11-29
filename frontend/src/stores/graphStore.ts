import { create } from 'zustand';
import { DependencyGraph, Node, Edge } from '@/types/graph';
import { GlobalMetrics, ImpactAnalysis } from '@/types/metrics';
import { AnalysisSource } from '@/types/fitness';

interface GraphState {
  graph: DependencyGraph | null;
  globalMetrics: GlobalMetrics | null;
  warnings: string[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  hoveredNode: Node | null;
  impactAnalysis: ImpactAnalysis | null;
  analysisSource: AnalysisSource | null;

  setGraph: (graph: DependencyGraph) => void;
  setGlobalMetrics: (metrics: GlobalMetrics) => void;
  setWarnings: (warnings: string[]) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  setHoveredNode: (node: Node | null) => void;
  setImpactAnalysis: (impact: ImpactAnalysis | null) => void;
  setAnalysisSource: (source: AnalysisSource) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number; z: number }) => void;
  updateNodePositions: (updates: Array<{ nodeId: string; position: { x: number; y: number; z: number } }>) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graph: null,
  globalMetrics: null,
  warnings: [],
  selectedNode: null,
  selectedEdge: null,
  hoveredNode: null,
  impactAnalysis: null,
  analysisSource: null,

  setGraph: (graph) => set({ graph }),
  setGlobalMetrics: (globalMetrics) => set({ globalMetrics }),
  setWarnings: (warnings) => set({ warnings }),
  setSelectedNode: (selectedNode) => set({ selectedNode, selectedEdge: null, impactAnalysis: selectedNode ? undefined : null }),
  setSelectedEdge: (selectedEdge) => set({ selectedEdge, selectedNode: null, impactAnalysis: null }),
  setHoveredNode: (hoveredNode) => set({ hoveredNode }),
  setImpactAnalysis: (impactAnalysis) => set({ impactAnalysis }),
  setAnalysisSource: (analysisSource) => set({ analysisSource }),

  updateNodePosition: (nodeId, position) => set((state) => {
    if (!state.graph) return state;
    return {
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((node) =>
          node.id === nodeId ? { ...node, position } : node
        ),
      },
    };
  }),

  updateNodePositions: (updates) => set((state) => {
    if (!state.graph) return state;
    const updateMap = new Map(updates.map(u => [u.nodeId, u.position]));
    return {
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((node) => {
          const newPosition = updateMap.get(node.id);
          return newPosition ? { ...node, position: newPosition } : node;
        }),
      },
    };
  }),

  reset: () => set({
    graph: null,
    globalMetrics: null,
    warnings: [],
    selectedNode: null,
    selectedEdge: null,
    hoveredNode: null,
    impactAnalysis: null,
    analysisSource: null,
  }),
}));
