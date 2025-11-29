import json
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.models import DependencyGraph
from app.core.parsing_models import (
    PerformanceAnalysisResult,
    PriorityWeights,
)
from app.services.profiling import (
    CProfileParser,
    PerformanceAnalyzer,
    PySpyParser,
)

router = APIRouter()


class AnalyzePerformanceRequest(BaseModel):
    """Request model for performance analysis."""

    graph: DependencyGraph
    weights: PriorityWeights | None = None


@router.post("/performance/analyze", response_model=PerformanceAnalysisResult)
async def analyze_performance(
    file: UploadFile = File(..., description="Profiling file (.prof or .json)"),
    graph_json: str = Form(..., description="Dependency graph as JSON string"),
    weights_json: str | None = Form(
        None, description="Optional priority weights as JSON string"
    ),
) -> PerformanceAnalysisResult:
    """Analyze performance profiling data in context of dependency graph.

    Accepts profiling files from:
    - cProfile (.prof files)
    - py-spy (.json speedscope files)

    Combines performance metrics with architectural metrics (coupling, complexity)
    to calculate priority scores and identify optimization targets.
    """
    graph = DependencyGraph(**json.loads(graph_json))
    weights = PriorityWeights(**json.loads(weights_json)) if weights_json else None

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in (".prof", ".json"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {file.filename}. Supported: .prof (cProfile), .json (py-spy)",
        )

    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        parser = CProfileParser(tmp_path) if suffix == ".prof" else PySpyParser(tmp_path)

        analyzer = PerformanceAnalyzer(
            module_performance=parser.parse(),
            dependency_graph=graph,
            profiler_type=parser.get_profiler_type(),
            total_execution_time=parser.get_total_execution_time(),
            total_samples=parser.get_total_samples(),
            weights=weights,
        )

        return analyzer.analyze()
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


@router.get("/performance/health")
async def health_check() -> dict:
    """Health check endpoint for performance service.

    Returns:
        Status information
    """
    return {
        "status": "healthy",
        "service": "performance-profiling",
        "supported_formats": ["cprofile (.prof)", "pyspy (.json speedscope)"],
    }
