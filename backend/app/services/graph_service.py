import networkx as nx

from app.core import get_logger
from app.core.parsing_models import DependencyAnalysis

logger = get_logger(__name__)


def build_graph(data: DependencyAnalysis) -> nx.DiGraph:
    """
    Build a NetworkX directed graph from dependency analysis.

    Args:
        data: Dependency analysis data (Pydantic model)

    Returns:
        NetworkX DiGraph with nodes and edges
    """
    logger.debug("Building graph from %d modules", data.module_count)
    graph = nx.DiGraph()

    for module_path in data.modules.keys():
        complexity_metrics = data.complexity.get(module_path)

        graph.add_node(
            module_path,
            type="internal",
            module=module_path,
            label=module_path.split(".")[-1] if "." in module_path else module_path,
            complexity=complexity_metrics.model_dump() if complexity_metrics else {},
        )

    third_party_modules: set[str] = set()
    for deps in data.dependencies.values():
        for dep in deps:
            if dep.startswith("third_party."):
                third_party_modules.add(dep)

    for tp_module in third_party_modules:
        lib_name = tp_module.replace("third_party.", "")
        graph.add_node(
            tp_module,
            type="third_party",
            module="third_party",
            label=lib_name,
        )

    edge_count = 0
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
            edge_count += 1

    logger.debug(
        "Graph built: %d nodes (%d internal, %d third-party), %d edges",
        graph.number_of_nodes(),
        len(data.modules),
        len(third_party_modules),
        edge_count,
    )

    return graph
