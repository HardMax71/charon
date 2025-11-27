import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3, Euler, Quaternion, ConeGeometry, QuadraticBezierCurve3, Mesh } from 'three';
import { Edge as EdgeType, Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphModifiers } from '../context/GraphContext';
import { useUIStore } from '@/stores/uiStore';

// Shared cone geometry for arrows
const sharedConeGeometry = new ConeGeometry(0.8, 2, 16);

// Number of points for bezier curve
const CURVE_SEGMENTS = 20;

// Reusable vectors to avoid allocations
const tempStart = new Vector3();
const tempEnd = new Vector3();
const tempMid = new Vector3();
const tangentVec = new Vector3();
const tempQuat = new Quaternion();
const upVec = new Vector3(0, 1, 0);

interface EdgeMeshProps {
  edge: EdgeType;
  sourceNode: NodeType;
  targetNode: NodeType;
}

/**
 * Compute bezier curve points
 */
function computeBezierPoints(start: Vector3, end: Vector3, mid: Vector3, points: Vector3[]): void {
  const curve = new QuadraticBezierCurve3(start, mid, end);
  const curvePoints = curve.getPoints(CURVE_SEGMENTS);
  for (let i = 0; i < curvePoints.length && i < points.length; i++) {
    points[i].copy(curvePoints[i]);
  }
}

/**
 * Single edge mesh component
 */
const EdgeMesh = memo(({ edge, sourceNode, targetNode }: EdgeMeshProps) => {
  const { nodePositionsRef } = useGraphContext();
  const modifiers = useGraphModifiers();
  const selectedModule = useUIStore(state => state.selectedModule);

  const isRemoved = modifiers.removedEdgeIds.includes(edge.id);
  const isAdded = modifiers.addedEdgeIds.includes(edge.id);

  // Refs for line and arrow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);
  const arrowRef = useRef<Mesh>(null);

  // Pre-allocate points array for bezier curve
  const pointsRef = useRef<Vector3[]>(
    Array.from({ length: CURVE_SEGMENTS + 1 }, () => new Vector3())
  );

  // Update positions from refs each frame
  useFrame(() => {
    const sourcePos = nodePositionsRef.current.get(edge.source);
    const targetPos = nodePositionsRef.current.get(edge.target);

    if (!sourcePos || !targetPos) return;

    // Calculate mid point for arc
    tempStart.copy(sourcePos);
    tempEnd.copy(targetPos);
    tempMid
      .addVectors(tempStart, tempEnd)
      .multiplyScalar(0.5)
      .add(new Vector3(0, tempStart.distanceTo(tempEnd) * 0.15, 0));

    // Update line geometry
    if (lineRef.current?.geometry) {
      computeBezierPoints(tempStart, tempEnd, tempMid, pointsRef.current);
      const positions = new Float32Array(pointsRef.current.length * 3);
      for (let i = 0; i < pointsRef.current.length; i++) {
        positions[i * 3] = pointsRef.current[i].x;
        positions[i * 3 + 1] = pointsRef.current[i].y;
        positions[i * 3 + 2] = pointsRef.current[i].z;
      }
      lineRef.current.geometry.setPositions(positions);
    }

    // Update arrow position and rotation
    if (arrowRef.current) {
      tangentVec.subVectors(tempEnd, tempMid).normalize();
      arrowRef.current.position.copy(tempEnd).sub(tangentVec.clone().multiplyScalar(3.5));
      tempQuat.setFromUnitVectors(upVec, tangentVec);
      arrowRef.current.quaternion.copy(tempQuat);
    }
  });

  // Style calculations
  const { color, opacity, lineWidth } = useMemo(() => {
    let c = '#64748b'; // Slate-500
    let op = 0.6;
    let w = 1.2;

    // Removed edge - red, thick
    if (isRemoved) {
      c = '#ef4444';
      op = 1.0;
      w = 3.0;
    }
    // Added edge - green
    else if (isAdded) {
      c = '#10b981';
      op = 1.0;
      w = 2.5;
    }
    // Custom edge color (e.g., circular dependency)
    else if (edge.color) {
      c = edge.color;
      op = 0.9;
      w = 2.0;
    }
    // Module filter
    else if (selectedModule) {
      const sIn = sourceNode.module === selectedModule ||
        (sourceNode.module && sourceNode.module.startsWith(selectedModule + '.'));
      const tIn = targetNode.module === selectedModule ||
        (targetNode.module && targetNode.module.startsWith(selectedModule + '.'));

      if (sIn || tIn) {
        c = '#0d9488';
        op = 0.9;
        w = 2.5;
      } else {
        op = 0.05;
      }
    }

    return { color: c, opacity: op, lineWidth: w };
  }, [isRemoved, isAdded, edge.color, selectedModule, sourceNode.module, targetNode.module]);

  // Initial positions for first render
  const sourcePos = nodePositionsRef.current.get(edge.source);
  const targetPos = nodePositionsRef.current.get(edge.target);

  if (!sourcePos || !targetPos) return null;

  // Compute initial bezier points
  const start = sourcePos.clone();
  const end = targetPos.clone();
  const mid = new Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5)
    .add(new Vector3(0, start.distanceTo(end) * 0.15, 0));

  computeBezierPoints(start, end, mid, pointsRef.current);
  const initialPoints = pointsRef.current.map(p => p.toArray() as [number, number, number]);

  // Arrow position and rotation
  const tangent = new Vector3().subVectors(end, mid).normalize();
  const arrowPos = end.clone().sub(tangent.clone().multiplyScalar(3.5));
  const arrowRot = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tangent)
  );

  return (
    <group>
      {/* Visual line */}
      <Line
        ref={lineRef}
        points={initialPoints}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />

      {/* Arrow head */}
      {opacity > 0.1 && (
        <mesh ref={arrowRef} position={arrowPos} rotation={arrowRot} geometry={sharedConeGeometry}>
          <meshBasicMaterial color={color} transparent opacity={opacity} />
        </mesh>
      )}
    </group>
  );
});

EdgeMesh.displayName = 'EdgeMesh';

/**
 * Container for all edges
 */
interface EdgeGroupProps {
  edges: EdgeType[];
  nodes: NodeType[];
}

export const EdgeGroup = memo(({ edges, nodes }: EdgeGroupProps) => {
  // Build node lookup map
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
          <EdgeMesh
            key={edge.id}
            edge={edge}
            sourceNode={sourceNode}
            targetNode={targetNode}
          />
        );
      })}
    </group>
  );
});

EdgeGroup.displayName = 'EdgeGroup';
