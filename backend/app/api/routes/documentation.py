import io

from app.api.routes import ERROR_RESPONSES
from app.core.models import ExportDocumentationRequest
from app.services import DocumentationService, AnalysisOrchestratorService
from fastapi import APIRouter
from fastapi.responses import Response
from weasyprint import HTML

router = APIRouter()


@router.post("/export-documentation", responses=ERROR_RESPONSES)
async def export_documentation(request: ExportDocumentationRequest) -> Response:
    """
    Export architectural documentation in specified format.

    Args:
        request: Export request with graph data, metrics, format, and project name

    Returns:
        Documentation file in requested format
    """
    graph = AnalysisOrchestratorService.build_networkx_graph(request.graph)

    doc_service = DocumentationService(
        graph=graph,
        global_metrics=request.global_metrics,
        project_name=request.project_name,
    )

    # Generate documentation in requested format
    if request.format == "md":
        content = doc_service.generate_markdown()
        media_type = "text/markdown"
        extension = "md"

    elif request.format == "html":
        content = doc_service.generate_html()
        media_type = "text/html"
        extension = "html"

    elif request.format == "pdf":
        # Generate HTML first
        html_content = doc_service.generate_html()

        pdf_buffer = io.BytesIO()
        HTML(string=html_content).write_pdf(target=pdf_buffer)
        content = pdf_buffer.getvalue()
        media_type = "application/pdf"
        extension = "pdf"

    # Return file with appropriate headers
    filename = f"{request.project_name.replace(' ', '_')}_documentation.{extension}"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
