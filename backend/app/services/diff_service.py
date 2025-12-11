from collections.abc import AsyncGenerator
import networkx as nx

from app.core.models import DiffRequest, DiffResult, FileInput
from app.services import GitHubService, analyze_files, build_graph, ProgressTracker


class DiffService:
    """Service for comparing dependencies between two versions of a repository."""

    @staticmethod
    async def fetch_version_files(
        repo_url: str, ref: str, github_service: GitHubService
    ) -> list[FileInput]:
        """Fetch files for a specific version/reference from GitHub."""
        result = await github_service.fetch_repository(repo_url, ref)
        return result.files

    @staticmethod
    async def analyze_and_build_graph(
        files: list[FileInput], project_name: str
    ) -> nx.DiGraph:
        """Analyze files and build dependency graph."""
        dependency_data = await analyze_files(files, project_name)
        return build_graph(dependency_data)

    @staticmethod
    def compare_graphs(graph1: nx.DiGraph, graph2: nx.DiGraph) -> DiffResult:
        """Compare two graphs and return the differences."""
        nodes1 = set(graph1.nodes)
        nodes2 = set(graph2.nodes)

        added_nodes = list(nodes2 - nodes1)
        removed_nodes = list(nodes1 - nodes2)

        edges1 = set(graph1.edges)
        edges2 = set(graph2.edges)

        added_edges = [{"source": e[0], "target": e[1]} for e in (edges2 - edges1)]
        removed_edges = [{"source": e[0], "target": e[1]} for e in (edges1 - edges2)]

        common_edges = edges1 & edges2
        changed_edges = []
        for edge in common_edges:
            imports1 = set(graph1.edges[edge].get("imports", []))
            imports2 = set(graph2.edges[edge].get("imports", []))

            if imports1 != imports2:
                changed_edges.append(
                    {
                        "source": edge[0],
                        "target": edge[1],
                        "added_imports": list(imports2 - imports1),
                        "removed_imports": list(imports1 - imports2),
                    }
                )

        return DiffResult(
            added_nodes=added_nodes,
            removed_nodes=removed_nodes,
            added_edges=added_edges,
            removed_edges=removed_edges,
            changed_edges=changed_edges,
        )

    @staticmethod
    async def perform_diff(
        request: DiffRequest, tracker: ProgressTracker
    ) -> AsyncGenerator[str, None]:
        """Perform diff analysis between two repository versions."""
        try:
            yield await tracker.emit_step(0)
            github_service = GitHubService()
            repo_url = f"https://github.com/{request.repo}"

            files1 = await DiffService.fetch_version_files(
                repo_url, request.ref1, github_service
            )

            yield await tracker.emit_step(1)
            files2 = await DiffService.fetch_version_files(
                repo_url, request.ref2, github_service
            )

            yield await tracker.emit_step(2)
            graph1 = await DiffService.analyze_and_build_graph(files1, request.repo)

            yield await tracker.emit_step(3)
            graph2 = await DiffService.analyze_and_build_graph(files2, request.repo)

            yield await tracker.emit_step(4)
            diff_result = DiffService.compare_graphs(graph1, graph2)

            yield await tracker.emit_step(6)
            yield await tracker.emit_result(diff_result.model_dump())

        except Exception as e:
            yield await tracker.emit_error(str(e))
