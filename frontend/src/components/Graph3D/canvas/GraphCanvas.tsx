import { memo, ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGraphContext } from '../context/GraphContext';
import { SceneSetup } from './SceneSetup';
import { NodeGroup } from './NodeMesh';
import { EdgeGroup } from './EdgeMesh';
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
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        // Disable problematic pixel storage options that trigger Firefox warnings
        // These are deprecated for non-DOM-Element uploads
        premultipliedAlpha: false,
      }}
      onCreated={({ gl }) => {
        // Disable deprecated pixel store settings to avoid Firefox warnings
        // gl is Three.js WebGLRenderer, need to access raw WebGL context
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
          {/* Cluster bounding boxes */}
          {!hideClusterBoxes && <ClusterBoxes />}

          {/* Edges (rendered first, behind nodes) */}
          <EdgeGroup edges={graph.edges} nodes={graph.nodes} />

          {/* Nodes */}
          <NodeGroup nodes={graph.nodes} />
        </group>

        {/* Additional children (custom elements) */}
        {children}
      </Suspense>
    </Canvas>
  );
});

GraphCanvas.displayName = 'GraphCanvas';
