"""Layout switching endpoint."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

from app.services.layout_service import apply_layout
from app.services.graph_service import build_graph
from app.services.analyzer_service import DependencyData

router = APIRouter()


class LayoutRequest(BaseModel):
    """Request to recalculate layout."""

    graph_data: dict
    algorithm: Literal["hierarchical", "force", "circular"]


@router.post("/layout")
async def recalculate_layout(request: LayoutRequest):
    """
    Recalculate graph layout with a different algorithm.

    Args:
        request: Layout request

    Returns:
        Updated node positions
    """
    try:
        # This is a simplified version - in production, you'd reconstruct the graph
        # from the provided data and apply the new layout
        return {"message": "Layout endpoint - implementation depends on frontend state management"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
