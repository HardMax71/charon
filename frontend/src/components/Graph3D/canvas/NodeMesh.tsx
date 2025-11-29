import { memo, useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import { Mesh, Vector3, SphereGeometry, Color } from 'three';
import { Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphSelection, useGraphModifiers } from '../context/GraphContext';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useUIStore } from '@/stores/uiStore';
import {
  STATUS_COLORS,
  THIRD_PARTY_COLOR,
  getLanguageColor,
} from '@/utils/constants';

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

  // Get filter state
  const graphFilters = useUIStore(state => state.graphFilters);
  const hasActiveFilters = useUIStore(state => state.hasActiveFilters);

  const isSelected = selectedNodeId === node.id;
  const isHighlighted = modifiers.highlightedNodeId === node.id;
  const isAdded = modifiers.addedNodeIds.includes(node.id);
  const isRemoved = modifiers.removedNodeIds.includes(node.id);

  // Check if node matches active filters
  const matchesFilters = useMemo(() => {
    if (!hasActiveFilters()) return true;

    const { languages, services, statuses, thirdPartyOnly } = graphFilters;

    // Third party filter
    if (thirdPartyOnly) {
      return node.type === 'third_party';
    }

    // If any filters are active, check each category (OR within category, AND between categories)
    let matches = true;

    // Language filter
    if (languages.length > 0) {
      matches = matches && (node.language ? languages.includes(node.language) : false);
    }

    // Service filter
    if (services.length > 0) {
      matches = matches && (node.service ? services.includes(node.service) : false);
    }

    // Status filter
    if (statuses.length > 0) {
      const nodeStatuses: string[] = [];
      if (node.metrics.is_hot_zone) nodeStatuses.push('hotZone');
      if (node.metrics.is_circular) nodeStatuses.push('circular');
      if (node.metrics.is_high_coupling) nodeStatuses.push('highCoupling');
      matches = matches && statuses.some(s => nodeStatuses.includes(s));
    }

    return matches;
  }, [node, graphFilters, hasActiveFilters]);

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
  // Fill color = status, Outline color = language
  const { fillColor, outlineColor, opacity, scale } = useMemo(() => {
    let fill = STATUS_COLORS.default;
    let op = 1.0;
    let sc = 1.0;

    // Third party gets gray fill
    if (node.type === 'third_party') {
      fill = THIRD_PARTY_COLOR;
    }

    // Hot zone coloring (status override)
    if (!disableImpactAnalysis && node.metrics.is_hot_zone) {
      fill = node.metrics.hot_zone_severity === 'critical'
        ? STATUS_COLORS.hot_critical
        : STATUS_COLORS.hot_warning;
    }

    // Circular dependency
    if (node.metrics.is_circular) {
      fill = STATUS_COLORS.circular;
    }

    // High coupling (only if not already colored by hot zone/circular)
    if (node.metrics.is_high_coupling && fill === STATUS_COLORS.default) {
      fill = STATUS_COLORS.high_coupling;
    }

    // Added node - green (highest priority for diff view)
    if (isAdded) {
      fill = STATUS_COLORS.added;
    }

    // Removed node - red with transparency
    if (isRemoved) {
      fill = STATUS_COLORS.removed;
      op = 0.7;
    }

    // Outline color based on language (always visible)
    const outline = getLanguageColor(node.language);

    // Selection scale
    if (isSelected) {
      sc = 1.4;
    }

    // Complexity-based scale
    const complexity = node.metrics.cyclomatic_complexity || 0;
    if (!isSelected) {
      sc = 1.0 + Math.min(complexity / 30, 0.4);
    }

    // Dim non-matching nodes when filters are active (applied last for highest priority)
    if (!matchesFilters && !isSelected) {
      op = 0.03;
      sc = 0.5; // Also shrink non-matching nodes
    }

    return { fillColor: fill, outlineColor: outline, opacity: op, scale: sc };
  }, [node, isSelected, isAdded, isRemoved, disableImpactAnalysis, matchesFilters]);

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
        color={fillColor}
        roughness={0.2}
        metalness={0.1}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={fillColor}
        emissiveIntensity={isSelected ? 0.4 : 0.15}
      />

      {/* Selection indicator */}
      {isSelected && (
        <mesh scale={1.2} geometry={sharedSphereGeometry}>
          <meshBasicMaterial color={fillColor} transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {/* Highlight glow */}
      {isHighlighted && (
        <mesh scale={1.4} geometry={sharedSphereGeometry}>
          <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Language-colored outline (hidden for filtered nodes) */}
      {opacity > 0.1 && (
        <Outlines
          thickness={0.25}
          color={outlineColor}
          transparent
          opacity={opacity < 1 ? 0.5 : 0.9}
        />
      )}

      {/* Detailed label - only for selected node */}
      {isSelected && (
        <Html
          position={[0, 4, 0]}
          style={{
            pointerEvents: 'none',
            transform: 'translate3d(-50%, -100%, 0)',
            whiteSpace: 'nowrap',
          }}
          zIndexRange={[100, 0]}
        >
          <div className="flex flex-col items-center pb-1">
            <div className="bg-white/95 backdrop-blur-md border border-slate-300 shadow-xl px-3 py-1.5 rounded-md flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500 leading-none">
                  {isAdded ? 'ADDED' : isRemoved ? 'REMOVED' : node.type.toUpperCase()}
                </span>
                {node.language && (
                  <span
                    className="text-[8px] font-bold px-1 py-0.5 rounded text-white leading-none"
                    style={{ backgroundColor: outlineColor }}
                  >
                    {node.language.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-slate-900 leading-tight">
                {node.label}
              </span>
              {node.service && (
                <span className="text-[9px] text-slate-500 font-mono leading-none">
                  {node.service}
                </span>
              )}
              {node.metrics.cyclomatic_complexity > 10 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[9px] font-mono text-rose-600 font-bold">
                    Complexity: {node.metrics.cyclomatic_complexity}
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
