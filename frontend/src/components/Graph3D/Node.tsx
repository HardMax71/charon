import { useRef, useEffect } from 'react';
import { Mesh, Vector3, Vector2, Plane, Raycaster } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Node as NodeType } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';

interface NodeProps {
  node: NodeType;
}

export const Node = ({ node }: NodeProps) => {
  const meshRef = useRef<Mesh>(null);
  const { graph, selectedNode, setSelectedNode, setHoveredNode, updateNodePosition, updateNodePositions, impactAnalysis } = useGraphStore();
  const { selectedModule, isDraggingNode, setIsDraggingNode } = useUIStore();
  const { camera, gl } = useThree();

  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new Vector3());
  const raycaster = useRef(new Raycaster());

  const isSelected = selectedNode?.id === node.id;

  // Check if this node is affected by impact analysis
  const impactDistance = impactAnalysis?.affected_nodes?.[node.id];
  const isAffected = impactDistance !== undefined;
  const impactColor = impactAnalysis?.affected_node_details?.find(n => n.id === node.id)?.color;

  // Check if this node belongs to the selected module (supports hierarchical matching)
  const isInSelectedModule = !selectedModule ||
    node.module === selectedModule ||
    (node.module && node.module.startsWith(selectedModule + '.'));

  // Scale: proportional to complexity (base size + complexity bonus)
  // Base scale determined by selection state
  const complexity = node.metrics.cyclomatic_complexity || 0;
  const complexityScale = 1 + Math.min(complexity / 20, 0.5); // Up to 50% larger for high complexity

  let baseScale = 1;
  if (isSelected) {
    baseScale = 1.5;
  } else if (isAffected && impactDistance === 1) {
    baseScale = 1.3; // Direct dependents are larger
  } else if (isAffected) {
    baseScale = 1.1; // Other affected nodes slightly larger
  } else if (isInSelectedModule && selectedModule) {
    baseScale = 1.2; // Slightly enlarged for module filter
  }

  // Final scale = base scale * complexity scale
  const scale = baseScale * complexityScale;

  // Opacity and emissive:
  // - Hot zones override base color with red/orange
  // - Impact analysis takes priority over module filter
  // - Unaffected nodes are faded when impact analysis is active
  let isDimmed = false;
  let opacity = 1.0;
  let emissiveIntensity = 0.2;
  let displayColor = node.color;

  // Hot zone coloring (highest priority when not in impact mode)
  const isHotZone = node.metrics.is_hot_zone;
  const hotZoneSeverity = node.metrics.hot_zone_severity;

  if (!impactAnalysis && isHotZone) {
    // Hot zones get special colors
    switch (hotZoneSeverity) {
      case 'critical':
        displayColor = '#dc2626'; // Red
        emissiveIntensity = 0.4;
        break;
      case 'warning':
        displayColor = '#f97316'; // Orange
        emissiveIntensity = 0.3;
        break;
      default:
        displayColor = node.color;
    }
  }

  if (impactAnalysis) {
    // Impact analysis mode
    if (isAffected) {
      // Affected nodes: use impact color
      displayColor = impactColor || node.color;
      opacity = 1.0;
      emissiveIntensity = isSelected ? 0.5 : 0.3;
    } else {
      // Unaffected nodes: slight fade (much less aggressive)
      isDimmed = true;
      opacity = 0.7;
      emissiveIntensity = 0.1;
    }
  } else if (selectedModule) {
    // Module filter mode (only if no impact analysis)
    isDimmed = !isInSelectedModule;
    opacity = isDimmed ? 0.35 : 1.0;
    emissiveIntensity = isSelected ? 0.5 : (isDimmed ? 0.0 : 0.2);
  } else {
    // Normal mode (with hot zone colors already applied above)
    emissiveIntensity = isSelected ? 0.5 : (isHotZone ? emissiveIntensity : 0.2);
  }

  // Drag handlers - only for selected node
  const handlePointerDown = (e: any) => {
    // Only allow dragging if this is the selected node
    if (!isSelected) return;

    e.stopPropagation();
    setIsDraggingNode(true);

    // Set drag plane at current node position
    dragPlane.current.setFromNormalAndCoplanarPoint(
      new Vector3(0, 1, 0),
      new Vector3(node.position.x, node.position.y, node.position.z)
    );

    // Calculate offset between click point and node center
    const intersectPoint = new Vector3();
    const mousePos = new Vector2(
      (e.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mousePos, camera);
    raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint);
    dragOffset.current.subVectors(
      new Vector3(node.position.x, node.position.y, node.position.z),
      intersectPoint
    );

    gl.domElement.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: any) => {
    if (!isDraggingNode) return;
    e.stopPropagation();

    // Calculate new position
    const intersectPoint = new Vector3();
    const mousePos = new Vector2(
      (e.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mousePos, camera);

    if (raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint)) {
      const newPosition = intersectPoint.add(dragOffset.current);

      // If module filter is active, move all nodes in the module
      if (selectedModule && graph) {
        const nodesToMove = graph.nodes.filter(
          (n) => n.module === selectedModule ||
                 (n.module && n.module.startsWith(selectedModule + '.'))
        );

        // Calculate delta from current node position
        const delta = {
          x: newPosition.x - node.position.x,
          y: newPosition.y - node.position.y,
          z: newPosition.z - node.position.z,
        };

        // Update all nodes in module
        const updates = nodesToMove.map((n) => ({
          nodeId: n.id,
          position: {
            x: n.position.x + delta.x,
            y: n.position.y + delta.y,
            z: n.position.z + delta.z,
          },
        }));

        updateNodePositions(updates);
      } else {
        // Just move this node
        updateNodePosition(node.id, {
          x: newPosition.x,
          y: newPosition.y,
          z: newPosition.z,
        });
      }
    }
  };

  const handlePointerUp = () => {
    setIsDraggingNode(false);
    gl.domElement.style.cursor = 'pointer';
  };

  // Attach global event listeners when dragging this node
  useEffect(() => {
    if (!isDraggingNode || !isSelected) return;

    const canvas = gl.domElement;

    const handleGlobalMove = (e: PointerEvent) => {
      handlePointerMove(e);
    };

    const handleGlobalUp = () => {
      handlePointerUp();
    };

    canvas.addEventListener('pointermove', handleGlobalMove);
    canvas.addEventListener('pointerup', handleGlobalUp);
    canvas.addEventListener('pointercancel', handleGlobalUp);

    return () => {
      canvas.removeEventListener('pointermove', handleGlobalMove);
      canvas.removeEventListener('pointerup', handleGlobalUp);
      canvas.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, [isDraggingNode, isSelected]);

  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[node.position.x, node.position.y, node.position.z]}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNode(node);
      }}
      onPointerDown={handlePointerDown}
      onPointerOver={() => {
        setHoveredNode(node);
        gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHoveredNode(null);
        if (!isDraggingNode) {
          gl.domElement.style.cursor = 'default';
        }
      }}
    >
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial
        color={displayColor}
        emissive={isDimmed ? '#000000' : displayColor}
        emissiveIntensity={emissiveIntensity}
        opacity={opacity}
        transparent={opacity < 1.0}
        depthWrite={opacity >= 1.0}
        depthTest={true}
      />

      {isSelected && (
        <Html distanceFactor={10}>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none">
            {node.label}
          </div>
        </Html>
      )}
    </mesh>
  );
};
