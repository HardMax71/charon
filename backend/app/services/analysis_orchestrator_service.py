from collections.abc import AsyncGenerator
import networkx as nx

from app.core import get_logger, THIRD_PARTY_COLOR, DEFAULT_NODE_COLOR
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
    PackageSuggestion,
    RefactoringSuggestion,
    RefactoringSummary,
    HotZoneFile,
    GlobalMetrics,
    DependencyGraph,
    SourceFilesResult,
    Language,
    NodeType,
)
from app.services import (
    analyze_files,
    build_graph,
    MetricsCalculator,
    ClusteringService,
    RefactoringService,
    GitHubService,
    ProgressTracker,
    apply_layout,
)
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
                try:
                    github_service = GitHubService()
                    files = await github_service.fetch_repository(url, token=token)
                    project_name = url.split("/")[-1]

                    if not files:
                        logger.warning(
                            "No supported source files found in repository: %s", url
                        )
                        return SourceFilesResult(
                            success=False,
                            error_message="No supported source files found in repository",
                        )

                    logger.info(
                        "Successfully fetched %d files from GitHub repo: %s",
                        len(files),
                        project_name,
                    )
                    return SourceFilesResult(
                        success=True, files=files, project_name=project_name
                    )

                except Exception as e:
                    logger.error(
                        "GitHub fetch error for %s: %s", url, str(e), exc_info=True
                    )
                    return SourceFilesResult(
                        success=False, error_message=f"GitHub error: {str(e)}"
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
                return SourceFilesResult(
                    success=False, error_message="Invalid request type"
                )

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
        global_metrics: dict,
        clustering_result: ClusteringResult,
        clustering_service: ClusteringService,
        refactoring_service: RefactoringService,
    ) -> GlobalMetrics:
        """Enrich global metrics with clustering and refactoring data."""
        cluster_metrics_list = clustering_result.metrics
        global_metrics["clusters"] = [cm.model_dump() for cm in cluster_metrics_list]

        suggestions = clustering_service.get_cluster_suggestions()
        package_suggestions = [PackageSuggestion(**sugg) for sugg in suggestions]
        global_metrics["package_suggestions"] = [
            ps.model_dump() for ps in package_suggestions
        ]

        refactoring_suggestions_data = (
            refactoring_service.analyze_refactoring_opportunities()
        )
        refactoring_summary_data = refactoring_service.get_summary_stats()

        refactoring_suggestions = [
            RefactoringSuggestion(**sugg) for sugg in refactoring_suggestions_data
        ]
        global_metrics["refactoring_suggestions"] = [
            rs.model_dump() for rs in refactoring_suggestions
        ]
        global_metrics["refactoring_summary"] = RefactoringSummary(
            **refactoring_summary_data
        ).model_dump()

        hot_zone_files = [
            HotZoneFile(**hzf) for hzf in global_metrics.get("hot_zone_files", [])
        ]
        global_metrics["hot_zone_files"] = [hzf.model_dump() for hzf in hot_zone_files]

        return GlobalMetrics(**global_metrics)

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
        if not source_result.success:
            error_msg = (
                source_result.error_message or "Unknown error fetching source files"
            )
            logger.error("Failed to fetch source files: %s", error_msg)
            yield await tracker.emit_error(error_msg)
            return

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
        global_metrics_dict = metrics_calc.calculate_all()

        clustering_service = ClusteringService(graph)
        clustering_result_dict = clustering_service.detect_communities(resolution=1.0)
        clustering_result = ClusteringResult(**clustering_result_dict)

        refactoring_service = RefactoringService(graph)

        global_metrics = AnalysisOrchestratorService.enrich_global_metrics(
            global_metrics_dict,
            clustering_result,
            clustering_service,
            refactoring_service,
        )

        yield await tracker.emit_step(5)
        graph = apply_layout(graph, "hierarchical")

        nodes, edges = AnalysisOrchestratorService.build_nodes_and_edges(
            graph, clustering_result
        )

        result = {
            "graph": {
                "nodes": [n.model_dump() for n in nodes],
                "edges": [e.model_dump() for e in edges],
            },
            "global_metrics": global_metrics.model_dump(),
            "warnings": dependency_data.errors,
        }

        yield await tracker.emit_step(6)
        yield await tracker.emit_result(result)

    @staticmethod
    def build_networkx_graph(graph: DependencyGraph) -> nx.DiGraph:
        """Rebuild NetworkX graph from Pydantic model."""
        nx_graph = nx.DiGraph()

        for node in graph.nodes:
            nx_graph.add_node(
                node.id,
                type=node.type,
                module=node.module,
                label=node.label,
                metrics=node.metrics.model_dump() if node.metrics else {},
            )

        for edge in graph.edges:
            nx_graph.add_edge(
                edge.source, edge.target, imports=edge.imports, weight=edge.weight
            )

        return nx_graph
