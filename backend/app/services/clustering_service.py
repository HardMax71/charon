import networkx as nx
from typing import Dict, List, Set
from collections import defaultdict


class ClusteringService:
    """Detect clusters and calculate cluster metrics."""

    def __init__(self, graph: nx.DiGraph):
        """
        Initialize clustering service.

        Args:
            graph: NetworkX directed graph
        """
        self.graph = graph
        self.clusters: Dict[int, Set[str]] = {}
        self.node_to_cluster: Dict[str, int] = {}

    def detect_communities(self, resolution: float = 1.0) -> Dict:
        """
        Detect clusters using Louvain community detection algorithm.

        Args:
            resolution: Resolution parameter for Louvain (default 1.0)
                       Higher values = more smaller clusters
                       Lower values = fewer larger clusters

        Returns:
            Dictionary with cluster information
        """
        # Convert directed graph to undirected for community detection
        # (Louvain algorithm works on undirected graphs)
        undirected_graph = self.graph.to_undirected()

        # Only cluster internal nodes
        internal_nodes = [
            n for n in self.graph.nodes
            if self.graph.nodes[n].get("type") == "internal"
        ]

        # Create subgraph with only internal nodes
        internal_subgraph = undirected_graph.subgraph(internal_nodes)

        # Detect clusters using Louvain algorithm
        try:
            communities = nx.community.louvain_communities(
                internal_subgraph,
                resolution=resolution,
                seed=42  # For reproducibility
            )

            # Convert to dictionary format
            self.clusters = {i: set(comm) for i, comm in enumerate(communities)}

            # Create reverse mapping (node -> cluster_id)
            self.node_to_cluster = {}
            for cluster_id, nodes in self.clusters.items():
                for node in nodes:
                    self.node_to_cluster[node] = cluster_id

        except Exception as e:
            # Fallback: each node is its own cluster
            self.clusters = {i: {node} for i, node in enumerate(internal_nodes)}
            self.node_to_cluster = {node: i for i, node in enumerate(internal_nodes)}

        # Calculate cluster metrics
        cluster_metrics = self._calculate_cluster_metrics()

        return {
            "clusters": self.clusters,
            "node_to_cluster": self.node_to_cluster,
            "metrics": cluster_metrics,
        }

    def _calculate_cluster_metrics(self) -> List[Dict]:
        """
        Calculate metrics for each detected cluster.

        Returns:
            List of cluster metrics
        """
        metrics = []

        for cluster_id, nodes in self.clusters.items():
            # Skip empty clusters
            if not nodes:
                continue

            # Create subgraph for this cluster
            subgraph = self.graph.subgraph(nodes)

            # Calculate internal edges (within cluster)
            internal_edges = subgraph.number_of_edges()

            # Calculate external edges (crossing cluster boundary)
            external_edges = 0
            for node in nodes:
                for successor in self.graph.successors(node):
                    if successor not in nodes:
                        external_edges += 1
                for predecessor in self.graph.predecessors(node):
                    if predecessor not in nodes:
                        external_edges += 1

            # Calculate cluster cohesion (internal/total ratio)
            total_edges = internal_edges + external_edges
            cohesion = internal_edges / total_edges if total_edges > 0 else 0.0

            # Calculate modularity contribution
            # (measure of how well the cluster is separated)
            modularity_contribution = self._calculate_modularity_contribution(nodes)

            # Get average coupling within cluster
            if nodes:
                avg_internal_coupling = sum(
                    subgraph.degree(node) for node in nodes
                ) / len(nodes)
            else:
                avg_internal_coupling = 0.0

            # Suggest if this could be a separate package
            # High cohesion + low external coupling = good package candidate
            is_package_candidate = cohesion > 0.7 and external_edges < internal_edges

            metrics.append({
                "cluster_id": cluster_id,
                "size": len(nodes),
                "internal_edges": internal_edges,
                "external_edges": external_edges,
                "cohesion": round(cohesion, 3),
                "modularity_contribution": round(modularity_contribution, 3),
                "avg_internal_coupling": round(avg_internal_coupling, 2),
                "is_package_candidate": is_package_candidate,
                "nodes": list(nodes),
            })

        # Sort by size (descending)
        metrics.sort(key=lambda x: x["size"], reverse=True)

        return metrics

    def _calculate_modularity_contribution(self, cluster_nodes: Set[str]) -> float:
        """
        Calculate modularity contribution for a cluster.

        Modularity measures how well a network is divided into clusters.
        Range: [-0.5, 1.0], higher is better.

        Args:
            cluster_nodes: Set of nodes in the cluster

        Returns:
            Modularity contribution
        """
        # Total edges in graph
        total_edges = self.graph.number_of_edges()
        if total_edges == 0:
            return 0.0

        # Edges within cluster
        internal_edges = 0
        for node in cluster_nodes:
            for successor in self.graph.successors(node):
                if successor in cluster_nodes:
                    internal_edges += 1

        # Expected edges if random (based on degree)
        degree_sum = sum(self.graph.degree(node) for node in cluster_nodes)
        expected_edges = (degree_sum ** 2) / (4 * total_edges)

        # Modularity contribution
        modularity = (internal_edges - expected_edges) / total_edges

        return modularity

    def get_cluster_suggestions(self) -> List[Dict]:
        """
        Get package reorganization suggestions based on clusters.

        Returns:
            List of suggestions for package boundaries
        """
        suggestions = []

        for cluster_id, nodes in self.clusters.items():
            # Skip small clusters (< 3 files)
            if len(nodes) < 3:
                continue

            # Find common module prefix
            common_prefix = self._find_common_prefix(nodes)

            # Get cluster metrics
            metrics = next(
                (m for m in self._calculate_cluster_metrics() if m["cluster_id"] == cluster_id),
                None
            )

            if metrics and metrics["is_package_candidate"]:
                suggestions.append({
                    "cluster_id": cluster_id,
                    "suggested_package_name": common_prefix or f"cluster_{cluster_id}",
                    "modules": list(nodes),
                    "size": len(nodes),
                    "cohesion": metrics["cohesion"],
                    "reason": (
                        f"High cohesion ({metrics['cohesion']:.2f}) with "
                        f"{metrics['internal_edges']} internal connections and "
                        f"only {metrics['external_edges']} external dependencies"
                    ),
                })

        return suggestions

    def _find_common_prefix(self, nodes: Set[str]) -> str:
        """
        Find common module prefix for a set of nodes.

        Args:
            nodes: Set of module names

        Returns:
            Common prefix (e.g., 'app.services' for 'app.services.x', 'app.services.y')
        """
        if not nodes:
            return ""

        # Split all module names into parts
        node_parts = [node.split(".") for node in nodes]

        # Find common prefix
        common_prefix_parts = []
        for parts in zip(*node_parts):
            if len(set(parts)) == 1:
                common_prefix_parts.append(parts[0])
            else:
                break

        return ".".join(common_prefix_parts) if common_prefix_parts else ""
