// Main component
export { Graph3D, default } from './Graph3D';

// Context and hooks
export {
  GraphProvider,
  useGraphContext,
  useGraphData,
  useGraphSelection,
  useGraphModifiers,
  useGraphLayout,
} from './context/GraphContext';

export type { LayoutType, GraphContextValue, VisualModifiers } from './context/GraphContext';

// Hooks
export { useLayoutEngine } from './hooks/useLayoutEngine';
export { useNodeDrag } from './hooks/useNodeDrag';

// Canvas components (for advanced customization)
export { GraphCanvas } from './canvas/GraphCanvas';
export { SceneSetup } from './canvas/SceneSetup';
export { NodeMesh, NodeGroup } from './canvas/NodeMesh';
export { EdgeGroup } from './canvas/EdgeMesh';
export { ClusterBoxes } from './canvas/ClusterBoxes';

// Legacy export for backward compatibility during migration
export { LayoutSelector } from './LayoutSelector';
