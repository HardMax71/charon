import networkx as nx
import pytest
from jinja2 import Environment, FileSystemLoader

import app.services.export.documentation as doc_module
from app.core.models import (
    ComplexityMetrics,
    DependencyAnalysis,
    DependencyGraph,
    Edge,
    GlobalMetrics,
    ImportInfo,
    ModuleMetadata,
    Node,
    Position3D,
)
from app.services.analysis.metrics import MetricsCalculator, percentile
from app.services.export.documentation import DocumentationService
from app.services.fitness.refactoring import RefactoringService
from app.services.graph.service import build_graph, build_networkx_graph
from app.utils.import_resolver import (
    ImportResolver,
    extract_top_level_module,
    is_standard_library,
)


# =============================================================================
# Percentile Function Tests
# =============================================================================


class TestPercentile:
    """Tests for percentile calculation."""

    @pytest.mark.parametrize(
        "values,percent,expected",
        [
            ([], 50, 0.0),
            ([1, 2, 3, 4, 5], 0, 1),
            ([1, 2, 3, 4, 5], 100, 5),
            ([1, 2, 3, 4, 5], 50, 3),
            ([10, 20, 30, 40, 50], 80, 42),
        ],
        ids=["empty", "p0", "p100", "p50", "p80"],
    )
    def test_percentile_values(self, values, percent, expected):
        """Test percentile calculation."""
        result = percentile(values, percent)
        assert abs(result - expected) < 1


# =============================================================================
# Import Resolver Tests
# =============================================================================


class TestImportResolverHelpers:
    """Tests for import resolver helper functions."""

    @pytest.mark.parametrize(
        "module,expected",
        [
            ("os", True),
            ("sys", True),
            ("json", True),
            ("pathlib", True),
            ("typing", True),
            ("requests", False),
            ("numpy", False),
            ("", False),
            ("my_module", False),
        ],
    )
    def test_is_standard_library(self, module, expected):
        """Test stdlib detection."""
        assert is_standard_library(module) == expected

    @pytest.mark.parametrize(
        "path,expected",
        [
            ("app.services.user", "app"),
            ("single", "single"),
            ("", ""),
            ("a.b.c.d", "a"),
        ],
    )
    def test_extract_top_level_module(self, path, expected):
        """Test top-level module extraction."""
        assert extract_top_level_module(path) == expected


class TestImportResolver:
    """Tests for ImportResolver class."""

    @pytest.fixture
    def resolver(self):
        """Create resolver with sample project modules."""
        return ImportResolver(
            {"app.services", "app.models", "app.utils", "app.services.user"}
        )

    def test_classify_stdlib(self, resolver):
        """Classify stdlib import."""
        import_info = ImportInfo(module="os", names=["path"], level=0, lineno=1)
        result = resolver.classify(import_info, "app.main")

        assert result == ("stdlib", "os")

    def test_classify_internal(self, resolver):
        """Classify internal import."""
        import_info = ImportInfo(module="app.services", names=[], level=0, lineno=1)
        result = resolver.classify(import_info, "app.main")

        assert result == ("internal", "app.services")

    def test_classify_third_party(self, resolver):
        """Classify third-party import."""
        import_info = ImportInfo(module="requests", names=[], level=0, lineno=1)
        result = resolver.classify(import_info, "app.main")

        assert result == ("third_party", "requests")

    def test_classify_relative_import(self, resolver):
        """Classify relative import."""
        import_info = ImportInfo(module="utils", names=[], level=1, lineno=1)
        result = resolver.classify(import_info, "app.services.user")

        # Resolves to app.services.utils, check if resolved correctly
        assert result[0] in ("internal", "third_party")

    def test_cache_works(self, resolver):
        """Test that caching works."""
        import_info = ImportInfo(module="os", names=[], level=0, lineno=1)

        result1 = resolver.classify(import_info, "app.main")
        result2 = resolver.classify(import_info, "app.main")

        assert result1 == result2
        assert resolver.get_cache_stats()["cache_size"] == 1

    def test_clear_cache(self, resolver):
        """Test cache clearing."""
        import_info = ImportInfo(module="os", names=[], level=0, lineno=1)
        resolver.classify(import_info, "app.main")

        resolver.clear_cache()

        assert resolver.get_cache_stats()["cache_size"] == 0

    def test_relative_import_invalid_level(self, resolver):
        """Test handling of invalid relative import level."""
        import_info = ImportInfo(module="module", names=[], level=10, lineno=1)
        result = resolver.classify(import_info, "app.main")

        # Should handle gracefully
        assert result[0] in ("stdlib", "internal", "third_party")


