from fastapi import APIRouter, Cookie, Request
from sse_starlette.sse import EventSourceResponse

from app.api.routes import ERROR_RESPONSES
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
    build_networkx_graph,
)
from app.middleware.error_handler import stream_with_error_handling

router = APIRouter()


@router.post("/analyze", responses=ERROR_RESPONSES)
async def analyze_code(
    request: AnalyzeRequest,
    http_request: Request,
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
        async for event in stream_with_error_handling(
            AnalysisOrchestratorService.perform_analysis(effective_request, tracker),
            tracker.emit_error_response,
            path=str(http_request.url.path),
        ):
            yield event

    return EventSourceResponse(generate())


@router.post(
    "/impact-analysis",
    response_model=ImpactAnalysisResponse,
    responses=ERROR_RESPONSES,
)
async def analyze_impact(request: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    impact_service = ImpactAnalysisService(request.graph)
    return impact_service.calculate_impact(request.node_id, request.max_depth)


@router.post(
    "/health-score",
    response_model=HealthScoreResponse,
    responses=ERROR_RESPONSES,
)
async def calculate_health_score(
    graph: DependencyGraph, global_metrics: GlobalMetrics
) -> HealthScoreResponse:
    nx_graph = build_networkx_graph(graph)
    health_service = HealthScoreService(nx_graph, global_metrics)
    return health_service.calculate_health_score()
