import React from 'react';

export const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-6 px-6 md:px-12">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">

        {/* LEFT: System Metadata (Clean, Monospace) */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          <span className="font-bold text-slate-600">Charon</span>
          <span className="text-slate-300">•</span>
          <span>v1.0.0</span>
          <span className="text-slate-300">•</span>
          <span>Build 2025.11</span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="hidden sm:inline">Open Source</span>
        </div>

        {/* RIGHT: Links */}
        <div className="flex flex-wrap justify-center gap-6 font-medium text-xs text-stone-500">
          <a
            href="https://github.com/HardMax71/charon#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-styx-600 hover:underline decoration-2 underline-offset-4 transition-colors"
          >
            Documentation
          </a>
          <a
            href="https://github.com/HardMax71/charon"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-styx-600 hover:underline decoration-2 underline-offset-4 transition-colors"
          >
            Repository
          </a>
          <a
            href="https://github.com/HardMax71/charon/graphs/contributors"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-styx-600 hover:underline decoration-2 underline-offset-4 transition-colors"
          >
            Contributors
          </a>
        </div>

      </div>
    </footer>
  );
};