import { memo, useMemo, useRef, useCallback } from 'react';
import { Line } from '@react-three/drei';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import {
  Vector3,
  ConeGeometry,
  Quaternion,
  CatmullRomCurve3,
  Mesh
} from 'three';
import { Edge as EdgeType, Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphModifiers, VisualModifiers } from '../context/GraphContext';
import { useUIStore, GraphFilters } from '@/stores/uiStore';
import { useGraphStore } from '@/stores/graphStore';
import { nodeMatchesFilters } from '@/utils/graphFilters';

const CURVE_SEGMENTS = 12;

// Shared geometry for arrow heads
const sharedConeGeometry = new ConeGeometry(0.8, 2, 8);

// Reusable vectors for curve computation
const tempStart = new Vector3();
const tempEnd = new Vector3();
const tempMid = new Vector3();
const tempTangent = new Vector3();
const tempQuat = new Quaternion();
const tempUp = new Vector3(0, 1, 0);

interface BatchedEdgesProps {
  edges: EdgeType[];
  nodes: NodeType[];
}

// Compute bezier curve points into a flat array for setPositions
const computeCurvePositions = (
  start: Vector3,
  end: Vector3,
  out: Float32Array
): void => {
  const dist = start.distanceTo(end);
  tempMid.addVectors(start, end).multiplyScalar(0.5);
  tempMid.y += dist * 0.15;

  for (let i = 0; i <= CURVE_SEGMENTS; i++) {
    const t = i / CURVE_SEGMENTS;
    const oneMinusT = 1 - t;

    const idx = i * 3;
    out[idx] = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * tempMid.x + t * t * end.x;
    out[idx + 1] = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * tempMid.y + t * t * end.y;
    out[idx + 2] = oneMinusT * oneMinusT * start.z + 2 * oneMinusT * t * tempMid.z + t * t * end.z;
  }
};

// Compute initial points as array of tuples for Line component
const computeInitialPoints = (
  start: Vector3,
  end: Vector3
): [number, number, number][] => {
  const dist = start.distanceTo(end);
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.y += dist * 0.15;

  const points: [number, number, number][] = [];

  for (let i = 0; i <= CURVE_SEGMENTS; i++) {
    const t = i / CURVE_SEGMENTS;
    const oneMinusT = 1 - t;

    const x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * mid.x + t * t * end.x;
    const y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * mid.y + t * t * end.y;
    const z = oneMinusT * oneMinusT * start.z + 2 * oneMinusT * t * mid.z + t * t * end.z;

    points.push([x, y, z]);
  }

  return points;
};

const getEdgeStyle = (
  edge: EdgeType,
  sourceNode: NodeType,
  targetNode: NodeType,
  modifiers: VisualModifiers,
  selectedModule: string | null,
  graphFilters: GraphFilters,
  filtersActive: boolean
): { color: string; opacity: number; lineWidth: number } => {
  const isRemoved = modifiers.removedEdgeIds.includes(edge.id);
  const isAdded = modifiers.addedEdgeIds.includes(edge.id);
  const matchesFilter = nodeMatchesFilters(sourceNode, graphFilters, filtersActive) ||
                        nodeMatchesFilters(targetNode, graphFilters, filtersActive);

  if (!matchesFilter) return { color: '#64748b', opacity: 0.02, lineWidth: 0.5 };
  if (isRemoved) return { color: '#ef4444', opacity: 1.0, lineWidth: 3 };
  if (isAdded) return { color: '#10b981', opacity: 1.0, lineWidth: 3 };
  if (edge.color) return { color: edge.color, opacity: 0.9, lineWidth: 2.5 };

  if (selectedModule) {
    const sourceInModule = sourceNode.module === selectedModule ||
      (sourceNode.module?.startsWith(selectedModule + '.') ?? false);
    const targetInModule = targetNode.module === selectedModule ||
      (targetNode.module?.startsWith(selectedModule + '.') ?? false);

    if (sourceInModule || targetInModule) {
      return { color: '#0d9488', opacity: 0.9, lineWidth: 3 };
    }
    return { color: '#64748b', opacity: 0.1, lineWidth: 1 };
  }

  return { color: '#64748b', opacity: 0.7, lineWidth: 2 };
};

interface EdgeLineProps {
  edge: EdgeType;
  sourceNode: NodeType;
  targetNode: NodeType;
  modifiers: VisualModifiers;
  selectedModule: string | null;
  graphFilters: GraphFilters;
  filtersActive: boolean;
  nodePositionsRef: ReturnType<typeof useGraphContext>['nodePositionsRef'];
}

