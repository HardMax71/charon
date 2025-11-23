import { InputForm } from '@/components/InputForm/InputForm';

export const HeroSection = () => (
  <div className="h-[calc(100vh-4rem)] w-full shrink-0 snap-start bg-gradient-to-b from-white to-slate-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full h-full flex items-center justify-center py-6 sm:py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center w-full">

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

        <div>
          <InputForm />
        </div>
      </div>
    </div>
  </div>
);
