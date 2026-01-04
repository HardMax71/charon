import networkx as nx
import pytest

from app.core.models import Language
from app.services.analysis.complexity import ComplexityService
from app.services.graph.layout import (
    apply_layout,
    circular_layout_3d,
    force_directed_layout_3d,
    hierarchical_layout_3d,
)
from app.services.parsers.registry import ParserRegistry
from app.utils.cycle_detector import detect_cycles, get_nodes_in_cycles


# =============================================================================
# Cycle Detector Tests
# =============================================================================


class TestCycleDetector:
    """Tests for cycle detection utilities."""

    def test_detect_cycles_with_cycle(self):
        """Detect cycles in graph with circular dependencies."""
        graph = nx.DiGraph()
        graph.add_edges_from([("a", "b"), ("b", "c"), ("c", "a")])

        cycles = detect_cycles(graph)

        assert len(cycles) == 1
        assert set(cycles[0]) == {"a", "b", "c"}

    def test_detect_cycles_no_cycles(self):
        """No cycles in acyclic graph."""
        graph = nx.DiGraph()
        graph.add_edges_from([("a", "b"), ("b", "c"), ("a", "c")])

        cycles = detect_cycles(graph)

        assert cycles == []

    def test_detect_cycles_empty_graph(self, empty_nx_graph):
        """Empty graph has no cycles."""
        assert detect_cycles(empty_nx_graph) == []

    def test_detect_cycles_multiple_cycles(self):
        """Detect multiple independent cycles."""
        graph = nx.DiGraph()
        graph.add_edges_from([("a", "b"), ("b", "a")])  # Cycle 1
        graph.add_edges_from([("x", "y"), ("y", "x")])  # Cycle 2

        cycles = detect_cycles(graph)

        assert len(cycles) == 2

    def test_get_nodes_in_cycles(self):
        """Get all nodes participating in cycles."""
        cycles = [["a", "b", "c"], ["x", "y"]]

        nodes = get_nodes_in_cycles(cycles)

        assert nodes == {"a", "b", "c", "x", "y"}

    def test_get_nodes_in_cycles_empty(self):
        """Empty cycles list returns empty set."""
        assert get_nodes_in_cycles([]) == set()

    def test_get_nodes_in_cycles_overlapping(self):
        """Overlapping cycles don't duplicate nodes."""
        cycles = [["a", "b", "c"], ["b", "c", "d"]]

        nodes = get_nodes_in_cycles(cycles)

        assert nodes == {"a", "b", "c", "d"}


# =============================================================================
# Layout Tests
# =============================================================================