const EdgeLine = memo(({
  edge,
  sourceNode,
  targetNode,
  modifiers,
  selectedModule,
  graphFilters,
  filtersActive,
  nodePositionsRef
}: EdgeLineProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);
  const arrowRef = useRef<Mesh>(null);
  const positionsBuffer = useRef(new Float32Array((CURVE_SEGMENTS + 1) * 3));
  const lastHashRef = useRef<string>('');

  const setSelectedEdge = useGraphStore(state => state.setSelectedEdge);
  const { selectNode } = useGraphContext();

  // Get initial positions
  const sourcePos = nodePositionsRef.current.get(edge.source);
  const targetPos = nodePositionsRef.current.get(edge.target);

  const initialStart = sourcePos ?? new Vector3(
    sourceNode.position.x,
    sourceNode.position.y,
    sourceNode.position.z
  );
  const initialEnd = targetPos ?? new Vector3(
    targetNode.position.x,
    targetNode.position.y,
    targetNode.position.z
  );

  const initialPoints = useMemo(() => computeInitialPoints(initialStart, initialEnd), [
    initialStart.x, initialStart.y, initialStart.z,
    initialEnd.x, initialEnd.y, initialEnd.z
  ]);

  // Create hitbox curve for click detection
  const hitboxCurve = useMemo(() => {
    const points = initialPoints.map(p => new Vector3(p[0], p[1], p[2]));
    return new CatmullRomCurve3(points);
  }, [initialPoints]);

  const style = useMemo(() => getEdgeStyle(
    edge, sourceNode, targetNode, modifiers, selectedModule, graphFilters, filtersActive
  ), [edge, sourceNode, targetNode, modifiers, selectedModule, graphFilters, filtersActive]);

  // Update positions every frame when nodes move
  useFrame(() => {
    const srcPos = nodePositionsRef.current.get(edge.source);
    const tgtPos = nodePositionsRef.current.get(edge.target);
    if (!srcPos || !tgtPos) return;

    // Dirty check
    const hash = `${srcPos.x.toFixed(2)},${srcPos.y.toFixed(2)},${srcPos.z.toFixed(2)},${tgtPos.x.toFixed(2)},${tgtPos.y.toFixed(2)},${tgtPos.z.toFixed(2)}`;
    if (hash === lastHashRef.current) return;
    lastHashRef.current = hash;

    tempStart.copy(srcPos);
    tempEnd.copy(tgtPos);
    computeCurvePositions(tempStart, tempEnd, positionsBuffer.current);

    if (lineRef.current?.geometry) {
      lineRef.current.geometry.setPositions(positionsBuffer.current);
    }

    // Update arrow position and rotation
    if (arrowRef.current) {
      const dist = tempStart.distanceTo(tempEnd);
      tempMid.addVectors(tempStart, tempEnd).multiplyScalar(0.5);
      tempMid.y += dist * 0.15;

      // Tangent at end of curve points toward target
      tempTangent.subVectors(tempEnd, tempMid).normalize();

      // Position arrow slightly before the end
      arrowRef.current.position.copy(tempEnd).sub(tempTangent.clone().multiplyScalar(3.5));

      // Orient arrow to point along tangent
      tempQuat.setFromUnitVectors(tempUp, tempTangent);
      arrowRef.current.quaternion.copy(tempQuat);
    }
  });

  // Click handler
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectNode(null);
    setSelectedEdge(edge);
  }, [edge, setSelectedEdge, selectNode]);

  // Compute initial arrow position/rotation
  const initialArrowData = useMemo(() => {
    const dist = initialStart.distanceTo(initialEnd);
    const mid = new Vector3().addVectors(initialStart, initialEnd).multiplyScalar(0.5);
    mid.y += dist * 0.15;

    const tangent = new Vector3().subVectors(initialEnd, mid).normalize();
    const position = initialEnd.clone().sub(tangent.clone().multiplyScalar(3.5));
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tangent);

    return { position, quaternion };
  }, [initialStart, initialEnd]);

  return (
    <group
      onClick={handleClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Visible line */}
      <Line
        ref={lineRef}
        points={initialPoints}
        color={style.color}
        lineWidth={style.lineWidth}
        transparent
        opacity={style.opacity}
      />

      {/* Invisible hitbox tube for easier clicking */}
      <mesh raycast={undefined}>
        <tubeGeometry args={[hitboxCurve, CURVE_SEGMENTS, 2.5, 6, false]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Arrow head - only visible when edge is visible enough */}
      {style.opacity > 0.1 && (
        <mesh
          ref={arrowRef}
          position={initialArrowData.position}
          quaternion={initialArrowData.quaternion}
          geometry={sharedConeGeometry}
        >
          <meshBasicMaterial color={style.color} depthWrite />
        </mesh>
      )}
    </group>
  );
});

EdgeLine.displayName = 'EdgeLine';

export const BatchedEdges = memo(({ edges, nodes }: BatchedEdgesProps) => {
  const { nodePositionsRef } = useGraphContext();
  const modifiers = useGraphModifiers();
  const selectedModule = useUIStore(state => state.selectedModule);
  const graphFilters = useUIStore(state => state.graphFilters);
  const hasActiveFilters = useUIStore(state => state.hasActiveFilters);
  const filtersActive = hasActiveFilters();

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeType>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <group>
      {edges.map(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (!sourceNode || !targetNode) return null;

        return (
          <EdgeLine
            key={edge.id}
            edge={edge}
            sourceNode={sourceNode}
            targetNode={targetNode}
            modifiers={modifiers}
            selectedModule={selectedModule}
            graphFilters={graphFilters}
            filtersActive={filtersActive}
            nodePositionsRef={nodePositionsRef}
          />
        );
      })}
    </group>
  );
});

BatchedEdges.displayName = 'BatchedEdges';
