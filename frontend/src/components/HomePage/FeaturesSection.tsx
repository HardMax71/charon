import { Network, AlertCircle, GitMerge, Workflow } from 'lucide-react';
import { TechCell } from './TechCell';

export const FeaturesSection = () => (
  <div className="flex-none bg-white/90 border-b border-slate-200 py-2 sm:py-3 lg:py-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 sm:gap-0">
      <TechCell
        index="01"
        icon={<Network className="text-indigo-600" />}
        label="Topology"
        title="Force-Directed Graph"
        desc="Physics-based rendering reveals gravitational pull of core modules."
      />
      <TechCell
        index="02"
        icon={<AlertCircle className="text-rose-600" />}
        label="Diagnostics"
        title="Cycle Detection"
        desc="Identify recursive import chains that break runtime logic."
      />
      <TechCell
        index="03"
        icon={<GitMerge className="text-amber-600" />}
        label="Analysis"
        title="Coupling Metrics"
        desc="Calculate Instability and Abstractness per package automatically."
      />
      <TechCell
        index="04"
        icon={<Workflow className="text-teal-600" />}
        label="Structure"
        title="Auto-Clustering"
        desc="Cluster detection suggests natural microservice boundaries."
      />
    </div>
  </div>
);
