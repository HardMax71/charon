import { GitCommit, ExternalLink, Calendar, User } from 'lucide-react';
import { CircularDepsTimeline } from './CircularDepsTimeline';
import { buildGitHubCommitUrl } from '@/utils/githubUtils';
import { TemporalSnapshotData, CircularDependencyTimelineEvent } from '@/types/temporal';

interface TemporalSidebarProps {
  currentSnapshot: TemporalSnapshotData | null;
  timeline: CircularDependencyTimelineEvent[];
  repositoryUrl: string;
}

export const TemporalSidebar = ({ currentSnapshot, timeline, repositoryUrl }: TemporalSidebarProps) => (
  <div className="w-80 border-r border-slate-200 bg-slate-50/50 overflow-y-auto custom-scrollbar p-5 space-y-5">

    {currentSnapshot && (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Snapshot Data</span>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
              {currentSnapshot.commit_sha.substring(0, 7)}
            </span>
            <a
              href={buildGitHubCommitUrl(repositoryUrl, currentSnapshot.commit_sha)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-teal-600 hover:underline flex items-center gap-1"
            >
              VIEW DIFF <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(currentSnapshot.commit_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentSnapshot.author}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 italic leading-relaxed">
              "{currentSnapshot.commit_message}"
            </p>
          </div>
        </div>
      </div>
    )}

    {currentSnapshot && (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          State Metrics
        </h4>
        <div className="space-y-2">
          <MetricRow label="Nodes" value={currentSnapshot.node_count} />
          <MetricRow label="Edges" value={currentSnapshot.edge_count} />
          <MetricRow
            label="Circular Cycles"
            value={currentSnapshot.circular_count}
            highlight={currentSnapshot.circular_count > 0}
          />
        </div>
      </div>
    )}

    <div className="pt-2">
      <CircularDepsTimeline
        timeline={timeline}
        currentCommitSha={currentSnapshot?.commit_sha}
        repositoryUrl={repositoryUrl}
      />
    </div>
  </div>
);

interface MetricRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

const MetricRow = ({ label, value, highlight }: MetricRowProps) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className={`font-mono font-bold ${highlight ? 'text-rose-600' : 'text-slate-900'}`}>
      {value}
    </span>
  </div>
);
