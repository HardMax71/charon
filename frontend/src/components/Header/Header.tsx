import { Link, useLocation } from 'react-router-dom';
import { Clock } from 'lucide-react';

export const Header = () => {
  const location = useLocation();

  return (
    <header className="bg-surface border-b border-border-light px-6 md:px-8 py-3 flex items-center justify-between backdrop-blur-sm">
      <Link
        to="/"
        className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight hover:text-primary transition-colors cursor-pointer"
      >
        Charon
      </Link>

      <nav className="flex items-center gap-2">
        <Link
          to="/temporal"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            location.pathname === '/temporal'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-text-secondary hover:bg-background hover:text-text-primary'
          }`}
        >
          <Clock className="w-4 h-4" />
          Temporal Analysis
        </Link>
      </nav>
    </header>
  );
};
