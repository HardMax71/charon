from app.core.models import (
    AnalyzeRequest,
    ImpactAnalysisRequest,
    ImpactAnalysisResponse,
    HealthScoreResponse,
    DependencyGraph,
    GlobalMetrics,
)
from app.services import (
    ImpactAnalysisService,
    HealthScoreService,
    AnalysisOrchestratorService,
    ProgressTracker,
)
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()


@router.post("/analyze")
async def analyze_code(request: AnalyzeRequest) -> EventSourceResponse:
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
            async for event in AnalysisOrchestratorService.perform_analysis(
                request, tracker
            ):
                yield event
        except Exception as e:
            yield await tracker.emit_error(str(e))

    return EventSourceResponse(generate())


@router.post("/impact-analysis", response_model=ImpactAnalysisResponse)
async def analyze_impact(request: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    """
    Analyze the impact of changes to a specific node.

    Calculates transitive dependencies to understand what would be affected
    if this node is modified.
    """
    graph_data = request.graph.model_dump()
    impact_service = ImpactAnalysisService(graph_data)
    result = impact_service.calculate_impact(request.node_id, request.max_depth)
    return ImpactAnalysisResponse(**result)


@router.post("/health-score", response_model=HealthScoreResponse)
async def calculate_health_score(
    graph: DependencyGraph, global_metrics: GlobalMetrics
) -> HealthScoreResponse:
    """
    Calculate comprehensive health score for the project.

    Analyzes multiple architectural quality factors:
    - Circular dependencies (20%)
    - Coupling levels (20%)
    - Code complexity and maintainability (30%)
    - Architecture quality / god objects (20%)
    - Instability distribution (10%)

    Returns a 0-100 score with grade and actionable recommendations.
    """
    nx_graph = AnalysisOrchestratorService.build_networkx_graph(graph)
    health_service = HealthScoreService(nx_graph, global_metrics.model_dump())
    result = health_service.calculate_health_score()
    return HealthScoreResponse(**result)
