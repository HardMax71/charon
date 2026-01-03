import math
import networkx as nx
from typing import Literal

from app.core import get_logger

logger = get_logger(__name__)

LayoutType = Literal["hierarchical", "force_directed", "circular"]


def hierarchical_layout_3d(graph: nx.DiGraph) -> nx.DiGraph:
    """
    Apply hierarchical 3D layout with third-party libs in separate section.

    Args:
        graph: NetworkX directed graph

    Returns:
        Graph with position attributes
    """
    # Separate internal and third-party nodes
    internal_nodes = [
        n for n in graph.nodes if graph.nodes[n].get("type") == "internal"
    ]
    third_party_nodes = [
        n for n in graph.nodes if graph.nodes[n].get("type") == "third_party"
    ]

    # Position third-party nodes in a circle at the bottom
    radius = 80
    y_offset = -60

    for i, node in enumerate(third_party_nodes):
        if len(third_party_nodes) == 1:
            angle = 0
        else:
            angle = (i / len(third_party_nodes)) * 2 * math.pi

        x = radius * math.cos(angle)
        z = radius * math.sin(angle)

        graph.nodes[node]["position"] = {"x": x, "y": y_offset, "z": z}

    # Position internal nodes using spring layout
    if internal_nodes:
        # Create subgraph of internal nodes
        subgraph = graph.subgraph(internal_nodes)

        # Use spring layout for natural clustering
        try:
            # Try 3D spring layout
            pos_dict = nx.spring_layout(
                subgraph,
                dim=3,
                k=3.0,  # Optimal distance between nodes
                iterations=50,
                seed=42,
            )
        except (nx.NetworkXError, ValueError) as e:
            # Fallback to 2D if 3D fails
            logger.warning("3D spring layout failed, falling back to 2D: %s", e)
            pos_dict_2d = nx.spring_layout(subgraph, k=3.0, iterations=50, seed=42)
            pos_dict = {node: [pos[0], 0, pos[1]] for node, pos in pos_dict_2d.items()}

        # Scale and apply positions
        scale = 60
        for node, pos in pos_dict.items():
            graph.nodes[node]["position"] = {
                "x": pos[0] * scale,
                "y": pos[1] * scale if len(pos) > 2 else 0,
                "z": pos[2] * scale if len(pos) > 2 else pos[1] * scale,
            }

    return graph


def force_directed_layout_3d(graph: nx.DiGraph) -> nx.DiGraph:
    """
    Apply force-directed 3D layout.

    Args:
        graph: NetworkX directed graph

    Returns:
        Graph with position attributes
    """
    try:
        pos_dict = nx.spring_layout(graph, dim=3, k=4.0, iterations=80, seed=42)
    except (nx.NetworkXError, ValueError) as e:
        # Fallback to 2D
        logger.warning("3D force-directed layout failed, falling back to 2D: %s", e)
        pos_dict_2d = nx.spring_layout(graph, k=4.0, iterations=80, seed=42)
        pos_dict = {node: [pos[0], 0, pos[1]] for node, pos in pos_dict_2d.items()}

    scale = 70
    for node, pos in pos_dict.items():
        graph.nodes[node]["position"] = {
            "x": pos[0] * scale,
            "y": pos[1] * scale if len(pos) > 2 else 0,
            "z": pos[2] * scale if len(pos) > 2 else pos[1] * scale,
        }

    return graph


def circular_layout_3d(graph: nx.DiGraph) -> nx.DiGraph:
    """
    Apply circular 3D layout with nodes arranged in a circle.

    Args:
        graph: NetworkX directed graph

    Returns:
        Graph with position attributes
    """
    nodes = list(graph.nodes)
    n = len(nodes)

    if n == 0:
        return graph

    radius = 50 + n * 2  # Scale radius with number of nodes

    for i, node in enumerate(nodes):
        angle = (i / n) * 2 * math.pi
        x = radius * math.cos(angle)
        z = radius * math.sin(angle)
        y = 0  # All nodes at same height

        graph.nodes[node]["position"] = {"x": x, "y": y, "z": z}

    return graph


def apply_layout(
    graph: nx.DiGraph, layout_type: LayoutType = "hierarchical"
) -> nx.DiGraph:
    """
    Apply a 3D layout to the graph based on the specified type.

    Args:
        graph: NetworkX directed graph
        layout_type: Type of layout ("hierarchical", "force_directed", or "circular")

    Returns:
        Graph with position attributes applied
    """
    logger.debug(
        "Applying %s layout to graph with %d nodes", layout_type, len(graph.nodes)
    )

    if layout_type == "hierarchical":
        return hierarchical_layout_3d(graph)
    elif layout_type == "force_directed":
        return force_directed_layout_3d(graph)
    elif layout_type == "circular":
        return circular_layout_3d(graph)
    else:
        logger.warning(
            "Unknown layout type '%s', defaulting to hierarchical", layout_type
        )
        return hierarchical_layout_3d(graph)
