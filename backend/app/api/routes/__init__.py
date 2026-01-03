from app.core.models import ErrorResponse

ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Bad request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not found"},
    409: {"model": ErrorResponse, "description": "Conflict"},
    413: {"model": ErrorResponse, "description": "Payload too large"},
    422: {"model": ErrorResponse, "description": "Validation error"},
    429: {"model": ErrorResponse, "description": "Rate limit"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
    501: {"model": ErrorResponse, "description": "Not implemented"},
    502: {"model": ErrorResponse, "description": "Bad gateway"},
    503: {"model": ErrorResponse, "description": "Service unavailable"},
}

__all__ = ["ERROR_RESPONSES"]
