import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/fitness', label: 'Fitness' },
  { path: '/refactoring', label: 'Refactoring' },
  { path: '/performance', label: 'Performance' },
  { path: '/temporal', label: 'Temporal' },
];

export const Header = () => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-white border-b border-slate-200">
      <div className="w-full h-full flex items-center justify-between px-6 max-w-[1400px] mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded overflow-hidden">
            <img src="/icon.png" alt="Charon" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
            Charon
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === path
                  ? 'text-teal-700 bg-teal-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav */}
        <nav className="flex sm:hidden items-center gap-1">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                location.pathname === path
                  ? 'text-teal-700 bg-teal-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label.slice(0, 3)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};