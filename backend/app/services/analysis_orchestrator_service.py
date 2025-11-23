from typing import AsyncGenerator
import networkx as nx

from app.core import get_logger
from app.core.models import (
    AnalyzeRequest,
    AnalysisResult,
    Node,
    Edge,
    NodeMetrics,
    Position3D,
    ClusterMetrics,
    ClusteringResult,
    PackageSuggestion,
    RefactoringSuggestion,
    RefactoringSummary,
    HotZoneFile,
    GlobalMetrics,
    DependencyGraph,
    FileInput,
    SourceFilesResult,
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
from app.utils.color_generator import get_color_for_node

logger = get_logger(__name__)


class AnalysisOrchestratorService:
    """Orchestrates the complete code analysis workflow."""

    @staticmethod
    async def fetch_source_files(request: AnalyzeRequest) -> SourceFilesResult:
        """Fetch source files based on request source type."""
        logger.debug("Fetching source files for source type: %s", request.source)

        if request.source == "github":
            if not request.url:
                logger.warning("GitHub source requested but no URL provided")
                return SourceFilesResult(success=False, error_message="GitHub URL is required")

            try:
                github_service = GitHubService()
                files = await github_service.fetch_repository(request.url)
                project_name = request.url.split("/")[-1]

                if not files:
                    logger.warning("No Python files found in repository: %s", request.url)
                    return SourceFilesResult(
                        success=False, error_message="No Python files found in repository"
                    )

                logger.info("Successfully fetched %d files from GitHub repo: %s", len(files), project_name)
                return SourceFilesResult(success=True, files=files, project_name=project_name)

            except Exception as e:
                logger.error("GitHub fetch error for %s: %s", request.url, str(e), exc_info=True)
                return SourceFilesResult(success=False, error_message=f"GitHub error: {str(e)}")

        elif request.source == "local":
            if not request.files:
                logger.warning("Local source requested but no files provided")
                return SourceFilesResult(success=False, error_message="Files are required")

            logger.info("Using %d local files for analysis", len(request.files))
            return SourceFilesResult(success=True, files=request.files, project_name="local_project")

        elif request.source == "import":
            logger.debug("Import source requested (no file fetching needed)")
            return SourceFilesResult(success=True, files=[], project_name="imported_project")

        else:
            logger.error("Unknown source type: %s", request.source)
            return SourceFilesResult(success=False, error_message=f"Unknown source: {request.source}")

    @staticmethod
    def build_nodes_and_edges(
        graph: nx.DiGraph, clustering_result: ClusteringResult
    ) -> tuple[list[Node], list[Edge]]:
        """Build Node and Edge models from NetworkX graph."""
        nodes = []
        for node_id in graph.nodes:
            node_data = graph.nodes[node_id]
            metrics = node_data.get("metrics", {})

            color = get_color_for_node(
                node_id,
                node_data.get("module", ""),
                is_circular=metrics.get("is_circular", False),
                is_high_coupling=metrics.get("is_high_coupling", False),
            )

            cluster_id = clustering_result.node_to_community.get(node_id)

            nodes.append(
                Node(
                    id=node_id,
                    label=node_data.get("label", node_id),
                    type=node_data.get("type", "internal"),
                    module=node_data.get("module", ""),
                    position=Position3D(**node_data.get("position", {"x": 0, "y": 0, "z": 0})),
                    color=color,
                    metrics=NodeMetrics(**metrics),
                    cluster_id=cluster_id,
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
        global_metrics["package_suggestions"] = [ps.model_dump() for ps in package_suggestions]

        refactoring_suggestions_data = refactoring_service.analyze_refactoring_opportunities()
        refactoring_summary_data = refactoring_service.get_summary_stats()

        refactoring_suggestions = [
            RefactoringSuggestion(**sugg) for sugg in refactoring_suggestions_data
        ]
        global_metrics["refactoring_suggestions"] = [rs.model_dump() for rs in refactoring_suggestions]
        global_metrics["refactoring_summary"] = RefactoringSummary(**refactoring_summary_data).model_dump()

        hot_zone_files = [HotZoneFile(**hzf) for hzf in global_metrics.get("hot_zone_files", [])]
        global_metrics["hot_zone_files"] = [hzf.model_dump() for hzf in hot_zone_files]

        return GlobalMetrics(**global_metrics)

    @staticmethod
    async def perform_analysis(
        request: AnalyzeRequest, tracker: ProgressTracker
    ) -> AsyncGenerator[str, None]:
        """Perform code analysis and yield progress updates."""
        yield await tracker.emit_step(0)

        if request.source == "import":
            if not request.data:
                yield await tracker.emit_error("Import data is required")
                return
            result = request.data.model_dump()
            yield await tracker.emit_result(result)
            return

        source_result = await AnalysisOrchestratorService.fetch_source_files(request)
        if not source_result.success:
            logger.error("Failed to fetch source files: %s", source_result.error_message)
            yield await tracker.emit_error(source_result.error_message)
            return

        files = source_result.files
        project_name = source_result.project_name
        logger.info("Starting analysis for project '%s' with %d files", project_name, len(files))

        yield await tracker.emit_step(1)
        dependency_data = analyze_files(files, project_name)

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
            global_metrics_dict, clustering_result, clustering_service, refactoring_service
        )

        yield await tracker.emit_step(5)
        graph = apply_layout(graph, "hierarchical")

        nodes, edges = AnalysisOrchestratorService.build_nodes_and_edges(graph, clustering_result)

        result = {
            "graph": {"nodes": [n.model_dump() for n in nodes], "edges": [e.model_dump() for e in edges]},
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
