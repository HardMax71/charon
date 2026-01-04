import { memo, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  Matrix4,
  Color,
  TorusGeometry,
  MeshBasicMaterial,
  Object3D
} from 'three';
import { Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphModifiers } from '../context/GraphContext';
import { useUIStore } from '@/stores/uiStore';
import { STATUS_COLORS } from '@/utils/constants';
import { nodeMatchesFilters } from '@/utils/graphFilters';

const MAX_RINGS = 2000;
const tempMatrix = new Matrix4();
const tempColor = new Color();
const tempObject = new Object3D();

interface StatusRingsProps {
  nodes: NodeType[];
}

type StatusType = 'hot_critical' | 'hot_warning' | 'circular' | 'high_coupling';

const getNodeStatus = (
  node: NodeType,
  disableImpactAnalysis: boolean
): StatusType | null => {
  if (!disableImpactAnalysis && node.metrics.is_hot_zone) {
    return node.metrics.hot_zone_severity === 'critical' ? 'hot_critical' : 'hot_warning';
  }
  if (node.metrics.is_circular) return 'circular';
  if (node.metrics.is_high_coupling) return 'high_coupling';
  return null;
};

const STATUS_RING_COLORS: Record<StatusType, string> = {
  hot_critical: STATUS_COLORS.hot_critical,
  hot_warning: STATUS_COLORS.hot_warning,
  circular: STATUS_COLORS.circular,
  high_coupling: STATUS_COLORS.high_coupling,
};

const GREYED_OUT_COLOR = '#94a3b8'; // Slate-400 for non-matching rings

export const StatusRings = memo(({ nodes }: StatusRingsProps) => {
  const meshRef = useRef<InstancedMesh>(null);
  const { nodePositionsRef, disableImpactAnalysis } = useGraphContext();
  const modifiers = useGraphModifiers();
  const graphFilters = useUIStore(state => state.graphFilters);
  const hasActiveFilters = useUIStore(state => state.hasActiveFilters);
  const filtersActive = hasActiveFilters();

  // Ring geometry: radius 4 (slightly larger than node radius 3), tube 0.4
  const geometry = useMemo(() => new TorusGeometry(4.5, 0.5, 8, 32), []);
  const material = useMemo(() => new MeshBasicMaterial({
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  }), []);

  // Filter to only nodes with status issues
  const statusNodes = useMemo(() => {
    return nodes
      .filter(node => {
        // Skip added/removed nodes (they have their own color)
        if (modifiers.addedNodeIds.includes(node.id)) return false;
        if (modifiers.removedNodeIds.includes(node.id)) return false;
        if (node.type === 'third_party') return false;
        return getNodeStatus(node, disableImpactAnalysis) !== null;
      })
      .map(node => ({
        node,
        status: getNodeStatus(node, disableImpactAnalysis)!,
      }));
  }, [nodes, modifiers, disableImpactAnalysis]);

  // Update ring positions and colors
  useEffect(() => {
    if (!meshRef.current || statusNodes.length === 0) return;
    const mesh = meshRef.current;

    statusNodes.forEach(({ node, status }, i) => {
      const pos = nodePositionsRef.current.get(node.id);
      const matchesFilter = nodeMatchesFilters(node, graphFilters, filtersActive);

      tempObject.position.set(
        pos?.x ?? node.position.x,
        pos?.y ?? node.position.y,
        pos?.z ?? node.position.z
      );
      // Rotate ring to be horizontal (like a halo)
      tempObject.rotation.set(Math.PI / 2, 0, 0);
      // Scale down non-matching rings
      tempObject.scale.setScalar(matchesFilter ? 1 : 0.6);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);

      // Grey out non-matching rings
      if (matchesFilter) {
        tempColor.set(STATUS_RING_COLORS[status]);
      } else {
        tempColor.set(GREYED_OUT_COLOR);
        tempColor.multiplyScalar(0.3); // Darken further
      }
      mesh.setColorAt(i, tempColor);
    });

    mesh.count = statusNodes.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [statusNodes, nodePositionsRef, graphFilters, filtersActive]);

  // Update positions every frame (follow nodes during drag)
  useFrame(() => {
    if (!meshRef.current || statusNodes.length === 0) return;
    const mesh = meshRef.current;

    statusNodes.forEach(({ node }, i) => {
      const pos = nodePositionsRef.current.get(node.id);
      if (!pos) return;

      mesh.getMatrixAt(i, tempMatrix);

      tempObject.position.copy(pos);
      tempObject.rotation.set(Math.PI / 2, 0, 0);
      tempObject.scale.setScalar(1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  if (statusNodes.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_RINGS]}
      frustumCulled={false}
      raycast={() => null}
    />
  );
});

StatusRings.displayName = 'StatusRings';
