import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
  MutableRefObject,
} from 'react';
import { Vector3 } from 'three';
import { DependencyGraph } from '@/types/graph';
import { GlobalMetrics } from '@/types/metrics';
import { useGraphStore } from '@/stores/graphStore';

// Layout types
export type LayoutType = 'hierarchical' | 'force' | 'circular';

// Visual modifiers for what-if scenarios
export interface VisualModifiers {
  removedNodeIds: string[];
  removedEdgeIds: string[];
  addedNodeIds: string[];
  addedEdgeIds: string[];
  highlightedNodeId: string | null;
  focusNodeId: string | null;
}

// Context value interface
export interface GraphContextValue {
  // Core data (reactive - changes trigger re-render)
  graph: DependencyGraph | null;
  metrics: GlobalMetrics | null;

  // Node positions stored in ref (mutations don't trigger re-render)
  nodePositionsRef: MutableRefObject<Map<string, Vector3>>;

  // Original positions for layout reset
  originalPositionsRef: MutableRefObject<Map<string, Vector3>>;

  // Selection state
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Layout
  layout: LayoutType;

  // Visual modifiers
  modifiers: VisualModifiers;

  // Flags
  disableImpactAnalysis: boolean;

  // Actions
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setLayout: (layout: LayoutType) => void;
  updateNodePosition: (id: string, x: number, y: number, z: number) => void;
  getNodePosition: (id: string) => Vector3 | undefined;

  // Callbacks
  onNodeDragEnd?: (nodeId: string, position: { x: number; y: number; z: number }) => void;
}

const GraphContext = createContext<GraphContextValue | null>(null);

// Provider props
interface GraphProviderProps {
  children: ReactNode;

  // Data
  graph: DependencyGraph | null;
  metrics?: GlobalMetrics | null;

  // Layout
  initialLayout?: LayoutType;

  // Visual modifiers
  removedNodeIds?: string[];
  removedEdgeIds?: string[];
  addedNodeIds?: string[];
  addedEdgeIds?: string[];
  highlightedNodeId?: string | null;
  focusNodeId?: string | null;

  // Flags
  disableImpactAnalysis?: boolean;

  // Callbacks
  onNodeDragEnd?: (nodeId: string, position: { x: number; y: number; z: number }) => void;
}

export const GraphProvider = ({
  children,
  graph,
  metrics = null,
  initialLayout = 'hierarchical',
  removedNodeIds = [],
  removedEdgeIds = [],
  addedNodeIds = [],
  addedEdgeIds = [],
  highlightedNodeId = null,
  focusNodeId = null,
  disableImpactAnalysis = false,
  onNodeDragEnd,
}: GraphProviderProps) => {
  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [layout, setLayoutState] = useState<LayoutType>(initialLayout);

  // Position refs - mutations don't trigger React re-renders
  const nodePositionsRef = useRef<Map<string, Vector3>>(new Map());
  const originalPositionsRef = useRef<Map<string, Vector3>>(new Map());

  // Track graph identity for position initialization
  const lastGraphIdRef = useRef<string | null>(null);

  // Initialize positions from graph nodes
  useEffect(() => {
    if (!graph) {
      nodePositionsRef.current.clear();
      originalPositionsRef.current.clear();
      lastGraphIdRef.current = null;
      return;
    }

    // Create a simple identity based on node count and first/last node ids
    const graphId = `${graph.nodes.length}-${graph.nodes[0]?.id}-${graph.nodes[graph.nodes.length - 1]?.id}`;

    // Only reinitialize if graph structure changed
    if (graphId === lastGraphIdRef.current) {
      return;
    }

    lastGraphIdRef.current = graphId;

    const positions = nodePositionsRef.current;
    const originals = originalPositionsRef.current;

    positions.clear();
    originals.clear();

    graph.nodes.forEach(node => {
      const pos = new Vector3(node.position.x, node.position.y, node.position.z);
      positions.set(node.id, pos.clone());
      originals.set(node.id, pos.clone());
    });
  }, [graph]);

  // Get store actions
  const setStoreSelectedNode = useGraphStore(state => state.setSelectedNode);

  // Actions
  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    // Sync to global store
    if (id && graph) {
      const node = graph.nodes.find(n => n.id === id);
      setStoreSelectedNode(node || null);
    } else {
      setStoreSelectedNode(null);
    }
  }, [graph, setStoreSelectedNode]);

  const hoverNode = useCallback((id: string | null) => {
    setHoveredNodeId(id);
  }, []);

  const setLayout = useCallback((newLayout: LayoutType) => {
    setLayoutState(newLayout);
  }, []);

  const updateNodePosition = useCallback((id: string, x: number, y: number, z: number) => {
    const positions = nodePositionsRef.current;
    let pos = positions.get(id);

    if (pos) {
      pos.set(x, y, z);
    } else {
      pos = new Vector3(x, y, z);
      positions.set(id, pos);
    }

    // Call external callback if provided
    if (onNodeDragEnd) {
      onNodeDragEnd(id, { x, y, z });
    }
  }, [onNodeDragEnd]);

  const getNodePosition = useCallback((id: string): Vector3 | undefined => {
    return nodePositionsRef.current.get(id);
  }, []);

  // Memoize modifiers to prevent unnecessary re-renders
  const modifiers = useMemo<VisualModifiers>(() => ({
    removedNodeIds,
    removedEdgeIds,
    addedNodeIds,
    addedEdgeIds,
    highlightedNodeId,
    focusNodeId,
  }), [removedNodeIds, removedEdgeIds, addedNodeIds, addedEdgeIds, highlightedNodeId, focusNodeId]);

  // Context value
  const value = useMemo<GraphContextValue>(() => ({
    graph,
    metrics,
    nodePositionsRef,
    originalPositionsRef,
    selectedNodeId,
    hoveredNodeId,
    layout,
    modifiers,
    disableImpactAnalysis,
    selectNode,
    hoverNode,
    setLayout,
    updateNodePosition,
    getNodePosition,
    onNodeDragEnd,
  }), [
    graph,
    metrics,
    selectedNodeId,
    hoveredNodeId,
    layout,
    modifiers,
    disableImpactAnalysis,
    selectNode,
    hoverNode,
    setLayout,
    updateNodePosition,
    getNodePosition,
    onNodeDragEnd,
  ]);

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
};

// Hook to access graph context
export const useGraphContext = (): GraphContextValue => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraphContext must be used within a GraphProvider');
  }
  return context;
};

// Convenience hook for just the graph data
export const useGraphData = () => {
  const { graph, metrics, nodePositionsRef, getNodePosition } = useGraphContext();
  return { graph, metrics, nodePositionsRef, getNodePosition };
};

// Convenience hook for selection state
export const useGraphSelection = () => {
  const { selectedNodeId, hoveredNodeId, selectNode, hoverNode } = useGraphContext();
  return { selectedNodeId, hoveredNodeId, selectNode, hoverNode };
};

// Convenience hook for visual modifiers
export const useGraphModifiers = () => {
  const { modifiers } = useGraphContext();
  return modifiers;
};

// Convenience hook for layout
export const useGraphLayout = () => {
  const { layout, setLayout, nodePositionsRef, originalPositionsRef, graph } = useGraphContext();
  return { layout, setLayout, nodePositionsRef, originalPositionsRef, graph };
};
