import math
from typing import Dict, List, Any
import networkx as nx


class HealthScoreService:
    """
    Calculate a comprehensive health score for the project based on multiple factors.

    Score is 0-100 where:
    - 80-100: Excellent
    - 60-79: Good
    - 40-59: Fair
    - 20-39: Poor
    - 0-19: Critical

    Components:
    - Circular Dependencies (20%): Penalizes circular dependencies
    - Coupling Health (20%): Based on average coupling and instability
    - Complexity Health (30%): Based on cyclomatic complexity and maintainability
    - Architecture Health (20%): Based on god objects and hot zones
    - Stability Distribution (10%): Based on instability metric distribution
    """

    def __init__(self, graph: nx.DiGraph, global_metrics: Dict[str, Any]):
        self.graph = graph
        self.global_metrics = global_metrics
        self.total_nodes = len([n for n in graph.nodes if graph.nodes[n].get('type') == 'internal'])

    def calculate_health_score(self) -> Dict[str, Any]:
        """Calculate comprehensive health score."""
        # Calculate individual component scores
        circular_score = self._calculate_circular_dependency_score()
        coupling_score = self._calculate_coupling_score()
        complexity_score = self._calculate_complexity_score()
        architecture_score = self._calculate_architecture_score()
        stability_score = self._calculate_stability_score()

        # Weighted average (total: 100%)
        weights = {
            'circular': 0.20,    # 20%
            'coupling': 0.20,    # 20%
            'complexity': 0.30,  # 30%
            'architecture': 0.20, # 20%
            'stability': 0.10,   # 10%
        }

        overall_score = (
            circular_score['score'] * weights['circular'] +
            coupling_score['score'] * weights['coupling'] +
            complexity_score['score'] * weights['complexity'] +
            architecture_score['score'] * weights['architecture'] +
            stability_score['score'] * weights['stability']
        )

        # Determine overall grade
        overall_grade = self._get_grade(overall_score)

        return {
            'overall_score': round(overall_score, 2),
            'overall_grade': overall_grade,
            'components': {
                'circular_dependencies': circular_score,
                'coupling_health': coupling_score,
                'complexity_health': complexity_score,
                'architecture_health': architecture_score,
                'stability_distribution': stability_score,
            },
            'weights': weights,
            'summary': self._generate_summary(overall_score, overall_grade),
            'recommendations': self._generate_recommendations(
                circular_score, coupling_score, complexity_score,
                architecture_score, stability_score
            ),
        }

    def _calculate_circular_dependency_score(self) -> Dict[str, Any]:
        """
        Calculate score based on circular dependencies.

        Perfect score (100) = 0 circular dependencies
        Score decreases based on % of nodes in circular dependencies
        """
        circular_count = self.global_metrics.get('circular_dependencies_count', 0)
        circular_nodes = len([
            n for n in self.graph.nodes
            if self.graph.nodes[n].get('metrics', {}).get('is_circular', False)
        ])

        if self.total_nodes == 0:
            return {'score': 100, 'grade': 'A', 'details': 'No internal nodes'}

        # Percentage of nodes involved in circular dependencies
        circular_percentage = (circular_nodes / self.total_nodes) * 100

        # Scoring: 0% circular = 100, 100% circular = 0
        # Use exponential decay for harsh penalty
        score = max(0, 100 * math.exp(-circular_percentage / 20))

        return {
            'score': round(score, 2),
            'grade': self._get_grade(score),
            'details': {
                'circular_dependency_count': circular_count,
                'nodes_in_cycles': circular_nodes,
                'total_nodes': self.total_nodes,
                'percentage_affected': round(circular_percentage, 2),
            }
        }

    def _calculate_coupling_score(self) -> Dict[str, Any]:
        """
        Calculate score based on coupling metrics.

        Considers:
        - Average coupling (lower is better)
        - High coupling file count (fewer is better)
        """
        avg_afferent = self.global_metrics.get('avg_afferent_coupling', 0)
        avg_efferent = self.global_metrics.get('avg_efferent_coupling', 0)
        avg_coupling = avg_afferent + avg_efferent

        high_coupling_count = len(self.global_metrics.get('high_coupling_files', []))
        high_coupling_percentage = (high_coupling_count / self.total_nodes * 100) if self.total_nodes > 0 else 0

        # Coupling score (0-10 is ideal, 20+ is problematic)
        # Score: 0-5 = 100, 5-10 = 80-100, 10-20 = 40-80, 20+ = 0-40
        if avg_coupling <= 5:
            coupling_health = 100
        elif avg_coupling <= 10:
            coupling_health = 80 + (10 - avg_coupling) * 4  # Linear from 80 to 100
        elif avg_coupling <= 20:
            coupling_health = 40 + (20 - avg_coupling) * 4  # Linear from 40 to 80
        else:
            coupling_health = max(0, 40 - (avg_coupling - 20) * 2)

        # Penalize high coupling percentage
        high_coupling_penalty = min(50, high_coupling_percentage * 2)

        score = max(0, coupling_health - high_coupling_penalty)

        return {
            'score': round(score, 2),
            'grade': self._get_grade(score),
            'details': {
                'avg_afferent_coupling': round(avg_afferent, 2),
                'avg_efferent_coupling': round(avg_efferent, 2),
                'avg_total_coupling': round(avg_coupling, 2),
                'high_coupling_files': high_coupling_count,
                'high_coupling_percentage': round(high_coupling_percentage, 2),
            }
        }

    def _calculate_complexity_score(self) -> Dict[str, Any]:
        """
        Calculate score based on complexity metrics.

        Considers:
        - Average cyclomatic complexity (threshold: 10)
        - Average maintainability index (0-100 scale)
        """
        avg_complexity = self.global_metrics.get('avg_complexity', 0)
        avg_maintainability = self.global_metrics.get('avg_maintainability', 100)

        # Complexity score (McCabe thresholds)
        # 1-10: Simple (100), 10-20: Complex (50-100), 20+: Very complex (0-50)
        if avg_complexity <= 10:
            complexity_health = 100 - (avg_complexity * 2)  # 100 at 0, 80 at 10
        elif avg_complexity <= 20:
            complexity_health = 50 + (20 - avg_complexity) * 3  # 50 to 80
        else:
            complexity_health = max(0, 50 - (avg_complexity - 20) * 2.5)

        # Maintainability score (already 0-100)
        # Microsoft thresholds: 0-9 (low), 10-19 (moderate), 20+ (good)
        maintainability_health = avg_maintainability

        # Weighted average (60% maintainability, 40% complexity)
        score = (maintainability_health * 0.6) + (complexity_health * 0.4)

        return {
            'score': round(score, 2),
            'grade': self._get_grade(score),
            'details': {
                'avg_cyclomatic_complexity': round(avg_complexity, 2),
                'avg_maintainability_index': round(avg_maintainability, 2),
                'complexity_classification': self._classify_complexity(avg_complexity),
                'maintainability_classification': self._classify_maintainability(avg_maintainability),
            }
        }

    def _calculate_architecture_score(self) -> Dict[str, Any]:
        """
        Calculate score based on architecture quality.

        Considers:
        - God objects (hot zones with critical severity)
        - Total hot zone count
        """
        hot_zones = self.global_metrics.get('hot_zone_files', [])

        critical_hot_zones = len([hz for hz in hot_zones if hz.get('severity') == 'critical'])
        warning_hot_zones = len([hz for hz in hot_zones if hz.get('severity') == 'warning'])
        total_hot_zones = len(hot_zones)

        if self.total_nodes == 0:
            return {'score': 100, 'grade': 'A', 'details': 'No internal nodes'}

        # God objects = critical hot zones
        god_object_percentage = (critical_hot_zones / self.total_nodes) * 100
        hot_zone_percentage = (total_hot_zones / self.total_nodes) * 100

        # Harsh penalty for god objects
        god_object_penalty = min(60, god_object_percentage * 10)

        # Moderate penalty for other hot zones
        hot_zone_penalty = min(40, (hot_zone_percentage - god_object_percentage) * 2)

        score = max(0, 100 - god_object_penalty - hot_zone_penalty)

        return {
            'score': round(score, 2),
            'grade': self._get_grade(score),
            'details': {
                'god_objects': critical_hot_zones,
                'warning_hot_zones': warning_hot_zones,
                'total_hot_zones': total_hot_zones,
                'god_object_percentage': round(god_object_percentage, 2),
                'hot_zone_percentage': round(hot_zone_percentage, 2),
            }
        }

    def _calculate_stability_score(self) -> Dict[str, Any]:
        """
        Calculate score based on instability distribution.

        Instability (I) = Ce / (Ce + Ca)
        Preferred: 0-0.3 (stable) or 0.7-1.0 (unstable)
        Avoid: 0.3-0.7 (intermediate)
        """
        instability_values = []

        for node_id in self.graph.nodes:
            if self.graph.nodes[node_id].get('type') != 'internal':
                continue

            metrics = self.graph.nodes[node_id].get('metrics', {})
            instability = metrics.get('instability', 0)
            instability_values.append(instability)

        if not instability_values:
            return {'score': 100, 'grade': 'A', 'details': 'No internal nodes'}

        # Count nodes in each zone
        stable_count = len([i for i in instability_values if i <= 0.3])
        intermediate_count = len([i for i in instability_values if 0.3 < i < 0.7])
        unstable_count = len([i for i in instability_values if i >= 0.7])

        total = len(instability_values)

        # Ideal: high % in stable/unstable zones, low % in intermediate
        stable_percentage = (stable_count / total) * 100
        intermediate_percentage = (intermediate_count / total) * 100
        unstable_percentage = (unstable_count / total) * 100

        # Score: reward stable + unstable, penalize intermediate
        good_zones_percentage = stable_percentage + unstable_percentage

        # Score = good zones percentage minus half of intermediate percentage
        score = max(0, good_zones_percentage - (intermediate_percentage * 0.5))

        return {
            'score': round(score, 2),
            'grade': self._get_grade(score),
            'details': {
                'stable_modules': stable_count,
                'intermediate_modules': intermediate_count,
                'unstable_modules': unstable_count,
                'stable_percentage': round(stable_percentage, 2),
                'intermediate_percentage': round(intermediate_percentage, 2),
                'unstable_percentage': round(unstable_percentage, 2),
                'avg_instability': round(sum(instability_values) / len(instability_values), 2),
            }
        }

    def _get_grade(self, score: float) -> str:
        """Convert score to letter grade."""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'

    def _classify_complexity(self, complexity: float) -> str:
        """Classify complexity level."""
        if complexity <= 10:
            return 'Simple'
        elif complexity <= 20:
            return 'Complex'
        else:
            return 'Very Complex'

    def _classify_maintainability(self, maintainability: float) -> str:
        """Classify maintainability level."""
        if maintainability >= 20:
            return 'Good'
        elif maintainability >= 10:
            return 'Moderate'
        else:
            return 'Low'

    def _generate_summary(self, score: float, grade: str) -> str:
        """Generate human-readable summary."""
        if score >= 80:
            return f"Excellent health (Grade {grade}). Your codebase demonstrates strong architectural practices with minimal technical debt."
        elif score >= 60:
            return f"Good health (Grade {grade}). Your codebase is generally well-structured with some areas for improvement."
        elif score >= 40:
            return f"Fair health (Grade {grade}). Your codebase has moderate technical debt that should be addressed."
        elif score >= 20:
            return f"Poor health (Grade {grade}). Your codebase has significant architectural issues requiring attention."
        else:
            return f"Critical health (Grade {grade}). Your codebase has severe architectural problems that need immediate refactoring."

    def _generate_recommendations(
        self,
        circular_score: Dict,
        coupling_score: Dict,
        complexity_score: Dict,
        architecture_score: Dict,
        stability_score: Dict,
    ) -> List[str]:
        """Generate actionable recommendations based on scores."""
        recommendations = []

        # Circular dependencies
        if circular_score['score'] < 70:
            circular_count = circular_score['details']['circular_dependency_count']
            recommendations.append(
                f"Break {circular_count} circular dependenc{'y' if circular_count == 1 else 'ies'} "
                "to improve modularity and testability."
            )

        # Coupling
        if coupling_score['score'] < 70:
            avg_coupling = coupling_score['details']['avg_total_coupling']
            if avg_coupling > 10:
                recommendations.append(
                    f"Reduce average coupling from {avg_coupling:.1f} to below 10 "
                    "through dependency injection and interface segregation."
                )

        # Complexity
        if complexity_score['score'] < 70:
            avg_complexity = complexity_score['details']['avg_cyclomatic_complexity']
            if avg_complexity > 10:
                recommendations.append(
                    f"Reduce average cyclomatic complexity from {avg_complexity:.1f} to below 10 "
                    "by extracting methods and simplifying conditional logic."
                )

            avg_maintainability = complexity_score['details']['avg_maintainability_index']
            if avg_maintainability < 20:
                recommendations.append(
                    f"Improve maintainability index from {avg_maintainability:.1f} to above 20 "
                    "through refactoring and reducing complexity."
                )

        # Architecture
        if architecture_score['score'] < 70:
            god_objects = architecture_score['details']['god_objects']
            if god_objects > 0:
                recommendations.append(
                    f"Refactor {god_objects} god object{'s' if god_objects > 1 else ''} "
                    "using Single Responsibility Principle and Extract Class pattern."
                )

        # Stability
        if stability_score['score'] < 70:
            intermediate_pct = stability_score['details']['intermediate_percentage']
            if intermediate_pct > 40:
                recommendations.append(
                    f"{intermediate_pct:.0f}% of modules have intermediate instability (0.3-0.7). "
                    "Make modules either very stable or very unstable to improve architecture clarity."
                )

        # If score is good overall
        if not recommendations:
            recommendations.append("Great work! Maintain current practices and continue monitoring metrics.")

        return recommendations
