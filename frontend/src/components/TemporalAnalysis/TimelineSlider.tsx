import { useMemo } from 'react';
import { Calendar, GitCommit, ExternalLink } from 'lucide-react';
import { buildGitHubCommitUrl } from '@/utils/githubUtils';
import { TemporalSnapshotData } from '@/types/temporal';

interface TimelineSliderProps {
  snapshots: TemporalSnapshotData[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  repositoryUrl: string;
}

export const TimelineSlider = ({
  snapshots,
  currentIndex,
  onIndexChange,
  repositoryUrl,
}: TimelineSliderProps) => {
  const currentSnapshot = snapshots[currentIndex];

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (snapshots.length <= 1) return 0;
    return (currentIndex / (snapshots.length - 1)) * 100;
  }, [currentIndex, snapshots.length]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Slider Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-text-tertiary" />
          <span className="font-bold text-text-primary">Timeline</span>
          <span className="text-text-tertiary">
            ({currentIndex + 1} / {snapshots.length})
          </span>
        </div>

        {currentSnapshot && (
          <div className="flex items-center gap-2 text-sm">
            <GitCommit className="w-4 h-4 text-amber-600" />
            <a
              href={buildGitHubCommitUrl(repositoryUrl, currentSnapshot.commit_sha)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-amber-600 hover:text-amber-700 hover:underline font-semibold flex items-center gap-1 transition-colors"
            >
              {currentSnapshot.commit_sha.substring(0, 7)}
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-text-tertiary">
              {formatDate(currentSnapshot.commit_date)}
            </span>
          </div>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        {/* Track */}
        <div className="h-2 bg-border-light rounded-full overflow-hidden">
          {/* Progress Fill */}
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Slider Input */}
        <input
          type="range"
          min={0}
          max={snapshots.length - 1}
          value={currentIndex}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
          style={{ margin: 0 }}
        />

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-amber-600 rounded-full shadow-lg pointer-events-none transition-all duration-200"
          style={{ left: `calc(${progress}% - 8px)` }}
        />

        {/* Milestone Markers */}
        {snapshots.length > 1 && snapshots.length <= 20 && (
          <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
            {snapshots.map((_, index) => {
              const position = (index / (snapshots.length - 1)) * 100;
              return (
                <div
                  key={index}
                  className={`absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full ${
                    index <= currentIndex ? 'bg-amber-700' : 'bg-border-medium'
                  }`}
                  style={{ left: `${position}%` }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Date Range Display */}
      <div className="flex items-center justify-between text-xs text-text-tertiary font-mono">
        <span>{formatDate(snapshots[0]?.commit_date)}</span>
        <span>{formatDate(snapshots[snapshots.length - 1]?.commit_date)}</span>
      </div>
    </div>
  );
};
