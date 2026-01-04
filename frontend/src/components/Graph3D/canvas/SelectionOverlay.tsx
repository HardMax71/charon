import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SphereGeometry, Group } from 'three';
import { Node as NodeType } from '@/types/graph';
import { useGraphContext, useGraphModifiers } from '../context/GraphContext';
import { getLanguageColor, STATUS_COLORS, THIRD_PARTY_COLOR } from '@/utils/constants';

const sharedSphereGeometry = new SphereGeometry(3, 16, 16);

interface SelectionOverlayProps {
  nodes: NodeType[];
}

export const SelectionOverlay = memo(({ nodes }: SelectionOverlayProps) => {
  const { selectedNodeId, nodePositionsRef } = useGraphContext();
  const modifiers = useGraphModifiers();
  const groupRef = useRef<Group>(null);
  const highlightRef = useRef<Group>(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const highlightedNode = useMemo(() => {
    if (!modifiers.highlightedNodeId) return null;
    return nodes.find(n => n.id === modifiers.highlightedNodeId) || null;
  }, [nodes, modifiers.highlightedNodeId]);

  // Update positions every frame
  useFrame(() => {
    if (groupRef.current && selectedNode) {
      const pos = nodePositionsRef.current.get(selectedNode.id);
      if (pos) groupRef.current.position.copy(pos);
    }
    if (highlightRef.current && highlightedNode && highlightedNode.id !== selectedNodeId) {
      const pos = nodePositionsRef.current.get(highlightedNode.id);
      if (pos) highlightRef.current.position.copy(pos);
    }
  });

  if (!selectedNode && !highlightedNode) return null;

  const isAdded = selectedNode ? modifiers.addedNodeIds.includes(selectedNode.id) : false;
  const isRemoved = selectedNode ? modifiers.removedNodeIds.includes(selectedNode.id) : false;

  const getNodeFillColor = (node: NodeType): string => {
    // Added/removed use status colors
    if (modifiers.addedNodeIds.includes(node.id)) return STATUS_COLORS.added;
    if (modifiers.removedNodeIds.includes(node.id)) return STATUS_COLORS.removed;
    // Third party uses gray
    if (node.type === 'third_party') return THIRD_PARTY_COLOR;
    // All other nodes use language color
    return getLanguageColor(node.language);
  };

  const selectedColor = selectedNode ? getNodeFillColor(selectedNode) : STATUS_COLORS.default;
  const outlineColor = selectedNode ? getLanguageColor(selectedNode.language) : STATUS_COLORS.default;
  const scale = 1.4;

  return (
    <>
      {selectedNode && (
        <group ref={groupRef}>
          {/* Selection ring - raycast disabled to allow clicks through */}
          <mesh scale={scale * 1.2} geometry={sharedSphereGeometry} raycast={() => null}>
            <meshBasicMaterial color={selectedColor} transparent opacity={0.2} wireframe />
          </mesh>

          {/* Main sphere overlay for selected state - raycast disabled */}
          <mesh scale={scale} geometry={sharedSphereGeometry} raycast={() => null}>
            <meshLambertMaterial
              color={selectedColor}
              emissive={selectedColor}
              emissiveIntensity={0.4}
            />
          </mesh>

          {/* HTML Label */}
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
                  <span className="section-label font-mono leading-none">
                    {isAdded ? 'ADDED' : isRemoved ? 'REMOVED' : selectedNode.type.toUpperCase()}
                  </span>
                  {selectedNode.language && (
                    <span
                      className="text-xs font-bold px-1 py-0.5 rounded text-white leading-none"
                      style={{ backgroundColor: outlineColor }}
                    >
                      {selectedNode.language.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-900 leading-tight">
                  {selectedNode.label}
                </span>
                {selectedNode.service && (
                  <span className="text-xs text-slate-600 font-mono leading-none">
                    {selectedNode.service}
                  </span>
                )}
                {selectedNode.metrics.cyclomatic_complexity > 10 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-mono text-rose-600 font-bold">
                      Complexity: {selectedNode.metrics.cyclomatic_complexity}
                    </span>
                  </div>
                )}
              </div>
              <div className="w-0.5 h-4 bg-slate-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            </div>
          </Html>
        </group>
      )}

      {highlightedNode && highlightedNode.id !== selectedNodeId && (
        <group ref={highlightRef}>
          <mesh scale={1.4} geometry={sharedSphereGeometry} raycast={() => null}>
            <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
          </mesh>
        </group>
      )}
    </>
  );
});

SelectionOverlay.displayName = 'SelectionOverlay';
