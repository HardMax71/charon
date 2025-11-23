import { useMemo, useEffect, useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import * as THREE from 'three';

const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ClusterBoundingBoxes = () => {
  const { graph, globalMetrics } = useGraphStore();
  const { showClusters } = useUIStore();

  // Force recalculation by tracking a version counter
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Watch for node position changes and force update
  useEffect(() => {
    if (!graph?.nodes) return;
    setUpdateTrigger(prev => prev + 1);
  }, [graph?.nodes]);

  const boxes = useMemo(() => {
    if (!graph || !globalMetrics?.clusters || !showClusters) return [];

    return globalMetrics.clusters.map((cluster) => {
      const nodes = graph.nodes.filter(n => n.cluster_id === cluster.cluster_id);
      if (!nodes.length) return null;

      const box = new THREE.Box3();
      nodes.forEach(n => box.expandByPoint(new THREE.Vector3(n.position.x, n.position.y, n.position.z)));

      // Add padding
      box.min.subScalar(4);
      box.max.addScalar(4);

      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);

      return {
        id: cluster.cluster_id,
        color: CLUSTER_COLORS[cluster.cluster_id % CLUSTER_COLORS.length],
        pos: [center.x, center.y, center.z] as [number, number, number],
        args: [size.x, size.y, size.z] as [number, number, number]
      };
    }).filter(Boolean) as any[];
  }, [graph?.nodes, globalMetrics, showClusters, updateTrigger]);

  if (!showClusters) return null;

  return (
    <group>
      {boxes.map((box) => (
        <group key={box.id} position={box.pos}>
          {/* 1. Sharp Wireframe Cage */}
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...box.args)]} />
            <lineBasicMaterial color={box.color} transparent opacity={0.6} />
          </lineSegments>

          {/* 2. Subtle Fill (Forcefield effect) */}
          <mesh raycast={() => null}>
            <boxGeometry args={box.args} />
            <meshBasicMaterial color={box.color} transparent opacity={0.03} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
};