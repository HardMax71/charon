import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Node } from './Node';
import { Edge } from './Edge';
import { ClusterBoundingBoxes } from './ClusterBoundingBoxes';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { analyzeImpact } from '@/services/api';

export const Scene = () => {
  const { graph, selectedNode, setSelectedNode, setImpactAnalysis } = useGraphStore();
  const { isDraggingNode } = useUIStore();

  // Trigger impact analysis
  useEffect(() => {
    if (!selectedNode || !graph) {
      setImpactAnalysis(null);
      return;
    }
    analyzeImpact(selectedNode.id, graph)
      .then(setImpactAnalysis)
      .catch((error) => {
        console.error('Impact analysis failed:', error);
        setImpactAnalysis(null);
      });
  }, [selectedNode, graph, setImpactAnalysis]);

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
      <fog attach="fog" args={['#f8fafc', 50, 400]} />

      <PerspectiveCamera makeDefault position={[80, 60, 80]} near={0.1} far={10000} />
      <OrbitControls
        enabled={!isDraggingNode}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 1.8} // Prevent going below ground too much
      />

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
        position={[0, -50, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); setSelectedNode(null); }}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* --- GRAPH ELEMENTS --- */}
      <group position={[0, 0, 0]}>
        <ClusterBoundingBoxes />

        {graph.edges.map((edge) => (
          <Edge key={edge.id} edge={edge} nodes={graph.nodes} />
        ))}

        {graph.nodes.map((node) => (
          <Node key={node.id} node={node} />
        ))}
      </group>
    </Canvas>
  );
};