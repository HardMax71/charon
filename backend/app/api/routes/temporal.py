import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.core.models import TemporalAnalysisRequest
from app.core.exceptions import NotFoundException
from app.services.temporal_service import TemporalAnalysisService

router = APIRouter()
temporal_service = TemporalAnalysisService()


@router.post("/temporal-analysis")
async def start_temporal_analysis(request: TemporalAnalysisRequest):
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
        async for event in temporal_service.analyze_repository_history_streaming(
            repo_url=request.repository_url,
            start_date=request.start_date,
            end_date=request.end_date,
            sample_strategy=request.sample_strategy,
        ):
            yield {
                "event": "message",
                "data": json.dumps(event)
            }

    return EventSourceResponse(generate())


@router.get("/temporal-analysis/{analysis_id}")
async def get_temporal_analysis(analysis_id: str):
    """
    Retrieve cached temporal analysis results.

    Args:
        analysis_id: Analysis ID from previous analysis

    Returns:
        Cached temporal analysis results
    """
    result = temporal_service.get_cached_analysis(analysis_id)

    if not result:
        raise NotFoundException(f"Temporal analysis '{analysis_id}' not found or expired")

    return result