# =============================================================================
# Build Graph Tests
# =============================================================================


class TestBuildGraph:
    """Tests for build_graph function."""

    @pytest.fixture
    def sample_analysis(self):
        """Create sample DependencyAnalysis."""
        return DependencyAnalysis(
            modules={"app.main": "", "app.utils": ""},
            dependencies={
                "app.main": {"app.utils", "third_party.requests"},
                "app.utils": set(),
            },
            import_details={("app.main", "app.utils"): ["helper", "util"]},
            complexity={
                "app.main": ComplexityMetrics(
                    cyclomatic_complexity=5,
                    max_complexity=5,
                    maintainability_index=75,
                    lines_of_code=100,
                    logical_lines=80,
                    source_lines=60,
                    comments=10,
                    complexity_grade="A",
                    maintainability_grade="B",
                    function_count=5,
                )
            },
            module_metadata={
                "app.main": ModuleMetadata(
                    language="python",
                    file_path="/app/main.py",
                    service="main",
                    node_kind="module",
                )
            },
        )

    def test_build_graph_creates_nodes(self, sample_analysis):
        """Build graph creates correct nodes."""
        graph = build_graph(sample_analysis)

        assert "app.main" in graph.nodes
        assert "app.utils" in graph.nodes
        assert "third_party.requests" in graph.nodes

    def test_build_graph_node_types(self, sample_analysis):
        """Build graph assigns correct node types."""
        graph = build_graph(sample_analysis)

        assert graph.nodes["app.main"]["type"] == "internal"
        assert graph.nodes["third_party.requests"]["type"] == "third_party"

    def test_build_graph_creates_edges(self, sample_analysis):
        """Build graph creates correct edges."""
        graph = build_graph(sample_analysis)

        assert graph.has_edge("app.main", "app.utils")
        assert graph.has_edge("app.main", "third_party.requests")

    def test_build_graph_edge_attributes(self, sample_analysis):
        """Build graph sets edge attributes."""
        graph = build_graph(sample_analysis)

        edge = graph["app.main"]["app.utils"]
        assert "imports" in edge
        assert "weight" in edge


class TestBuildNetworkxGraph:
    """Tests for build_networkx_graph function."""

    def test_build_from_dependency_graph(self, default_node_metrics):
        """Build NetworkX graph from DependencyGraph."""
        dep_graph = DependencyGraph(
            nodes=[
                Node(
                    id="a",
                    label="a.py",
                    type="internal",
                    module="app",
                    position=Position3D(x=0, y=0, z=0),
                    color="#fff",
                    metrics=default_node_metrics,
                ),
                Node(
                    id="b",
                    label="b.py",
                    type="internal",
                    module="app",
                    position=Position3D(x=1, y=0, z=0),
                    color="#fff",
                    metrics=default_node_metrics,
                ),
            ],
            edges=[
                Edge(
                    id="e1",
                    source="a",
                    target="b",
                    imports=["x"],
                    weight=1,
                    thickness=1,
                )
            ],
        )

        nx_graph = build_networkx_graph(dep_graph)

        assert "a" in nx_graph.nodes
        assert "b" in nx_graph.nodes
        assert nx_graph.has_edge("a", "b")


# =============================================================================
# Metrics Calculator Tests
# =============================================================================


