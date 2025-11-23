import { useRef, useMemo, useEffect, useCallback, memo } from 'react';
import { Mesh, Vector3, Vector2, Plane, Raycaster } from 'three';
import { useThree } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import { Node as NodeType } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';

interface NodeProps {
  node: NodeType;
  isAdded?: boolean;
  isRemoved?: boolean;
  isHighlighted?: boolean;
  onNodeDragEnd?: (nodeId: string, position: { x: number; y: number; z: number }) => void;
}

// Memoized to prevent unnecessary re-renders when parent re-renders
// Critical for performance with 100+ node instances
export const Node = memo(({ node, isAdded = false, isRemoved = false, isHighlighted = false, onNodeDragEnd }: NodeProps) => {
  const meshRef = useRef<Mesh>(null);
  const selectedNode = useGraphStore(state => state.selectedNode);
  const setSelectedNode = useGraphStore(state => state.setSelectedNode);
  const setHoveredNode = useGraphStore(state => state.setHoveredNode);
  const updateNodePosition = useGraphStore(state => state.updateNodePosition);
  const impactAnalysis = useGraphStore(state => state.impactAnalysis);
  const selectedModule = useUIStore(state => state.selectedModule);
  const isDraggingNode = useUIStore(state => state.isDraggingNode);
  const setIsDraggingNode = useUIStore(state => state.setIsDraggingNode);
  const { camera, gl, controls } = useThree();

  // Interaction refs
  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new Vector3());
  const raycaster = useRef(new Raycaster());

  const isSelected = selectedNode?.id === node.id;

  // Memoize sphere geometry to prevent recreation on every render (R3F best practice)
  const sphereGeometry = useMemo(() => [3, 32, 32] as const, []);

  // --- VISUAL LOGIC ---
  const impactDistance = impactAnalysis?.affected_nodes?.[node.id];
  const isAffected = impactDistance !== undefined;
  const isInSelectedModule = !selectedModule || node.module === selectedModule || (node.module && node.module.startsWith(selectedModule + '.'));

  // Scale Calculation
  const complexity = node.metrics.cyclomatic_complexity || 0;
  const baseScale = useMemo(() => {
    if (isSelected) return 1.4;
    if (isAffected && impactDistance === 1) return 1.3;
    if (isAffected) return 1.1;
    if (!isInSelectedModule) return 0.8;
    return 1.0 + Math.min(complexity / 30, 0.4);
  }, [isSelected, isAffected, impactDistance, isInSelectedModule, complexity]);

  // Color & Opacity Logic
  const { displayColor, opacity, roughness, metalness } = useMemo(() => {
    const isHotZone = node.metrics.is_hot_zone;
    let c = node.color;
    let op = 1.0;
    let rough = 0.2;
    let metal = 0.1;

    if (!impactAnalysis && isHotZone) {
      c = node.metrics.hot_zone_severity === 'critical' ? '#ef4444' : '#f59e0b';
    }

    // Override color if node is newly added
    if (isAdded) {
      c = '#10b981'; // Emerald-500
    }

    // Override color if node is removed (highest priority)
    if (isRemoved) {
      c = '#ef4444'; // Red-500
      op = 0.7; // Slightly transparent to show it's being removed
    }

    if (impactAnalysis) {
      if (isAffected) {
        c = impactAnalysis.affected_node_details?.find(n => n.id === node.id)?.color || c;
      } else {
        op = 0.1;
      }
    } else if (selectedModule && !isInSelectedModule) {
      op = 0.2;
    }

    return { displayColor: c, opacity: op, roughness: rough, metalness: metal };
  }, [node, impactAnalysis, isAffected, selectedModule, isInSelectedModule, isAdded, isRemoved]);

  // Click handler for selecting node
  // Memoized to maintain stable reference for React Three Fiber
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
  }, [node, setSelectedNode]);

  // --- DRAG HANDLERS ---
  // Memoized to maintain stable references and prevent unnecessary re-renders
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isSelected) return;
    e.stopPropagation();
    setIsDraggingNode(true);
    dragPlane.current.setFromNormalAndCoplanarPoint(
      new Vector3(0, 1, 0),
      new Vector3(node.position.x, node.position.y, node.position.z)
    );
    const intersectPoint = new Vector3();
    const mousePos = new Vector2((e.clientX / gl.domElement.clientWidth) * 2 - 1, -(e.clientY / gl.domElement.clientHeight) * 2 + 1);
    raycaster.current.setFromCamera(mousePos, camera);
    raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint);
    dragOffset.current.subVectors(node.position as any, intersectPoint);
    gl.domElement.style.cursor = 'grabbing';
  }, [isSelected, setIsDraggingNode, node.position, gl, camera]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingNode) return;
    e.stopPropagation();
    const intersectPoint = new Vector3();
    const mousePos = new Vector2((e.clientX / gl.domElement.clientWidth) * 2 - 1, -(e.clientY / gl.domElement.clientHeight) * 2 + 1);
    raycaster.current.setFromCamera(mousePos, camera);
    if (raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint)) {
      const newPos = intersectPoint.add(dragOffset.current);

      // Update mesh position immediately for smooth dragging
      if (meshRef.current) {
        meshRef.current.position.set(newPos.x, newPos.y, newPos.z);
      }

      // Also update state so edges follow the node
      if (onNodeDragEnd) {
        onNodeDragEnd(node.id, { x: newPos.x, y: newPos.y, z: newPos.z });
      } else {
        updateNodePosition(node.id, { x: newPos.x, y: newPos.y, z: newPos.z });
      }
    }
  }, [isDraggingNode, gl, camera, onNodeDragEnd, node.id, updateNodePosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDraggingNode && meshRef.current) {
      // Commit final position
      const { x, y, z } = meshRef.current.position;

      if (onNodeDragEnd) {
        onNodeDragEnd(node.id, { x, y, z });
      } else {
        updateNodePosition(node.id, { x, y, z });
      }

      // Reset camera orbit target to center to prevent orbiting around the dragged node
      if (controls && (controls as any).target) {
        (controls as any).target.set(0, 0, 0);
        (controls as any).update();
      }
    }
    setIsDraggingNode(false);
    gl.domElement.style.cursor = 'pointer';
  }, [isDraggingNode, onNodeDragEnd, node.id, updateNodePosition, controls, setIsDraggingNode, gl]);

  useEffect(() => {
    if (!isDraggingNode || !isSelected) return;
    const canvas = gl.domElement;
    const move = (e: PointerEvent) => handlePointerMove(e as any);
    const up = (e: PointerEvent) => handlePointerUp(e as any);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    return () => {
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
    };
  }, [isDraggingNode, isSelected, handlePointerMove, handlePointerUp, gl.domElement]);


  return (
    <mesh
      ref={meshRef}
      position={[node.position.x, node.position.y, node.position.z]}
      scale={baseScale}
      onClick={handleClick}
      onPointerDown={isSelected ? handlePointerDown : undefined}
      onPointerOver={() => { setHoveredNode(node); gl.domElement.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHoveredNode(null); if (!isDraggingNode) gl.domElement.style.cursor = 'default'; }}
    >
      <sphereGeometry args={sphereGeometry} />

      <meshStandardMaterial
        color={displayColor}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={isSelected ? displayColor : displayColor}
        emissiveIntensity={isSelected ? 0.4 : 0.15}
        depthWrite={true}
      />

      {isSelected && (
        <mesh scale={1.2}>
          <sphereGeometry args={sphereGeometry} />
          <meshBasicMaterial color={displayColor} transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {/* Hover Glow Effect */}
      {isHighlighted && (
        <mesh scale={1.4}>
          <sphereGeometry args={sphereGeometry} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
        </mesh>
      )}

      <Outlines
        thickness={0.15}
        color="#000000"
        transparent
        opacity={opacity < 1 ? 0.1 : 0.4}
      />

      {(isSelected || (isAffected && impactDistance === 1)) && (
        <Html
          position={[0, 3, 0]} // Anchor at sphere surface
          style={{
            pointerEvents: 'none',
            transform: 'translate3d(-50%, -100%, 0)', // Grow upwards from anchor
            whiteSpace: 'nowrap',
          }}
          zIndexRange={[100, 0]}
        >
          <div className="flex flex-col items-center pb-1">

            {/* LABEL CARD */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-300 shadow-xl px-3 py-1.5 rounded-md flex flex-col gap-0.5">
              <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500 leading-none">
                {isAdded ? 'ADDED' : node.type.toUpperCase()}
              </span>
              <span className="text-sm font-bold text-slate-900 leading-tight">
                {node.label}
              </span>

              {complexity > 10 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[9px] font-mono text-rose-600 font-bold">CX: {complexity}</span>
                </div>
              )}
            </div>

            {/* LEADER LINE (Thicker & Darker) */}
            {/* w-0.5 = 2px width (vs 1px wires). bg-slate-800 = Dark Grey/Black */}
            <div className="w-0.5 h-4 bg-slate-800" />

            {/* ANCHOR DOT (Slightly larger) */}
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          </div>
        </Html>
      )}
    </mesh>
  );
});