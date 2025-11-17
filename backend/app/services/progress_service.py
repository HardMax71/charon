from typing import AsyncIterator
import asyncio
import json


class ProgressTracker:
    """Track and emit progress updates via Server-Sent Events."""

    def __init__(self):
        self.steps = [
            ("Fetching source files...", 10),
            ("Parsing Python files...", 30),
            ("Resolving imports...", 50),
            ("Building dependency graph...", 70),
            ("Calculating metrics...", 85),
            ("Generating layout...", 95),
            ("Complete!", 100),
        ]
        self.current_step = 0

    async def emit_progress(self) -> AsyncIterator[str]:
        """
        Emit progress updates as SSE events.

        Yields:
            SSE formatted strings
        """
        for message, percentage in self.steps:
            yield f"data: {json.dumps({'message': message, 'progress': percentage})}\n\n"
            await asyncio.sleep(0.1)  # Small delay for smooth updates

    async def emit_step(self, step_index: int) -> str:
        """
        Emit a specific step update.

        Args:
            step_index: Index of the step to emit

        Returns:
            SSE formatted string
        """
        if 0 <= step_index < len(self.steps):
            message, percentage = self.steps[step_index]
            return f"data: {json.dumps({'message': message, 'progress': percentage})}\n\n"
        return ""

    async def emit_result(self, result: dict) -> str:
        """
        Emit the final result.

        Args:
            result: Analysis result dictionary

        Returns:
            SSE formatted string
        """
        return f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"

    async def emit_error(self, error: str) -> str:
        """
        Emit an error message.

        Args:
            error: Error message

        Returns:
            SSE formatted string
        """
        return f"data: {json.dumps({'type': 'error', 'message': error})}\n\n"
