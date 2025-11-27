const features = [
  {
    num: '01',
    title: 'Force-Directed Topology',
    description: 'Physics-based 3D rendering reveals gravitational pull between modules. See coupling at a glance.',
  },
  {
    num: '02',
    title: 'Cycle Detection',
    description: 'Automatically identify circular dependencies that break runtime logic and block refactoring.',
  },
  {
    num: '03',
    title: 'Coupling Metrics',
    description: 'Calculate afferent/efferent coupling, instability index, and abstractness for every module.',
  },
  {
    num: '04',
    title: 'Auto-Clustering',
    description: 'Smart cluster detection suggests natural service boundaries. Know where to split.',
  },
];

export const FeaturesSection = () => (
  <section className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full flex-shrink-0 snap-start bg-white relative overflow-hidden">
    {/* Subtle background accent */}
    <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-white" />

    <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 h-full flex flex-col justify-center">
      {/* Section header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">
          Architecture analysis, <span className="text-teal-600">automated.</span>
        </h2>
        <p className="text-base text-slate-500 max-w-xl mx-auto">
          Stop manually tracing imports. Charon does the heavy lifting.
        </p>
      </div>

      {/* Feature list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        {features.map((feature) => (
          <div key={feature.num} className="group flex gap-4">
            {/* Number */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
              <span className="text-sm font-bold font-mono text-slate-400 group-hover:text-teal-600 transition-colors">
                {feature.num}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-teal-700 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