class TestMetricsCalculator:
    """Tests for MetricsCalculator."""

    @pytest.fixture
    def metrics_graph(self):
        """Create graph for metrics testing."""
        graph = nx.DiGraph()
        graph.add_node("a", type="internal", module="app", complexity={})
        graph.add_node("b", type="internal", module="app", complexity={})
        graph.add_node("c", type="internal", module="app", complexity={})
        graph.add_node("lib", type="third_party", module="lib", complexity={})
        graph.add_edge("a", "b")
        graph.add_edge("a", "c")
        graph.add_edge("b", "c")
        graph.add_edge("a", "lib")
        return graph

    def test_calculate_all_returns_global_metrics(self, metrics_graph):
        """Calculate all returns GlobalMetrics."""
        calc = MetricsCalculator(metrics_graph)
        result = calc.calculate_all()

        assert isinstance(result, GlobalMetrics)
        assert result.total_internal == 3
        assert result.total_third_party == 1

    def test_node_metrics_assigned(self, metrics_graph):
        """Metrics are assigned to nodes."""
        calc = MetricsCalculator(metrics_graph)
        calc.calculate_all()

        for node in ["a", "b", "c"]:
            assert "metrics" in metrics_graph.nodes[node]
            metrics = metrics_graph.nodes[node]["metrics"]
            assert "afferent_coupling" in metrics
            assert "efferent_coupling" in metrics

    def test_circular_dependency_detection(self):
        """Detect circular dependencies."""
        graph = nx.DiGraph()
        graph.add_node("a", type="internal", module="app", complexity={})
        graph.add_node("b", type="internal", module="app", complexity={})
        graph.add_edge("a", "b")
        graph.add_edge("b", "a")

        calc = MetricsCalculator(graph)
        result = calc.calculate_all()

        assert len(result.circular_dependencies) > 0
        assert graph.nodes["a"]["metrics"]["is_circular"] is True
        assert graph.nodes["b"]["metrics"]["is_circular"] is True

    def test_instability_calculation(self, metrics_graph):
        """Test instability metric calculation."""
        calc = MetricsCalculator(metrics_graph)
        calc.calculate_all()

        # Node 'a' has 3 outgoing, 0 incoming -> instability = 1.0
        assert metrics_graph.nodes["a"]["metrics"]["instability"] == 1.0

        # Node 'c' has 0 outgoing, 2 incoming -> instability = 0.0
        assert metrics_graph.nodes["c"]["metrics"]["instability"] == 0.0


# =============================================================================
# Documentation Service Tests
# =============================================================================


class TestDocumentationService:
    """Tests for DocumentationService."""

    @pytest.fixture
    def doc_graph(self):
        """Create graph for documentation testing."""
        graph = nx.DiGraph()
        graph.add_node(
            "app.main",
            type="internal",
            module="app",
            metrics={
                "afferent_coupling": 0,
                "efferent_coupling": 2,
                "is_high_coupling": False,
                "is_circular": False,
            },
        )
        graph.add_node(
            "app.utils",
            type="internal",
            module="app",
            metrics={
                "afferent_coupling": 1,
                "efferent_coupling": 0,
                "is_high_coupling": False,
                "is_circular": False,
            },
        )
        graph.add_node("requests", type="third_party", module="requests", metrics={})
        graph.add_edge("app.main", "app.utils")
        graph.add_edge("app.main", "requests")
        return graph

    @pytest.fixture
    def doc_metrics(self):
        """Create GlobalMetrics for documentation."""
        return GlobalMetrics(
            total_files=3,
            total_internal=2,
            total_third_party=1,
            avg_afferent_coupling=0.5,
            avg_efferent_coupling=1.0,
            avg_complexity=5.0,
            avg_maintainability=75.0,
            circular_dependencies=[],
            high_coupling_files=[],
            coupling_threshold=5.0,
            hot_zone_files=[],
        )

    def test_generate_markdown(self, doc_graph, doc_metrics):
        """Generate markdown documentation."""
        service = DocumentationService(doc_graph, doc_metrics, "TestProject")
        md = service.generate_markdown()

        assert "# TestProject" in md
        assert "## Project Overview" in md
        assert "## Module Dependencies" in md
        assert "## Coupling Report" in md
        assert "## Circular Dependencies" in md
        assert "## Third-Party Library Usage" in md

    def test_generate_html(self, doc_graph, doc_metrics, tmp_path):
        """Generate HTML documentation."""
        # Create minimal template for testing
        templates_dir = tmp_path / "templates"
        templates_dir.mkdir()
        (templates_dir / "documentation.html").write_text(
            "<html><head><title>{{ project_name }}</title></head>"
            "<body>{{ content }}</body></html>"
        )

        # Patch the template directory
        original_env = doc_module._jinja_env
        doc_module._jinja_env = Environment(loader=FileSystemLoader(templates_dir))

        try:
            service = DocumentationService(doc_graph, doc_metrics, "TestProject")
            html = service.generate_html()

            assert "<html" in html
            assert "TestProject" in html
        finally:
            doc_module._jinja_env = original_env

    def test_no_circular_deps_message(self, doc_graph, doc_metrics):
        """Show OK message when no circular deps."""
        service = DocumentationService(doc_graph, doc_metrics)
        md = service.generate_markdown()

        assert "[OK] No circular dependencies detected" in md

    def test_no_high_coupling_message(self, doc_graph, doc_metrics):
        """Show OK message when no high coupling."""
        service = DocumentationService(doc_graph, doc_metrics)
        md = service.generate_markdown()

        assert "[OK] No high coupling modules detected" in md

    def test_third_party_audit(self, doc_graph, doc_metrics):
        """Include third-party library audit."""
        service = DocumentationService(doc_graph, doc_metrics)
        md = service.generate_markdown()

        assert "requests" in md
        assert "Third-Party" in md


