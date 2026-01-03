import json

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.api.routes import ERROR_RESPONSES
from app.core.models import (
    ErrorResponse,
    TemporalAnalysisRequest,
    TemporalAnalysisResponse,
)
from app.middleware.error_handler import stream_with_error_handling
from app.services import TemporalOrchestratorService

router = APIRouter()
temporal_orchestrator = TemporalOrchestratorService()


@router.post("/temporal-analysis", responses=ERROR_RESPONSES)
async def start_temporal_analysis(
    request: TemporalAnalysisRequest,
    http_request: Request,
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

    async def temporal_error_event(error: ErrorResponse) -> dict:
        return {
            "event": "message",
            "data": json.dumps(
                {"type": "error", "error": error.model_dump(exclude_none=True)}
            ),
        }

    async def generate():
        async for event in stream_with_error_handling(
            temporal_orchestrator.start_temporal_analysis(request),
            temporal_error_event,
            path=str(http_request.url.path),
        ):
            yield event

    return EventSourceResponse(generate())


@router.get(
    "/temporal-analysis/{analysis_id}",
    response_model=TemporalAnalysisResponse,
    responses=ERROR_RESPONSES,
)
async def get_temporal_analysis(analysis_id: str) -> TemporalAnalysisResponse:
    """
    Retrieve cached temporal analysis results.

    Args:
        analysis_id: Analysis ID from previous analysis

    Returns:
        Cached temporal analysis results
    """
    return temporal_orchestrator.get_temporal_analysis(analysis_id)
