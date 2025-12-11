from fastapi import APIRouter, Cookie
from sse_starlette.sse import EventSourceResponse

from app.api.routes.auth import get_session_token
from app.core.config import settings
from app.core.models import (
    AnalyzeRequest,
    GitHubAnalyzeRequest,
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

router = APIRouter()


@router.post("/analyze")
async def analyze_code(
    request: AnalyzeRequest,
    session_id: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> EventSourceResponse:
    effective_request: AnalyzeRequest = request

    match request.source:
        case "github" if not request.github_token:  # type: ignore[union-attr]
            token = get_session_token(session_id)
            if token:
                effective_request = GitHubAnalyzeRequest(
                    source="github",
                    url=request.url,  # type: ignore[union-attr]
                    github_token=token,
                )

    async def generate():
        tracker = ProgressTracker()
        try:
            async for event in AnalysisOrchestratorService.perform_analysis(
                effective_request, tracker
            ):
                yield event
        except Exception as e:
            yield await tracker.emit_error(str(e))

    return EventSourceResponse(generate())


@router.post("/impact-analysis", response_model=ImpactAnalysisResponse)
async def analyze_impact(request: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    graph_data = request.graph.model_dump()
    impact_service = ImpactAnalysisService(graph_data)
    result = impact_service.calculate_impact(request.node_id, request.max_depth)
    return ImpactAnalysisResponse(**result)


@router.post("/health-score", response_model=HealthScoreResponse)
async def calculate_health_score(
    graph: DependencyGraph, global_metrics: GlobalMetrics
) -> HealthScoreResponse:
    nx_graph = AnalysisOrchestratorService.build_networkx_graph(graph)
    health_service = HealthScoreService(nx_graph, global_metrics)
    return health_service.calculate_health_score()
