import { memo, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  Matrix4,
  Color,
  SphereGeometry,
  MeshLambertMaterial,
  Object3D
} from 'three';
import { Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphModifiers } from '../context/GraphContext';
import { useUIStore } from '@/stores/uiStore';
import { STATUS_COLORS, THIRD_PARTY_COLOR, getLanguageColor } from '@/utils/constants';
import { nodeMatchesFilters } from '@/utils/graphFilters';

const MAX_NODES = 5000;
const tempMatrix = new Matrix4();
const tempColor = new Color();
const tempObject = new Object3D();

interface InstancedNodesProps {
  nodes: NodeType[];
}

const getNodeColor = (
  node: NodeType,
  isAdded: boolean,
  isRemoved: boolean
): string => {
  // Added/removed nodes use status colors
  if (isAdded) return STATUS_COLORS.added;
  if (isRemoved) return STATUS_COLORS.removed;
  // Third party uses gray
  if (node.type === 'third_party') return THIRD_PARTY_COLOR;
  // All other nodes use language color
  return getLanguageColor(node.language);
};

const getNodeScale = (node: NodeType, matchesFilter: boolean, isSelected: boolean): number => {
  if (!matchesFilter && !isSelected) return 0.5;
  if (isSelected) return 1.4;
  return 1.0 + Math.min((node.metrics.cyclomatic_complexity || 0) / 30, 0.4);
};

const getNodeOpacity = (matchesFilter: boolean, isRemoved: boolean): number => {
  if (!matchesFilter) return 0.03;
  if (isRemoved) return 0.7;
  return 1.0;
};

export const InstancedNodes = memo(({ nodes }: InstancedNodesProps) => {
  const meshRef = useRef<InstancedMesh>(null);
  const { nodePositionsRef, selectedNodeId } = useGraphContext();
  const modifiers = useGraphModifiers();
  const graphFilters = useUIStore(state => state.graphFilters);
  const hasActiveFilters = useUIStore(state => state.hasActiveFilters);
  const filtersActive = hasActiveFilters();

  const geometry = useMemo(() => new SphereGeometry(3, 12, 12), []);
  const material = useMemo(() => new MeshLambertMaterial({
    transparent: true,
    opacity: 1,
  }), []);

  // Initialize and update instances when nodes/filters/modifiers change
  useEffect(() => {
    if (!meshRef.current || nodes.length === 0) return;
    const mesh = meshRef.current;

    nodes.forEach((node, i) => {
      const pos = nodePositionsRef.current.get(node.id);
      const isAdded = modifiers.addedNodeIds.includes(node.id);
      const isRemoved = modifiers.removedNodeIds.includes(node.id);
      const isSelected = selectedNodeId === node.id;
      const matchesFilter = nodeMatchesFilters(node, graphFilters, filtersActive);

      const scale = getNodeScale(node, matchesFilter, isSelected);
      const opacity = getNodeOpacity(matchesFilter, isRemoved);
      const color = getNodeColor(node, isAdded, isRemoved);

      tempObject.position.set(
        pos?.x ?? node.position.x,
        pos?.y ?? node.position.y,
        pos?.z ?? node.position.z
      );
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);

      // Encode opacity into color alpha by darkening non-matching nodes
      tempColor.set(color);
      if (opacity < 1) {
        tempColor.multiplyScalar(opacity * 0.3 + 0.1);
      }
      mesh.setColorAt(i, tempColor);
    });

    mesh.count = nodes.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [nodes, modifiers, graphFilters, filtersActive, selectedNodeId, nodePositionsRef]);

  // Update positions every frame
  useFrame(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    nodes.forEach((node, i) => {
      const pos = nodePositionsRef.current.get(node.id);
      if (!pos) return;

      mesh.getMatrixAt(i, tempMatrix);
      const scale = tempMatrix.elements[0]; // Extract current scale

      tempObject.position.copy(pos);
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_NODES]}
      frustumCulled={false}
      raycast={() => null}
    />
  );
});

InstancedNodes.displayName = 'InstancedNodes';
