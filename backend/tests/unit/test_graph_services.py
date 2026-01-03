import pytest
import networkx as nx

from app.services.graph.impact import ImpactAnalysisService
from app.services.graph.clustering import ClusteringService
from app.core.exceptions import NotFoundError


# =============================================================================
# Impact Analysis Tests
# =============================================================================


class TestImpactAnalysisService:
    """Tests for ImpactAnalysisService."""

    def test_direct_impact(self, impact_dependency_graph):
        """Test finding direct dependents."""
        service = ImpactAnalysisService(impact_dependency_graph)
        result = service.calculate_impact("core.utils", max_depth=1)

        assert result.metrics.total_affected == 3  # Including itself
        assert "services.user" in result.affected_nodes
        assert "services.auth" in result.affected_nodes

    def test_transitive_impact(self, impact_dependency_graph):
        """Test finding transitive dependents."""
        service = ImpactAnalysisService(impact_dependency_graph)
        result = service.calculate_impact("core.utils", max_depth=10)

        assert result.metrics.total_affected == 5

    def test_impact_levels(self, impact_dependency_graph):
        """Test impact level breakdown."""
        service = ImpactAnalysisService(impact_dependency_graph)
        result = service.calculate_impact("core.utils", max_depth=10)

        assert "0" in result.impact_levels
        assert "core.utils" in result.impact_levels["0"]
        assert "1" in result.impact_levels
        assert len(result.impact_levels["1"]) == 2
        assert "2" in result.impact_levels

    def test_max_depth_limit(self, impact_dependency_graph):
        """Test that max_depth limits traversal."""
        service = ImpactAnalysisService(impact_dependency_graph)
        result = service.calculate_impact("core.utils", max_depth=1)

        assert result.metrics.max_depth_reached == 1
        assert "2" not in result.impact_levels

    def test_node_not_found(self, impact_dependency_graph):
        """Test error when node not found."""
        service = ImpactAnalysisService(impact_dependency_graph)

        with pytest.raises(NotFoundError):
            service.calculate_impact("nonexistent.module")

    def test_leaf_node_no_dependents(self, impact_dependency_graph):
        """Test impact of leaf node with no dependents."""
        service = ImpactAnalysisService(impact_dependency_graph)
        result = service.calculate_impact("api.routes", max_depth=10)

        assert result.metrics.total_affected == 1

    def test_impact_metrics(self, impact_dependency_graph):
        """Test impact metrics calculation."""
        service = ImpactAnalysisService(impact_dependency_graph)
        result = service.calculate_impact("core.utils", max_depth=10)

        assert result.metrics.total_nodes == 5
        assert result.metrics.total_affected == 5
        assert result.metrics.impact_percentage == 100.0

    def test_selected_node_info(self, impact_dependency_graph):
        """Test selected node information."""
        service = ImpactAnalysisService(impact_dependency_graph)
        result = service.calculate_impact("services.user", max_depth=10)

        assert result.selected_node.id == "services.user"
        assert result.selected_node.label == "user.py"
        assert result.selected_node.module == "services"

    def test_affected_node_details(self, impact_dependency_graph):
        """Test affected node details are populated."""
        service = ImpactAnalysisService(impact_dependency_graph)
        result = service.calculate_impact("core.utils", max_depth=10)

        assert len(result.affected_node_details) == 5
        for detail in result.affected_node_details:
            assert detail.id is not None
            assert detail.label is not None
            assert detail.distance >= 0
            assert detail.color is not None

    @pytest.mark.parametrize(
        "distance,expected_label",
        [
            (0, "Selected"),
            (1, "Direct Dependents"),
            (2, "1-Hop Dependents"),
            (3, "2-Hop Dependents"),
            (5, "4-Hop Dependents"),
        ],
    )
    def test_distance_label(self, impact_dependency_graph, distance, expected_label):
        """Test distance label generation."""
        service = ImpactAnalysisService(impact_dependency_graph)
        assert service._get_distance_label(distance) == expected_label

    @pytest.mark.parametrize(
        "distance,expected_color",
        [
            (0, "#3b82f6"),  # blue
            (1, "#ef4444"),  # red
            (2, "#f97316"),  # orange
            (10, "#6b7280"),  # gray
        ],
    )
    def test_impact_color(self, impact_dependency_graph, distance, expected_color):
        """Test impact color assignment."""
        service = ImpactAnalysisService(impact_dependency_graph)
        assert service._get_impact_color(distance) == expected_color


# =============================================================================
# Clustering Service Tests
# =============================================================================