class TestLayoutFunctions:
    """Tests for graph layout functions."""

    @pytest.fixture
    def layout_graph(self):
        """Graph for layout testing."""
        graph = nx.DiGraph()
        graph.add_node("a", type="internal", module="app")
        graph.add_node("b", type="internal", module="app")
        graph.add_node("c", type="third_party", module="requests")
        graph.add_edge("a", "b")
        graph.add_edge("a", "c")
        return graph

    def test_hierarchical_layout_assigns_positions(self, layout_graph):
        """Hierarchical layout assigns position to all nodes."""
        result = hierarchical_layout_3d(layout_graph)

        for node in result.nodes:
            assert "position" in result.nodes[node]
            pos = result.nodes[node]["position"]
            assert "x" in pos and "y" in pos and "z" in pos

    def test_hierarchical_layout_separates_third_party(self, layout_graph):
        """Third-party nodes are positioned separately (lower y)."""
        result = hierarchical_layout_3d(layout_graph)

        internal_y = result.nodes["a"]["position"]["y"]
        third_party_y = result.nodes["c"]["position"]["y"]

        assert third_party_y < internal_y

    def test_force_directed_layout_assigns_positions(self, layout_graph):
        """Force-directed layout assigns position to all nodes."""
        result = force_directed_layout_3d(layout_graph)

        for node in result.nodes:
            assert "position" in result.nodes[node]

    def test_circular_layout_assigns_positions(self, layout_graph):
        """Circular layout assigns position to all nodes."""
        result = circular_layout_3d(layout_graph)

        for node in result.nodes:
            assert "position" in result.nodes[node]
            # All nodes at same y level in circular layout
            assert result.nodes[node]["position"]["y"] == 0

    def test_circular_layout_empty_graph(self, empty_nx_graph):
        """Circular layout handles empty graph."""
        result = circular_layout_3d(empty_nx_graph)
        assert len(result.nodes) == 0

    def test_circular_layout_single_node(self):
        """Circular layout with single node."""
        graph = nx.DiGraph()
        graph.add_node("single", type="internal", module="app")

        result = circular_layout_3d(graph)

        assert "position" in result.nodes["single"]

    @pytest.mark.parametrize(
        "layout_type",
        ["hierarchical", "force_directed", "circular"],
    )
    def test_apply_layout_types(self, layout_graph, layout_type):
        """apply_layout works for all layout types."""
        result = apply_layout(layout_graph, layout_type)

        for node in result.nodes:
            assert "position" in result.nodes[node]

    def test_apply_layout_unknown_type_defaults_hierarchical(self, layout_graph):
        """Unknown layout type defaults to hierarchical."""
        result = apply_layout(layout_graph, "unknown_layout")  # type: ignore

        for node in result.nodes:
            assert "position" in result.nodes[node]

    def test_hierarchical_single_third_party(self):
        """Hierarchical layout with single third-party node."""
        graph = nx.DiGraph()
        graph.add_node("lib", type="third_party", module="lib")

        result = hierarchical_layout_3d(graph)

        assert "position" in result.nodes["lib"]
        # Single third-party should be at angle 0
        assert result.nodes["lib"]["position"]["z"] == 0

    def test_hierarchical_only_internal_nodes(self):
        """Hierarchical layout with only internal nodes."""
        graph = nx.DiGraph()
        graph.add_node("a", type="internal", module="app")
        graph.add_node("b", type="internal", module="app")
        graph.add_edge("a", "b")

        result = hierarchical_layout_3d(graph)

        for node in result.nodes:
            assert "position" in result.nodes[node]


# =============================================================================
# Parser Registry Tests
# =============================================================================


class TestParserRegistry:
    """Tests for parser registry."""

    def test_get_parser_python(self):
        """Get Python parser from registry."""
        parser = ParserRegistry.get_parser(Language.PYTHON)
        assert parser.language == Language.PYTHON

    def test_get_parser_unregistered_raises(self):
        """Unregistered language raises ValueError."""
        # Temporarily remove a parser to test error handling
        saved = ParserRegistry._parsers.get(Language.RUST)
        del ParserRegistry._parsers[Language.RUST]
        try:
            with pytest.raises(ValueError, match="No parser registered"):
                ParserRegistry.get_parser(Language.RUST)
        finally:
            if saved:
                ParserRegistry._parsers[Language.RUST] = saved

    def test_get_parser_for_file_python(self, tmp_path):
        """Get parser for .py file."""
        py_file = tmp_path / "test.py"
        py_file.touch()

        parser = ParserRegistry.get_parser_for_file(py_file)

        assert parser is not None
        assert parser.language == Language.PYTHON

    def test_get_parser_for_file_unknown_extension(self, tmp_path):
        """Unknown extension returns None."""
        txt_file = tmp_path / "test.txt"
        txt_file.touch()

        parser = ParserRegistry.get_parser_for_file(txt_file)

        assert parser is None

    def test_get_registered_languages(self):
        """Get list of registered languages."""
        languages = ParserRegistry.get_registered_languages()

        assert Language.PYTHON in languages
        assert Language.JAVASCRIPT in languages
        assert Language.GO in languages

    def test_get_supported_extensions(self):
        """Get list of supported extensions."""
        extensions = ParserRegistry.get_supported_extensions()

        assert ".py" in extensions
        assert ".js" in extensions
        assert ".go" in extensions

    def test_detect_languages_by_config(self, tmp_path):
        """Detect languages by config files."""
        (tmp_path / "pyproject.toml").touch()
        (tmp_path / "package.json").touch()

        languages = ParserRegistry.detect_languages(tmp_path)

        assert Language.PYTHON in languages
        assert Language.JAVASCRIPT in languages

    def test_detect_languages_by_extension(self, tmp_path):
        """Detect languages by file extensions."""
        (tmp_path / "main.go").touch()
        (tmp_path / "lib.rs").touch()

        languages = ParserRegistry.detect_languages(tmp_path)

        assert Language.GO in languages
        assert Language.RUST in languages


