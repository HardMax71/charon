import { Link, useLocation } from 'react-router-dom';
import { Clock, Activity, Shield, CheckCircle, GitBranch } from 'lucide-react';

export const Header = () => {
  const location = useLocation();
  const isTemporal = location.pathname === '/temporal';
  const isFitness = location.pathname === '/fitness';
  const isRefactoring = location.pathname === '/refactoring';

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 transition-all duration-300">
      <div className="w-full h-full flex items-center justify-between px-6 md:px-12 max-w-[1400px] mx-auto">

        {/* Logo Section - Primary Brand Anchor */}
        <Link
          to="/"
          className="logo-container group"
        >
          <div className="w-8 h-8 rounded overflow-hidden">
            <img src="/icon.png" alt="Charon Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-styx-900 tracking-tight leading-none group-hover:text-styx-600 transition-colors">
              CHARON
            </span>
            <span className="text-[10px] font-mono text-stone-700 tracking-widest uppercase leading-none mt-1">
              System Visualizer
            </span>
          </div>
        </Link>

        {/* Navigation Section */}
        <nav className="flex items-center gap-6">
          <Link
            to="/fitness"
            className={`
              flex items-center gap-2 text-sm font-medium transition-colors
              hover:text-styx-600 hover:underline decoration-2 underline-offset-4
              ${isFitness
                ? 'text-styx-600 font-bold'
                : 'text-stone-700'
              }
            `}
          >
            {isFitness ? <CheckCircle className="w-4 h-4 animate-pulse" /> : <Shield className="w-4 h-4" />}
            <span>Fitness Functions</span>
          </Link>
          <Link
            to="/refactoring"
            className={`
              flex items-center gap-2 text-sm font-medium transition-colors
              hover:text-styx-600 hover:underline decoration-2 underline-offset-4
              ${isRefactoring
                ? 'text-styx-600 font-bold'
                : 'text-stone-700'
              }
            `}
          >
            {isRefactoring ? <CheckCircle className="w-4 h-4 animate-pulse" /> : <GitBranch className="w-4 h-4" />}
            <span>Refactoring Scenarios</span>
          </Link>
          <Link
            to="/temporal"
            className={`
              flex items-center gap-2 text-sm font-medium transition-colors
              hover:text-styx-600 hover:underline decoration-2 underline-offset-4
              ${isTemporal
                ? 'text-styx-600 font-bold'
                : 'text-stone-700'
              }
            `}
          >
            {isTemporal ? <CheckCircle className="w-4 h-4 animate-pulse" /> : <Clock className="w-4 h-4" />}
            <span>Temporal Analysis</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};