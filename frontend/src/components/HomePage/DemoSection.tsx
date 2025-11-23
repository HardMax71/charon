import { Cpu, Share2, Terminal } from 'lucide-react';
import { Graph3D } from '@/components/Graph3D/Graph3D';
import { DependencyGraph } from '@/types/graph';

interface DemoSectionProps {
  graph: DependencyGraph;
}

export const DemoSection = ({ graph }: DemoSectionProps) => (
  <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 bg-slate-50">

    <div className="lg:col-span-8 relative bg-slate-100 min-h-[300px] lg:min-h-0">
      <Graph3D
        customGraph={graph}
        hideLayoutSelector={true}
        hideNodeMetrics={true}
        hideControlsLegend={true}
        hideClusterBoxes={true}
      />
    </div>

    <div className="lg:col-span-4 p-4 sm:p-6 flex flex-col justify-center bg-white">
      <div className="w-12 h-1.5 bg-teal-600 mb-4" />
      <h2 className="text-2xl font-bold mb-3 tracking-tight">
        Surgical<br />Refactoring.
      </h2>
      <p className="text-slate-600 mb-4 leading-relaxed text-sm">
        Charon isn't just a visualizer; it's a decision engine. Map afferent and efferent coupling for architectural surgery.
      </p>

      <ul className="space-y-2 font-mono text-xs text-slate-700">
        <li className="flex items-center gap-2 group cursor-pointer">
          <div className="p-1.5 bg-slate-100 rounded border border-slate-200 group-hover:border-teal-500 transition-all">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold">Identify "God Objects"</span>
        </li>
        <li className="flex items-center gap-2 group cursor-pointer">
          <div className="p-1.5 bg-slate-100 rounded border border-slate-200 group-hover:border-rose-500 transition-all">
            <Share2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold">Visualize Blast Radius</span>
        </li>
        <li className="flex items-center gap-2 group cursor-pointer">
          <div className="p-1.5 bg-slate-100 rounded border border-slate-200 group-hover:border-amber-500 transition-all">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold">Export as JSON</span>
        </li>
      </ul>
    </div>
  </div>
);
