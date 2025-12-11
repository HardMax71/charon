import logging
from typing import Any

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic_core import ErrorDetails as PydanticErrorDetails
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("charon.error_handler")

# Type for error details:
# - str: Simple error message (from unhandled exceptions)
# - list[PydanticErrorDetails]: Validation errors from Pydantic
# - None: No additional details
ErrorDetails = str | list[PydanticErrorDetails] | None


def create_error_response(
    status_code: int,
    error_type: str,
    message: str,
    details: ErrorDetails = None,
    path: str | None = None,
) -> JSONResponse:
    """Create a standardized error response."""
    content: dict[str, Any] = {
        "error": error_type,
        "detail": message,
        "status_code": status_code,
    }

    if details:
        content["details"] = details

    if path:
        content["path"] = path

    return JSONResponse(
        status_code=status_code,
        content=content,
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

    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_type="ValidationError",
        message="Request validation failed",
        details=list(exc.errors()),
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
