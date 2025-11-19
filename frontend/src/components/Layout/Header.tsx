import { Link, useLocation } from 'react-router-dom';
import { Clock, Activity } from 'lucide-react';

export const Header = () => {
  const location = useLocation();
  const isTemporal = location.pathname === '/temporal';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md h-16">
      <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">

        {/* Logo Section */}
        <Link
          to="/"
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 bg-slate-900 text-white rounded flex items-center justify-center font-serif font-bold shadow-sm group-hover:bg-teal-600 transition-colors">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-teal-700 transition-colors">
              CHARON
            </span>
            <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase leading-none">
              System Visualizer
            </span>
          </div>
        </Link>

        {/* Navigation Section */}
        <nav className="flex items-center gap-6">
          <Link
            to="/temporal"
            className={`
              flex items-center gap-2 text-sm font-medium transition-colors
              hover:text-teal-600 hover:underline decoration-2 underline-offset-4
              ${isTemporal 
                ? 'text-teal-700 font-bold' 
                : 'text-slate-500'
              }
            `}
          >
            {isTemporal ? <Activity className="w-4 h-4 animate-pulse" /> : <Clock className="w-4 h-4" />}
            <span>Temporal Analysis</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};