import { memo, useRef, useMemo, useCallback, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SphereGeometry, Group } from 'three';
import { Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphSelection, useGraphModifiers } from '../context/GraphContext';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useUIStore, GraphFilters } from '@/stores/uiStore';
import {
  STATUS_COLORS,
  THIRD_PARTY_COLOR,
  getLanguageColor,
} from '@/utils/constants';
import { nodeMatchesFilters } from '@/utils/graphFilters';

const sharedSphereGeometry = new SphereGeometry(3, 16, 16);

interface NodeMeshProps {
  node: NodeType;
  graphFilters: GraphFilters;
  filtersActive: boolean;
}

interface NodeGroupProps {
  nodes: NodeType[];
}

export const NodeGroup = memo(({ nodes }: NodeGroupProps) => {
  const { nodePositionsRef } = useGraphContext();
  const graphFilters = useUIStore(state => state.graphFilters);
  const hasActiveFilters = useUIStore(state => state.hasActiveFilters);
  const filtersActive = hasActiveFilters();

  const groupRefs = useRef<Map<string, Group>>(new Map());

  useEffect(() => {
    const nodeIds = new Set(nodes.map(n => n.id));
    groupRefs.current.forEach((_, id) => {
      if (!nodeIds.has(id)) {
        groupRefs.current.delete(id);
      }
    });
  }, [nodes]);

  useFrame(() => {
    groupRefs.current.forEach((group, nodeId) => {
      const pos = nodePositionsRef.current.get(nodeId);
      if (pos) {
        group.position.copy(pos);
      }
    });
  });

  const registerGroup = useCallback((nodeId: string, group: Group | null) => {
    if (group) {
      groupRefs.current.set(nodeId, group);
    } else {
      groupRefs.current.delete(nodeId);
    }
  }, []);

  return (
    <group>
      {nodes.map(node => (
        <NodeMeshWithRef
          key={node.id}
          node={node}
          graphFilters={graphFilters}
          filtersActive={filtersActive}
          registerGroup={registerGroup}
        />
      ))}
    </group>
  );
});

NodeGroup.displayName = 'NodeGroup';

interface NodeMeshWithRefProps extends NodeMeshProps {
  registerGroup: (nodeId: string, group: Group | null) => void;
}

const NodeMeshWithRef = memo(({ node, graphFilters, filtersActive, registerGroup }: NodeMeshWithRefProps) => {
  const groupRef = useRef<Group>(null);
  const { nodePositionsRef, disableImpactAnalysis } = useGraphContext();
  const { selectedNodeId, selectNode, hoverNode } = useGraphSelection();
  const modifiers = useGraphModifiers();
  const { gl } = useThree();

  const isSelected = selectedNodeId === node.id;
  const isHighlighted = modifiers.highlightedNodeId === node.id;
  const isAdded = modifiers.addedNodeIds.includes(node.id);
  const isRemoved = modifiers.removedNodeIds.includes(node.id);

  const matchesFilters = useMemo(
    () => nodeMatchesFilters(node, graphFilters, filtersActive),
    [node, graphFilters, filtersActive]
  );

  const { handlePointerDown } = useNodeDrag({
    nodeId: node.id,
    enabled: isSelected,
  });

  const { fillColor, outlineColor, opacity, scale } = useMemo(() => {
    let fill = STATUS_COLORS.default;
    let op = 1.0;
    let sc = 1.0;

    if (node.type === 'third_party') {
      fill = THIRD_PARTY_COLOR;
    }

    if (!disableImpactAnalysis && node.metrics.is_hot_zone) {
      fill = node.metrics.hot_zone_severity === 'critical'
        ? STATUS_COLORS.hot_critical
        : STATUS_COLORS.hot_warning;
    }

    if (node.metrics.is_circular) {
      fill = STATUS_COLORS.circular;
    }

    if (node.metrics.is_high_coupling && fill === STATUS_COLORS.default) {
      fill = STATUS_COLORS.high_coupling;
    }

    if (isAdded) {
      fill = STATUS_COLORS.added;
    }

    if (isRemoved) {
      fill = STATUS_COLORS.removed;
      op = 0.7;
    }

    const outline = getLanguageColor(node.language);

    if (isSelected) {
      sc = 1.4;
    } else {
      const complexity = node.metrics.cyclomatic_complexity || 0;
      sc = 1.0 + Math.min(complexity / 30, 0.4);
    }

    if (!matchesFilters && !isSelected) {
      op = 0.03;
      sc = 0.5;
    }

    return { fillColor: fill, outlineColor: outline, opacity: op, scale: sc };
  }, [node, isSelected, isAdded, isRemoved, disableImpactAnalysis, matchesFilters]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectNode(node.id);
  }, [node.id, selectNode]);

  const handlePointerOver = useCallback(() => {
    hoverNode(node.id);
    gl.domElement.style.cursor = 'pointer';
  }, [node.id, hoverNode, gl]);

  const handlePointerOut = useCallback(() => {
    hoverNode(null);
    gl.domElement.style.cursor = 'default';
  }, [hoverNode, gl]);

  useEffect(() => {
    if (groupRef.current) {
      registerGroup(node.id, groupRef.current);
    }
    return () => registerGroup(node.id, null);
  }, [node.id, registerGroup]);

  const initialPos = nodePositionsRef.current.get(node.id);
  const position: [number, number, number] = initialPos
    ? [initialPos.x, initialPos.y, initialPos.z]
    : [node.position.x, node.position.y, node.position.z];

  return (
    <group ref={groupRef} position={position}>
      <mesh
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
      </mesh>

      {isSelected && (
        <mesh scale={scale * 1.2} geometry={sharedSphereGeometry}>
          <meshBasicMaterial color={fillColor} transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {isHighlighted && (
        <mesh scale={scale * 1.4} geometry={sharedSphereGeometry}>
          <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
        </mesh>
      )}

      {isSelected && (
        <Html
          position={[0, 4 * scale, 0]}
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
                <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-600 leading-none">
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
                <span className="text-[9px] text-slate-600 font-mono leading-none">
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
    </group>
  );
});

NodeMeshWithRef.displayName = 'NodeMeshWithRef';
