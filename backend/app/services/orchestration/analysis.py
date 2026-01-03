from collections.abc import AsyncGenerator
import networkx as nx

from app.core import get_logger, THIRD_PARTY_COLOR, DEFAULT_NODE_COLOR
from app.core.exceptions import BadRequestError
from app.core.models import (
    AnalyzeRequest,
    GitHubAnalyzeRequest,
    LocalAnalyzeRequest,
    ImportAnalyzeRequest,
    Node,
    Edge,
    NodeMetrics,
    Position3D,
    ClusteringResult,
    GlobalMetrics,
    SourceFilesResult,
    Language,
    NodeType,
)
from app.services.analysis import analyze_files, MetricsCalculator
from app.services.fitness import RefactoringService
from app.services.graph import build_graph, ClusteringService, apply_layout
from app.services.infrastructure import GitHubService, ProgressTracker
# get_color_for_node no longer used - colors now based on status in frontend

logger = get_logger(__name__)


class AnalysisOrchestratorService:
    """Orchestrates the complete code analysis workflow."""

    @staticmethod
    async def fetch_source_files(request: AnalyzeRequest) -> SourceFilesResult:
        """Fetch source files based on request source type.

        Uses discriminated union with pattern matching - Pydantic ensures correct fields are present.
        """
        logger.debug("Fetching source files for source type: %s", request.source)

        match request:
            case GitHubAnalyzeRequest(url=url, github_token=token):
                github_service = GitHubService()
                result = await github_service.fetch_repository(url, token=token)
                project_name = url.split("/")[-1]

                if not result.files:
                    logger.warning(
                        "No supported source files found in repository: %s", url
                    )
                    raise BadRequestError(
                        "No supported source files found in repository"
                    )

                warnings = []
                if result.failed_count > 0:
                    warnings.append(
                        f"Failed to fetch {result.failed_count}/{result.total_files} files"
                    )

                logger.info(
                    "Fetched %d/%d files from GitHub repo: %s",
                    len(result.files),
                    result.total_files,
                    project_name,
                )
                return SourceFilesResult(
                    success=True,
                    files=result.files,
                    project_name=project_name,
                    warnings=warnings,
                )

            case LocalAnalyzeRequest(files=files):
                logger.info("Using %d local files for analysis", len(files))
                return SourceFilesResult(
                    success=True, files=files, project_name="local_project"
                )

            case ImportAnalyzeRequest():
                logger.debug("Import source requested (no file fetching needed)")
                return SourceFilesResult(
                    success=True, files=[], project_name="imported_project"
                )

            case _:
                # This should never happen due to discriminated union validation
                logger.error("Unexpected request type: %s", type(request))
                raise BadRequestError("Invalid request type")

    @staticmethod
    def build_nodes_and_edges(
        graph: nx.DiGraph, clustering_result: ClusteringResult
    ) -> tuple[list[Node], list[Edge]]:
        """Build Node and Edge models from NetworkX graph."""
        nodes = []
        for node_id in graph.nodes:
            node_data = graph.nodes[node_id]
            metrics = node_data.get("metrics", {})

            # Get language and node type
            lang_str = node_data.get("language")
            node_type = node_data.get("type", "internal")

            # Node fill color is now neutral by default
            # Status colors (hot zone, added, removed) are applied in frontend
            # Language is shown via outline + badge in frontend
            if node_type == "third_party":
                color = THIRD_PARTY_COLOR
            else:
                color = DEFAULT_NODE_COLOR

            cluster_id = clustering_result.node_to_cluster.get(node_id)

            # Parse language enum if present
            language = None
            if lang_str:
                try:
                    language = Language(lang_str)
                except ValueError:
                    pass

            # Parse node_kind enum if present
            node_kind_str = node_data.get("node_kind", "module")
            try:
                node_kind = NodeType(node_kind_str)
            except ValueError:
                node_kind = NodeType.MODULE

            nodes.append(
                Node(
                    id=node_id,
                    label=node_data.get("label", node_id),
                    type=node_data.get("type", "internal"),
                    module=node_data.get("module", ""),
                    position=Position3D(
                        **node_data.get("position", {"x": 0, "y": 0, "z": 0})
                    ),
                    color=color,
                    metrics=NodeMetrics(**metrics),
                    cluster_id=cluster_id,
                    # New multi-language fields
                    language=language,
                    node_kind=node_kind,
                    file_path=node_data.get("file_path"),
                    service=node_data.get("service"),
                )
            )

        edges = []
        for i, (source, target) in enumerate(graph.edges):
            edge_data = graph.edges[source, target]
            weight = edge_data.get("weight", 1)
            thickness = min(weight * 0.5, 5.0)

            edges.append(
                Edge(
                    id=f"edge_{i}",
                    source=source,
                    target=target,
                    imports=edge_data.get("imports", []),
                    weight=weight,
                    thickness=thickness,
                )
            )

        return nodes, edges

    @staticmethod
    def enrich_global_metrics(
        global_metrics: GlobalMetrics,
        clustering_result: ClusteringResult,
        clustering_service: ClusteringService,
        refactoring_service: RefactoringService,
    ) -> GlobalMetrics:
        """Enrich global metrics with clustering and refactoring data."""
        package_suggestions = clustering_service.get_cluster_suggestions()
        refactoring_suggestions = (
            refactoring_service.analyze_refactoring_opportunities()
        )
        refactoring_summary = refactoring_service.get_summary_stats()

        return global_metrics.model_copy(
            update={
                "clusters": clustering_result.metrics,
                "package_suggestions": package_suggestions,
                "refactoring_suggestions": refactoring_suggestions,
                "refactoring_summary": refactoring_summary,
            }
        )

    @staticmethod
    async def perform_analysis(
        request: AnalyzeRequest, tracker: ProgressTracker
    ) -> AsyncGenerator[str, None]:
        """Perform code analysis and yield progress updates."""
        yield await tracker.emit_step(0)

        # Handle import case - data field is guaranteed to exist by discriminated union
        match request:
            case ImportAnalyzeRequest(data=data):
                logger.info("Importing previously analyzed data")
                result = data.model_dump()
                yield await tracker.emit_result(result)
                return
            case _:
                pass  # Continue with normal analysis flow

        source_result = await AnalysisOrchestratorService.fetch_source_files(request)

        files = source_result.files or []
        project_name = source_result.project_name or "project"
        logger.info(
            "Starting analysis for project '%s' with %d files", project_name, len(files)
        )

        yield await tracker.emit_step(1)
        dependency_data = await analyze_files(files, project_name)

        yield await tracker.emit_step(2)

        yield await tracker.emit_step(3)
        graph = build_graph(dependency_data)

        yield await tracker.emit_step(4)
        metrics_calc = MetricsCalculator(graph)
        global_metrics = metrics_calc.calculate_all()

        clustering_service = ClusteringService(graph)
        clustering_result = clustering_service.detect_communities(resolution=1.0)

        refactoring_service = RefactoringService(graph)

        global_metrics = AnalysisOrchestratorService.enrich_global_metrics(
            global_metrics,
            clustering_result,
            clustering_service,
            refactoring_service,
        )

        yield await tracker.emit_step(5)
        graph = apply_layout(graph, "hierarchical")

        nodes, edges = AnalysisOrchestratorService.build_nodes_and_edges(
            graph, clustering_result
        )

        all_warnings = source_result.warnings + dependency_data.errors
        result = {
            "graph": {
                "nodes": [n.model_dump() for n in nodes],
                "edges": [e.model_dump() for e in edges],
            },
            "global_metrics": global_metrics.model_dump(),
            "warnings": all_warnings,
        }

        yield await tracker.emit_step(6)
        yield await tracker.emit_result(result)
