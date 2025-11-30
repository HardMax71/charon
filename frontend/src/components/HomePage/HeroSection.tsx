import { InputForm } from '@/components/InputForm/InputForm';
import { ArrowDown } from 'lucide-react';

export const HeroSection = () => (
  <section className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full flex-shrink-0 snap-start relative overflow-hidden bg-white">
    {/* Decorative gradient blobs */}
    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-teal-100/60 via-teal-50/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-slate-100/80 via-teal-50/30 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

    {/* Subtle dot pattern */}
    <div className="absolute inset-0 opacity-[0.4]" style={{
      backgroundImage: `radial-gradient(circle, rgba(13,148,136,0.15) 1px, transparent 1px)`,
      backgroundSize: '24px 24px'
    }} />

    {/* Content */}
    <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 h-full flex items-center">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">

        {/* Left: Copy */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
            </span>
            <span className="text-xs font-semibold text-teal-700 tracking-wide">Multi-Language Architecture Analysis</span>
          </div>

          <div className="space-y-5">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] text-slate-900">
              See your code.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-teal-700">
                Really see it.
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-slate-600 max-w-lg leading-relaxed">
              Charon maps your codebase into an interactive 3D graph, revealing hidden dependencies, circular imports, and architectural debt.
            </p>
          </div>

          {/* Tech stack - minimal inline */}
          <div className="flex items-center gap-2 text-xs text-slate-600 pt-2">
            <span className="uppercase tracking-wider">Powered by</span>
            <span className="px-2 py-1 bg-slate-100 rounded font-mono font-medium text-slate-600">tree-sitter</span>
            <span>+</span>
            <span className="px-2 py-1 bg-slate-100 rounded font-mono font-medium text-slate-600">NetworkX</span>
            <span>+</span>
            <span className="px-2 py-1 bg-slate-100 rounded font-mono font-medium text-slate-600">Three.js</span>
          </div>
        </div>

        {/* Right: Form */}
        <div className="lg:pl-8">
          <InputForm />
        </div>
      </div>
    </div>

    {/* Scroll indicator */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600">
      <span className="text-[10px] uppercase tracking-widest font-medium">Scroll</span>
      <ArrowDown className="w-4 h-4 animate-bounce" />
    </div>
  </section>
);
