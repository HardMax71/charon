import { useMemo } from 'react';
import { QuadraticBezierLine } from '@react-three/drei';
import { Vector3, Euler, Quaternion } from 'three';
import { Edge as EdgeType, Node } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';

interface EdgeProps {
  edge: EdgeType;
  nodes: Node[];
}

export const Edge = ({ edge, nodes }: EdgeProps) => {
  const { setSelectedEdge } = useGraphStore();
  const { setShowDependencyModal, selectedModule } = useUIStore();

  const { start, end, midPoint, arrowPosition, arrowRotation, edgeColor, edgeOpacity, lineWidth, arrowSize } = useMemo(() => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      return {
        start: new Vector3(0, 0, 0),
        end: new Vector3(0, 0, 0),
        midPoint: new Vector3(0, 0, 0),
        arrowPosition: new Vector3(0, 0, 0),
        arrowRotation: new Euler(0, 0, 0),
        edgeColor: '#64748b',
        edgeOpacity: 1,
        lineWidth: edge.thickness,
        arrowSize: { radius: 1, height: 3 },
      };
    }

    const start = new Vector3(
      sourceNode.position.x,
      sourceNode.position.y,
      sourceNode.position.z
    );
    const end = new Vector3(
      targetNode.position.x,
      targetNode.position.y,
      targetNode.position.z
    );

    // Calculate mid-point with slight curve
    const midPoint = new Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5)
      .add(new Vector3(0, 5, 0)); // Slight upward curve

    // Calculate arrow position (near the target node)
    const direction = new Vector3().subVectors(end, midPoint).normalize();
    const arrowPosition = new Vector3().copy(end).sub(direction.multiplyScalar(3)); // 3 units before target

    // Calculate arrow rotation to point toward target
    // Cones in three.js point along +Y axis by default, so we need to rotate from Y to our direction
    const arrowRotation = new Euler();
    const up = new Vector3(0, 1, 0);

    // Calculate the quaternion rotation from up (Y axis) to our direction vector
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(up, direction);
    arrowRotation.setFromQuaternion(quaternion);

    // Determine edge color, opacity, and width based on selected module
    let edgeColor = '#64748b'; // Default gray
    let edgeOpacity = 1;
    let lineWidth = edge.thickness;
    let arrowSize = { radius: 1, height: 3 };

    if (selectedModule) {
      // Check if either source or target is in the selected module (hierarchical matching)
      const sourceInModule = sourceNode.module === selectedModule ||
        (sourceNode.module && sourceNode.module.startsWith(selectedModule + '.'));
      const targetInModule = targetNode.module === selectedModule ||
        (targetNode.module && targetNode.module.startsWith(selectedModule + '.'));

      if (sourceInModule || targetInModule) {
        // Color the edge with the node color (prefer source node color)
        const nodeColor = sourceInModule ? sourceNode.color : targetNode.color;
        // Only use node color if it's defined and not white
        if (nodeColor && nodeColor !== '#ffffff' && nodeColor !== '#fff' && nodeColor.toLowerCase() !== 'white') {
          edgeColor = nodeColor;
        }
        edgeOpacity = 1;
        // Make lines bolder and arrows bigger for selected module edges
        lineWidth = edge.thickness * 2;
        arrowSize = { radius: 1.5, height: 4 };
      } else {
        // Dim edges not connected to selected module
        edgeOpacity = 0.3;
      }
    }

    return { start, end, midPoint, arrowPosition, arrowRotation, edgeColor, edgeOpacity, lineWidth, arrowSize };
  }, [edge, nodes, selectedModule]);

  const handleClick = () => {
    setSelectedEdge(edge);
    setShowDependencyModal(true);
  };

  return (
    <group onClick={handleClick}>
      {/* Visible edge line */}
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={midPoint}
        color={edgeColor}
        lineWidth={lineWidth}
        transparent={edgeOpacity < 1}
        opacity={edgeOpacity}
      />

      {/* Invisible thick hitbox for easier clicking */}
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={midPoint}
        color={edgeColor}
        lineWidth={Math.max(lineWidth * 3, 5)}
        transparent
        opacity={0}
      />

      {/* Arrow cone at the end */}
      <mesh position={arrowPosition} rotation={arrowRotation}>
        <coneGeometry args={[arrowSize.radius, arrowSize.height, 32]} />
        <meshStandardMaterial
          color={edgeColor}
          transparent={edgeOpacity < 1}
          opacity={edgeOpacity}
        />
      </mesh>
    </group>
  );
};
