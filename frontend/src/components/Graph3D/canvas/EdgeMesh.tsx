import { memo, useMemo, useRef, useCallback, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3, Quaternion, ConeGeometry, QuadraticBezierCurve3, Mesh, CatmullRomCurve3 } from 'three';
import { Edge as EdgeType, Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphModifiers, useGraphSelection } from '../context/GraphContext';
import { useUIStore, GraphFilters } from '@/stores/uiStore';
import { useGraphStore } from '@/stores/graphStore';
import { nodeMatchesFilters } from '@/utils/graphFilters';

// Type for Line2 geometry from drei's Line component
interface LineRef {
  geometry: {
    setPositions: (positions: Float32Array | number[]) => void;
  };
}

const sharedConeGeometry = new ConeGeometry(0.8, 2, 8);
const CURVE_SEGMENTS = 12;

const reusableCurve = new QuadraticBezierCurve3(new Vector3(), new Vector3(), new Vector3());

function computeBezierPoints(start: Vector3, end: Vector3, mid: Vector3, points: Vector3[]): void {
  reusableCurve.v0.copy(start);
  reusableCurve.v1.copy(mid);
  reusableCurve.v2.copy(end);

  for (let i = 0; i <= CURVE_SEGMENTS; i++) {
    const t = i / CURVE_SEGMENTS;
    reusableCurve.getPoint(t, points[i]);
  }
}

interface EdgeMeshProps {
  edge: EdgeType;
  sourceNode: NodeType;
  targetNode: NodeType;
  graphFilters: GraphFilters;
  filtersActive: boolean;
}

interface EdgeGroupProps {
  edges: EdgeType[];
  nodes: NodeType[];
}

export const EdgeGroup = memo(({ edges, nodes }: EdgeGroupProps) => {
  const { nodePositionsRef } = useGraphContext();
  const graphFilters = useUIStore(state => state.graphFilters);
  const hasActiveFilters = useUIStore(state => state.hasActiveFilters);
  const filtersActive = hasActiveFilters();

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeType>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  const edgeRefs = useRef<Map<string, { line: LineRef | null; arrow: Mesh | null }>>(new Map());

  const tempVecs = useRef({
    start: new Vector3(),
    end: new Vector3(),
    mid: new Vector3(),
    midOffset: new Vector3(0, 1, 0),
    tangent: new Vector3(),
    offset: new Vector3(),
    quat: new Quaternion(),
    up: new Vector3(0, 1, 0),
  });

  const sharedPointsArray = useRef<Vector3[]>(
    Array.from({ length: CURVE_SEGMENTS + 1 }, () => new Vector3())
  );

  const sharedPositionsArray = useRef<Float32Array>(
    new Float32Array((CURVE_SEGMENTS + 1) * 3)
  );

  useFrame(() => {
    const { start, end, mid, midOffset, tangent, offset, quat, up } = tempVecs.current;
    const points = sharedPointsArray.current;
    const positions = sharedPositionsArray.current;

    edgeRefs.current.forEach((refs, edgeId) => {
      const [sourceId, targetId] = edgeId.split('->');
      const sourcePos = nodePositionsRef.current.get(sourceId);
      const targetPos = nodePositionsRef.current.get(targetId);

      if (!sourcePos || !targetPos || !refs.line?.geometry) return;

      start.copy(sourcePos);
      end.copy(targetPos);
      const dist = start.distanceTo(end);
      mid.addVectors(start, end).multiplyScalar(0.5);
      midOffset.set(0, dist * 0.15, 0);
      mid.add(midOffset);

      computeBezierPoints(start, end, mid, points);

      for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i].x;
        positions[i * 3 + 1] = points[i].y;
        positions[i * 3 + 2] = points[i].z;
      }
      refs.line.geometry.setPositions(positions);

      if (refs.arrow) {
        tangent.subVectors(end, mid).normalize();
        offset.copy(tangent).multiplyScalar(3.5);
        refs.arrow.position.copy(end).sub(offset);
        quat.setFromUnitVectors(up, tangent);
        refs.arrow.quaternion.copy(quat);
      }
    });
  });

  const registerEdge = useCallback((edgeId: string, line: LineRef | null, arrow: Mesh | null) => {
    if (line) {
      edgeRefs.current.set(edgeId, { line, arrow });
    } else {
      edgeRefs.current.delete(edgeId);
    }
  }, []);

  return (
    <group>
      {edges.map(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (!sourceNode || !targetNode) return null;

        return (
          <EdgeMeshWithRef
            key={edge.id}
            edge={edge}
            sourceNode={sourceNode}
            targetNode={targetNode}
            graphFilters={graphFilters}
            filtersActive={filtersActive}
            registerEdge={registerEdge}
          />
        );
      })}
    </group>
  );
});

