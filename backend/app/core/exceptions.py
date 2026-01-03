from app.core.models import ErrorDetails


class DomainError(Exception):
    """Base exception for domain errors with HTTP semantics."""

    status_code = 500
    error_type = "InternalServerError"

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        error_type: str | None = None,
        details: ErrorDetails | None = None,
    ):
        self.message = message
        self.details = details
        if status_code is not None:
            self.status_code = status_code
        if error_type is not None:
            self.error_type = error_type
        super().__init__(message)


class BadRequestError(DomainError):
    status_code = 400
    error_type = "BadRequest"


class UnauthorizedError(DomainError):
    status_code = 401
    error_type = "Unauthorized"


class ForbiddenError(DomainError):
    status_code = 403
    error_type = "Forbidden"


class NotFoundError(DomainError):
    status_code = 404
    error_type = "NotFound"


class ConflictError(DomainError):
    status_code = 409
    error_type = "Conflict"


class PayloadTooLargeError(DomainError):
    status_code = 413
    error_type = "PayloadTooLarge"


class RateLimitError(DomainError):
    status_code = 429
    error_type = "RateLimit"


class ExternalServiceError(DomainError):
    status_code = 502
    error_type = "BadGateway"


class FeatureNotConfiguredError(DomainError):
    status_code = 501
    error_type = "NotImplemented"


class ServiceUnavailableError(DomainError):
    status_code = 503
    error_type = "ServiceUnavailable"


class GitHubError(ExternalServiceError):
    """Errors related to GitHub API operations."""

    error_type = "GitHubError"


class RepositoryNotFoundError(NotFoundError):
    """Repository does not exist or is not accessible."""

    error_type = "RepositoryNotFound"


class ParseError(BadRequestError):
    """Errors during file parsing."""

    error_type = "ParseError"

    def __init__(self, message: str, file_path: str):
        self.file_path = file_path
        super().__init__(f"{file_path}: {message}")


class AnalysisError(DomainError):
    """Errors during code analysis."""

    error_type = "AnalysisError"
