import { Node, Edge } from '@/types/graph';

export const applyCircularLayout = (nodes: Node[]): Node[] => {
  const radius = 70;
  const angleStep = (2 * Math.PI) / nodes.length;

  return nodes.map((node, index) => {
    const angle = index * angleStep;
    return {
      ...node,
      position: {
        x: radius * Math.cos(angle),
        y: 0,
        z: radius * Math.sin(angle),
      },
    };
  });
};

export const applyForceDirectedLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  const iterations = 50;
  const repulsion = 500;
  const attraction = 0.01;
  const damping = 0.9;

  const positions = nodes.map((node) => ({
    id: node.id,
    x: node.position.x || Math.random() * 30 - 15,
    y: node.position.y || Math.random() * 30 - 15,
    z: node.position.z || Math.random() * 30 - 15,
    vx: 0,
    vy: 0,
    vz: 0,
  }));

  // Build index map once for O(1) lookups (instead of O(n) findIndex per edge)
  const idToIndex = new Map(positions.map((p, i) => [p.id, i]));

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsive forces
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dz = positions[j].z - positions[i].z;
        const distSq = dx * dx + dy * dy + dz * dz + 0.1;
        const dist = Math.sqrt(distSq);
        const force = repulsion / distSq;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        positions[i].vx -= fx;
        positions[i].vy -= fy;
        positions[i].vz -= fz;
        positions[j].vx += fx;
        positions[j].vy += fy;
        positions[j].vz += fz;
      }
    }

    // Attractive forces for edges
    edges.forEach((edge) => {
      const sourceIdx = idToIndex.get(edge.source);
      const targetIdx = idToIndex.get(edge.target);

      if (sourceIdx !== undefined && targetIdx !== undefined) {
        const dx = positions[targetIdx].x - positions[sourceIdx].x;
        const dy = positions[targetIdx].y - positions[sourceIdx].y;
        const dz = positions[targetIdx].z - positions[sourceIdx].z;

        positions[sourceIdx].vx += dx * attraction;
        positions[sourceIdx].vy += dy * attraction;
        positions[sourceIdx].vz += dz * attraction;
        positions[targetIdx].vx -= dx * attraction;
        positions[targetIdx].vy -= dy * attraction;
        positions[targetIdx].vz -= dz * attraction;
      }
    });

    // Update positions
    positions.forEach((pos) => {
      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.z += pos.vz;
      pos.vx *= damping;
      pos.vy *= damping;
      pos.vz *= damping;
    });
  }

  // Build position map for O(1) final lookups
  const positionMap = new Map(positions.map((p) => [p.id, p]));

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    return {
      ...node,
      position: pos ? { x: pos.x, y: pos.y, z: pos.z } : node.position,
    };
  });
};

export const resetToOriginalLayout = (nodes: Node[], originalNodes: Node[]): Node[] => {
  const originalMap = new Map(originalNodes.map((n) => [n.id, n]));
  return nodes.map((node) => {
    const original = originalMap.get(node.id);
    return {
      ...node,
      position: original ? original.position : node.position,
    };
  });
};
