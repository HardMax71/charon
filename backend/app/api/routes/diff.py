from app.core.models import DiffRequest
from app.services import DiffService, ProgressTracker
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()


@router.post("/diff")
async def diff_versions(request: DiffRequest) -> EventSourceResponse:
    """
    Compare dependencies between two versions of a repository.

    Args:
        request: Diff request with repo and two references

    Returns:
        SSE stream with diff results
    """

    async def generate():
        tracker = ProgressTracker()
        async for event in DiffService.perform_diff(request, tracker):
            yield event

    return EventSourceResponse(generate())
