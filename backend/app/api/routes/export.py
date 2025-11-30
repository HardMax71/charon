from app.core.models import ExportRequest
from app.services import export_to_json, export_to_toml, generate_filename
from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()

# Format configuration: (export_function, media_type)
_FORMAT_CONFIG = {
    "json": (export_to_json, "application/json"),
    "toml": (export_to_toml, "application/toml"),
}


@router.post("/export")
async def export_analysis(request: ExportRequest) -> Response:
    """
    Export analysis results to JSON or TOML.

    Args:
        request: Export request with graph, metrics, format, and project name

    Returns:
        File download response
    """
    # format is validated by Pydantic Literal["json", "toml"]
    export_fn, media_type = _FORMAT_CONFIG[request.format]
    content = export_fn(request.graph, request.global_metrics, request.project_name)
    filename = generate_filename(request.project_name, request.format)

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
