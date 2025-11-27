import { memo, useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import { Mesh, Vector3, SphereGeometry, Color } from 'three';
import { Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphSelection, useGraphModifiers } from '../context/GraphContext';
import { useNodeDrag } from '../hooks/useNodeDrag';

// Shared geometry - created once, reused by all nodes
const sharedSphereGeometry = new SphereGeometry(3, 32, 32);

// Reusable color object
const tempColor = new Color();

interface NodeMeshProps {
  node: NodeType;
}

/**
 * Individual node mesh component
 * Uses shared geometry and ref-based position updates for performance
 */
export const NodeMesh = memo(({ node }: NodeMeshProps) => {
  const meshRef = useRef<Mesh>(null);
  const { nodePositionsRef, disableImpactAnalysis } = useGraphContext();
  const { selectedNodeId, hoveredNodeId, selectNode, hoverNode } = useGraphSelection();
  const modifiers = useGraphModifiers();
  const { gl } = useThree();

  const isSelected = selectedNodeId === node.id;
  const isHighlighted = modifiers.highlightedNodeId === node.id;
  const isAdded = modifiers.addedNodeIds.includes(node.id);
  const isRemoved = modifiers.removedNodeIds.includes(node.id);

  // Drag handling
  const { handlePointerDown } = useNodeDrag({
    nodeId: node.id,
    enabled: isSelected,
  });

  // Update position from ref each frame (no React re-render!)
  useFrame(() => {
    if (!meshRef.current) return;

    const pos = nodePositionsRef.current.get(node.id);
    if (pos) {
      meshRef.current.position.copy(pos);
    }
  });

  // Visual calculations - memoized
  const { color, opacity, scale } = useMemo(() => {
    let c = node.color;
    let op = 1.0;
    let sc = 1.0;

    // Hot zone coloring
    if (!disableImpactAnalysis && node.metrics.is_hot_zone) {
      c = node.metrics.hot_zone_severity === 'critical' ? '#ef4444' : '#f59e0b';
    }

    // Added node - green
    if (isAdded) {
      c = '#10b981';
    }

    // Removed node - red with transparency
    if (isRemoved) {
      c = '#ef4444';
      op = 0.7;
    }

    // Selection scale
    if (isSelected) {
      sc = 1.4;
    }

    // Complexity-based scale
    const complexity = node.metrics.cyclomatic_complexity || 0;
    if (!isSelected) {
      sc = 1.0 + Math.min(complexity / 30, 0.4);
    }

    return { color: c, opacity: op, scale: sc };
  }, [node, isSelected, isAdded, isRemoved, disableImpactAnalysis]);

  // Click handler
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    selectNode(node.id);
  }, [node.id, selectNode]);

  // Hover handlers
  const handlePointerOver = useCallback(() => {
    hoverNode(node.id);
    gl.domElement.style.cursor = 'pointer';
  }, [node.id, hoverNode, gl]);

  const handlePointerOut = useCallback(() => {
    hoverNode(null);
    gl.domElement.style.cursor = 'default';
  }, [hoverNode, gl]);

  // Initial position
  const initialPos = nodePositionsRef.current.get(node.id);
  const position: [number, number, number] = initialPos
    ? [initialPos.x, initialPos.y, initialPos.z]
    : [node.position.x, node.position.y, node.position.z];

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      geometry={sharedSphereGeometry}
      onClick={handleClick}
      onPointerDown={isSelected ? handlePointerDown : undefined}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.1}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={color}
        emissiveIntensity={isSelected ? 0.4 : 0.15}
      />

      {/* Selection indicator */}
      {isSelected && (
        <mesh scale={1.2} geometry={sharedSphereGeometry}>
          <meshBasicMaterial color={color} transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {/* Highlight glow */}
      {isHighlighted && (
        <mesh scale={1.4} geometry={sharedSphereGeometry}>
          <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Outline */}
      <Outlines
        thickness={0.15}
        color="#000000"
        transparent
        opacity={opacity < 1 ? 0.1 : 0.4}
      />

      {/* Label - only for selected node */}
      {isSelected && (
        <Html
          position={[0, 3, 0]}
          style={{
            pointerEvents: 'none',
            transform: 'translate3d(-50%, -100%, 0)',
            whiteSpace: 'nowrap',
          }}
          zIndexRange={[100, 0]}
        >
          <div className="flex flex-col items-center pb-1">
            <div className="bg-white/95 backdrop-blur-md border border-slate-300 shadow-xl px-3 py-1.5 rounded-md flex flex-col gap-0.5">
              <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500 leading-none">
                {isAdded ? 'ADDED' : node.type.toUpperCase()}
              </span>
              <span className="text-sm font-bold text-slate-900 leading-tight">
                {node.label}
              </span>
              {node.metrics.cyclomatic_complexity > 10 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[9px] font-mono text-rose-600 font-bold">
                    CX: {node.metrics.cyclomatic_complexity}
                  </span>
                </div>
              )}
            </div>
            <div className="w-0.5 h-4 bg-slate-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          </div>
        </Html>
      )}
    </mesh>
  );
});

NodeMesh.displayName = 'NodeMesh';

/**
 * Container for all nodes
 */
interface NodeGroupProps {
  nodes: NodeType[];
}

export const NodeGroup = memo(({ nodes }: NodeGroupProps) => {
  const modifiers = useGraphModifiers();

  // Filter out removed nodes (but still render them with visual indication if needed)
  const visibleNodes = useMemo(() => {
    return nodes.filter(node => !modifiers.removedNodeIds.includes(node.id) || true);
  }, [nodes, modifiers.removedNodeIds]);

  return (
    <group>
      {visibleNodes.map(node => (
        <NodeMesh key={node.id} node={node} />
      ))}
    </group>
  );
});

NodeGroup.displayName = 'NodeGroup';
