from app.api.routes import (
    analyze,
    auth,
    export,
    diff,
    diagram,
    temporal,
    documentation,
    fitness,
    performance,
)
from app.core import setup_logging
from app.core.config import settings
from app.core.exceptions import DomainError
from app.middleware.error_handler import (
    domain_exception_handler,
    pydantic_validation_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

setup_logging()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="3D dependency visualizer for Python projects",
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(ValidationError, pydantic_validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(DomainError, domain_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,  # type: ignore[arg-type]
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=[
        "Content-Type",
        "Accept",
        "Authorization",
    ],
    expose_headers=["Content-Disposition"],
)

app.include_router(analyze.router, prefix=settings.api_prefix, tags=["analysis"])
app.include_router(auth.router, prefix=settings.api_prefix, tags=["auth"])
app.include_router(export.router, prefix=settings.api_prefix, tags=["export"])
app.include_router(diff.router, prefix=settings.api_prefix, tags=["diff"])
app.include_router(diagram.router, prefix=settings.api_prefix, tags=["diagram"])
app.include_router(temporal.router, prefix=settings.api_prefix, tags=["temporal"])
app.include_router(
    documentation.router, prefix=settings.api_prefix, tags=["documentation"]
)
app.include_router(fitness.router, prefix=settings.api_prefix, tags=["fitness"])
app.include_router(performance.router, prefix=settings.api_prefix, tags=["performance"])


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.version,
        "description": "3D dependency visualizer for Python projects",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
