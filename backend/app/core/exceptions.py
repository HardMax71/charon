from typing import Any


class CharonException(Exception):
    """Base exception for all Charon errors."""

    def __init__(self, message: str, details: Any = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class NotFoundException(CharonException):
    """Resource not found exception."""

    pass


class ValidationException(CharonException):
    """Validation error exception."""

    pass


class AnalysisException(CharonException):
    """Error during code analysis."""

    pass


class ExportException(CharonException):
    """Error during export operations."""

    pass


class GitHubException(CharonException):
    """Error fetching from GitHub."""

    pass


class DiagramException(CharonException):
    """Error generating diagram."""

    pass


class DocumentationException(CharonException):
    """Error generating documentation."""

    pass
