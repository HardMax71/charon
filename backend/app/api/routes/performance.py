import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.routes import ERROR_RESPONSES
from app.core.models import (
    AnalyzePerformanceRequest,
    PerformanceAnalyzeForm,
    PerformanceAnalysisResult,
    PerformanceProfileUpload,
)
from app.services.profiling import (
    CProfileParser,
    PerformanceAnalyzer,
    PySpyParser,
)

router = APIRouter()


def build_performance_form(
    graph_json: str = Form(..., description="Dependency graph as JSON string"),
    weights_json: str | None = Form(
        None, description="Optional priority weights as JSON string"
    ),
) -> PerformanceAnalyzeForm:
    return PerformanceAnalyzeForm.model_validate(
        {"graph_json": graph_json, "weights_json": weights_json}
    )


def build_profile_upload(
    file: UploadFile = File(..., description="Profiling file (.prof or .json)"),
) -> PerformanceProfileUpload:
    return PerformanceProfileUpload(file=file)


@router.post(
    "/performance/analyze",
    response_model=PerformanceAnalysisResult,
    responses=ERROR_RESPONSES,
)
async def analyze_performance(
    form: PerformanceAnalyzeForm = Depends(build_performance_form),
    upload: PerformanceProfileUpload = Depends(build_profile_upload),
) -> PerformanceAnalysisResult:
    """Analyze performance profiling data in context of dependency graph.

    Accepts profiling files from:
    - cProfile (.prof files)
    - py-spy (.json speedscope files)

    Combines performance metrics with architectural metrics (coupling, complexity)
    to calculate priority scores and identify optimization targets.
    """
    graph = form.graph
    weights = form.weights
    file = upload.file
    suffix = Path(file.filename or "").suffix.lower()

    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        parser = (
            CProfileParser(tmp_path) if suffix == ".prof" else PySpyParser(tmp_path)
        )

        request = AnalyzePerformanceRequest(graph=graph, weights=weights)
        analyzer = PerformanceAnalyzer(
            module_performance=parser.parse(),
            dependency_graph=request.graph,
            profiler_type=parser.get_profiler_type(),
            total_execution_time=parser.get_total_execution_time(),
            total_samples=parser.get_total_samples(),
            weights=request.weights,
        )

        return analyzer.analyze()
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


@router.get("/performance/health", responses=ERROR_RESPONSES)
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
