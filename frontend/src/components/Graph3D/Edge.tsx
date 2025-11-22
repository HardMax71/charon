import { useMemo } from 'react';
import { QuadraticBezierLine } from '@react-three/drei';
import { Vector3, Euler, Quaternion } from 'three';
import { Edge as EdgeType, Node } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';

interface EdgeProps {
  edge: EdgeType;
  nodes: Node[];
  removedEdgeIds?: string[];
  addedEdgeIds?: string[];
}

export const Edge = ({ edge, nodes, removedEdgeIds = [], addedEdgeIds = [] }: EdgeProps) => {
  const { setSelectedEdge } = useGraphStore();
  const { setShowDependencyModal, selectedModule } = useUIStore();

  // 1. Calculate data (returns null if invalid)
  const edgeData = useMemo(() => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return null;

    const start = new Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z);
    const end = new Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z);

    // Gentle Arc
    const midPoint = new Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5)
      .add(new Vector3(0, start.distanceTo(end) * 0.15, 0)); // Proportional height

    // Arrow logic - Calculate tangent at end of quadratic Bezier curve
    // For quadratic Bezier, tangent at end is: 2 * (end - midPoint)
    const tangent = new Vector3().subVectors(end, midPoint).normalize();

    // Position arrow slightly before the end point (offset by node radius + small gap)
    const arrowOffset = tangent.clone().multiplyScalar(3.5);
    const arrowPosition = new Vector3().copy(end).sub(arrowOffset);

    // Rotate arrow to point in the direction of the tangent
    const arrowRotation = new Euler().setFromQuaternion(
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tangent)
    );

    // Style Logic
    // Default: Much darker and thicker for visibility against white
    let color = '#64748b'; // Slate-500
    let opacity = 0.6;     // Higher default opacity
    let width = 1.2;       // Thicker default line

    // Removed Edge: RED (highest priority - stays visible after removal)
    if (removedEdgeIds.includes(edge.id)) {
      color = '#ef4444'; // Red-500
      opacity = 1.0;
      width = 3.0; // Extra thick to stand out
    }
    // Added Edge: GREEN (second priority)
    else if (addedEdgeIds.includes(edge.id)) {
      color = '#10b981'; // Emerald-500
      opacity = 1.0;
      width = 2.5; // Thicker to stand out
    }
    // Circular Dependency Edge: RED (third priority - from edge data)
    else if (edge.color) {
      color = edge.color;
      opacity = 0.9;
      width = 2.0; // Thicker to highlight circular dependencies
    }
    // Module Filter Focus
    else if (selectedModule) {
      const sIn = sourceNode.module === selectedModule || (sourceNode.module && sourceNode.module.startsWith(selectedModule + '.'));
      const tIn = targetNode.module === selectedModule || (targetNode.module && targetNode.module.startsWith(selectedModule + '.'));

      if (sIn || tIn) {
        color = '#0d9488'; // Teal-600 (Active)
        opacity = 0.9;
        width = 2.5;
      } else {
        opacity = 0.05; // Fade others
      }
    }

    return { start, end, midPoint, arrowPosition, arrowRotation, edgeColor: color, edgeOpacity: opacity, lineWidth: width };
  }, [edge, nodes, selectedModule, removedEdgeIds, addedEdgeIds]);

  // 2. Safe check before rendering
  if (!edgeData) return null;

  const { start, end, midPoint, arrowPosition, arrowRotation, edgeColor, edgeOpacity, lineWidth } = edgeData;

  return (
    <group onClick={(e) => { e.stopPropagation(); setSelectedEdge(edge); setShowDependencyModal(true); }}>
      {/* Visual Line */}
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={midPoint}
        color={edgeColor}
        lineWidth={lineWidth}
        transparent
        opacity={edgeOpacity}
      />

      {/* Hitbox Line (Invisible, thicker for clicking) */}
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={midPoint}
        lineWidth={4}
        visible={false}
      />

      {/* Arrow Head */}
      {edgeOpacity > 0.1 && (
        <mesh position={arrowPosition} rotation={arrowRotation}>
          <coneGeometry args={[0.8, 2, 16]} />
          <meshBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} />
        </mesh>
      )}
    </group>
  );
};