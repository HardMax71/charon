import pytest

from app.core.exceptions import BadRequestError
from app.middleware.error_handler import (
    _map_validation_status,
    stream_with_error_handling,
)


def test_map_validation_status_payload_too_large() -> None:
    status_code, error_type = _map_validation_status(
        [{"msg": "Graph JSON exceeds maximum size (10MB)"}]
    )

    assert status_code == 413
    assert error_type == "PayloadTooLarge"


def test_map_validation_status_unsupported_format() -> None:
    status_code, error_type = _map_validation_status(
        [{"msg": "Unsupported format: profile.txt"}]
    )

    assert status_code == 400
    assert error_type == "BadRequest"


@pytest.mark.asyncio
async def test_stream_with_error_handling_domain_error() -> None:
    async def failing_stream():
        yield {"event": "progress", "data": {"step": 1}}
        raise BadRequestError("Boom")

    async def on_error(payload):
        return {"event": "error", "data": payload.model_dump()}

    events = []
    async for event in stream_with_error_handling(
        failing_stream(), on_error, path="/api/test"
    ):
        events.append(event)

    assert events[0]["event"] == "progress"
    assert events[1]["event"] == "error"
    assert events[1]["data"]["error"] == "BadRequest"
    assert events[1]["data"]["status_code"] == 400
