/**
 * Graph3D - Refactored implementation
 *
 * This component provides backward compatibility with the old API while
 * using the new architecture internally.
 *
 * New architecture features:
 * - Single source of truth (GraphContext)
 * - Ref-based position updates (no re-renders on drag)
 * - Shared geometry for better performance
 * - Composition-based overlays (children slots)
 */

import { memo, ReactNode, useEffect } from 'react';
import { DependencyGraph } from '@/types/graph';
import { GlobalMetrics } from '@/types/metrics';
import { GraphProvider, LayoutType } from './context/GraphContext';
import { GraphCanvas } from './canvas/GraphCanvas';
import { useLayoutEngine } from './hooks/useLayoutEngine';
import { useUIStore } from '@/stores/uiStore';
import { useGraphStore } from '@/stores/graphStore';
import { LayoutSelector } from './LayoutSelector';
import { NodeMetricsModal } from '../NodeMetricsModal/NodeMetricsModal';
import { ControlsLegend } from '../ControlsLegend/ControlsLegend';

// Legacy props interface (backward compatible)
interface Graph3DProps {
  // Hide flags (legacy - prefer using children slots)
  hideLayoutSelector?: boolean;
  hideNodeMetrics?: boolean;
  hideControlsLegend?: boolean;
  hideClusterBoxes?: boolean;

  // Data
  customGraph?: DependencyGraph | null;
  customMetrics?: GlobalMetrics | null;

  // Behavior
  disableImpactAnalysis?: boolean;
  nodeMetricsPosition?: 'fixed' | 'absolute';

  // Layout
  layout?: LayoutType;

  // Visual modifiers
  removedEdgeIds?: string[];
  removedNodeIds?: string[];
  addedNodeIds?: string[];
  addedEdgeIds?: string[];
  highlightedNodeId?: string | null;
  focusNodeId?: string | null;

  // Callbacks
  onNodeDragEnd?: (nodeId: string, position: { x: number; y: number; z: number }) => void;

  // New: children slots for overlays
  children?: ReactNode;
}

/**
 * Layout sync component
 */
const LayoutSync = memo(({ layout: propLayout }: { layout?: LayoutType }) => {
  const storeLayout = useUIStore(state => state.currentLayout);
  const { applyLayout } = useLayoutEngine();

  const activeLayout = propLayout ?? storeLayout;

  // Apply layout on mount and when it changes
  // Using useEffect would cause issues, so we call directly
  if (activeLayout) {
    // Schedule layout application after render
    queueMicrotask(() => applyLayout(activeLayout));
  }

  return null;
});

LayoutSync.displayName = 'LayoutSync';

/**
 * Graph3D component with backward-compatible API
 */
export const Graph3D = memo(({
  // Legacy hide flags
  hideLayoutSelector = false,
  hideNodeMetrics = false,
  hideControlsLegend = false,
  hideClusterBoxes = false,

  // Data
  customGraph,
  customMetrics,

  // Behavior
  disableImpactAnalysis = false,
  nodeMetricsPosition = 'fixed',

  // Layout
  layout,

  // Visual modifiers
  removedEdgeIds = [],
  removedNodeIds = [],
  addedNodeIds = [],
  addedEdgeIds = [],
  highlightedNodeId = null,
  focusNodeId = null,

  // Callbacks
  onNodeDragEnd,

  // Children slots
  children,
}: Graph3DProps) => {
  // Fall back to store if no props provided
  const storeGraph = useGraphStore(state => state.graph);
  const storeMetrics = useGraphStore(state => state.globalMetrics);
  const setGraph = useGraphStore(state => state.setGraph);

  const graph = customGraph ?? storeGraph;
  const metrics = customMetrics ?? storeMetrics;

  // Sync custom graph to store so DependencyModal can access it
  // Only sync once when store is empty (avoid constant updates in RefactoringPage)
  useEffect(() => {
    if (customGraph && !storeGraph) {
      setGraph(customGraph);
    }
  }, [customGraph, storeGraph, setGraph]);

  return (
    <div className="relative w-full h-full bg-slate-50">
      <GraphProvider
        graph={graph}
        metrics={metrics}
        removedNodeIds={removedNodeIds}
        removedEdgeIds={removedEdgeIds}
        addedNodeIds={addedNodeIds}
        addedEdgeIds={addedEdgeIds}
        highlightedNodeId={highlightedNodeId}
        focusNodeId={focusNodeId}
        disableImpactAnalysis={disableImpactAnalysis}
        onNodeDragEnd={onNodeDragEnd}
      >
        {/* Layout engine sync */}
        <LayoutSync layout={layout} />

        {/* 3D Canvas */}
        <GraphCanvas hideClusterBoxes={hideClusterBoxes} />

        {/* Legacy overlays (controlled by hide* props) */}
        {!hideNodeMetrics && (
          <div className="absolute top-4 left-4 z-10">
            <NodeMetricsModal position={nodeMetricsPosition} />
          </div>
        )}

        {!hideLayoutSelector && (
          <LayoutSelector
            customGraph={customGraph}
            customMetrics={customMetrics}
            className="fixed top-20 right-6 z-40"
          />
        )}

        {!hideControlsLegend && (
          <div className="absolute bottom-4 left-4 z-10">
            <ControlsLegend />
          </div>
        )}

        {/* New: children slots for custom overlays */}
        {children}
      </GraphProvider>
    </div>
  );
});

Graph3D.displayName = 'Graph3D';

export default Graph3D;
