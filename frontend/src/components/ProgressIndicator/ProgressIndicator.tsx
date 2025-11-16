import { useUIStore } from '@/stores/uiStore';

export const ProgressIndicator = () => {
  const { isLoading, loadingProgress, loadingMessage } = useUIStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-xl border border-border-light p-8 min-w-[90vw] sm:min-w-[500px] max-w-xl animate-slide-down">
        <h3 className="text-2xl font-bold mb-6 text-text-primary tracking-tight">
          Analyzing Dependencies
        </h3>

        <div className="mb-4">
          <div className="w-full bg-border-light rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-3 transition-all duration-500 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm md:text-base">
          <p className="text-text-secondary font-medium">{loadingMessage}</p>
          <p className="text-text-tertiary font-mono font-semibold tabular-nums">{loadingProgress}%</p>
        </div>
      </div>
    </div>
  );
};
