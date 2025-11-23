import { useEffect, useRef, memo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Vector3 } from 'three';
import { Node } from './Node';
import { Edge } from './Edge';
import { ClusterBoundingBoxes } from './ClusterBoundingBoxes';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { analyzeImpact } from '@/services/api';
import { logger } from '@/utils/logger';
import { DependencyGraph } from '@/types/graph';

interface SceneProps {
  customGraph?: DependencyGraph;
  disableImpactAnalysis?: boolean;
  hideClusterBoxes?: boolean;
  removedEdgeIds?: string[];
  removedNodeIds?: string[];
  addedNodeIds?: string[];
  addedEdgeIds?: string[];
  highlightedNodeId?: string | null;
  focusNodeId?: string | null;
  onNodeDragEnd?: (nodeId: string, position: { x: number; y: number; z: number }) => void;
}

// Helper component to handle camera focus
// Memoized to prevent re-renders when props haven't changed
const CameraFocus = memo(({ focusNodeId, graph }: { focusNodeId: string | null, graph: DependencyGraph }) => {
  const { camera, controls } = useThree();
  const lastFocusedIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only run when focusNodeId changes, not when graph updates
    if (focusNodeId && focusNodeId !== lastFocusedIdRef.current && graph && controls) {
      const node = graph.nodes.find(n => n.id === focusNodeId);
      if (node) {
        const { x, y, z } = node.position;
        const target = new Vector3(x, y, z);
        const offset = new Vector3(40, 40, 40);

        // @ts-ignore
        if (controls.target) {
          // Focus on node temporarily
          // @ts-ignore
          controls.target.copy(target);
          camera.position.copy(target).add(offset);
          // @ts-ignore
          controls.update();

          // Reset controls target to center after a short delay
          setTimeout(() => {
            // @ts-ignore
            if (controls.target) {
              // @ts-ignore
              controls.target.set(0, 0, 0);
              // @ts-ignore
              controls.update();
            }
          }, 1500);
        }
        lastFocusedIdRef.current = focusNodeId;
      }
    } else if (!focusNodeId) {
      lastFocusedIdRef.current = null;
    }
  }, [focusNodeId, camera, controls]);

  return null;
});

// Memoized to prevent re-renders when props haven't changed
// This is critical for performance with 100+ Node and 200+ Edge children
export const Scene = memo(({
  customGraph,
  disableImpactAnalysis = false,
  hideClusterBoxes = false,
  removedEdgeIds = [],
  removedNodeIds = [],
  addedNodeIds = [],
  addedEdgeIds = [],
  highlightedNodeId = null,
  focusNodeId = null,
  onNodeDragEnd
}: SceneProps = {}) => {
  const storeGraph = useGraphStore(state => state.graph);
  const selectedNode = useGraphStore(state => state.selectedNode);
  const setSelectedNode = useGraphStore(state => state.setSelectedNode);
  const setImpactAnalysis = useGraphStore(state => state.setImpactAnalysis);
  const isDraggingNode = useUIStore(state => state.isDraggingNode);

  // Use custom graph if provided, otherwise use store graph
  const graph = customGraph || storeGraph;

  // Trigger impact analysis (only if not disabled and not using custom graph)
  useEffect(() => {
    if (disableImpactAnalysis || customGraph) {
      return;
    }
    if (!selectedNode || !graph) {
      setImpactAnalysis(null);
      return;
    }
    analyzeImpact(selectedNode.id, graph).then(setImpactAnalysis);
  }, [selectedNode, graph, setImpactAnalysis, disableImpactAnalysis, customGraph]);

  if (!graph) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-mono text-sm">
        NO DATA STREAM
      </div>
    );
  }

  return (
    <Canvas className="w-full h-full" shadows dpr={[1, 2]}>
      {/* 1. THE LABORATORY ENVIRONMENT */}
      <color attach="background" args={['#f8fafc']} /> {/* Slate-50 */}

      <PerspectiveCamera makeDefault position={[80, 60, 80]} near={0.1} far={10000} />
      <OrbitControls
        makeDefault
        enabled={!isDraggingNode}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 1.8} // Prevent going below ground too much
      />

      <CameraFocus focusNodeId={focusNodeId} graph={graph} />

      {/* Lighting Setup for "Matte/Ceramic" look */}
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight
        position={[50, 80, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-20, 20, -20]} intensity={0.5} color="#0d9488" /> {/* Teal fill */}

      {/* Soft Reflection Environment */}
      <Environment preset="city" />

      {/* Ground Plane for raycasting deselection */}
      <mesh
        position={[0, -500, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); setSelectedNode(null); }}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* --- GRAPH ELEMENTS --- */}
      <group position={[0, 0, 0]}>
        {!hideClusterBoxes && <ClusterBoundingBoxes />}

        {graph.edges.map((edge) => (
          <Edge
            key={edge.id}
            edge={edge}
            nodes={graph.nodes}
            removedEdgeIds={removedEdgeIds}
            addedEdgeIds={addedEdgeIds}
          />
        ))}

        {graph.nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            isAdded={addedNodeIds.includes(node.id)}
            isRemoved={removedNodeIds.includes(node.id)}
            isHighlighted={highlightedNodeId === node.id}
            onNodeDragEnd={onNodeDragEnd}
          />
        ))}
      </group>
    </Canvas>
  );
});