import json
from typing import AsyncGenerator

from app.core.models import TemporalAnalysisRequest, TemporalAnalysisResponse
from app.core.exceptions import NotFoundException
from app.services import TemporalAnalysisService


class TemporalOrchestratorService:
    """Orchestrates temporal analysis operations with SSE streaming."""

    def __init__(self):
        self.temporal_service = TemporalAnalysisService()

    async def start_temporal_analysis(
        self, request: TemporalAnalysisRequest
    ) -> AsyncGenerator[dict, None]:
        """
        Start temporal analysis with SSE-formatted progress updates.

        Yields SSE-formatted events for streaming to the client.
        """
        async for event in self.temporal_service.analyze_repository_history_streaming(
            repo_url=request.repository_url,
            start_date=request.start_date,
            end_date=request.end_date,
            sample_strategy=request.sample_strategy,
        ):
            yield {"event": "message", "data": json.dumps(event)}

    def get_temporal_analysis(self, analysis_id: str) -> TemporalAnalysisResponse:
        """
        Retrieve cached temporal analysis results.

        Raises NotFoundException if analysis not found or expired.
        """
        result = self.temporal_service.get_cached_analysis(analysis_id)

        if not result:
            raise NotFoundException(
                f"Temporal analysis '{analysis_id}' not found or expired"
            )

        return TemporalAnalysisResponse(**result)
