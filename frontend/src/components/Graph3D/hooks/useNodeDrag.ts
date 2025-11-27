import { useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Vector2, Plane, Raycaster } from 'three';
import { useGraphContext } from '../context/GraphContext';
import { useUIStore } from '@/stores/uiStore';

// Reusable objects to avoid allocations in hot paths
const dragPlane = new Plane(new Vector3(0, 1, 0), 0);
const intersectPoint = new Vector3();
const mousePos = new Vector2();
const raycaster = new Raycaster();
const tempVec = new Vector3();

interface UseNodeDragOptions {
  nodeId: string;
  enabled?: boolean;
}

interface UseNodeDragReturn {
  isDragging: boolean;
  handlePointerDown: (e: any) => void;
  handlePointerUp: () => void;
}

/**
 * Hook for handling node drag interactions
 * Uses refs for position updates to avoid React re-renders during drag
 */
export function useNodeDrag({ nodeId, enabled = true }: UseNodeDragOptions): UseNodeDragReturn {
  const { nodePositionsRef, updateNodePosition, selectedNodeId, selectNode } = useGraphContext();
  const { camera, gl } = useThree();
  const setIsDraggingNode = useUIStore(state => state.setIsDraggingNode);

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(new Vector3());

  const handlePointerDown = useCallback((e: any) => {
    if (!enabled) return;

    e.stopPropagation();

    // Select node on click
    selectNode(nodeId);

    // Only start drag if already selected
    if (selectedNodeId !== nodeId) return;

    isDraggingRef.current = true;
    setIsDraggingNode(true); // Disable OrbitControls during drag

    // Set up drag plane at node's current position
    const nodePos = nodePositionsRef.current.get(nodeId);
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

    gl.domElement.style.cursor = 'grabbing';

    // Add global listeners for drag
    const handleGlobalMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const rect = gl.domElement.getBoundingClientRect();
      mousePos.set(
        ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mousePos, camera);

      if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
        tempVec.copy(intersectPoint).add(dragOffsetRef.current);

        // Update position in ref (no React re-render!)
        const pos = nodePositionsRef.current.get(nodeId);
        if (pos) {
          pos.copy(tempVec);
        }

        // Also notify external callback
        updateNodePosition(nodeId, tempVec.x, tempVec.y, tempVec.z);
      }
    };

    const handleGlobalUp = () => {
      isDraggingRef.current = false;
      setIsDraggingNode(false); // Re-enable OrbitControls
      gl.domElement.style.cursor = 'pointer';
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);

  }, [enabled, nodeId, selectedNodeId, selectNode, nodePositionsRef, updateNodePosition, camera, gl, setIsDraggingNode]);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDraggingNode(false); // Re-enable OrbitControls
    gl.domElement.style.cursor = 'pointer';
  }, [gl, setIsDraggingNode]);

  return {
    isDragging: isDraggingRef.current,
    handlePointerDown,
    handlePointerUp,
  };
}
