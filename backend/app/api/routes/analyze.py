from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.core.models import (
    AnalyzeRequest, Node, Edge, NodeMetrics, Position3D,
    ClusterMetrics, PackageSuggestion, RefactoringSuggestion, RefactoringSummary, HotZoneFile,
    ImpactAnalysisRequest, ImpactAnalysisResponse
)
from app.services.analyzer_service import analyze_files
from app.services.graph_service import build_graph
from app.services.metrics_service import MetricsCalculator
from app.services.clustering_service import ClusteringService
from app.services.refactoring_service import RefactoringService
from app.services.impact_service import ImpactAnalysisService
from app.services.layout_service import apply_layout
from app.services.github_service import GitHubService
from app.services.progress_service import ProgressTracker
from app.utils.color_generator import get_color_for_node

router = APIRouter()


@router.post("/analyze")
async def analyze_code(request: AnalyzeRequest):
    """
    Analyze code and return dependency graph with metrics.

    Supports three input sources:
    - github: Fetch from GitHub repository
    - local: Uploaded files
    - import: Previously exported data
    """

    async def generate():
        tracker = ProgressTracker()

        try:
            # Step 1: Fetch source files
            yield await tracker.emit_step(0)

            if request.source == "github":
                if not request.url:
                    yield await tracker.emit_error("GitHub URL is required")
                    return

                try:
                    github_service = GitHubService()
                    files = await github_service.fetch_repository(request.url)
                    project_name = request.url.split("/")[-1]

                    if not files:
                        yield await tracker.emit_error("No Python files found in repository")
                        return
                except Exception as e:
                    yield await tracker.emit_error(f"GitHub error: {str(e)}")
                    return

            elif request.source == "local":
                if not request.files:
                    yield await tracker.emit_error("Files are required")
                    return

                files = request.files
                project_name = "local_project"

                if not files:
                    yield await tracker.emit_error("No Python files provided")
                    return

            elif request.source == "import":
                if not request.data:
                    yield await tracker.emit_error("Import data is required")
                    return

                # Return imported data directly
                result = request.data.model_dump()
                yield await tracker.emit_result(result)
                return

            else:
                yield await tracker.emit_error(f"Unknown source: {request.source}")
                return

            # Step 2: Parse Python files
            yield await tracker.emit_step(1)
            dependency_data = analyze_files(files, project_name)

            # Step 3: Resolve imports
            yield await tracker.emit_step(2)

            # Step 4: Build dependency graph
            yield await tracker.emit_step(3)
            graph = build_graph(dependency_data)

            # Step 5: Calculate metrics
            yield await tracker.emit_step(4)
            metrics_calc = MetricsCalculator(graph)
            global_metrics = metrics_calc.calculate_all()

            # Step 5.5: Detect communities/clusters
            clustering_service = ClusteringService(graph)
            clustering_result = clustering_service.detect_communities(resolution=1.0)

            # Add cluster information to global metrics
            cluster_metrics_list = [
                ClusterMetrics(**cluster_data)
                for cluster_data in clustering_result["metrics"]
            ]
            global_metrics["clusters"] = [cm.model_dump() for cm in cluster_metrics_list]

            # Get package suggestions
            suggestions = clustering_service.get_cluster_suggestions()
            package_suggestions = [
                PackageSuggestion(**sugg) for sugg in suggestions
            ]
            global_metrics["package_suggestions"] = [ps.model_dump() for ps in package_suggestions]

            # Step 5.6: Analyze refactoring opportunities
            refactoring_service = RefactoringService(graph)
            refactoring_suggestions_data = refactoring_service.analyze_refactoring_opportunities()
            refactoring_summary_data = refactoring_service.get_summary_stats()

            # Add refactoring suggestions to global metrics
            refactoring_suggestions = [
                RefactoringSuggestion(**sugg) for sugg in refactoring_suggestions_data
            ]
            global_metrics["refactoring_suggestions"] = [rs.model_dump() for rs in refactoring_suggestions]
            global_metrics["refactoring_summary"] = RefactoringSummary(**refactoring_summary_data).model_dump()

            # Convert hot zone files to Pydantic models
            hot_zone_files = [
                HotZoneFile(**hzf) for hzf in global_metrics.get("hot_zone_files", [])
            ]
            global_metrics["hot_zone_files"] = [hzf.model_dump() for hzf in hot_zone_files]

            # Step 6: Generate layout
            yield await tracker.emit_step(5)
            graph = apply_layout(graph, "hierarchical")

            # Build response
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

                # Get cluster ID for this node
                cluster_id = clustering_result["node_to_community"].get(node_id)

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
                thickness = min(weight * 0.5, 5.0)  # Cap thickness at 5

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

            result = {
                "graph": {"nodes": [n.model_dump() for n in nodes], "edges": [e.model_dump() for e in edges]},
                "global_metrics": global_metrics,
                "warnings": dependency_data.errors,
            }

            # Step 7: Complete
            yield await tracker.emit_step(6)
            yield await tracker.emit_result(result)

        except Exception as e:
            yield await tracker.emit_error(str(e))

    return EventSourceResponse(generate())


@router.post("/impact-analysis", response_model=ImpactAnalysisResponse)
async def analyze_impact(request: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    """
    Analyze the impact of changes to a specific node.

    Calculates transitive dependencies to understand what would be affected
    if this node is modified.

    Args:
        request: Impact analysis request with node_id, graph, and optional max_depth

    Returns:
        Impact analysis with affected nodes, metrics, and visualization data
    """
    # Convert Pydantic graph model to dict for ImpactAnalysisService
    graph_data = request.graph.model_dump()

    # Perform impact analysis
    impact_service = ImpactAnalysisService(graph_data)
    result = impact_service.calculate_impact(request.node_id, request.max_depth)

    # Return as Pydantic model (FastAPI will validate and serialize)
    return ImpactAnalysisResponse(**result)
