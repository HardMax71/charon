from collections import deque

from app.core.exceptions import NotFoundException


class ImpactAnalysisService:
    """Service for analyzing the impact of changes to a node."""

    def __init__(self, graph_data: dict):
        """Initialize with graph data containing nodes and edges."""
        self.nodes = {node["id"]: node for node in graph_data.get("nodes", [])}
        self.edges = graph_data.get("edges", [])

        # Build adjacency list for dependents (who depends on this node)
        self.dependents: dict[str, list[str]] = {}
        for edge in self.edges:
            source = edge["source"]
            target = edge["target"]
            # source depends on target, so target has source as a dependent
            if target not in self.dependents:
                self.dependents[target] = []
            self.dependents[target].append(source)

    def calculate_impact(self, node_id: str, max_depth: int = 10) -> dict:
        """
        Calculate the impact of changes to a node.

        Returns:
            dict with:
                - affected_nodes: dict mapping node_id -> distance
                - impact_levels: dict mapping distance -> list of node_ids
                - metrics: impact statistics
        """
        if node_id not in self.nodes:
            raise NotFoundException(f"Node '{node_id}' not found in graph")

        # BFS to find all transitive dependents
        affected_nodes: dict[str, int] = {node_id: 0}  # node_id -> distance
        impact_levels: dict[int, list[str]] = {0: [node_id]}

        queue = deque([(node_id, 0)])
        visited = {node_id}

        while queue:
            current_id, distance = queue.popleft()

            if distance >= max_depth:
                continue

            # Find all nodes that depend on current node
            for dependent_id in self.dependents.get(current_id, []):
                if dependent_id not in visited:
                    new_distance = distance + 1
                    affected_nodes[dependent_id] = new_distance

                    if new_distance not in impact_levels:
                        impact_levels[new_distance] = []
                    impact_levels[new_distance].append(dependent_id)

                    visited.add(dependent_id)
                    queue.append((dependent_id, new_distance))

        # Calculate metrics
        total_nodes = len(self.nodes)
        total_affected = len(affected_nodes)
        impact_percentage = (
            (total_affected / total_nodes * 100) if total_nodes > 0 else 0
        )

        # Count by distance
        distance_breakdown = {}
        for distance, nodes in impact_levels.items():
            distance_breakdown[distance] = {
                "count": len(nodes),
                "percentage": (len(nodes) / total_nodes * 100)
                if total_nodes > 0
                else 0,
                "label": self._get_distance_label(distance),
            }

        metrics = {
            "total_nodes": total_nodes,
            "total_affected": total_affected,
            "impact_percentage": round(impact_percentage, 2),
            "max_depth_reached": max(impact_levels.keys()) if impact_levels else 0,
            "distance_breakdown": distance_breakdown,
        }

        # Add node details for each affected node
        affected_node_details = []
        for nid, distance in affected_nodes.items():
            node = self.nodes.get(nid, {})
            affected_node_details.append(
                {
                    "id": nid,
                    "label": node.get("label", nid),
                    "module": node.get("module", ""),
                    "type": node.get("type", "internal"),
                    "distance": distance,
                    "color": self._get_impact_color(distance),
                }
            )

        return {
            "selected_node": {
                "id": node_id,
                "label": self.nodes[node_id].get("label", node_id),
                "module": self.nodes[node_id].get("module", ""),
            },
            "affected_nodes": affected_nodes,
            "impact_levels": {str(k): v for k, v in impact_levels.items()},
            "affected_node_details": affected_node_details,
            "metrics": metrics,
        }

    def _get_distance_label(self, distance: int) -> str:
        """Get a human-readable label for a distance level."""
        if distance == 0:
            return "Selected"
        elif distance == 1:
            return "Direct Dependents"
        elif distance == 2:
            return "1-Hop Dependents"
        elif distance == 3:
            return "2-Hop Dependents"
        else:
            return f"{distance - 1}-Hop Dependents"

    def _get_impact_color(self, distance: int) -> str:
        """Get color for impact level visualization."""
        # Color gradient: selected (blue) -> direct (red) -> 1-hop (orange) -> 2-hop (yellow) -> 3+ (green)
        colors = {
            0: "#3b82f6",  # blue - selected
            1: "#ef4444",  # red - direct impact
            2: "#f97316",  # orange - 1-hop
            3: "#eab308",  # yellow - 2-hop
            4: "#84cc16",  # lime - 3-hop
            5: "#22c55e",  # green - 4-hop
        }
        return colors.get(distance, "#6b7280")  # gray for 5+
