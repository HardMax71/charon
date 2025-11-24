import tempfile
from pathlib import Path

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
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from pydantic import BaseModel

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

    Args:
        file: Profiling file (.prof for cProfile, .json for py-spy)
        graph_json: Dependency graph JSON (serialized DependencyGraph)
        weights_json: Optional custom priority weights JSON

    Returns:
        PerformanceAnalysisResult with bottlenecks sorted by priority
    """
    # Parse graph from JSON
    try:
        import json

        graph_data = json.loads(graph_json)
        graph = DependencyGraph(**graph_data)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid graph JSON: {str(e)}"
        ) from e

    # Parse weights if provided
    weights = None
    if weights_json:
        try:
            import json

            weights_data = json.loads(weights_json)
            weights = PriorityWeights(**weights_data)
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid weights JSON: {str(e)}"
            ) from e

    # Save uploaded file to temporary location
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=Path(file.filename).suffix
        ) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save uploaded file: {str(e)}"
        ) from e

    try:
        # Detect profiler type and parse
        if tmp_path.endswith(".prof"):
            # cProfile format
            parser = CProfileParser(tmp_path)
        elif tmp_path.endswith(".json"):
            # py-spy speedscope format
            parser = PySpyParser(tmp_path)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file.filename}. Supported: .prof (cProfile), .json (py-spy)",
            )

        # Parse profiling data
        module_performance = parser.parse()
        profiler_type = parser.get_profiler_type()
        total_time = parser.get_total_execution_time()
        total_samples = parser.get_total_samples()

        # Analyze with dependency graph
        analyzer = PerformanceAnalyzer(
            module_performance=module_performance,
            dependency_graph=graph,
            profiler_type=profiler_type,
            total_execution_time=total_time,
            total_samples=total_samples,
            weights=weights,
        )

        result = analyzer.analyze()

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}") from e
    finally:
        # Clean up temporary file
        try:
            Path(tmp_path).unlink()
        except Exception:
            pass


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
