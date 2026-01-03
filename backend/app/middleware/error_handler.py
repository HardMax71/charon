import logging
from collections.abc import AsyncIterator, Awaitable, Callable

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from pydantic_core import ErrorDetails as PydanticErrorDetails
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import DomainError
from app.core.models import ErrorDetails, ErrorResponse

logger = logging.getLogger("charon.error_handler")

# Type for error details:
# - str: Simple error message (from unhandled exceptions)
# - list[PydanticErrorDetails]: Validation errors from Pydantic
# - None: No additional details


def _build_error_payload(
    status_code: int,
    error_type: str,
    message: str,
    details: ErrorDetails = None,
    path: str | None = None,
) -> ErrorResponse:
    return ErrorResponse(
        error=error_type,
        detail=message,
        status_code=status_code,
        details=details,
        path=path,
    )


def create_error_response(
    status_code: int,
    error_type: str,
    message: str,
    details: ErrorDetails = None,
    path: str | None = None,
) -> JSONResponse:
    """Create a standardized error response."""
    response = _build_error_payload(
        status_code=status_code,
        error_type=error_type,
        message=message,
        details=details,
        path=path,
    )

    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(exclude_none=True),
    )


def _map_validation_status(errors: list[PydanticErrorDetails]) -> tuple[int, str]:
    for error in errors:
        message = str(error.get("msg", ""))
        if "exceeds maximum size" in message:
            return status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "PayloadTooLarge"
        if "Unsupported format" in message:
            return status.HTTP_400_BAD_REQUEST, "BadRequest"
    return status.HTTP_422_UNPROCESSABLE_ENTITY, "ValidationError"


def _handle_validation_error(
    *, errors: list[PydanticErrorDetails], path: str
) -> JSONResponse:
    normalized_errors: list[dict[str, object]] = [dict(error) for error in errors]
    status_code, error_type = _map_validation_status(errors)
    return create_error_response(
        status_code=status_code,
        error_type=error_type,
        message="Request validation failed",
        details=normalized_errors,
        path=path,
    )


async def domain_exception_handler(request: Request, exc: DomainError) -> JSONResponse:
    """Handle domain errors."""
    return create_error_response(
        status_code=exc.status_code,
        error_type=exc.error_type,
        message=exc.message,
        details=exc.details,
        path=str(request.url.path),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors."""
    logger.warning(
        f"Validation error on {request.method} {request.url.path}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": exc.errors(),
        },
    )

    return _handle_validation_error(
        errors=list(exc.errors()),
        path=str(request.url.path),
    )


async def pydantic_validation_exception_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors outside request parsing."""
    return _handle_validation_error(
        errors=list(exc.errors()),
        path=str(request.url.path),
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Handle HTTP exceptions."""
    logger.warning(
        f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
        },
    )

    return create_error_response(
        status_code=exc.status_code,
        error_type="HTTPException",
        message=exc.detail,
        path=str(request.url.path),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all unhandled exceptions."""
    logger.error(
        "Unhandled exception on %s %s: %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
        str(exc),
        exc_info=True,
    )

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_type="InternalServerError",
        message="An unexpected error occurred",
        path=str(request.url.path),
    )


ErrorEventFactory = Callable[[ErrorResponse], Awaitable[str | dict]]


async def stream_with_error_handling(
    stream: AsyncIterator[str | dict],
    on_error: ErrorEventFactory,
    path: str | None = None,
) -> AsyncIterator[str | dict]:
    """Wrap SSE generators to emit unified errors on failure."""
    try:
        async for event in stream:
            yield event
    except DomainError as exc:
        payload = _build_error_payload(
            status_code=exc.status_code,
            error_type=exc.error_type,
            message=exc.message,
            details=exc.details,
            path=path,
        )
        yield await on_error(payload)
    except ValidationError as exc:
        errors = list(exc.errors())
        normalized_errors: list[dict[str, object]] = [dict(error) for error in errors]
        status_code, error_type = _map_validation_status(errors)
        payload = _build_error_payload(
            status_code=status_code,
            error_type=error_type,
            message="Request validation failed",
            details=normalized_errors,
            path=path,
        )
        yield await on_error(payload)
    except Exception:
        payload = _build_error_payload(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_type="InternalServerError",
            message="An unexpected error occurred",
            path=path,
        )
        yield await on_error(payload)
