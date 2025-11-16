"""Export endpoint."""

from fastapi import APIRouter
from fastapi.responses import Response

from app.core.models import ExportRequest
from app.services.export_service import export_to_json, export_to_toml, generate_filename

router = APIRouter()


@router.post("/export")
async def export_analysis(request: ExportRequest):
    """
    Export analysis results to JSON or TOML.

    Args:
        request: Export request with graph, metrics, format, and project name

    Returns:
        File download response
    """
    if request.format == "json":
        content = export_to_json(request.graph, request.global_metrics, request.project_name)
        media_type = "application/json"
    elif request.format == "toml":
        content = export_to_toml(request.graph, request.global_metrics, request.project_name)
        media_type = "application/toml"
    else:
        return Response(content="Invalid format", status_code=400)

    filename = generate_filename(request.project_name, request.format)

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
