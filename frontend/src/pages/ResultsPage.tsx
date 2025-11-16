import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Graph3D } from '@/components/Graph3D/Graph3D';
import { MetricsPanel } from '@/components/MetricsPanel/MetricsPanel';
import { useGraphStore } from '@/stores/graphStore';

export const ResultsPage = () => {
  const { graph } = useGraphStore();
  const navigate = useNavigate();

  // Redirect to home if no graph data
  useEffect(() => {
    if (!graph) {
      navigate('/');
    }
  }, [graph, navigate]);

  if (!graph) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <Graph3D />
      </div>
      <MetricsPanel />
    </div>
  );
};