# =============================================================================
# Refactoring Service Tests
# =============================================================================


class TestRefactoringService:
    """Tests for RefactoringService."""

    def test_detect_god_object(self):
        """Detect god object pattern."""
        graph = nx.DiGraph()
        graph.add_node("god", type="internal", module="app")
        # Add 16 dependencies to trigger god object detection
        for i in range(16):
            dep = f"dep{i}"
            graph.add_node(dep, type="internal", module="app")
            graph.add_edge("god", dep)

        service = RefactoringService(graph)
        suggestions = service.analyze_refactoring_opportunities()

        patterns = [s.pattern for s in suggestions]
        assert "God Object" in patterns

    def test_detect_inappropriate_intimacy(self):
        """Detect bidirectional dependencies."""
        graph = nx.DiGraph()
        graph.add_node("a", type="internal", module="app")
        graph.add_node("b", type="internal", module="app")
        graph.add_edge("a", "b", imports=["x"])
        graph.add_edge("b", "a", imports=["y"])

        service = RefactoringService(graph)
        suggestions = service.analyze_refactoring_opportunities()

        patterns = [s.pattern for s in suggestions]
        assert "Inappropriate Intimacy" in patterns

    def test_detect_circular_dependency(self):
        """Detect circular dependency pattern."""
        graph = nx.DiGraph()
        for node in ["a", "b", "c"]:
            graph.add_node(node, type="internal", module="app")
        graph.add_edge("a", "b")
        graph.add_edge("b", "c")
        graph.add_edge("c", "a")

        service = RefactoringService(graph)
        suggestions = service.analyze_refactoring_opportunities()

        patterns = [s.pattern for s in suggestions]
        assert "Circular Dependency" in patterns

    def test_detect_hub_module(self):
        """Detect hub module pattern."""
        graph = nx.DiGraph()
        hub = "hub"
        graph.add_node(hub, type="internal", module="app")
        # Add 11 incoming dependencies
        for i in range(11):
            dep = f"user{i}"
            graph.add_node(dep, type="internal", module="app")
            graph.add_edge(dep, hub)

        service = RefactoringService(graph)
        suggestions = service.analyze_refactoring_opportunities()

        patterns = [s.pattern for s in suggestions]
        assert "Hub Module" in patterns

    def test_detect_unused_module(self):
        """Detect potential dead code."""
        graph = nx.DiGraph()
        graph.add_node("unused", type="internal", module="app")
        graph.add_node("dep", type="internal", module="app")
        graph.add_edge("unused", "dep")  # Has outgoing but no incoming

        service = RefactoringService(graph)
        suggestions = service.analyze_refactoring_opportunities()

        patterns = [s.pattern for s in suggestions]
        assert "Potential Dead Code" in patterns

    def test_get_summary_stats(self):
        """Get summary statistics."""
        graph = nx.DiGraph()
        graph.add_node("a", type="internal", module="app")
        graph.add_node("b", type="internal", module="app")
        graph.add_edge("a", "b")
        graph.add_edge("b", "a")

        service = RefactoringService(graph)
        summary = service.get_summary_stats()

        assert summary.modules_analyzed == 2
        assert summary.total_suggestions >= 0
        assert "critical" in summary.by_severity

    def test_no_suggestions_clean_graph(self):
        """Clean graph produces no/minimal suggestions."""
        graph = nx.DiGraph()
        graph.add_node("a", type="internal", module="app")
        graph.add_node("b", type="internal", module="app")
        graph.add_edge("a", "b")

        service = RefactoringService(graph)
        suggestions = service.analyze_refactoring_opportunities()

        # Should have at most dead code warning for "a"
        assert len(suggestions) <= 1

    def test_severity_sorting(self):
        """Suggestions are sorted by severity."""
        graph = nx.DiGraph()
        # Create patterns of different severity
        graph.add_node("a", type="internal", module="app")
        graph.add_node("b", type="internal", module="app")
        graph.add_edge("a", "b")
        graph.add_edge("b", "a")

        service = RefactoringService(graph)
        suggestions = service.analyze_refactoring_opportunities()

        if len(suggestions) > 1:
            severities = [s.severity for s in suggestions]
            # Critical should come before warning/info
            severity_order = {"critical": 0, "warning": 1, "info": 2}
            for i in range(len(severities) - 1):
                assert severity_order.get(severities[i], 3) <= severity_order.get(
                    severities[i + 1], 3
                )
