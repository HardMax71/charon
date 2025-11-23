import React, { useMemo } from 'react';
import { InputForm } from '@/components/InputForm/InputForm';
import { Graph3D } from '@/components/Graph3D/Graph3D';
import { useGraphStore } from '@/stores/graphStore';
import { DependencyGraph } from '@/types/graph';
import {
  Network,
  AlertCircle,
  GitMerge,
  Workflow,
  Terminal,
  Cpu,
  Share2
} from 'lucide-react';

export const HomePage = () => {
  const { graph } = useGraphStore();

  // Example graph for demo purposes
  const exampleGraph: DependencyGraph = useMemo(() => ({
    nodes: [
      {
        id: 'app.main',
        label: 'main.py',
        type: 'internal' as const,
        module: 'app',
        position: { x: 0, y: 0, z: 0 },
        color: '#0f172a',
        cluster_id: 0,
        metrics: {
          afferent_coupling: 8,
          efferent_coupling: 4,
          instability: 0.33,
          is_circular: false,
          is_high_coupling: true,
          cyclomatic_complexity: 12,
          max_complexity: 8,
          maintainability_index: 65,
          lines_of_code: 245,
          complexity_grade: 'B',
          maintainability_grade: 'C',
          is_hot_zone: true,
          hot_zone_severity: 'warning' as const,
          hot_zone_score: 0.72,
          hot_zone_reason: 'High coupling with moderate complexity'
        }
      },
      {
        id: 'app.config',
        label: 'config.py',
        type: 'internal' as const,
        module: 'app',
        position: { x: 0, y: 20, z: 0 },
        color: '#0f172a',
        cluster_id: 0,
        metrics: {
          afferent_coupling: 6,
          efferent_coupling: 2,
          instability: 0.25,
          is_circular: false,
          is_high_coupling: false,
          cyclomatic_complexity: 4,
          max_complexity: 3,
          maintainability_index: 82,
          lines_of_code: 89,
          complexity_grade: 'A',
          maintainability_grade: 'A',
          is_hot_zone: false,
          hot_zone_severity: 'ok' as const,
          hot_zone_score: 0.15,
          hot_zone_reason: ''
        }
      },
      {
        id: 'services.user',
        label: 'user_service.py',
        type: 'internal' as const,
        module: 'services',
        position: { x: 20, y: 3, z: 15 },
        color: '#0d9488',
        cluster_id: 1,
        metrics: {
          afferent_coupling: 3,
          efferent_coupling: 5,
          instability: 0.625,
          is_circular: true,
          is_high_coupling: false,
          cyclomatic_complexity: 18,
          max_complexity: 12,
          maintainability_index: 58,
          lines_of_code: 312,
          complexity_grade: 'C',
          maintainability_grade: 'D',
          is_hot_zone: true,
          hot_zone_severity: 'critical' as const,
          hot_zone_score: 0.88,
          hot_zone_reason: 'Circular dependency with high complexity'
        }
      },
      {
        id: 'services.auth',
        label: 'auth.py',
        type: 'internal' as const,
        module: 'services',
        position: { x: 28, y: -7, z: 20 },
        color: '#0d9488',
        cluster_id: 1,
        metrics: {
          afferent_coupling: 4,
          efferent_coupling: 3,
          instability: 0.43,
          is_circular: true,
          is_high_coupling: false,
          cyclomatic_complexity: 15,
          max_complexity: 9,
          maintainability_index: 62,
          lines_of_code: 267,
          complexity_grade: 'B',
          maintainability_grade: 'C',
          is_hot_zone: true,
          hot_zone_severity: 'warning' as const,
          hot_zone_score: 0.65,
          hot_zone_reason: 'Part of circular dependency chain'
        }
      },
      {
        id: 'models.user',
        label: 'user.py',
        type: 'internal' as const,
        module: 'models',
        position: { x: 30, y: 15, z: 18 },
        color: '#0d9488',
        cluster_id: 1,
        metrics: {
          afferent_coupling: 5,
          efferent_coupling: 2,
          instability: 0.29,
          is_circular: false,
          is_high_coupling: false,
          cyclomatic_complexity: 6,
          max_complexity: 4,
          maintainability_index: 78,
          lines_of_code: 156,
          complexity_grade: 'A',
          maintainability_grade: 'B',
          is_hot_zone: false,
          hot_zone_severity: 'ok' as const,
          hot_zone_score: 0.22,
          hot_zone_reason: ''
        }
      },
      {
        id: 'services.data',
        label: 'data_service.py',
        type: 'internal' as const,
        module: 'services',
        position: { x: -20, y: 3, z: 15 },
        color: '#0d9488',
        cluster_id: 2,
        metrics: {
          afferent_coupling: 3,
          efferent_coupling: 4,
          instability: 0.57,
          is_circular: false,
          is_high_coupling: false,
          cyclomatic_complexity: 14,
          max_complexity: 10,
          maintainability_index: 68,
          lines_of_code: 298,
          complexity_grade: 'B',
          maintainability_grade: 'C',
          is_hot_zone: false,
          hot_zone_severity: 'info' as const,
          hot_zone_score: 0.45,
          hot_zone_reason: 'Moderate instability'
        }
      },
      {
        id: 'models.data',
        label: 'data.py',
        type: 'internal' as const,
        module: 'models',
        position: { x: -30, y: 15, z: 18 },
        color: '#0d9488',
        cluster_id: 2,
        metrics: {
          afferent_coupling: 4,
          efferent_coupling: 1,
          instability: 0.2,
          is_circular: false,
          is_high_coupling: false,
          cyclomatic_complexity: 5,
          max_complexity: 3,
          maintainability_index: 85,
          lines_of_code: 134,
          complexity_grade: 'A',
          maintainability_grade: 'A',
          is_hot_zone: false,
          hot_zone_severity: 'ok' as const,
          hot_zone_score: 0.12,
          hot_zone_reason: ''
        }
      },
      {
        id: 'utils.logger',
        label: 'logger.py',
        type: 'internal' as const,
        module: 'utils',
        position: { x: 0, y: -20, z: -8 },
        color: '#64748b',
        cluster_id: 3,
        metrics: {
          afferent_coupling: 7,
          efferent_coupling: 1,
          instability: 0.125,
          is_circular: false,
          is_high_coupling: false,
          cyclomatic_complexity: 3,
          max_complexity: 2,
          maintainability_index: 92,
          lines_of_code: 67,
          complexity_grade: 'A',
          maintainability_grade: 'A',
          is_hot_zone: false,
          hot_zone_severity: 'ok' as const,
          hot_zone_score: 0.08,
          hot_zone_reason: ''
        }
      },
      {
        id: 'utils.helpers',
        label: 'helpers.py',
        type: 'internal' as const,
        module: 'utils',
        position: { x: 15, y: -25, z: -5 },
        color: '#64748b',
        cluster_id: 3,
        metrics: {
          afferent_coupling: 5,
          efferent_coupling: 0,
          instability: 0,
          is_circular: false,
          is_high_coupling: false,
          cyclomatic_complexity: 8,
          max_complexity: 5,
          maintainability_index: 88,
          lines_of_code: 145,
          complexity_grade: 'A',
          maintainability_grade: 'A',
          is_hot_zone: false,
          hot_zone_severity: 'ok' as const,
          hot_zone_score: 0.05,
          hot_zone_reason: ''
        }
      },
      {
        id: 'utils.constants',
        label: 'constants.py',
        type: 'internal' as const,
        module: 'utils',
        position: { x: -15, y: -25, z: -5 },
        color: '#64748b',
        cluster_id: 3,
        metrics: {
          afferent_coupling: 6,
          efferent_coupling: 0,
          instability: 0,
          is_circular: false,
          is_high_coupling: false,
          cyclomatic_complexity: 1,
          max_complexity: 1,
          maintainability_index: 98,
          lines_of_code: 42,
          complexity_grade: 'A',
          maintainability_grade: 'A',
          is_hot_zone: false,
          hot_zone_severity: 'ok' as const,
          hot_zone_score: 0.02,
          hot_zone_reason: ''
        }
      },
      {
        id: 'external.api',
        label: 'api_client.py',
        type: 'third_party' as const,
        module: 'external',
        position: { x: 0, y: 30, z: -15 },
        color: '#f59e0b',
        cluster_id: null,
        metrics: {
          afferent_coupling: 3,
          efferent_coupling: 5,
          instability: 0.625,
          is_circular: false,
          is_high_coupling: false,
          cyclomatic_complexity: 10,
          max_complexity: 7,
          maintainability_index: 72,
          lines_of_code: 189,
          complexity_grade: 'B',
          maintainability_grade: 'B',
          is_hot_zone: false,
          hot_zone_severity: 'info' as const,
          hot_zone_score: 0.38,
          hot_zone_reason: 'External dependency with moderate instability'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'app.main', target: 'app.config', imports: ['CONFIG'], weight: 1, thickness: 0.5 },
      { id: 'e2', source: 'app.main', target: 'services.user', imports: ['UserService'], weight: 2, thickness: 1 },
      { id: 'e3', source: 'app.main', target: 'services.data', imports: ['DataService'], weight: 2, thickness: 1 },
      { id: 'e4', source: 'app.main', target: 'utils.logger', imports: ['logger'], weight: 1, thickness: 0.5 },
      { id: 'e5', source: 'services.user', target: 'models.user', imports: ['User'], weight: 3, thickness: 1.5 },
      { id: 'e6', source: 'services.user', target: 'services.auth', imports: ['authenticate'], weight: 2, thickness: 1 },
      { id: 'e7', source: 'services.user', target: 'utils.logger', imports: ['logger'], weight: 1, thickness: 0.5 },
      { id: 'e8', source: 'services.auth', target: 'app.config', imports: ['SECRET_KEY'], weight: 1, thickness: 0.5 },
      { id: 'e9', source: 'services.auth', target: 'services.user', imports: ['get_user'], weight: 2, thickness: 1 },
      { id: 'e10', source: 'services.data', target: 'models.data', imports: ['Data'], weight: 3, thickness: 1.5 },
      { id: 'e11', source: 'services.data', target: 'utils.logger', imports: ['logger'], weight: 1, thickness: 0.5 },
      { id: 'e12', source: 'services.data', target: 'utils.constants', imports: ['DB_CONFIG'], weight: 1, thickness: 0.5 },
      { id: 'e13', source: 'app.config', target: 'utils.constants', imports: ['DEFAULT_CONFIG'], weight: 1, thickness: 0.5 },
      { id: 'e14', source: 'external.api', target: 'app.config', imports: ['API_KEY'], weight: 1, thickness: 0.5 },
      { id: 'e15', source: 'services.user', target: 'external.api', imports: ['api_call'], weight: 2, thickness: 1 },
      { id: 'e16', source: 'services.data', target: 'external.api', imports: ['fetch_data'], weight: 2, thickness: 1 },
      { id: 'e17', source: 'services.user', target: 'utils.helpers', imports: ['validate'], weight: 1, thickness: 0.5 },
      { id: 'e18', source: 'models.user', target: 'utils.helpers', imports: ['format_name'], weight: 1, thickness: 0.5 }
    ]
  }), []);

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth">

      {/* FIRST SCREEN */}
      <div className="h-[calc(100vh-4rem)] w-full shrink-0 snap-start bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full h-full flex items-center justify-center py-6 sm:py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center w-full">

            {/* Branding */}
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-slate-900 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-white shadow-sm">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                System Online
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none">
                CODE<br />
                VISUAL<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-800">AUTOPSY.</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-xl text-slate-600 font-medium leading-relaxed max-w-lg">
                Stop guessing. Charon generates a 3D topology of your Python architecture, exposing circular dependencies and coupling at the source.
              </p>

              <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 pt-2 sm:pt-4 font-mono text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">
                <div>
                  <span className="block text-slate-900 font-bold text-base sm:text-lg">AST</span>
                  Parser
                </div>
                <div>
                  <span className="block text-slate-900 font-bold text-base sm:text-lg">NX</span>
                  Graph Logic
                </div>
                <div>
                  <span className="block text-slate-900 font-bold text-base sm:text-lg">R3F</span>
                  Render Engine
                </div>
              </div>
            </div>

            {/* Form */}
            <div>
              <InputForm />
            </div>
          </div>
        </div>
      </div>

      {/* SECOND SCREEN */}
      <div className="h-[calc(100vh-4rem)] w-full shrink-0 snap-start bg-white flex flex-col overflow-hidden">
        {/* Features strip */}
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

        {/* Graph Demo + Description */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 bg-slate-50">

          {/* Graph */}
          <div className="lg:col-span-8 relative bg-slate-100 min-h-[300px] lg:min-h-0">
            <Graph3D
              customGraph={graph || exampleGraph}
              hideLayoutSelector={true}
              hideNodeMetrics={true}
              hideControlsLegend={true}
              hideClusterBoxes={true}
            />
          </div>

            {/* Description */}
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
      </div>
    </div>
  );
};

/* --- COMPONENTS --- */

interface TechCellProps {
  index: string;
  icon: any;
  label: string;
  title: string;
  desc: string;
}

const TechCell = ({ index, icon, label, title, desc }: TechCellProps) => (
  <div className="px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r last:border-b-0 sm:last:border-r-0 flex flex-col gap-1.5 sm:gap-2 group hover:bg-slate-50 transition-colors border-slate-200">
    <div className="flex items-start justify-between mb-1 sm:mb-2">
      <span className="font-mono text-base sm:text-xl text-slate-300 group-hover:text-slate-400 transition-colors">
        {index}
      </span>
      <div className="p-1 sm:p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 14, className: 'sm:w-4 sm:h-4' })}
      </div>
    </div>

    <span className="inline-block font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-500 mb-1 sm:mb-1.5 border border-slate-200 px-1.5 py-0.5 rounded bg-white w-fit">
      {label}
    </span>
    <h3 className="text-xs sm:text-sm font-bold mb-1 sm:mb-1.5 text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
      {title}
    </h3>
    <p className="text-[10px] sm:text-xs text-slate-600 leading-snug">
      {desc}
    </p>
  </div>
);
