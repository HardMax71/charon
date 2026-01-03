import uuid
from collections import defaultdict
from datetime import datetime
import statistics

from cachetools import TTLCache

from app.core.models import (
    ChurnHeatmapData,
    ChurnHeatmapEntry,
    CircularDependencyTimelineEvent,
    NodeMetrics,
    Position3D,
    TemporalAnalysisResponse,
    TemporalDependencyChange,
    TemporalGraphEdge,
    TemporalGraphNode,
    TemporalGraphSnapshot,
    TemporalSnapshotChanges,
    TemporalSnapshotData,
    TemporalSnapshotMetrics,
)
from app.services.analyzer_service import analyze_files
from app.services.github_service import GitHubService
from app.services.graph_service import build_graph
from app.services.layout_service import apply_layout
from app.services.metrics_service import MetricsCalculator


class TemporalAnalysisService:
    """Service for analyzing dependency evolution over git history."""

    def __init__(self):
        self.github_service = GitHubService()
        # TTL cache: max 50 analyses, 1 hour TTL
        self.snapshots_cache: TTLCache[str, TemporalAnalysisResponse] = TTLCache(
            maxsize=50, ttl=3600
        )

    async def analyze_repository_history_streaming(
        self,
        repo_url: str,
        start_date: str | None = None,
        end_date: str | None = None,
        sample_strategy: str = "all",
    ):
        """
        Analyze repository history with SSE progress updates.

        Yields progress events during analysis.
        """
        # Generate analysis ID
        analysis_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"{repo_url}_{start_date}_{end_date}_{sample_strategy}",
            )
        )

        yield {
            "type": "progress",
            "message": "Fetching commit history...",
            "step": 1,
            "total": 6,
        }

        # Fetch commit history
        commits = await self.github_service.fetch_commit_history(
            repo_url, start_date, end_date
        )

        if not commits:
            yield {
                "type": "error",
                "message": "No commits found in the specified range",
            }
            return

        yield {
            "type": "progress",
            "message": f"Found {len(commits)} commits",
            "step": 2,
            "total": 6,
        }

        # Sample commits
        sampled_commits = self._sample_commits(commits, sample_strategy)

        # Limit to reasonable number
        max_analysis_commits = 20
        if len(sampled_commits) > max_analysis_commits:
            sampled_commits = sampled_commits[-max_analysis_commits:]

        yield {
            "type": "progress",
            "message": f"Analyzing {len(sampled_commits)} commits...",
            "step": 3,
            "total": 6,
        }

        # Analyze each commit with progress updates
        snapshots: list[TemporalSnapshotData] = []
        previous_snapshot: TemporalSnapshotData | None = None

        for idx, commit in enumerate(sampled_commits):
            yield {
                "type": "progress",
                "message": f"Analyzing commit {idx + 1}/{len(sampled_commits)}: {commit['sha'][:7]}",
                "step": 3,
                "total": 6,
                "current": idx + 1,
                "total_commits": len(sampled_commits),
            }

            snapshot = await self._analyze_commit(repo_url, commit, previous_snapshot)
            if snapshot:
                snapshots.append(snapshot)
                previous_snapshot = snapshot

        yield {
            "type": "progress",
            "message": "Calculating dependency churn...",
            "step": 4,
            "total": 6,
        }

        # Calculate churn metrics
        churn_data = self._calculate_churn(snapshots)

        yield {
            "type": "progress",
            "message": "Tracking circular dependencies...",
            "step": 5,
            "total": 6,
        }

        # Track circular dependency introduction
        circular_deps_timeline = self._track_circular_dependencies(snapshots)

        # Build final result
        result = TemporalAnalysisResponse(
            analysis_id=analysis_id,
            repository=repo_url,
            start_date=start_date,
            end_date=end_date,
            total_commits=len(commits),
            analyzed_commits=len(snapshots),
            sample_strategy=sample_strategy,
            snapshots=snapshots,
            churn_data=churn_data,
            circular_deps_timeline=circular_deps_timeline,
        )

        # Cache results
        self.snapshots_cache[analysis_id] = result

        yield {
            "type": "progress",
            "message": "Analysis complete!",
            "step": 6,
            "total": 6,
        }
        yield {"type": "result", "data": result.model_dump()}

    def _sample_commits(self, commits: list[dict], strategy: str) -> list[dict]:
        """Sample commits based on strategy."""
        if strategy == "all":
            return commits

        if not commits:
            return []

        # Group commits by time period
        grouped = defaultdict(list)

        for commit in commits:
            commit_date = datetime.fromisoformat(commit["date"].replace("Z", "+00:00"))

            if strategy == "daily":
                key = commit_date.date()
            elif strategy == "weekly":
                # ISO week
                key = f"{commit_date.year}-W{commit_date.isocalendar()[1]}"
            elif strategy == "monthly":
                key = f"{commit_date.year}-{commit_date.month:02d}"
            else:
                key = commit_date.date()

            grouped[key].append(commit)

        # Take the first commit from each group
        sampled = []
        for group in sorted(grouped.keys()):
            # Take the earliest commit in the group
            group_commits = sorted(grouped[group], key=lambda c: c["date"])
            sampled.append(group_commits[0])

        return sampled

    async def _analyze_commit(
        self,
        repo_url: str,
        commit: dict,
        previous_snapshot: TemporalSnapshotData | None,
    ) -> TemporalSnapshotData | None:
        """Analyze dependencies at a specific commit."""
        result = await self.github_service.fetch_repository_at_commit(
            repo_url, commit["sha"]
        )

        if not result.files:
            return None

        project_name = repo_url.split("/")[-1]
        dependency_data = await analyze_files(result.files, project_name)

        # Build graph
        graph = build_graph(dependency_data)

        # Calculate metrics
        metrics_calc = MetricsCalculator(graph)
        global_metrics = metrics_calc.calculate_all()

        # Apply hierarchical layout
        graph = apply_layout(graph, "hierarchical")

        # Extract key information
        node_count = len(graph.nodes)
        edge_count = len(graph.edges)

        # Get dependency list (for churn calculation)
        dependencies = {}
        for source, target in graph.edges:
            if source not in dependencies:
                dependencies[source] = []
            dependencies[source].append(target)

        # Find circular dependencies
        circular_nodes = [
            node_id
            for node_id in graph.nodes
            if graph.nodes[node_id].get("metrics", {}).get("is_circular", False)
        ]

        # Calculate changes from previous snapshot
        changes: TemporalSnapshotChanges | None = None
        if previous_snapshot:
            changes = self._calculate_changes(
                previous_snapshot,
                dependencies,
                node_count,
                edge_count,
                len(circular_nodes),
            )

        coupling_values = [
            graph.nodes[node_id].get("metrics", {}).get("afferent_coupling", 0)
            + graph.nodes[node_id].get("metrics", {}).get("efferent_coupling", 0)
            for node_id in graph.nodes
            if graph.nodes[node_id].get("type") == "internal"
        ]
        avg_coupling = statistics.mean(coupling_values) if coupling_values else 0.0
        max_coupling = max(coupling_values) if coupling_values else 0
        total_complexity = sum(
            graph.nodes[node_id].get("metrics", {}).get("cyclomatic_complexity", 0)
            for node_id in graph.nodes
            if graph.nodes[node_id].get("type") == "internal"
        )

        graph_snapshot = TemporalGraphSnapshot(
            nodes=[
                TemporalGraphNode(
                    id=node_id,
                    type=graph.nodes[node_id].get("type", "internal"),
                    label=graph.nodes[node_id].get("label", node_id),
                    module=graph.nodes[node_id].get("module", ""),
                    position=Position3D.model_validate(
                        graph.nodes[node_id].get("position", {"x": 0, "y": 0, "z": 0})
                    ),
                    metrics=NodeMetrics(
                        **(
                            {
                                "afferent_coupling": 0,
                                "efferent_coupling": 0,
                                "instability": 0.0,
                            }
                            | graph.nodes[node_id].get("metrics", {})
                        )
                    ),
                )
                for node_id in graph.nodes
            ],
            edges=[
                TemporalGraphEdge(
                    source=s,
                    target=t,
                    imports=graph.edges[s, t].get("imports", []),
                    weight=graph.edges[s, t].get("weight", 1),
                )
                for s, t in graph.edges
            ],
        )

        return TemporalSnapshotData(
            commit_sha=commit["sha"],
            commit_message=commit["message"],
            commit_date=commit["date"],
            author=commit["author"],
            node_count=node_count,
            edge_count=edge_count,
            dependencies=dependencies,
            circular_nodes=circular_nodes,
            circular_count=len(circular_nodes),
            global_metrics=TemporalSnapshotMetrics(
                average_coupling=round(avg_coupling, 2),
                max_coupling=max_coupling,
                total_complexity=round(total_complexity, 2),
                avg_afferent_coupling=global_metrics.avg_afferent_coupling,
                avg_efferent_coupling=global_metrics.avg_efferent_coupling,
            ),
            changes=changes,
            graph_snapshot=graph_snapshot,
        )

    def _calculate_changes(
        self,
        previous_snapshot: TemporalSnapshotData,
        current_dependencies: dict[str, list[str]],
        current_nodes: int,
        current_edges: int,
        current_circular_count: int,
    ) -> TemporalSnapshotChanges:
        """Calculate changes between snapshots."""
        prev_deps = previous_snapshot.dependencies

        # Calculate added/removed/modified dependencies
        added_nodes = set(current_dependencies.keys()) - set(prev_deps.keys())
        removed_nodes = set(prev_deps.keys()) - set(current_dependencies.keys())

        modified_deps: list[TemporalDependencyChange] = []
        for node_id in set(current_dependencies.keys()) & set(prev_deps.keys()):
            current = set(current_dependencies[node_id])
            previous = set(prev_deps.get(node_id, []))
            if current != previous:
                modified_deps.append(
                    TemporalDependencyChange(
                        node=node_id,
                        added=list(current - previous),
                        removed=list(previous - current),
                    )
                )

        return TemporalSnapshotChanges(
            added_nodes=list(added_nodes),
            removed_nodes=list(removed_nodes),
            modified_dependencies=modified_deps,
            node_count_delta=current_nodes - previous_snapshot.node_count,
            edge_count_delta=current_edges - previous_snapshot.edge_count,
            circular_count_delta=current_circular_count
            - previous_snapshot.circular_count,
        )

    def _calculate_churn(
        self, snapshots: list[TemporalSnapshotData]
    ) -> ChurnHeatmapData:
        """Calculate dependency churn metrics."""
        # Track how often each node's dependencies changed
        node_churn = defaultdict(int)
        total_changes = 0

        for snapshot in snapshots:
            if snapshot.changes:
                changes = snapshot.changes
                total_changes += len(changes.modified_dependencies)

                for mod in changes.modified_dependencies:
                    node_churn[mod.node] += 1

        # Sort by churn frequency
        churn_ranking = sorted(node_churn.items(), key=lambda x: x[1], reverse=True)

        # Calculate aggregated metrics
        if snapshots:
            avg_churn = total_changes / len(snapshots)
        else:
            avg_churn = 0

        return ChurnHeatmapData(
            total_changes=total_changes,
            average_churn_per_snapshot=round(avg_churn, 2),
            node_churn=dict(node_churn),
            top_churning_nodes=churn_ranking[:20],
            churn_heatmap=self._generate_churn_heatmap(snapshots),
        )

    def _generate_churn_heatmap(
        self, snapshots: list[TemporalSnapshotData]
    ) -> list[ChurnHeatmapEntry]:
        """Generate heatmap data for visualization."""
        heatmap_data = []

        for snapshot in snapshots:
            date = snapshot.commit_date
            snapshot_churn = {}

            if snapshot.changes:
                for mod in snapshot.changes.modified_dependencies:
                    node = mod.node
                    snapshot_churn[node] = snapshot_churn.get(node, 0) + 1

            heatmap_data.append(
                ChurnHeatmapEntry(
                    date=date,
                    commit_sha=snapshot.commit_sha,
                    churn_count=sum(snapshot_churn.values()),
                    nodes_changed=list(snapshot_churn.keys()),
                )
            )

        return heatmap_data

    def _track_circular_dependencies(
        self, snapshots: list[TemporalSnapshotData]
    ) -> list[CircularDependencyTimelineEvent]:
        """Track when circular dependencies were introduced."""
        timeline = []
        seen_circular = set()

        for snapshot in snapshots:
            circular_nodes = set(snapshot.circular_nodes)
            new_circular = circular_nodes - seen_circular

            if new_circular:
                timeline.append(
                    CircularDependencyTimelineEvent(
                        date=snapshot.commit_date,
                        commit_sha=snapshot.commit_sha,
                        commit_message=snapshot.commit_message,
                        new_circular_nodes=list(new_circular),
                        total_circular=len(circular_nodes),
                    )
                )

            seen_circular.update(circular_nodes)

        return timeline

    def get_cached_analysis(self, analysis_id: str) -> TemporalAnalysisResponse | None:
        """Retrieve cached analysis results."""
        return self.snapshots_cache.get(analysis_id)
