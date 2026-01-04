import pytest
import networkx as nx

from app.services.graph.layout import apply_layout
from app.utils.cycle_detector import detect_cycles


class TestCycleDetector:
    def test_detect_cycles_empty_graph(self):
        g = nx.DiGraph()
        result = detect_cycles(g)
        assert result == []

    def test_detect_cycles_with_cycle(self):
        g = nx.DiGraph()
        g.add_edge("a", "b")
        g.add_edge("b", "c")
        g.add_edge("c", "a")

        result = detect_cycles(g)

        assert len(result) > 0

    def test_detect_cycles_no_cycle(self):
        g = nx.DiGraph()
        g.add_edge("a", "b")
        g.add_edge("b", "c")

        result = detect_cycles(g)

        assert result == []


class TestLayout:
    @pytest.fixture
    def sample_graph(self):
        g = nx.DiGraph()
        g.add_node("a", type="internal")
        g.add_node("b", type="internal")
        g.add_edge("a", "b")
        return g

    @pytest.mark.parametrize(
        "layout_name",
        ["hierarchical", "force_directed", "circular"],
    )
    def test_apply_layout(self, sample_graph, layout_name):
        result = apply_layout(sample_graph, layout_name)

        for node in result.nodes:
            assert "position" in result.nodes[node]

    def test_apply_layout_invalid_name(self, sample_graph):
        result = apply_layout(sample_graph, "invalid_layout")

        for node in result.nodes:
            assert "position" in result.nodes[node]


class TestExceptions:
    def test_github_error_str(self):
        from app.core.exceptions import GitHubError

        error = GitHubError("Test message")
        assert str(error) == "Test message"

    def test_rate_limit_error_str(self):
        from app.core.exceptions import RateLimitError

        error = RateLimitError("Rate limited")
        assert str(error) == "Rate limited"


class TestParsingModels:
    def test_import_parsing_models(self):
        from app.core import parsing_models

        assert parsing_models is not None
