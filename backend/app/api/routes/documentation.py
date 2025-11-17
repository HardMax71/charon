"""Documentation export endpoint."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Literal, Dict, Any

from app.services.graph_service import build_graph
from app.services.documentation_service import DocumentationService

router = APIRouter()


class ExportDocumentationRequest(BaseModel):
    graph: Dict[str, Any]
    global_metrics: Dict[str, Any]
    format: Literal["markdown", "html", "pdf"]
    project_name: str = "Project"


@router.post("/export-documentation")
async def export_documentation(request: ExportDocumentationRequest):
    """
    Export architectural documentation in specified format.

    Args:
        request: Export request with graph data, metrics, format, and project name

    Returns:
        Documentation file in requested format
    """
    try:
        # Rebuild graph from node/edge data
        import networkx as nx

        graph = nx.DiGraph()

        # Add nodes
        for node in request.graph["nodes"]:
            graph.add_node(
                node["id"],
                type=node.get("type", "internal"),
                module=node.get("module", ""),
                label=node.get("label", node["id"]),
                metrics=node.get("metrics", {}),
            )

        # Add edges
        for edge in request.graph["edges"]:
            graph.add_edge(
                edge["source"],
                edge["target"],
                imports=edge.get("imports", []),
                weight=edge.get("weight", 1),
            )

        # Create documentation service
        doc_service = DocumentationService(
            graph=graph,
            global_metrics=request.global_metrics,
            project_name=request.project_name,
        )

        # Generate documentation in requested format
        if request.format == "markdown":
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

            # Try to convert to PDF using weasyprint
            try:
                from weasyprint import HTML
                import io
                import traceback

                pdf_buffer = io.BytesIO()
                HTML(string=html_content).write_pdf(target=pdf_buffer)
                content = pdf_buffer.getvalue()
                media_type = "application/pdf"
                extension = "pdf"

            except ImportError:
                # Fallback: return HTML if weasyprint not available
                raise HTTPException(
                    status_code=501,
                    detail="PDF export requires weasyprint to be installed. "
                    "Install it with: pip install weasyprint"
                )
            except Exception as pdf_error:
                # Log full traceback for debugging
                import traceback
                traceback.print_exc()
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF generation error: {str(pdf_error)}\n{traceback.format_exc()}"
                )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format: {request.format}"
            )

        # Return file with appropriate headers
        filename = f"{request.project_name.replace(' ', '_')}_documentation.{extension}"

        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Documentation export failed: {str(e)}"
        )
