from app.api.routes import ERROR_RESPONSES
from app.core.models import DiffRequest
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.middleware.error_handler import stream_with_error_handling
from app.services import DiffService, ProgressTracker

router = APIRouter()


@router.post("/diff", responses=ERROR_RESPONSES)
async def diff_versions(
    request: DiffRequest, http_request: Request
) -> EventSourceResponse:
    """
    Compare dependencies between two versions of a repository.

    Args:
        request: Diff request with repo and two references

    Returns:
        SSE stream with diff results
    """

    async def generate():
        tracker = ProgressTracker()
        async for event in stream_with_error_handling(
            DiffService.perform_diff(request, tracker),
            tracker.emit_error_response,
            path=str(http_request.url.path),
        ):
            yield event

    return EventSourceResponse(generate())