class TestClusteringService:
    """Tests for ClusteringService."""

    def test_detect_communities(self, clustering_nx_graph):
        """Test community detection."""
        service = ClusteringService(clustering_nx_graph)
        result = service.detect_communities()

        assert len(result.clusters) >= 1
        assert len(result.node_to_cluster) >= 1

    def test_excludes_third_party(self, clustering_nx_graph):
        """Test that third-party nodes are excluded."""
        service = ClusteringService(clustering_nx_graph)
        result = service.detect_communities()

        assert "requests" not in result.node_to_cluster

    def test_cluster_metrics(self, clustering_nx_graph):
        """Test cluster metrics calculation."""
        service = ClusteringService(clustering_nx_graph)
        result = service.detect_communities()

        assert len(result.metrics) >= 1
        for metric in result.metrics:
            assert metric.size > 0
            assert metric.cluster_id >= 0
            assert 0 <= metric.cohesion <= 1
            assert metric.nodes is not None

    def test_node_to_cluster_mapping(self, clustering_nx_graph):
        """Test node to cluster mapping."""
        service = ClusteringService(clustering_nx_graph)
        result = service.detect_communities()

        for node in clustering_nx_graph.nodes:
            if clustering_nx_graph.nodes[node].get("type") == "internal":
                assert node in result.node_to_cluster

    def test_resolution_parameter(self, clustering_nx_graph):
        """Test resolution parameter affects clustering."""
        service = ClusteringService(clustering_nx_graph)
        result_low = service.detect_communities(resolution=0.5)

        service2 = ClusteringService(clustering_nx_graph)
        result_high = service2.detect_communities(resolution=2.0)

        assert result_low.clusters is not None
        assert result_high.clusters is not None

    def test_internal_external_edges(self, clustering_nx_graph):
        """Test internal vs external edge counting."""
        service = ClusteringService(clustering_nx_graph)
        result = service.detect_communities()

        for metric in result.metrics:
            assert metric.internal_edges >= 0
            assert metric.external_edges >= 0


class TestClusteringSuggestions:
    """Tests for package reorganization suggestions."""

    def test_get_cluster_suggestions(self, clustering_nx_graph):
        """Test getting package suggestions."""
        service = ClusteringService(clustering_nx_graph)
        service.detect_communities()
        suggestions = service.get_cluster_suggestions()

        assert isinstance(suggestions, list)

    @pytest.mark.parametrize(
        "nodes,expected_prefix",
        [
            (
                {"app.services.user", "app.services.auth", "app.services.order"},
                "app.services",
            ),
            ({"app.services", "lib.utils", "tests.unit"}, ""),
            (set(), ""),
        ],
        ids=["common_prefix", "no_common", "empty"],
    )
    def test_find_common_prefix(self, clustering_nx_graph, nodes, expected_prefix):
        """Test finding common prefix."""
        service = ClusteringService(clustering_nx_graph)
        assert service._find_common_prefix(nodes) == expected_prefix


class TestModularityContribution:
    """Tests for modularity calculation."""

    def test_modularity_contribution(self, clustering_nx_graph):
        """Test modularity contribution calculation."""
        service = ClusteringService(clustering_nx_graph)
        service.detect_communities()

        for cluster_id, nodes in service.clusters.items():
            modularity = service._calculate_modularity_contribution(nodes)
            assert -0.5 <= modularity <= 1.0

    def test_empty_graph_modularity(self, empty_nx_graph):
        """Test modularity with empty graph."""
        service = ClusteringService(empty_nx_graph)
        assert service._calculate_modularity_contribution(set()) == 0.0


class TestClusteringEdgeCases:
    """Edge case tests for clustering."""

    def test_single_node_graph(self):
        """Test clustering with single node."""
        graph = nx.DiGraph()
        graph.add_node("single", type="internal", module="app")

        service = ClusteringService(graph)
        result = service.detect_communities()

        assert len(result.clusters) >= 1
        assert "single" in result.node_to_cluster

    def test_disconnected_nodes(self):
        """Test clustering disconnected nodes."""
        graph = nx.DiGraph()
        for node, module in [("a", "app"), ("b", "lib"), ("c", "utils")]:
            graph.add_node(node, type="internal", module=module)

        service = ClusteringService(graph)
        result = service.detect_communities()

        assert len(result.node_to_cluster) == 3

    def test_all_third_party(self):
        """Test graph with only third-party nodes."""
        graph = nx.DiGraph()
        graph.add_node("requests", type="third_party", module="requests")
        graph.add_node("numpy", type="third_party", module="numpy")

        service = ClusteringService(graph)
        result = service.detect_communities()

        assert len(result.node_to_cluster) == 0
