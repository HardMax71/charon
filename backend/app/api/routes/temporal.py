from app.core.models import TemporalAnalysisRequest, TemporalAnalysisResponse
from app.services import TemporalOrchestratorService
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()
temporal_orchestrator = TemporalOrchestratorService()


@router.post("/temporal-analysis")
async def start_temporal_analysis(
    request: TemporalAnalysisRequest,
) -> EventSourceResponse:
    """
    Start temporal analysis for a GitHub repository with SSE progress updates.

    Args:
        repository_url: GitHub repository URL
        start_date: Optional start date (ISO format)
        end_date: Optional end date (ISO format)
        sample_strategy: How to sample commits ("all", "daily", "weekly", "monthly")

    Returns:
        Server-Sent Events stream with progress updates
    """

    async def generate():
        async for event in temporal_orchestrator.start_temporal_analysis(request):
            yield event

    return EventSourceResponse(generate())


@router.get("/temporal-analysis/{analysis_id}", response_model=TemporalAnalysisResponse)
async def get_temporal_analysis(analysis_id: str) -> TemporalAnalysisResponse:
    """
    Retrieve cached temporal analysis results.

    Args:
        analysis_id: Analysis ID from previous analysis

    Returns:
        Cached temporal analysis results
    """
    return temporal_orchestrator.get_temporal_analysis(analysis_id)
