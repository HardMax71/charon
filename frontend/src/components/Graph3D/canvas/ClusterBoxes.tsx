import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, Vector3, DoubleSide, Group, Mesh, LineSegments, BoxGeometry } from 'three';
import { useGraphContext } from '../context/GraphContext';
import { useUIStore } from '@/stores/uiStore';
import { Node as NodeType } from '@/types/graph';

// Shared unit box geometry
const unitBoxGeometry = new BoxGeometry(1, 1, 1);

const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const PADDING = 4;

// Reusable objects
const tempBox = new Box3();
const tempCenter = new Vector3();
const tempSize = new Vector3();

interface ClusterBoxMeshProps {
  nodeIds: string[];
  color: string;
}

/**
 * Single cluster box that updates every frame
 */
const ClusterBoxMesh = memo(({ nodeIds, color }: ClusterBoxMeshProps) => {
  const { nodePositionsRef } = useGraphContext();

  const groupRef = useRef<Group>(null);
  const wireframeRef = useRef<LineSegments>(null);
  const fillRef = useRef<Mesh>(null);

  // Update position and scale every frame
  useFrame(() => {
    if (!groupRef.current || nodeIds.length === 0) return;

    // Calculate bounding box from current node positions
    tempBox.makeEmpty();

    let hasValidPositions = false;
    for (const nodeId of nodeIds) {
      const pos = nodePositionsRef.current.get(nodeId);
      if (pos) {
        tempBox.expandByPoint(pos);
        hasValidPositions = true;
      }
    }

    if (!hasValidPositions) return;

    // Add padding
    tempBox.min.subScalar(PADDING);
    tempBox.max.addScalar(PADDING);

    // Get center and size
    tempBox.getCenter(tempCenter);
    tempBox.getSize(tempSize);

    // Update group position
    groupRef.current.position.copy(tempCenter);

    // Update wireframe and fill scale
    if (wireframeRef.current) {
      wireframeRef.current.scale.set(tempSize.x, tempSize.y, tempSize.z);
    }
    if (fillRef.current) {
      fillRef.current.scale.set(tempSize.x, tempSize.y, tempSize.z);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Wireframe cage - unit box scaled */}
      <lineSegments ref={wireframeRef}>
        <edgesGeometry args={[unitBoxGeometry]} />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>

      {/* Subtle fill - unit box scaled */}
      <mesh ref={fillRef} raycast={() => null} geometry={unitBoxGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.03}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
});

ClusterBoxMesh.displayName = 'ClusterBoxMesh';

/**
 * Cluster bounding boxes visualization
 */
export const ClusterBoxes = memo(() => {
  const { graph, metrics } = useGraphContext();
  const showClusters = useUIStore(state => state.showClusters);

  // Build cluster data (node IDs per cluster)
  const clusterData = useMemo(() => {
    if (!graph || !metrics?.clusters || !showClusters) return [];

    return metrics.clusters.map(cluster => {
      const clusterNodes = graph.nodes.filter((n: NodeType) => n.cluster_id === cluster.cluster_id);
      if (!clusterNodes.length) return null;

      return {
        id: cluster.cluster_id,
        nodeIds: clusterNodes.map((n: NodeType) => n.id),
        color: CLUSTER_COLORS[cluster.cluster_id % CLUSTER_COLORS.length],
      };
    }).filter(Boolean) as { id: number; nodeIds: string[]; color: string }[];
  }, [graph, metrics, showClusters]);

  if (!showClusters || clusterData.length === 0) return null;

  return (
    <group>
      {clusterData.map(cluster => (
        <ClusterBoxMesh
          key={cluster.id}
          nodeIds={cluster.nodeIds}
          color={cluster.color}
        />
      ))}
    </group>
  );
});

ClusterBoxes.displayName = 'ClusterBoxes';
