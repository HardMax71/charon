import { AlertTriangle, ExternalLink } from 'lucide-react';
import { buildGitHubCommitUrl } from '@/utils/githubUtils';

interface CircularDepsTimelineProps {
  timeline: any[];
  currentCommitSha?: string;
  repositoryUrl: string;
}

export const CircularDepsTimeline = ({
  timeline,
  currentCommitSha,
  repositoryUrl,
}: CircularDepsTimelineProps) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-success-bg rounded-lg p-4 border border-success/20">
        <div className="flex items-center gap-2 text-success text-sm font-medium">
          <span>✓</span>
          <span>No circular dependencies detected</span>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-background rounded-lg p-4 border border-border-light">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-error" />
        <h3 className="text-sm font-bold text-text-primary">Circular Dependencies</h3>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {timeline.map((entry, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border transition-all ${
              entry.commit_sha === currentCommitSha
                ? 'bg-error-bg border-error/30 shadow-sm'
                : 'bg-surface border-border-light'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <a
                href={buildGitHubCommitUrl(repositoryUrl, entry.commit_sha)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 transition-colors"
              >
                {entry.commit_sha.substring(0, 7)}
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="text-xs text-text-tertiary">
                {formatDate(entry.date)}
              </div>
            </div>

            <div className="text-xs text-text-secondary mb-2 italic">
              {entry.commit_message}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-error font-bold">
                +{entry.new_circular_nodes.length}
              </span>
              <span className="text-xs text-text-tertiary">new circular deps</span>
            </div>

            {entry.new_circular_nodes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border-light">
                <div className="text-xs text-text-tertiary space-y-1">
                  {entry.new_circular_nodes.slice(0, 3).map((node: string) => (
                    <div key={node} className="font-mono text-error truncate" title={node}>• {node}</div>
                  ))}
                  {entry.new_circular_nodes.length > 3 && (
                    <div className="text-text-tertiary italic">
                      +{entry.new_circular_nodes.length - 3} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
