import { memo, useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import {
  InstancedMesh,
  SphereGeometry,
  MeshBasicMaterial,
  Object3D,
  Vector3,
  Vector2,
  Plane,
  Raycaster
} from 'three';
import { Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphSelection } from '../context/GraphContext';
import { useUIStore } from '@/stores/uiStore';

const MAX_NODES = 5000;
const tempObject = new Object3D();

// Reusable objects for raycasting
const dragPlane = new Plane(new Vector3(0, 1, 0), 0);
const intersectPoint = new Vector3();
const mousePos = new Vector2();
const raycaster = new Raycaster();
const tempVec = new Vector3();

interface NodeInteractionLayerProps {
  nodes: NodeType[];
}

export const NodeInteractionLayer = memo(({ nodes }: NodeInteractionLayerProps) => {
  const meshRef = useRef<InstancedMesh>(null);
  const { nodePositionsRef, updateNodePosition } = useGraphContext();
  const { selectedNodeId, selectNode, hoverNode } = useGraphSelection();
  const { gl, camera } = useThree();
  const setIsDraggingNode = useUIStore(state => state.setIsDraggingNode);

  const geometry = useMemo(() => new SphereGeometry(4, 8, 8), []);
  const material = useMemo(() => new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), []);

  const indexToNode = useMemo(() => {
    const map = new Map<number, NodeType>();
    nodes.forEach((node, i) => map.set(i, node));
    return map;
  }, [nodes]);

  // Drag state refs
  const dragNodeRef = useRef<string | null>(null);
  const dragOffsetRef = useRef(new Vector3());

  // Initialize interaction mesh positions
  useEffect(() => {
    if (!meshRef.current || nodes.length === 0) return;
    const mesh = meshRef.current;

    nodes.forEach((node, i) => {
      const pos = nodePositionsRef.current.get(node.id);
      tempObject.position.set(
        pos?.x ?? node.position.x,
        pos?.y ?? node.position.y,
        pos?.z ?? node.position.z
      );
      tempObject.scale.setScalar(1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
    });

    mesh.count = nodes.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [nodes, nodePositionsRef]);

  // Update positions every frame
  useFrame(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    nodes.forEach((node, i) => {
      const pos = nodePositionsRef.current.get(node.id);
      if (!pos) return;

      tempObject.position.copy(pos);
      tempObject.scale.setScalar(1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const node = indexToNode.get(e.instanceId);
      if (node) {
        selectNode(node.id);
      }
    }
  }, [indexToNode, selectNode]);

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId !== undefined) {
      const node = indexToNode.get(e.instanceId);
      if (node) {
        hoverNode(node.id);
        gl.domElement.style.cursor = 'pointer';
      }
    }
  }, [indexToNode, hoverNode, gl]);

  const handlePointerOut = useCallback(() => {
    hoverNode(null);
    gl.domElement.style.cursor = 'default';
  }, [hoverNode, gl]);

  // Drag handling - start drag on pointer down if node is selected
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId !== undefined) {
      const node = indexToNode.get(e.instanceId);
      if (node && selectedNodeId === node.id) {
        e.stopPropagation();
        dragNodeRef.current = node.id;
        setIsDraggingNode(true);
        gl.domElement.style.cursor = 'grabbing';

        // Set up drag plane at node's current position
        const nodePos = nodePositionsRef.current.get(node.id);
        if (nodePos) {
          dragPlane.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), nodePos);

          // Calculate offset from click point to node center
          const rect = gl.domElement.getBoundingClientRect();
          mousePos.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );

          raycaster.setFromCamera(mousePos, camera);

          if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
            dragOffsetRef.current.subVectors(nodePos, intersectPoint);
          }
        }
      }
    }
  }, [indexToNode, selectedNodeId, setIsDraggingNode, nodePositionsRef, camera, gl]);

  // Global pointer events for drag
  useEffect(() => {
    const handleGlobalMove = (moveEvent: PointerEvent) => {
      if (!dragNodeRef.current) return;

      const rect = gl.domElement.getBoundingClientRect();
      mousePos.set(
        ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mousePos, camera);

      if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
        tempVec.copy(intersectPoint).add(dragOffsetRef.current);

        // Update position in ref
        const pos = nodePositionsRef.current.get(dragNodeRef.current);
        if (pos) {
          pos.copy(tempVec);
        }

        // Notify external callback
        updateNodePosition(dragNodeRef.current, tempVec.x, tempVec.y, tempVec.z);
      }
    };

    const handleGlobalUp = () => {
      if (dragNodeRef.current) {
        dragNodeRef.current = null;
        setIsDraggingNode(false);
        gl.domElement.style.cursor = 'pointer';
      }
    };

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [setIsDraggingNode, nodePositionsRef, updateNodePosition, camera, gl]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_NODES]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      frustumCulled={false}
    />
  );
});

NodeInteractionLayer.displayName = 'NodeInteractionLayer';
