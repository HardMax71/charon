import { Link } from 'react-router-dom';

export const Header = () => {
  return (
    <header className="bg-surface border-b border-border-light px-6 md:px-8 py-3 flex justify-between items-center backdrop-blur-sm">
      <Link
        to="/"
        className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight hover:text-primary transition-colors cursor-pointer"
      >
        Charon
      </Link>
      <p className="text-xs md:text-sm text-text-secondary font-medium tracking-wide hidden sm:block">
        Python Dependency Visualizer
      </p>
    </header>
  );
};
