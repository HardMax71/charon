import pytest
import networkx as nx

from app.core.models import (
    DependencyGraph,
    Node,
    Edge,
    Position3D,
    NodeMetrics,
    GlobalMetrics,
    CircularDependency,
    HotZoneFile,
)
from app.services.parsers.base import ParsedImport


# =============================================================================
# Graph Fixtures
# =============================================================================


@pytest.fixture
def empty_nx_graph():
    """Empty NetworkX directed graph."""
    return nx.DiGraph()


@pytest.fixture
def default_node_metrics():
    """Default NodeMetrics for testing."""
    return NodeMetrics(
        afferent_coupling=1,
        efferent_coupling=1,
        instability=0.5,
    )


@pytest.fixture
def sample_nx_graph():
    """Sample NetworkX graph with internal and third-party nodes."""
    graph = nx.DiGraph()

    # Add internal nodes
    graph.add_node(
        "app.services.user",
        type="internal",
        module="app.services",
        label="user.py",
    )
    graph.add_node(
        "app.services.auth",
        type="internal",
        module="app.services",
        label="auth.py",
    )
    graph.add_node(
        "app.models.user",
        type="internal",
        module="app.models",
        label="user.py",
    )

    # Add third-party nodes
    graph.add_node(
        "requests",
        type="third_party",
        module="requests",
        label="requests",
    )

    # Add edges
    graph.add_edge("app.services.user", "app.models.user")
    graph.add_edge("app.services.user", "requests")
    graph.add_edge("app.services.auth", "app.services.user")

    return graph


@pytest.fixture
def healthy_nx_graph():
    """Graph with healthy metrics (no circular deps, good instability)."""
    graph = nx.DiGraph()

    graph.add_node(
        "app.services.user",
        type="internal",
        module="app.services",
        metrics={"instability": 0.2, "is_circular": False},
    )
    graph.add_node(
        "app.services.auth",
        type="internal",
        module="app.services",
        metrics={"instability": 0.8, "is_circular": False},
    )
    graph.add_node(
        "app.models.user",
        type="internal",
        module="app.models",
        metrics={"instability": 0.1, "is_circular": False},
    )

    graph.add_edge("app.services.user", "app.models.user")
    graph.add_edge("app.services.auth", "app.models.user")

    return graph


@pytest.fixture
def unhealthy_nx_graph():
    """Graph with unhealthy metrics (circular deps, poor instability)."""
    graph = nx.DiGraph()

    for node_id in ["app.a", "app.b", "app.c"]:
        graph.add_node(
            node_id,
            type="internal",
            module="app",
            metrics={"instability": 0.5, "is_circular": True},
        )

    # Circular edges
    graph.add_edge("app.a", "app.b")
    graph.add_edge("app.b", "app.c")
    graph.add_edge("app.c", "app.a")

    return graph


@pytest.fixture
def clustering_nx_graph():
    """Graph for clustering tests with two distinct clusters."""
    graph = nx.DiGraph()

    # Cluster 1
    for node in ["cluster1.a", "cluster1.b", "cluster1.c"]:
        graph.add_node(node, type="internal", module="cluster1")
    graph.add_edge("cluster1.a", "cluster1.b")
    graph.add_edge("cluster1.b", "cluster1.c")
    graph.add_edge("cluster1.c", "cluster1.a")

    # Cluster 2
    for node in ["cluster2.x", "cluster2.y", "cluster2.z"]:
        graph.add_node(node, type="internal", module="cluster2")
    graph.add_edge("cluster2.x", "cluster2.y")
    graph.add_edge("cluster2.y", "cluster2.z")
    graph.add_edge("cluster2.z", "cluster2.x")

    # One edge between clusters
    graph.add_edge("cluster1.a", "cluster2.x")

    # Third-party (excluded from clustering)
    graph.add_node("requests", type="third_party", module="requests")

    return graph


# =============================================================================
# Metrics Fixtures
# =============================================================================


@pytest.fixture
def healthy_global_metrics():
    """Healthy global metrics for testing."""
    return GlobalMetrics(
        total_files=3,
        total_internal=3,
        total_third_party=0,
        avg_afferent_coupling=2.0,
        avg_efferent_coupling=2.0,
        avg_complexity=5.0,
        avg_maintainability=75.0,
        circular_dependencies=[],
        high_coupling_files=[],
        coupling_threshold=5.0,
        hot_zone_files=[],
    )


@pytest.fixture
def unhealthy_global_metrics():
    """Unhealthy global metrics for testing."""
    return GlobalMetrics(
        total_files=3,
        total_internal=3,
        total_third_party=0,
        avg_afferent_coupling=15.0,
        avg_efferent_coupling=15.0,
        avg_complexity=25.0,
        avg_maintainability=15.0,
        circular_dependencies=[
            CircularDependency(cycle=["app.a", "app.b", "app.c", "app.a"])
        ],
        high_coupling_files=["app.a", "app.b", "app.c"],
        coupling_threshold=5.0,
        hot_zone_files=[
            HotZoneFile(
                file="app.a",
                severity="critical",
                score=85.0,
                reason="High complexity and coupling",
                complexity=30.0,
                coupling=40,
            ),
        ],
    )


