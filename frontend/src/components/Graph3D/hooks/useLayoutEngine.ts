import { useCallback, useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useGraphLayout } from '../context/GraphContext';
import { Node, Edge } from '@/types/graph';

// Reusable vector to avoid allocations
const tempVec = new Vector3();

/**
 * Calculate circular layout positions
 */
function calculateCircularLayout(nodes: Node[]): Map<string, Vector3> {
  const positions = new Map<string, Vector3>();
  const count = nodes.length;
  const radius = Math.max(30, count * 2);

  nodes.forEach((node, i) => {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0;
    positions.set(node.id, new Vector3(x, y, z));
  });

  return positions;
}

/**
 * Calculate force-directed layout positions
 * Simple implementation - positions nodes based on connections
 */
function calculateForceLayout(nodes: Node[], edges: Edge[]): Map<string, Vector3> {
  const positions = new Map<string, Vector3>();

  // Initialize with current positions or random
  nodes.forEach(node => {
    positions.set(node.id, new Vector3(
      node.position.x + (Math.random() - 0.5) * 10,
      node.position.y + (Math.random() - 0.5) * 10,
      node.position.z + (Math.random() - 0.5) * 10
    ));
  });

  // Build adjacency for force calculation
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach(n => adjacency.set(n.id, new Set()));

  edges.forEach(edge => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  // Simple force simulation (few iterations for responsiveness)
  const iterations = 50;
  const repulsion = 500;
  const attraction = 0.1;
  const damping = 0.9;

  const velocities = new Map<string, Vector3>();
  nodes.forEach(n => velocities.set(n.id, new Vector3()));

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const posA = positions.get(nodes[i].id)!;
        const posB = positions.get(nodes[j].id)!;

        tempVec.subVectors(posA, posB);
        const dist = Math.max(tempVec.length(), 1);
        const force = repulsion / (dist * dist);

        tempVec.normalize().multiplyScalar(force);

        velocities.get(nodes[i].id)!.add(tempVec);
        velocities.get(nodes[j].id)!.sub(tempVec);
      }
    }

    // Attraction along edges
    edges.forEach(edge => {
      const posA = positions.get(edge.source);
      const posB = positions.get(edge.target);
      if (!posA || !posB) return;

      tempVec.subVectors(posB, posA);
      const dist = tempVec.length();

      tempVec.normalize().multiplyScalar(dist * attraction);

      velocities.get(edge.source)?.add(tempVec);
      velocities.get(edge.target)?.sub(tempVec);
    });

    // Apply velocities with damping
    nodes.forEach(node => {
      const pos = positions.get(node.id)!;
      const vel = velocities.get(node.id)!;

      pos.add(vel);
      vel.multiplyScalar(damping);
    });
  }

  return positions;
}

/**
 * Hook for managing layout calculations and transitions
 */
export function useLayoutEngine() {
  const { layout, setLayout, nodePositionsRef, originalPositionsRef, graph } = useGraphLayout();
  const isAnimatingRef = useRef(false);
  const prevLayoutRef = useRef<string | null>(null);

  // Apply layout when it changes
  useEffect(() => {
    if (!graph || graph.nodes.length === 0) return;
    if (prevLayoutRef.current === layout) return;

    prevLayoutRef.current = layout;

    let newPositions: Map<string, Vector3>;

    switch (layout) {
      case 'circular':
        newPositions = calculateCircularLayout(graph.nodes);
        break;
      case 'force':
        newPositions = calculateForceLayout(graph.nodes, graph.edges);
        break;
      case 'hierarchical':
      default:
        // Reset to original positions
        newPositions = new Map();
        originalPositionsRef.current.forEach((pos, id) => {
          newPositions.set(id, pos.clone());
        });
        break;
    }

    // Apply new positions to ref (no React re-render!)
    newPositions.forEach((pos, id) => {
      const current = nodePositionsRef.current.get(id);
      if (current) {
        current.copy(pos);
      } else {
        nodePositionsRef.current.set(id, pos);
      }
    });

  }, [layout, graph, nodePositionsRef, originalPositionsRef]);

  // Manual layout application (for imperative use)
  const applyLayout = useCallback((type: typeof layout) => {
    setLayout(type);
  }, [setLayout]);

  return {
    layout,
    applyLayout,
    isAnimating: isAnimatingRef.current,
  };
}
