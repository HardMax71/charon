export const Footer = () => {
  return (
    <footer className="w-full h-14 bg-white border-t border-slate-200">
      <div className="w-full h-full flex items-center justify-between px-6 max-w-[1400px] mx-auto">
        {/* Left: Brand + version */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-600">Charon</span>
          <span>•</span>
          <span>v1.0.0</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Open Source</span>
        </div>

        {/* Right: Links */}
        <div className="flex items-center gap-4 text-xs">
          <a
            href="https://github.com/HardMax71/charon#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-teal-600 transition-colors"
          >
            Docs
          </a>
          <a
            href="https://github.com/HardMax71/charon"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-teal-600 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};