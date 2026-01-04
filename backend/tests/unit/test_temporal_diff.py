import networkx as nx

from app.services.temporal.diff import DiffService


class TestCompareGraphs:
    """Tests for DiffService.compare_graphs."""

    def test_identical_graphs(self):
        """Comparing identical graphs produces no differences."""
        graph1 = nx.DiGraph()
        graph1.add_node("a")
        graph1.add_node("b")
        graph1.add_edge("a", "b", imports=["x"])

        graph2 = nx.DiGraph()
        graph2.add_node("a")
        graph2.add_node("b")
        graph2.add_edge("a", "b", imports=["x"])

        result = DiffService.compare_graphs(graph1, graph2)

        assert result.added_nodes == []
        assert result.removed_nodes == []
        assert result.added_edges == []
        assert result.removed_edges == []
        assert result.changed_edges == []

    def test_added_node(self):
        """Detect newly added nodes."""
        graph1 = nx.DiGraph()
        graph1.add_node("a")

        graph2 = nx.DiGraph()
        graph2.add_node("a")
        graph2.add_node("b")

        result = DiffService.compare_graphs(graph1, graph2)

        assert "b" in result.added_nodes
        assert result.removed_nodes == []

    def test_removed_node(self):
        """Detect removed nodes."""
        graph1 = nx.DiGraph()
        graph1.add_node("a")
        graph1.add_node("b")

        graph2 = nx.DiGraph()
        graph2.add_node("a")

        result = DiffService.compare_graphs(graph1, graph2)

        assert result.added_nodes == []
        assert "b" in result.removed_nodes

    def test_added_edge(self):
        """Detect newly added edges."""
        graph1 = nx.DiGraph()
        graph1.add_node("a")
        graph1.add_node("b")

        graph2 = nx.DiGraph()
        graph2.add_node("a")
        graph2.add_node("b")
        graph2.add_edge("a", "b", imports=["x"])

        result = DiffService.compare_graphs(graph1, graph2)

        assert len(result.added_edges) == 1
        assert result.added_edges[0].source == "a"
        assert result.added_edges[0].target == "b"

    def test_removed_edge(self):
        """Detect removed edges."""
        graph1 = nx.DiGraph()
        graph1.add_node("a")
        graph1.add_node("b")
        graph1.add_edge("a", "b", imports=["x"])

        graph2 = nx.DiGraph()
        graph2.add_node("a")
        graph2.add_node("b")

        result = DiffService.compare_graphs(graph1, graph2)

        assert len(result.removed_edges) == 1
        assert result.removed_edges[0].source == "a"
        assert result.removed_edges[0].target == "b"

    def test_changed_edge_imports(self):
        """Detect changed imports on existing edges."""
        graph1 = nx.DiGraph()
        graph1.add_node("a")
        graph1.add_node("b")
        graph1.add_edge("a", "b", imports=["x", "y"])

        graph2 = nx.DiGraph()
        graph2.add_node("a")
        graph2.add_node("b")
        graph2.add_edge("a", "b", imports=["x", "z"])

        result = DiffService.compare_graphs(graph1, graph2)

        assert len(result.changed_edges) == 1
        change = result.changed_edges[0]
        assert change.source == "a"
        assert change.target == "b"
        assert "z" in change.added_imports
        assert "y" in change.removed_imports

    def test_empty_graphs(self):
        """Comparing empty graphs produces no differences."""
        graph1 = nx.DiGraph()
        graph2 = nx.DiGraph()

        result = DiffService.compare_graphs(graph1, graph2)

        assert result.added_nodes == []
        assert result.removed_nodes == []
        assert result.added_edges == []
        assert result.removed_edges == []
        assert result.changed_edges == []

    def test_complete_replacement(self):
        """Detect when all nodes and edges are replaced."""
        graph1 = nx.DiGraph()
        graph1.add_node("old1")
        graph1.add_node("old2")
        graph1.add_edge("old1", "old2")

        graph2 = nx.DiGraph()
        graph2.add_node("new1")
        graph2.add_node("new2")
        graph2.add_edge("new1", "new2")

        result = DiffService.compare_graphs(graph1, graph2)

        assert set(result.added_nodes) == {"new1", "new2"}
        assert set(result.removed_nodes) == {"old1", "old2"}
        assert len(result.added_edges) == 1
        assert len(result.removed_edges) == 1

    def test_edge_without_imports(self):
        """Handle edges without imports attribute."""
        graph1 = nx.DiGraph()
        graph1.add_node("a")
        graph1.add_node("b")
        graph1.add_edge("a", "b")  # No imports

        graph2 = nx.DiGraph()
        graph2.add_node("a")
        graph2.add_node("b")
        graph2.add_edge("a", "b", imports=["x"])

        result = DiffService.compare_graphs(graph1, graph2)

        # Edge exists in both, but imports changed
        assert len(result.changed_edges) == 1
        assert "x" in result.changed_edges[0].added_imports

    def test_multiple_changes(self):
        """Handle multiple simultaneous changes."""
        graph1 = nx.DiGraph()
        graph1.add_nodes_from(["a", "b", "c"])
        graph1.add_edge("a", "b", imports=["x"])
        graph1.add_edge("b", "c", imports=["y"])

        graph2 = nx.DiGraph()
        graph2.add_nodes_from(["a", "b", "d"])  # c removed, d added
        graph2.add_edge("a", "b", imports=["x", "z"])  # z added
        graph2.add_edge("a", "d", imports=["w"])  # new edge

        result = DiffService.compare_graphs(graph1, graph2)

        assert "d" in result.added_nodes
        assert "c" in result.removed_nodes
        assert len(result.added_edges) == 1  # a->d
        assert len(result.removed_edges) == 1  # b->c
        assert len(result.changed_edges) == 1  # a->b imports changed
