import { useEffect, useRef, useState } from 'react';
import { Scene } from './Scene';
import { LayoutSelector } from '../Graph3D/LayoutSelector';
import { NodeMetricsModal } from '../NodeMetricsModal/NodeMetricsModal';
import { ControlsLegend } from '../ControlsLegend/ControlsLegend';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { applyCircularLayout, applyForceDirectedLayout, resetToOriginalLayout } from '@/utils/layoutAlgorithms';
import { DependencyGraph } from '@/types/graph';

interface Graph3DProps {
  hideLayoutSelector?: boolean;
  customGraph?: DependencyGraph | null;
  disableImpactAnalysis?: boolean;
  hideClusterBoxes?: boolean;
  hideNodeMetrics?: boolean;
  hideControlsLegend?: boolean;
  nodeMetricsPosition?: 'fixed' | 'absolute';
  // Allow overriding layout from parent (optional, syncs with store if undefined)
  layout?: 'force' | 'hierarchical' | 'circular';
  selectedModule?: string | null;
  removedEdgeIds?: string[];
  removedNodeIds?: string[];
  addedNodeIds?: string[];
  addedEdgeIds?: string[];
  highlightedNodeId?: string | null;
  focusNodeId?: string | null;
  onNodeDragEnd?: (nodeId: string, position: { x: number; y: number; z: number }) => void;
}

export const Graph3D = ({
  hideLayoutSelector = false,
  customGraph,
  disableImpactAnalysis = false,
  hideClusterBoxes = false,
  hideNodeMetrics = false,
  hideControlsLegend = false,
  nodeMetricsPosition = 'fixed',
  layout: propLayout,
  removedEdgeIds,
  removedNodeIds,
  addedNodeIds,
  addedEdgeIds,
  highlightedNodeId,
  focusNodeId,
  onNodeDragEnd,
}: Graph3DProps) => {
  const { graph: storeGraph, setGraph } = useGraphStore();
  const { currentLayout: storeLayout } = useUIStore();

  // Use prop layout if provided (for RefactoringPage), otherwise store layout
  const activeLayout = propLayout || storeLayout;

  // Internal state to handle layout transformations without mutating props or global store
  const [activeGraph, setActiveGraph] = useState<DependencyGraph | null>(null);
  const originalNodesRef = useRef<any[]>([]);
  const isInitializedRef = useRef(false);

  // 1. Sync activeGraph from source (handle initialization and structural changes)
  useEffect(() => {
    const source = customGraph || storeGraph;
    if (!source) return;

    // Initial load - full sync
    if (!isInitializedRef.current) {
      if (customGraph) {
        originalNodesRef.current = JSON.parse(JSON.stringify(customGraph.nodes));
        setActiveGraph(JSON.parse(JSON.stringify(customGraph)));
      } else if (storeGraph) {
        originalNodesRef.current = JSON.parse(JSON.stringify(storeGraph.nodes));
        setActiveGraph(JSON.parse(JSON.stringify(storeGraph)));
      }
      isInitializedRef.current = true;
      return;
    }

    // After initialization, sync structural changes (added/removed nodes and edges)
    if (customGraph) {
      setActiveGraph(prev => {
        if (!prev) return JSON.parse(JSON.stringify(customGraph));

        // Detect added/removed nodes
        const prevNodeIds = new Set(prev.nodes.map(n => n.id));
        const customNodeIds = new Set(customGraph.nodes.map(n => n.id));

        // Find added nodes
        const addedNodes = customGraph.nodes.filter(n => !prevNodeIds.has(n.id));

        // Find removed nodes
        const removedNodeIds = prev.nodes.filter(n => !customNodeIds.has(n.id)).map(n => n.id);

        // Update nodes: keep existing (with their layout positions), add new, remove deleted
        let updatedNodes = prev.nodes.filter(n => !removedNodeIds.includes(n.id));
        updatedNodes = [...updatedNodes, ...addedNodes];

        // Always sync edges from customGraph (they don't have positions to preserve)
        const updatedEdges = customGraph.edges;

        return { ...prev, nodes: updatedNodes, edges: updatedEdges };
      });
    }
  }, [customGraph, storeGraph]);

  // 2. Apply Layout Algorithms
  // This effect only runs when layout changes, NOT when graph data changes
  useEffect(() => {
    if (!activeGraph || activeGraph.nodes.length === 0) return;

    // Clone to avoid mutation
    let updatedNodes = JSON.parse(JSON.stringify(activeGraph.nodes));
    const edges = activeGraph.edges;

    switch (activeLayout) {
      case 'circular':
        updatedNodes = applyCircularLayout(updatedNodes);
        break;
      case 'force':
        updatedNodes = applyForceDirectedLayout(updatedNodes, edges);
        break;
      case 'hierarchical':
        updatedNodes = resetToOriginalLayout(updatedNodes, originalNodesRef.current);
        break;
    }

    // Update activeGraph with layout-transformed nodes
    setActiveGraph(prev => prev ? { ...prev, nodes: updatedNodes } : null);
  }, [activeLayout]); // Only re-run when layout type changes

  // 3. Handle node drag - update activeGraph directly
  const handleNodeDrag = (nodeId: string, position: { x: number; y: number; z: number }) => {
    // Update activeGraph immediately
    setActiveGraph(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n =>
          n.id === nodeId ? { ...n, position } : n
        )
      };
    });

    // Also call the prop callback if provided (for RefactoringPage metrics)
    if (onNodeDragEnd) {
      onNodeDragEnd(nodeId, position);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-50">

      {/* 3D Scene */}
      <Scene
        customGraph={activeGraph} // Pass the processed graph with layout applied
        disableImpactAnalysis={disableImpactAnalysis}
        hideClusterBoxes={hideClusterBoxes}
        removedEdgeIds={removedEdgeIds}
        removedNodeIds={removedNodeIds}
        addedNodeIds={addedNodeIds}
        addedEdgeIds={addedEdgeIds}
        highlightedNodeId={highlightedNodeId}
        focusNodeId={focusNodeId}
        onNodeDragEnd={handleNodeDrag}
      />

      {/* Overlays */}
      {!hideNodeMetrics && (
        <div className="absolute top-4 left-4 z-10">
          <NodeMetricsModal position={nodeMetricsPosition} />
        </div>
      )}

      {/*
        Updated Layout Selector
        - Passes customGraph so the dropdown knows what modules to list
        - Passes className for default positioning (since component is now reusable)
      */}
      {!hideLayoutSelector && (
        <LayoutSelector
          customGraph={customGraph}
          className="fixed top-20 right-6 z-40"
        />
      )}

      {!hideControlsLegend && (
        <div className="absolute bottom-4 left-4 z-10">
          <ControlsLegend />
        </div>
      )}
    </div>
  );
};