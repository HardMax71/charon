import { useMemo } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import * as THREE from 'three';

// Cluster colors for visualization
const CLUSTER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#d97706', // deep amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#eab308', // golden yellow
];

export const ClusterBoundingBoxes = () => {
  const { graph, globalMetrics } = useGraphStore();
  const { showClusters } = useUIStore();

  const clusterBoxes = useMemo(() => {
    if (!graph || !globalMetrics?.clusters || !showClusters) {
      return [];
    }

    const boxes: Array<{
      clusterId: number;
      color: string;
      min: THREE.Vector3;
      max: THREE.Vector3;
      center: THREE.Vector3;
      size: THREE.Vector3;
    }> = [];

    globalMetrics.clusters.forEach((cluster) => {
      // Get all nodes in this cluster
      const clusterNodes = graph.nodes.filter(node =>
        node.cluster_id === cluster.cluster_id
      );

      if (clusterNodes.length === 0) return;

      // Compute bounding box for this cluster
      const box = new THREE.Box3();
      clusterNodes.forEach(node => {
        box.expandByPoint(new THREE.Vector3(
          node.position.x,
          node.position.y,
          node.position.z
        ));
      });

      // Add padding around the cluster
      const padding = 3;
      box.min.sub(new THREE.Vector3(padding, padding, padding));
      box.max.add(new THREE.Vector3(padding, padding, padding));

      const center = new THREE.Vector3();
      box.getCenter(center);

      const size = new THREE.Vector3();
      box.getSize(size);

      boxes.push({
        clusterId: cluster.cluster_id,
        color: CLUSTER_COLORS[cluster.cluster_id % CLUSTER_COLORS.length],
        min: box.min,
        max: box.max,
        center,
        size,
      });
    });

    return boxes;
  }, [graph, globalMetrics, showClusters]);

  if (!showClusters || clusterBoxes.length === 0) {
    return null;
  }

  return (
    <group>
      {clusterBoxes.map((box) => (
        <group key={box.clusterId}>
          {/* Wireframe edges (rendered first) */}
          <lineSegments position={[box.center.x, box.center.y, box.center.z]}>
            <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(box.size.x, box.size.y, box.size.z)]} />
            <lineBasicMaterial
              attach="material"
              color={box.color}
              linewidth={2}
              transparent
              opacity={0.6}
              depthTest={true}
              depthWrite={false}
            />
          </lineSegments>

          {/* Semi-transparent box (rendered behind, no depth write to avoid z-fighting) */}
          <mesh position={[box.center.x, box.center.y, box.center.z]} renderOrder={-1}>
            <boxGeometry args={[box.size.x, box.size.y, box.size.z]} />
            <meshBasicMaterial
              color={box.color}
              transparent
              opacity={0.08}
              side={THREE.BackSide}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
