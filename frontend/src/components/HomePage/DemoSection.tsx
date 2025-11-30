import { Graph3D } from '@/components/Graph3D/Graph3D';
import { LayoutSelector } from '@/components/Graph3D/LayoutSelector';
import { DependencyGraph } from '@/types/graph';
import { GlobalMetrics } from '@/types/metrics';

interface DemoSectionProps {
  graph: DependencyGraph;
  metrics: GlobalMetrics;
}

export const DemoSection = ({ graph, metrics }: DemoSectionProps) => (
  <section className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full flex-shrink-0 snap-start bg-white relative overflow-hidden p-6">
    {/* Graph container with padding */}
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-lg">
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

      {/* Example badge - top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Example Project</span>
        </div>
      </div>
    </div>
  </section>
);
