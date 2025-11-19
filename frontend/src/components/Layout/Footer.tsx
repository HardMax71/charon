export const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-6 px-6 md:px-12">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

        {/* LEFT SIDE: Branding + Version (Aligned) */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">

          {/* 1. Brand Mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center text-teal-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M17 7 L10 12" />
                <path d="M10 12 L17 17" />
                <circle cx="17" cy="7" r="2" fill="currentColor" stroke="none" />
                <circle cx="10" cy="12" r="2" fill="currentColor" stroke="none" />
                <circle cx="17" cy="17" r="2" fill="currentColor" stroke="none" />
              </svg>
            </div>

            <div className="flex flex-col justify-center -mt-0.5">
              <h3 className="text-lg font-black tracking-tighter text-slate-900 leading-none">
                CHARON
              </h3>
              <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">
                Dependency Engine
              </span>
            </div>
          </div>

          {/* Divider (Desktop only) */}
          <div className="hidden md:block w-px h-8 bg-slate-200"></div>

          {/* 2. Version Info (Moved to right of logo) */}
          <p className="text-slate-400 font-mono text-[10px] uppercase tracking-wide">
            v1.0.0 &bull; Build 2025.11 &bull; Open Source
          </p>
        </div>

        {/* RIGHT SIDE: Links */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 font-medium text-xs md:text-sm text-slate-500">
          <a
            href="https://github.com/HardMax71/charon#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-600 hover:underline decoration-2 underline-offset-4 transition-colors"
          >
            Documentation
          </a>
          <a
            href="https://github.com/HardMax71/charon"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-600 hover:underline decoration-2 underline-offset-4 transition-colors"
          >
            GitHub Repository
          </a>
          <a
            href="https://github.com/HardMax71/charon/graphs/contributors"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-600 hover:underline decoration-2 underline-offset-4 transition-colors"
          >
            Contributors
          </a>
        </div>

      </div>
    </footer>
  );
};