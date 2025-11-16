"""Temporal analysis endpoints."""

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import Optional
import json

from app.services.temporal_service import TemporalAnalysisService

router = APIRouter()
temporal_service = TemporalAnalysisService()


class TemporalAnalysisRequest(BaseModel):
    """Request model for temporal analysis."""
    repository_url: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    sample_strategy: str = "all"  # "all", "daily", "weekly", "monthly"


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
        try:
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

        except ValueError as e:
            yield {
                "event": "message",
                "data": json.dumps({"type": "error", "message": str(e)})
            }
        except Exception as e:
            yield {
                "event": "message",
                "data": json.dumps({"type": "error", "message": f"Temporal analysis failed: {str(e)}"})
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
        raise HTTPException(
            status_code=404, detail="Analysis not found or expired"
        )

    return result
