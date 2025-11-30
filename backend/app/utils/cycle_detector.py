import networkx as nx

from app.core import get_logger

logger = get_logger(__name__)


def detect_cycles(graph: nx.DiGraph) -> list[list[str]]:
    """
    Detect all circular dependencies in the graph.

    Args:
        graph: NetworkX directed graph

    Returns:
        List of cycles, where each cycle is a list of node IDs
    """
    try:
        cycles = list(nx.simple_cycles(graph))
        return cycles
    except nx.NetworkXError as e:
        logger.warning("Failed to detect cycles in graph: %s", e)
        return []


def get_nodes_in_cycles(cycles: list[list[str]]) -> set[str]:
    """
    Get all nodes that are part of any cycle.

    Args:
        cycles: List of cycles

    Returns:
        Set of node IDs that are in at least one cycle
    """
    nodes_in_cycles = set()
    for cycle in cycles:
        nodes_in_cycles.update(cycle)
    return nodes_in_cycles
