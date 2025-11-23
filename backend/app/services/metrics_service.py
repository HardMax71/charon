import networkx as nx
from typing import Dict, List, Set
import statistics

from app.core.config import settings
from app.utils.cycle_detector import detect_cycles, get_nodes_in_cycles
from app.services.complexity_service import ComplexityService


def percentile(values: List[float], percent: float) -> float:
    """Calculate percentile of a list of values."""
    if not values:
        return 0.0
    sorted_values = sorted(values)
    k = (len(sorted_values) - 1) * (percent / 100.0)
    f = int(k)
    c = f + 1
    if c >= len(sorted_values):
        return sorted_values[-1]
    d0 = sorted_values[f] * (c - k)
    d1 = sorted_values[c] * (k - f)
    return d0 + d1


class MetricsCalculator:
    """Calculate coupling and cohesion metrics."""

    def __init__(self, graph: nx.DiGraph):
        self.graph = graph
        self.cycles: List[List[str]] = []
        self.nodes_in_cycles: Set[str] = set()
        self.high_coupling_threshold: float = 0

    def calculate_all(self) -> Dict:
        """Calculate all metrics for the graph."""
        # Detect circular dependencies
        self.cycles = detect_cycles(self.graph)
        self.nodes_in_cycles = get_nodes_in_cycles(self.cycles)

        # Calculate coupling for each node
        coupling_values = []
        for node in self.graph.nodes:
            metrics = self._calculate_node_metrics(node)
            self.graph.nodes[node]["metrics"] = metrics
            coupling_values.append(metrics["efferent_coupling"])

        # Determine high coupling threshold (80th percentile = top 20%)
        if coupling_values:
            self.high_coupling_threshold = percentile(
                coupling_values, settings.high_coupling_percentile
            )
        else:
            self.high_coupling_threshold = 0

        # Mark high coupling nodes
        for node in self.graph.nodes:
            is_high = (
                self.graph.nodes[node]["metrics"]["efferent_coupling"]
                >= self.high_coupling_threshold
            )
            self.graph.nodes[node]["metrics"]["is_high_coupling"] = is_high

        return self._calculate_global_metrics()

    def _calculate_node_metrics(self, node: str) -> Dict:
        """Calculate metrics for a single node."""
        # Efferent coupling (fan-out): number of outgoing dependencies
        efferent_coupling = self.graph.out_degree(node)

        # Afferent coupling (fan-in): number of incoming dependencies
        afferent_coupling = self.graph.in_degree(node)

        # Instability metric: Ce / (Ca + Ce)
        # 0 = maximally stable, 1 = maximally unstable
        total = afferent_coupling + efferent_coupling
        instability = efferent_coupling / total if total > 0 else 0.0

        # Check if part of circular dependency
        is_circular = node in self.nodes_in_cycles

        # Get complexity metrics from node data
        complexity_data = self.graph.nodes[node].get("complexity", {})

        # Calculate hot zone score
        cyclomatic_complexity = complexity_data.get("cyclomatic_complexity", 0)
        total_coupling = afferent_coupling + efferent_coupling

        hot_zone = ComplexityService.calculate_hot_zone_score(
            cyclomatic_complexity,
            total_coupling,
            complexity_threshold=10.0,
            coupling_threshold=5
        )

        return {
            "afferent_coupling": afferent_coupling,
            "efferent_coupling": efferent_coupling,
            "instability": round(instability, 3),
            "is_circular": is_circular,
            "is_high_coupling": False,  # Set later
            # Complexity metrics
            "cyclomatic_complexity": complexity_data.get("cyclomatic_complexity", 0),
            "max_complexity": complexity_data.get("max_complexity", 0),
            "maintainability_index": complexity_data.get("maintainability_index", 0),
            "lines_of_code": complexity_data.get("lines_of_code", 0),
            "complexity_grade": complexity_data.get("complexity_grade", "A"),
            "maintainability_grade": complexity_data.get("maintainability_grade", "A"),
            # Hot zone detection
            "is_hot_zone": hot_zone["is_hot_zone"],
            "hot_zone_severity": hot_zone["severity"],
            "hot_zone_score": hot_zone["score"],
            "hot_zone_reason": hot_zone["reason"],
        }

    def _calculate_global_metrics(self) -> Dict:
        """Calculate global project metrics."""
        internal_nodes = [
            n for n in self.graph.nodes if self.graph.nodes[n].get("type") == "internal"
        ]
        third_party_nodes = [
            n for n in self.graph.nodes if self.graph.nodes[n].get("type") == "third_party"
        ]

        # Calculate averages
        if internal_nodes:
            avg_afferent = statistics.mean(
                [self.graph.nodes[n]["metrics"]["afferent_coupling"] for n in internal_nodes]
            )
            avg_efferent = statistics.mean(
                [self.graph.nodes[n]["metrics"]["efferent_coupling"] for n in internal_nodes]
            )
        else:
            avg_afferent = 0.0
            avg_efferent = 0.0

        # Get high coupling files
        high_coupling_files = [
            n
            for n in internal_nodes
            if self.graph.nodes[n]["metrics"]["is_high_coupling"]
        ]

        # Format circular dependencies
        circular_deps = [{"cycle": cycle} for cycle in self.cycles]

        # Calculate complexity averages
        if internal_nodes:
            avg_complexity = statistics.mean(
                [self.graph.nodes[n]["metrics"]["cyclomatic_complexity"] for n in internal_nodes]
            )
            avg_maintainability = statistics.mean(
                [self.graph.nodes[n]["metrics"]["maintainability_index"] for n in internal_nodes]
            )
        else:
            avg_complexity = 0.0
            avg_maintainability = 0.0

        # Get hot zone files
        hot_zone_files = [
            {
                "file": n,
                "severity": self.graph.nodes[n]["metrics"]["hot_zone_severity"],
                "score": self.graph.nodes[n]["metrics"]["hot_zone_score"],
                "reason": self.graph.nodes[n]["metrics"]["hot_zone_reason"],
                "complexity": self.graph.nodes[n]["metrics"]["cyclomatic_complexity"],
                "coupling": (
                    self.graph.nodes[n]["metrics"]["afferent_coupling"] +
                    self.graph.nodes[n]["metrics"]["efferent_coupling"]
                ),
            }
            for n in internal_nodes
            if self.graph.nodes[n]["metrics"]["is_hot_zone"]
        ]

        # Sort hot zones by score (highest first)
        hot_zone_files = sorted(hot_zone_files, key=lambda x: x["score"], reverse=True)

        return {
            "total_files": len(internal_nodes) + len(third_party_nodes),
            "total_internal": len(internal_nodes),
            "total_third_party": len(third_party_nodes),
            "avg_afferent_coupling": round(avg_afferent, 2),
            "avg_efferent_coupling": round(avg_efferent, 2),
            "circular_dependencies": circular_deps,
            "high_coupling_files": high_coupling_files,
            "coupling_threshold": round(self.high_coupling_threshold, 2),
            # Complexity metrics
            "avg_complexity": round(avg_complexity, 2),
            "avg_maintainability": round(avg_maintainability, 2),
            "hot_zone_files": hot_zone_files,
        }
