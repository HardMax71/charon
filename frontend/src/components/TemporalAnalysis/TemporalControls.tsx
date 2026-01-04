import { Play, Pause, Clock, BarChart3, Network } from 'lucide-react';

interface TemporalControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  currentSnapshotIndex: number;
  totalSnapshots: number;
  viewMode: 'heatmap' | 'graph';
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onViewModeChange: (mode: 'heatmap' | 'graph') => void;
}

export const TemporalControls = ({
  isPlaying,
  playbackSpeed,
  currentSnapshotIndex,
  totalSnapshots,
  viewMode,
  onPlayPause,
  onSpeedChange,
  onViewModeChange
}: TemporalControlsProps) => (
  <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">

    <div className="flex items-center gap-4">
      <button
        onClick={onPlayPause}
        className={`
          h-10 px-4 rounded-lg font-bold text-xs uppercase tracking-wide transition-all flex items-center gap-2
          ${isPlaying
            ? 'bg-slate-900 text-white hover:bg-teal-600 shadow-sm'
            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }
        `}
        disabled={currentSnapshotIndex >= totalSnapshots - 1}
      >
        {isPlaying ? (
          <> <Pause className="w-3.5 h-3.5" /> Pause </>
        ) : (
          <> <Play className="w-3.5 h-3.5" /> Play </>
        )}
      </button>

      <div className="relative h-10">
        <select
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="input-select h-full text-xs font-bold uppercase"
        >
          <option value={2000}>0.5x Speed</option>
          <option value={1000}>1x Speed</option>
          <option value={500}>2x Speed</option>
          <option value={250}>4x Speed</option>
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
          <Clock className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>

    <div className="flex bg-slate-200/50 p-1 rounded-lg h-10">
      <button
        onClick={() => onViewModeChange('graph')}
        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
          viewMode === 'graph'
            ? 'bg-white text-teal-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-700'
        }`}
      >
        <Network className="w-3.5 h-3.5" />
        Topology
      </button>
      <button
        onClick={() => onViewModeChange('heatmap')}
        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
          viewMode === 'heatmap'
            ? 'bg-white text-teal-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-700'
        }`}
      >
        <BarChart3 className="w-3.5 h-3.5" />
        Heatmap
      </button>
    </div>
  </div>
);
