import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Node } from './Node';
import { Edge } from './Edge';
import { ClusterBoundingBoxes } from './ClusterBoundingBoxes';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { analyzeImpact } from '@/services/api';

export const Scene = () => {
  const { graph, selectedNode, setSelectedNode, setImpactAnalysis } = useGraphStore();
  const { isDraggingNode } = useUIStore();

  // Trigger impact analysis when a node is selected
  useEffect(() => {
    if (!selectedNode || !graph) {
      setImpactAnalysis(null);
      return;
    }

    // Call impact analysis API
    analyzeImpact(selectedNode.id, graph)
      .then((impactData) => {
        setImpactAnalysis(impactData);
      })
      .catch((error) => {
        console.error('Impact analysis failed:', error);
        setImpactAnalysis(null);
      });
  }, [selectedNode, graph, setImpactAnalysis]);

  if (!graph) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <p>No graph data loaded</p>
      </div>
    );
  }

  return (
    <Canvas className="w-full h-full">
      <PerspectiveCamera makeDefault position={[100, 100, 100]} near={0.1} far={10000} />
      <OrbitControls enabled={!isDraggingNode} enableDamping dampingFactor={0.05} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* Background plane for click-to-deselect */}
      <mesh
        position={[0, -50, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={() => setSelectedNode(null)}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>

      {/* Render cluster bounding boxes first (behind everything) */}
      <ClusterBoundingBoxes />

      {/* Render edges */}
      {graph.edges.map((edge) => (
        <Edge key={edge.id} edge={edge} nodes={graph.nodes} />
      ))}

      {/* Render nodes */}
      {graph.nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </Canvas>
  );
};