EdgeGroup.displayName = 'EdgeGroup';

interface EdgeMeshWithRefProps extends EdgeMeshProps {
  registerEdge: (edgeId: string, line: LineRef | null, arrow: Mesh | null) => void;
}

const EdgeMeshWithRef = memo(({ edge, sourceNode, targetNode, graphFilters, filtersActive, registerEdge }: EdgeMeshWithRefProps) => {
  const { nodePositionsRef } = useGraphContext();
  const { selectNode } = useGraphSelection();
  const modifiers = useGraphModifiers();
  const selectedModule = useUIStore(state => state.selectedModule);
  const setSelectedEdge = useGraphStore(state => state.setSelectedEdge);

  const lineRef = useRef<LineRef | null>(null);
  const arrowRef = useRef<Mesh>(null);

  const isRemoved = modifiers.removedEdgeIds.includes(edge.id);
  const isAdded = modifiers.addedEdgeIds.includes(edge.id);

  const edgeMatchesFilters = useMemo(
    () => nodeMatchesFilters(sourceNode, graphFilters, filtersActive) ||
          nodeMatchesFilters(targetNode, graphFilters, filtersActive),
    [sourceNode, targetNode, graphFilters, filtersActive]
  );

  const pointsRef = useRef<Vector3[]>(
    Array.from({ length: CURVE_SEGMENTS + 1 }, () => new Vector3())
  );

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectNode(null);
    setSelectedEdge(edge);
  }, [edge, setSelectedEdge, selectNode]);

  const { color, opacity, lineWidth } = useMemo(() => {
    let c = '#64748b';
    let op = 0.7;
    let w = 2.5;

    if (isRemoved) {
      c = '#ef4444';
      op = 1.0;
      w = 4.0;
    } else if (isAdded) {
      c = '#10b981';
      op = 1.0;
      w = 3.5;
    } else if (edge.color) {
      c = edge.color;
      op = 0.9;
      w = 3.0;
    } else if (selectedModule) {
      const sIn = sourceNode.module === selectedModule ||
        (sourceNode.module && sourceNode.module.startsWith(selectedModule + '.'));
      const tIn = targetNode.module === selectedModule ||
        (targetNode.module && targetNode.module.startsWith(selectedModule + '.'));

      if (sIn || tIn) {
        c = '#0d9488';
        op = 0.9;
        w = 3.5;
      } else {
        op = 0.1;
        w = 1.5;
      }
    }

    if (!edgeMatchesFilters) {
      op = 0.02;
      w = 0.5;
    }

    return { color: c, opacity: op, lineWidth: w };
  }, [isRemoved, isAdded, edge.color, selectedModule, sourceNode.module, targetNode.module, edgeMatchesFilters]);

  useEffect(() => {
    const edgeId = `${edge.source}->${edge.target}`;
    registerEdge(edgeId, lineRef.current, arrowRef.current);
    return () => registerEdge(edgeId, null, null);
  }, [edge.source, edge.target, registerEdge]);

  const sourcePos = nodePositionsRef.current.get(edge.source);
  const targetPos = nodePositionsRef.current.get(edge.target);

  if (!sourcePos || !targetPos) return null;

  const start = sourcePos.clone();
  const end = targetPos.clone();
  const mid = new Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5)
    .add(new Vector3(0, start.distanceTo(end) * 0.15, 0));

  computeBezierPoints(start, end, mid, pointsRef.current);
  const initialPoints = pointsRef.current.map(p => p.toArray() as [number, number, number]);

  const tangent = new Vector3().subVectors(end, mid).normalize();
  const arrowPos = end.clone().sub(tangent.clone().multiplyScalar(3.5));

  const hitboxCurve = useMemo(() => {
    return new CatmullRomCurve3(pointsRef.current.map(p => p.clone()));
  }, []);

  return (
    <group
      onClick={handleClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <Line
        ref={lineRef}
        points={initialPoints}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />

      <mesh>
        <tubeGeometry args={[hitboxCurve, CURVE_SEGMENTS, 2.5, 6, false]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {opacity > 0.1 && (
        <mesh ref={arrowRef} position={arrowPos} geometry={sharedConeGeometry}>
          <meshBasicMaterial color={color} depthWrite={true} />
        </mesh>
      )}
    </group>
  );
});

EdgeMeshWithRef.displayName = 'EdgeMeshWithRef';
