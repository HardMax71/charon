from app.core.models import ExportDiagramRequest
from app.services import DiagramExporter, AnalysisOrchestratorService
from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()


@router.post("/export-diagram")
async def export_diagram(request: ExportDiagramRequest) -> Response:
    """
    Export dependency graph to various diagram formats.

    Args:
        graph_data: The dependency graph data
        format: Diagram format (plantuml, c4, mermaid, uml, drawio)
        system_name: Name of the software system (for C4 diagrams)

    Returns:
        Diagram source code or XML
    """
    graph = AnalysisOrchestratorService.build_networkx_graph(request.graph_data)
    exporter = DiagramExporter(graph)

    # Generate diagram based on format
    if request.format == "plantuml":
        content = exporter.to_plantuml()
        media_type = "text/plain"
        filename = "diagram.puml"
    elif request.format == "c4":
        content = exporter.to_c4_container(request.system_name)
        media_type = "text/plain"
        filename = "c4-diagram.puml"
    elif request.format == "mermaid":
        content = exporter.to_mermaid()
        media_type = "text/plain"
        filename = "diagram.mmd"
    elif request.format == "uml":
        content = exporter.to_uml_package()
        media_type = "text/plain"
        filename = "uml-diagram.puml"
    elif request.format == "drawio":
        content = exporter.to_drawio_xml()
        media_type = "application/xml"
        filename = "diagram.drawio"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
