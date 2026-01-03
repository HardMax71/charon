import json
import toml
from typing import Literal

from app.core.models import DependencyGraph, GlobalMetrics


def export_to_json(
    graph: DependencyGraph,
    global_metrics: GlobalMetrics,
    project_name: str,
) -> str:
    """
    Export analysis results to JSON.

    Args:
        graph: Dependency graph
        global_metrics: Global metrics
        project_name: Project name

    Returns:
        JSON string
    """
    data = {
        "project_name": project_name,
        "graph": graph.model_dump(),
        "global_metrics": global_metrics.model_dump(),
    }

    return json.dumps(data, indent=2)


def export_to_toml(
    graph: DependencyGraph,
    global_metrics: GlobalMetrics,
    project_name: str,
) -> str:
    """
    Export analysis results to TOML.

    Args:
        graph: Dependency graph
        global_metrics: Global metrics
        project_name: Project name

    Returns:
        TOML string
    """
    data = {
        "project_name": project_name,
        "graph": graph.model_dump(),
        "global_metrics": global_metrics.model_dump(),
    }

    return toml.dumps(data)


def generate_filename(project_name: str, format: Literal["json", "toml"]) -> str:
    """
    Generate export filename.

    Args:
        project_name: Project name
        format: Export format

    Returns:
        Filename string
    """
    return f"charon_export_{project_name}.{format}"
