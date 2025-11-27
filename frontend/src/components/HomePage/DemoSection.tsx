import { Graph3D } from '@/components/Graph3D/Graph3D';
import { LayoutSelector } from '@/components/Graph3D/LayoutSelector';
import { DependencyGraph } from '@/types/graph';
import { GlobalMetrics } from '@/types/metrics';

interface DemoSectionProps {
  graph: DependencyGraph;
  metrics: GlobalMetrics;
}

export const DemoSection = ({ graph, metrics }: DemoSectionProps) => (
  <section className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full flex-shrink-0 snap-start bg-slate-100 relative overflow-hidden p-6">
    {/* Graph container with padding */}
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-lg">
      {/* Graph visualization */}
      <div className="absolute inset-0">
        <Graph3D
          customGraph={graph}
          customMetrics={metrics}
          hideLayoutSelector={true}
          hideNodeMetrics={true}
          hideControlsLegend={false}
          hideClusterBoxes={false}
        />
      </div>

      {/* Layout Selector - positioned absolute within container */}
      <LayoutSelector
        customGraph={graph}
        customMetrics={metrics}
        className="absolute top-4 right-4 z-40"
      />

      {/* Stats badge - top left */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-center">
            <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{graph?.nodes?.length || 0}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Modules</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-center">
            <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{graph?.edges?.length || 0}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Edges</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
