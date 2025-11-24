import hashlib
from collections import defaultdict
from datetime import datetime

from app.core import get_logger
from app.services.analyzer_service import analyze_files
from app.services.github_service import GitHubService
from app.services.graph_service import build_graph
from app.services.layout_service import apply_layout
from app.services.metrics_service import MetricsCalculator

logger = get_logger(__name__)


class TemporalAnalysisService:
    """Service for analyzing dependency evolution over git history."""

    def __init__(self):
        self.github_service = GitHubService()
        self.snapshots_cache: dict[str, dict] = {}

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
        analysis_id = hashlib.md5(
            f"{repo_url}_{start_date}_{end_date}_{sample_strategy}".encode()
        ).hexdigest()

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
        snapshots = []
        previous_snapshot = None

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
        result = {
            "analysis_id": analysis_id,
            "repository": repo_url,
            "start_date": start_date,
            "end_date": end_date,
            "total_commits": len(commits),
            "analyzed_commits": len(snapshots),
            "sample_strategy": sample_strategy,
            "snapshots": snapshots,
            "churn_data": churn_data,
            "circular_deps_timeline": circular_deps_timeline,
        }

        # Cache results
        self.snapshots_cache[analysis_id] = result

        yield {
            "type": "progress",
            "message": "Analysis complete!",
            "step": 6,
            "total": 6,
        }
        yield {"type": "result", "data": result}

    async def analyze_repository_history(
        self,
        repo_url: str,
        start_date: str | None = None,
        end_date: str | None = None,
        sample_strategy: str = "all",  # "all", "daily", "weekly", "monthly"
    ) -> dict:
        """
        Analyze dependency evolution over git history.

        Args:
            repo_url: GitHub repository URL
            start_date: Optional start date (ISO format)
            end_date: Optional end date (ISO format)
            sample_strategy: How to sample commits ("all", "daily", "weekly", "monthly")

        Returns:
            dict with:
                - analysis_id: Unique ID for this analysis
                - snapshots: List of dependency snapshots
                - churn_data: Dependency churn metrics
                - circular_deps_timeline: When circular dependencies appeared
        """
        logger.info("Starting temporal analysis for %s", repo_url)
        logger.info("Date range: %s to %s", start_date, end_date)
        logger.info("Sample strategy: %s", sample_strategy)

        # Generate analysis ID
        analysis_id = hashlib.md5(
            f"{repo_url}_{start_date}_{end_date}_{sample_strategy}".encode()
        ).hexdigest()

        # Fetch commit history from GitHub
        logger.info("Fetching commit history...")
        commits = await self.github_service.fetch_commit_history(
            repo_url, start_date, end_date
        )
        logger.info("Fetched %d commits", len(commits))

        if not commits:
            return {
                "analysis_id": analysis_id,
                "error": "No commits found in the specified range",
            }

        # Sample commits based on strategy
        sampled_commits = self._sample_commits(commits, sample_strategy)
        logger.info(
            "Sampled to %d commits using '%s' strategy",
            len(sampled_commits),
            sample_strategy,
        )

        # Limit to reasonable number to prevent timeouts
        max_analysis_commits = 20
        if len(sampled_commits) > max_analysis_commits:
            logger.info(
                "Limiting analysis to most recent %d commits", max_analysis_commits
            )
            sampled_commits = sampled_commits[-max_analysis_commits:]

        # Analyze each commit
        snapshots = []
        previous_snapshot = None

        for idx, commit in enumerate(sampled_commits):
            logger.info(
                "Analyzing commit %d/%d: %s",
                idx + 1,
                len(sampled_commits),
                commit["sha"][:7],
            )
            snapshot = await self._analyze_commit(repo_url, commit, previous_snapshot)
            if snapshot:
                snapshots.append(snapshot)
                previous_snapshot = snapshot
                logger.info(
                    "  ✓ Success: %d nodes, %d edges",
                    snapshot["node_count"],
                    snapshot["edge_count"],
                )
            else:
                logger.warning("  ✗ Failed to analyze commit")

        logger.info("Analysis complete: %d snapshots created", len(snapshots))

        # Calculate churn metrics
        churn_data = self._calculate_churn(snapshots)

        # Track circular dependency introduction
        circular_deps_timeline = self._track_circular_dependencies(snapshots)

        result = {
            "analysis_id": analysis_id,
            "repository": repo_url,
            "start_date": start_date,
            "end_date": end_date,
            "total_commits": len(commits),
            "analyzed_commits": len(snapshots),
            "sample_strategy": sample_strategy,
            "snapshots": snapshots,
            "churn_data": churn_data,
            "circular_deps_timeline": circular_deps_timeline,
        }

        # Cache results
        self.snapshots_cache[analysis_id] = result

        return result

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
        self, repo_url: str, commit: dict, previous_snapshot: dict | None
    ) -> dict | None:
        """Analyze dependencies at a specific commit."""
        try:
            # Fetch files at this commit
            files = await self.github_service.fetch_repository_at_commit(
                repo_url, commit["sha"]
            )

            if not files:
                return None

            # Analyze dependencies
            project_name = repo_url.split("/")[-1]
            dependency_data = await analyze_files(files, project_name)

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
            changes = None
            if previous_snapshot:
                changes = self._calculate_changes(
                    previous_snapshot,
                    dependencies,
                    node_count,
                    edge_count,
                    len(circular_nodes),
                )

            return {
                "commit_sha": commit["sha"],
                "commit_message": commit["message"],
                "commit_date": commit["date"],
                "author": commit["author"],
                "node_count": node_count,
                "edge_count": edge_count,
                "dependencies": dependencies,
                "circular_nodes": circular_nodes,
                "circular_count": len(circular_nodes),
                "global_metrics": {
                    "average_coupling": global_metrics.get("average_coupling", 0),
                    "max_coupling": global_metrics.get("max_coupling", 0),
                    "total_complexity": global_metrics.get("total_complexity", 0),
                },
                "changes": changes,
                # Store graph data for visualization
                "graph_snapshot": {
                    "nodes": [
                        {
                            "id": node_id,
                            "type": graph.nodes[node_id].get("type", "internal"),
                            "label": graph.nodes[node_id].get("label", node_id),
                            "module": graph.nodes[node_id].get("module", ""),
                            "position": graph.nodes[node_id].get(
                                "position", {"x": 0, "y": 0, "z": 0}
                            ),
                            "metrics": graph.nodes[node_id].get("metrics", {}),
                        }
                        for node_id in graph.nodes
                    ],
                    "edges": [
                        {
                            "source": s,
                            "target": t,
                            "imports": graph.edges[s, t].get("imports", []),
                            "weight": graph.edges[s, t].get("weight", 1),
                        }
                        for s, t in graph.edges
                    ],
                },
            }

        except Exception as e:
            logger.error(
                "Error analyzing commit %s: %s", commit["sha"], str(e), exc_info=True
            )
            return None

    def _calculate_changes(
        self,
        previous_snapshot: dict,
        current_dependencies: dict,
        current_nodes: int,
        current_edges: int,
        current_circular_count: int,
    ) -> dict:
        """Calculate changes between snapshots."""
        prev_deps = previous_snapshot.get("dependencies", {})

        # Calculate added/removed/modified dependencies
        added_nodes = set(current_dependencies.keys()) - set(prev_deps.keys())
        removed_nodes = set(prev_deps.keys()) - set(current_dependencies.keys())

        modified_deps = []
        for node_id in set(current_dependencies.keys()) & set(prev_deps.keys()):
            current = set(current_dependencies[node_id])
            previous = set(prev_deps.get(node_id, []))
            if current != previous:
                modified_deps.append(
                    {
                        "node": node_id,
                        "added": list(current - previous),
                        "removed": list(previous - current),
                    }
                )

        return {
            "added_nodes": list(added_nodes),
            "removed_nodes": list(removed_nodes),
            "modified_dependencies": modified_deps,
            "node_count_delta": current_nodes - previous_snapshot["node_count"],
            "edge_count_delta": current_edges - previous_snapshot["edge_count"],
            "circular_count_delta": current_circular_count
            - previous_snapshot["circular_count"],
        }

    def _calculate_churn(self, snapshots: list[dict]) -> dict:
        """Calculate dependency churn metrics."""
        # Track how often each node's dependencies changed
        node_churn = defaultdict(int)
        total_changes = 0

        for snapshot in snapshots:
            if snapshot.get("changes"):
                changes = snapshot["changes"]
                total_changes += len(changes.get("modified_dependencies", []))

                for mod in changes.get("modified_dependencies", []):
                    node_churn[mod["node"]] += 1

        # Sort by churn frequency
        churn_ranking = sorted(node_churn.items(), key=lambda x: x[1], reverse=True)

        # Calculate aggregated metrics
        if snapshots:
            avg_churn = total_changes / len(snapshots)
        else:
            avg_churn = 0

        return {
            "total_changes": total_changes,
            "average_churn_per_snapshot": round(avg_churn, 2),
            "node_churn": dict(node_churn),
            "top_churning_nodes": churn_ranking[:20],  # Top 20
            "churn_heatmap": self._generate_churn_heatmap(snapshots, node_churn),
        }

    def _generate_churn_heatmap(
        self, snapshots: list[dict], node_churn: dict[str, int]
    ) -> list[dict]:
        """Generate heatmap data for visualization."""
        heatmap_data = []

        for snapshot in snapshots:
            date = snapshot["commit_date"]
            snapshot_churn = {}

            if snapshot.get("changes"):
                for mod in snapshot["changes"].get("modified_dependencies", []):
                    node = mod["node"]
                    snapshot_churn[node] = snapshot_churn.get(node, 0) + 1

            heatmap_data.append(
                {
                    "date": date,
                    "commit_sha": snapshot["commit_sha"],
                    "churn_count": sum(snapshot_churn.values()),
                    "nodes_changed": list(snapshot_churn.keys()),
                }
            )

        return heatmap_data

    def _track_circular_dependencies(self, snapshots: list[dict]) -> list[dict]:
        """Track when circular dependencies were introduced."""
        timeline = []
        seen_circular = set()

        for snapshot in snapshots:
            circular_nodes = set(snapshot.get("circular_nodes", []))
            new_circular = circular_nodes - seen_circular

            if new_circular:
                timeline.append(
                    {
                        "date": snapshot["commit_date"],
                        "commit_sha": snapshot["commit_sha"],
                        "commit_message": snapshot["commit_message"],
                        "new_circular_nodes": list(new_circular),
                        "total_circular": len(circular_nodes),
                    }
                )

            seen_circular.update(circular_nodes)

        return timeline

    def get_cached_analysis(self, analysis_id: str) -> dict | None:
        """Retrieve cached analysis results."""
        return self.snapshots_cache.get(analysis_id)
