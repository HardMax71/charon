import json

import pytest

from app.core.models import ErrorResponse
from app.services.infrastructure.progress import ProgressTracker


class TestProgressTracker:
    """Tests for ProgressTracker."""

    @pytest.fixture
    def tracker(self):
        """Create tracker instance."""
        return ProgressTracker()

    @pytest.mark.asyncio
    async def test_emit_step_valid_index(self, tracker):
        """Emit step for valid index produces SSE event."""
        result = await tracker.emit_step(0)

        assert result.startswith("data: ")
        assert result.endswith("\n\n")

        # Parse the JSON data
        json_str = result[6:-2]  # Remove "data: " prefix and "\n\n" suffix
        data = json.loads(json_str)
        assert "message" in data
        assert "progress" in data
        assert data["progress"] == 10

    @pytest.mark.asyncio
    async def test_emit_step_invalid_index(self, tracker):
        """Emit step for invalid index returns empty string."""
        result = await tracker.emit_step(100)
        assert result == ""

    @pytest.mark.asyncio
    async def test_emit_step_negative_index(self, tracker):
        """Emit step for negative index returns empty string."""
        result = await tracker.emit_step(-1)
        assert result == ""

    @pytest.mark.asyncio
    async def test_emit_result(self, tracker):
        """Emit result produces correct SSE event."""
        test_data = {"key": "value", "count": 42}
        result = await tracker.emit_result(test_data)

        assert result.startswith("data: ")
        json_str = result[6:-2]
        data = json.loads(json_str)

        assert data["type"] == "result"
        assert data["data"] == test_data

    @pytest.mark.asyncio
    async def test_emit_error(self, tracker):
        """Emit error produces correct SSE event."""
        result = await tracker.emit_error("Something went wrong")

        json_str = result[6:-2]
        data = json.loads(json_str)

        assert data["type"] == "error"
        assert data["message"] == "Something went wrong"

    @pytest.mark.asyncio
    async def test_emit_error_response(self, tracker):
        """Emit error response from ErrorResponse model."""
        error = ErrorResponse(
            error="BadRequest", detail="Validation failed", status_code=400
        )
        result = await tracker.emit_error_response(error)

        json_str = result[6:-2]
        data = json.loads(json_str)

        assert data["type"] == "error"
        assert data["message"] == "Validation failed"

    def test_steps_initialized(self, tracker):
        """Tracker has predefined steps."""
        assert len(tracker.steps) == 7
        assert tracker.steps[0][0] == "Fetching source files..."
        assert tracker.steps[-1][0] == "Complete!"

    @pytest.mark.asyncio
    async def test_emit_progress_yields_all_steps(self, tracker):
        """Emit progress yields all defined steps."""
        steps = []
        async for step in tracker.emit_progress():
            steps.append(step)

        assert len(steps) == 7

    @pytest.mark.asyncio
    async def test_progress_percentages_increase(self, tracker):
        """Progress percentages increase monotonically."""
        percentages = []
        async for step in tracker.emit_progress():
            json_str = step[6:-2]
            data = json.loads(json_str)
            percentages.append(data["progress"])

        # Check monotonically increasing
        for i in range(1, len(percentages)):
            assert percentages[i] >= percentages[i - 1]

        # Final step should be 100%
        assert percentages[-1] == 100
