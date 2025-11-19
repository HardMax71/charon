import { useRef, useEffect, useMemo } from 'react';
import { Mesh, Vector3, Vector2, Plane, Raycaster } from 'three';
import { useThree } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import { Node as NodeType } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';

interface NodeProps {
  node: NodeType;
}

export const Node = ({ node }: NodeProps) => {
  const meshRef = useRef<Mesh>(null);
  const { selectedNode, setSelectedNode, setHoveredNode, updateNodePosition, impactAnalysis } = useGraphStore();
  const { selectedModule, isDraggingNode, setIsDraggingNode } = useUIStore();
  const { camera, gl } = useThree();

  // Interaction refs
  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new Vector3());
  const raycaster = useRef(new Raycaster());

  const isSelected = selectedNode?.id === node.id;

  // --- VISUAL LOGIC ---

  const impactDistance = impactAnalysis?.affected_nodes?.[node.id];
  const isAffected = impactDistance !== undefined;
  const isInSelectedModule = !selectedModule || node.module === selectedModule || (node.module && node.module.startsWith(selectedModule + '.'));

  // Scale Calculation (Increased base size)
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
    let rough = 0.2; // Shinier for better visibility
    let metal = 0.1;

    // Hot Zones overrides
    if (!impactAnalysis && isHotZone) {
      c = node.metrics.hot_zone_severity === 'critical' ? '#ef4444' : '#f59e0b';
    }

    // Impact / Filter overrides
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
  }, [node, impactAnalysis, isAffected, selectedModule, isInSelectedModule]);


  // --- DRAG HANDLERS ---
  const handlePointerDown = (e: any) => {
    if (!isSelected) return;
    e.stopPropagation();
    setIsDraggingNode(true);
    dragPlane.current.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), node.position as any);
    const intersectPoint = new Vector3();
    const mousePos = new Vector2((e.clientX / gl.domElement.clientWidth) * 2 - 1, -(e.clientY / gl.domElement.clientHeight) * 2 + 1);
    raycaster.current.setFromCamera(mousePos, camera);
    raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint);
    dragOffset.current.subVectors(node.position as any, intersectPoint);
    gl.domElement.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: any) => {
    if (!isDraggingNode) return;
    e.stopPropagation();
    const intersectPoint = new Vector3();
    const mousePos = new Vector2((e.clientX / gl.domElement.clientWidth) * 2 - 1, -(e.clientY / gl.domElement.clientHeight) * 2 + 1);
    raycaster.current.setFromCamera(mousePos, camera);
    if (raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint)) {
      const newPos = intersectPoint.add(dragOffset.current);
      updateNodePosition(node.id, { x: newPos.x, y: newPos.y, z: newPos.z });
    }
  };

  const handlePointerUp = () => {
    setIsDraggingNode(false);
    gl.domElement.style.cursor = 'pointer';
  };

  useEffect(() => {
    if (!isDraggingNode || !isSelected) return;
    const canvas = gl.domElement;
    const move = (e: PointerEvent) => handlePointerMove(e);
    const up = () => handlePointerUp();
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    return () => {
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
    };
  }, [isDraggingNode, isSelected]);


  return (
    <mesh
      ref={meshRef}
      position={[node.position.x, node.position.y, node.position.z]}
      scale={baseScale}
      onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
      onPointerDown={handlePointerDown}
      onPointerOver={() => { setHoveredNode(node); gl.domElement.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHoveredNode(null); if (!isDraggingNode) gl.domElement.style.cursor = 'default'; }}
    >
      {/* Increased geometry size from 2 to 3 for better default visibility */}
      <sphereGeometry args={[3, 32, 32]} />

      <meshStandardMaterial
        color={displayColor}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={isSelected ? displayColor : displayColor}
        emissiveIntensity={isSelected ? 0.4 : 0.15} // Slight glow by default
      />

      {/* Selection Halo */}
      {isSelected && (
        <mesh scale={1.2}>
          <sphereGeometry args={[3, 32, 32]} />
          <meshBasicMaterial color={displayColor} transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {/* Strong Black Outline for "Illustration" look */}
      <Outlines
        thickness={0.15}
        color="#000000"
        transparent
        opacity={opacity < 1 ? 0.1 : 0.4}
      />

      {/* HTML Label */}
      {(isSelected || (isAffected && impactDistance === 1)) && (
        <Html distanceFactor={20} position={[0, 3.5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="bg-white/95 backdrop-blur border border-slate-300 shadow-xl px-3 py-2 rounded-md flex flex-col gap-1 transform -translate-x-1/2 -translate-y-full">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500 leading-none">
              {node.type.toUpperCase()} NODE
            </span>
            <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
              {node.label}
            </span>
            {complexity > 10 && (
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-[9px] font-mono text-rose-600 font-bold">COMPLEXITY: {complexity}</span>
              </div>
            )}
          </div>
          <div className="w-px h-4 bg-slate-400 mx-auto" />
        </Html>
      )}
    </mesh>
  );
};