"""Graph construction service."""

import networkx as nx
from typing import Dict, Set, List

from app.services.analyzer_service import DependencyData


def build_graph(data: DependencyData) -> nx.DiGraph:
    """
    Build a NetworkX directed graph from dependency data.

    Args:
        data: Dependency analysis data

    Returns:
        NetworkX DiGraph
    """
    graph = nx.DiGraph()

    # Add nodes for all modules
    for module_path in data.modules.keys():
        # Get complexity metrics for this module
        complexity_metrics = data.complexity.get(module_path, {})

        graph.add_node(
            module_path,
            type="internal",
            module=module_path,
            label=module_path.split(".")[-1] if "." in module_path else module_path,
            complexity=complexity_metrics,
        )

    # Add nodes for third-party libraries
    third_party_modules: Set[str] = set()
    for deps in data.dependencies.values():
        for dep in deps:
            if dep.startswith("third_party."):
                third_party_modules.add(dep)

    for tp_module in third_party_modules:
        # Extract library name (remove 'third_party.' prefix)
        lib_name = tp_module.replace("third_party.", "")
        graph.add_node(
            tp_module,
            type="third_party",
            module="third_party",
            label=lib_name,
        )

    # Add edges for dependencies
    for from_module, to_modules in data.dependencies.items():
        for to_module in to_modules:
            imports = data.import_details.get((from_module, to_module), [])
            weight = len(imports)

            graph.add_edge(
                from_module,
                to_module,
                imports=imports,
                weight=weight,
            )

    return graph
