"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import analyze, export, diff, layout, diagram, temporal

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="3D dependency visualizer for Python projects",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyze.router, prefix=settings.api_prefix, tags=["analysis"])
app.include_router(export.router, prefix=settings.api_prefix, tags=["export"])
app.include_router(diff.router, prefix=settings.api_prefix, tags=["diff"])
app.include_router(layout.router, prefix=settings.api_prefix, tags=["layout"])
app.include_router(diagram.router, prefix=settings.api_prefix, tags=["diagram"])
app.include_router(temporal.router, prefix=settings.api_prefix, tags=["temporal"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.version,
        "description": "3D dependency visualizer for Python projects",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
