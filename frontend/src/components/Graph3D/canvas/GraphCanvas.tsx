import { memo, ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGraphContext } from '../context/GraphContext';
import { SceneSetup } from './SceneSetup';
import { InstancedNodes } from './InstancedNodes';
import { StatusRings } from './StatusRings';
import { BatchedEdges } from './BatchedEdges';
import { SelectionOverlay } from './SelectionOverlay';
import { NodeInteractionLayer } from './NodeInteractionLayer';
import { ClusterBoxes } from './ClusterBoxes';
import { useUIStore } from '@/stores/uiStore';

interface GraphCanvasProps {
  children?: ReactNode;
  hideClusterBoxes?: boolean;
}

/**
 * The 3D canvas component containing all graph visualization
 */
export const GraphCanvas = memo(({ children, hideClusterBoxes = false }: GraphCanvasProps) => {
  const { graph } = useGraphContext();
  const isDraggingNode = useUIStore(state => state.isDraggingNode);

  if (!graph) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-600 font-mono text-sm">
        No graph data
      </div>
    );
  }

  return (
    <Canvas
      className="w-full h-full"
      shadows={false}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
      }}
      onCreated={({ gl }) => {
        const context = gl.getContext();
        context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false);
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      }}
    >
      <Suspense fallback={null}>
        {/* Scene setup: camera, lights, controls */}
        <SceneSetup controlsDisabled={isDraggingNode} />

        {/* Graph elements */}
        <group position={[0, 0, 0]}>
          {!hideClusterBoxes && <ClusterBoxes />}

          {/* Batched edges (single draw call) */}
          <BatchedEdges edges={graph.edges} nodes={graph.nodes} />

          {/* Instanced nodes (single draw call) */}
          <InstancedNodes nodes={graph.nodes} />

          {/* Status rings for hot zones, circular deps, high coupling */}
          <StatusRings nodes={graph.nodes} />

          {/* Selection/highlight overlay (0-2 meshes) */}
          <SelectionOverlay nodes={graph.nodes} />

          {/* Invisible interaction layer for clicks/hovers */}
          <NodeInteractionLayer nodes={graph.nodes} />
        </group>

        {/* Additional children (custom elements) */}
        {children}
      </Suspense>
    </Canvas>
  );
});

GraphCanvas.displayName = 'GraphCanvas';