# =============================================================================
# Complexity Service Tests
# =============================================================================


class TestComplexityService:
    """Tests for complexity analysis service."""

    @pytest.mark.parametrize(
        "mi_score,expected_grade",
        [
            (90, "A"),
            (85, "A"),
            (75, "B"),
            (65, "B"),
            (50, "C"),
            (40, "C"),
            (30, "D"),
            (20, "D"),
            (10, "F"),
            (0, "F"),
        ],
    )
    def test_maintainability_grade(self, mi_score, expected_grade):
        """Test maintainability grading scale."""
        grade = ComplexityService._get_maintainability_grade(mi_score)
        assert grade == expected_grade

    def test_analyze_simple_file(self):
        """Analyze a simple Python file."""
        content = """
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b
"""
        result = ComplexityService.analyze_file("test.py", content)

        assert result.function_count == 2
        assert result.cyclomatic_complexity >= 1
        assert result.maintainability_index > 0
        assert len(result.functions) == 2

    def test_analyze_complex_file(self):
        """Analyze a file with higher complexity."""
        content = """
def complex_function(x, y, z):
    if x > 0:
        if y > 0:
            if z > 0:
                return 1
            else:
                return 2
        else:
            return 3
    elif x < 0:
        return 4
    else:
        return 5
"""
        result = ComplexityService.analyze_file("complex.py", content)

        assert result.max_complexity > 1
        assert result.function_count == 1

    def test_analyze_invalid_syntax(self):
        """Invalid syntax returns error metrics."""
        content = "def broken(:"

        result = ComplexityService.analyze_file("broken.py", content)

        assert result.error is not None
        assert result.cyclomatic_complexity == 0

    def test_analyze_empty_file(self):
        """Empty file returns zero metrics."""
        result = ComplexityService.analyze_file("empty.py", "")

        assert result.function_count == 0
        assert result.cyclomatic_complexity == 0


class TestHotZoneScore:
    """Tests for hot zone scoring."""

    @pytest.mark.parametrize(
        "complexity,coupling,expected_severity",
        [
            (15, 8, "critical"),  # High both, score >= 75
            (10, 5, "warning"),  # Hot zone but lower score
            (15, 2, "info"),  # High complexity only
            (5, 8, "info"),  # High coupling only
            (5, 2, "ok"),  # Both low
        ],
    )
    def test_hot_zone_severity(self, complexity, coupling, expected_severity):
        """Test hot zone severity classification."""
        result = ComplexityService.calculate_hot_zone_score(complexity, coupling)

        assert result.severity == expected_severity

    def test_hot_zone_is_hot_zone_flag(self):
        """is_hot_zone is True only when both thresholds exceeded."""
        hot = ComplexityService.calculate_hot_zone_score(15, 8)
        not_hot = ComplexityService.calculate_hot_zone_score(5, 2)

        assert hot.is_hot_zone is True
        assert not_hot.is_hot_zone is False

    def test_hot_zone_custom_thresholds(self):
        """Custom thresholds affect classification."""
        # With default thresholds (10, 5), this would be ok
        result = ComplexityService.calculate_hot_zone_score(
            complexity=8, coupling=4, complexity_threshold=5, coupling_threshold=3
        )

        assert result.is_hot_zone is True

    def test_hot_zone_score_capped(self):
        """Score is capped at reasonable bounds."""
        result = ComplexityService.calculate_hot_zone_score(100, 50)

        assert result.score <= 100
