import { useEffect, useRef } from 'react';
import { Scene } from './Scene';
import { LayoutSelector } from '../LayoutSelector/LayoutSelector';
import { NodeMetricsModal } from '../NodeMetricsModal/NodeMetricsModal';
import { ControlsLegend } from '../ControlsLegend/ControlsLegend';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';
import { applyCircularLayout, applyForceDirectedLayout, resetToOriginalLayout } from '@/utils/layoutAlgorithms';

interface Graph3DProps {
  hideLayoutSelector?: boolean;
}

export const Graph3D = ({ hideLayoutSelector = false }: Graph3DProps) => {
  const { graph, setGraph } = useGraphStore();
  const { currentLayout } = useUIStore();
  const originalNodesRef = useRef<any[]>([]);

  // Store original node positions on first load
  useEffect(() => {
    if (graph && originalNodesRef.current.length === 0) {
      originalNodesRef.current = JSON.parse(JSON.stringify(graph.nodes));
    }
  }, [graph]);

  // Apply layout when currentLayout changes
  useEffect(() => {
    if (!graph || originalNodesRef.current.length === 0) return;

    let updatedNodes = [...graph.nodes];

    switch (currentLayout) {
      case 'circular':
        updatedNodes = applyCircularLayout(updatedNodes);
        break;
      case 'force':
        updatedNodes = applyForceDirectedLayout(updatedNodes, graph.edges);
        break;
      case 'hierarchical':
        updatedNodes = resetToOriginalLayout(updatedNodes, originalNodesRef.current);
        break;
    }

    setGraph({ ...graph, nodes: updatedNodes });
  }, [currentLayout]);

  return (
    <div className="relative w-full h-full">
      <Scene />
      <div className="absolute top-4 left-4 z-10">
        <NodeMetricsModal />
      </div>
      {!hideLayoutSelector && <LayoutSelector />}
      <div className="absolute bottom-4 left-4 z-10">
        <ControlsLegend />
      </div>
    </div>
  );
};