# =============================================================================
# DependencyGraph Fixtures
# =============================================================================


@pytest.fixture
def impact_dependency_graph(default_node_metrics):
    """DependencyGraph for impact analysis testing."""
    nodes = [
        Node(
            id="core.utils",
            label="utils.py",
            type="internal",
            module="core",
            position=Position3D(x=0, y=0, z=0),
            color="#ff0000",
            metrics=default_node_metrics,
        ),
        Node(
            id="services.user",
            label="user.py",
            type="internal",
            module="services",
            position=Position3D(x=1, y=0, z=0),
            color="#00ff00",
            metrics=default_node_metrics,
        ),
        Node(
            id="services.auth",
            label="auth.py",
            type="internal",
            module="services",
            position=Position3D(x=2, y=0, z=0),
            color="#0000ff",
            metrics=default_node_metrics,
        ),
        Node(
            id="api.routes",
            label="routes.py",
            type="internal",
            module="api",
            position=Position3D(x=3, y=0, z=0),
            color="#ffff00",
            metrics=default_node_metrics,
        ),
        Node(
            id="api.handlers",
            label="handlers.py",
            type="internal",
            module="api",
            position=Position3D(x=4, y=0, z=0),
            color="#ff00ff",
            metrics=default_node_metrics,
        ),
    ]

    edges = [
        Edge(
            id="e1",
            source="services.user",
            target="core.utils",
            imports=[],
            weight=1,
            thickness=1.0,
        ),
        Edge(
            id="e2",
            source="services.auth",
            target="core.utils",
            imports=[],
            weight=1,
            thickness=1.0,
        ),
        Edge(
            id="e3",
            source="api.routes",
            target="services.user",
            imports=[],
            weight=1,
            thickness=1.0,
        ),
        Edge(
            id="e4",
            source="api.handlers",
            target="services.user",
            imports=[],
            weight=1,
            thickness=1.0,
        ),
        Edge(
            id="e5",
            source="api.handlers",
            target="services.auth",
            imports=[],
            weight=1,
            thickness=1.0,
        ),
    ]

    return DependencyGraph(nodes=nodes, edges=edges)


# =============================================================================
# Parser Fixtures
# =============================================================================


@pytest.fixture
def go_parser():
    """Go parser instance."""
    from app.services.parsers.go import GoParser

    return GoParser()


@pytest.fixture
def java_parser():
    """Java parser instance."""
    from app.services.parsers.java import JavaParser

    return JavaParser()


@pytest.fixture
def rust_parser():
    """Rust parser instance."""
    from app.services.parsers.rust import RustParser

    return RustParser()


@pytest.fixture
def js_parser():
    """JavaScript parser instance."""
    from app.services.parsers.javascript import JavaScriptParser

    return JavaScriptParser()


@pytest.fixture
def ts_parser():
    """TypeScript parser instance."""
    from app.services.parsers.javascript import TypeScriptParser

    return TypeScriptParser()


@pytest.fixture
def python_parser():
    """Python parser instance."""
    from app.services.parsers.python import PythonParser

    return PythonParser()


# =============================================================================
# Import Resolver Fixtures
# =============================================================================


@pytest.fixture
def go_resolver(tmp_path):
    """Go import resolver with mock go.mod."""
    from app.services.parsers.go import GoImportResolver

    go_mod = tmp_path / "go.mod"
    go_mod.write_text("module github.com/myorg/myproject\n\ngo 1.21\n")
    return GoImportResolver(tmp_path)


@pytest.fixture
def java_resolver(tmp_path):
    """Java import resolver."""
    from app.services.parsers.java import JavaImportResolver

    return JavaImportResolver(tmp_path)


@pytest.fixture
def rust_resolver(tmp_path):
    """Rust import resolver with mock Cargo.toml."""
    from app.services.parsers.rust import RustImportResolver

    cargo_toml = tmp_path / "Cargo.toml"
    cargo_toml.write_text('[package]\nname = "my_crate"\nversion = "0.1.0"\n')
    return RustImportResolver(tmp_path)


@pytest.fixture
def js_resolver(tmp_path):
    """JavaScript import resolver with mock package.json."""
    from app.services.parsers.javascript import JavaScriptImportResolver

    package_json = tmp_path / "package.json"
    package_json.write_text('{"name": "my-app", "dependencies": {"react": "^18.0.0"}}')
    return JavaScriptImportResolver(tmp_path)


@pytest.fixture
def python_resolver(tmp_path):
    """Python import resolver."""
    from app.services.parsers.python import PythonImportResolver

    return PythonImportResolver(tmp_path)


# =============================================================================
# Helper Functions
# =============================================================================


def make_import(module: str, is_relative: bool = False, level: int = 0) -> ParsedImport:
    """Create a ParsedImport for testing."""
    return ParsedImport(module=module, names=[], is_relative=is_relative, level=level)
