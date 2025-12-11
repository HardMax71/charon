from radon.complexity import cc_visit, cc_rank
from radon.metrics import mi_visit
from radon.raw import analyze

from app.core import get_logger
from app.core.parsing_models import ComplexityMetrics, FunctionComplexity

logger = get_logger(__name__)


class ComplexityService:
    """Service for analyzing code complexity metrics."""

    @staticmethod
    def _get_maintainability_grade(mi_score: float) -> str:
        """
        Get maintainability grade using a more granular scale.

        Based on industry standards and Microsoft Visual Studio:
        - A (85-100): Excellent, highly maintainable
        - B (65-84): Good, moderately maintainable
        - C (40-64): Fair, needs attention
        - D (20-39): Poor, difficult to maintain
        - F (0-19): Critical, unmaintainable

        Args:
            mi_score: Maintainability index (0-100)

        Returns:
            Letter grade A-F
        """
        if mi_score >= 85:
            return "A"
        elif mi_score >= 65:
            return "B"
        elif mi_score >= 40:
            return "C"
        elif mi_score >= 20:
            return "D"
        else:
            return "F"

    @staticmethod
    def analyze_file(file_path: str, content: str) -> ComplexityMetrics:
        """
        Analyze complexity metrics for a Python file.

        Args:
            file_path: Path to the file
            content: File content as string

        Returns:
            ComplexityMetrics with validated complexity data
        """
        try:
            cc_results = cc_visit(content)
            mi_score = mi_visit(content, multi=True)
            raw_metrics = analyze(content)

            functions = []
            total_complexity = 0
            max_complexity = 0

            for item in cc_results:
                complexity = item.complexity
                total_complexity += complexity
                max_complexity = max(max_complexity, complexity)

                functions.append(
                    FunctionComplexity(
                        name=item.name,
                        complexity=complexity,
                        rank=cc_rank(complexity),
                        lineno=item.lineno,
                        col_offset=item.col_offset,
                    )
                )

            avg_complexity = total_complexity / len(cc_results) if cc_results else 0
            complexity_grade = cc_rank(avg_complexity)
            maintainability_grade = ComplexityService._get_maintainability_grade(
                mi_score
            )

            logger.debug(
                "Analyzed %s: avg_complexity=%.2f, mi=%.2f",
                file_path,
                avg_complexity,
                mi_score,
            )

            return ComplexityMetrics(
                cyclomatic_complexity=round(avg_complexity, 2),
                max_complexity=max_complexity,
                maintainability_index=round(mi_score, 2),
                lines_of_code=raw_metrics.loc,
                logical_lines=raw_metrics.lloc,
                source_lines=raw_metrics.sloc,
                comments=raw_metrics.comments,
                complexity_grade=complexity_grade,
                maintainability_grade=maintainability_grade,
                functions=functions,
                function_count=len(cc_results),
            )

        except Exception as e:
            logger.warning("Failed to analyze %s: %s", file_path, e)
            return ComplexityMetrics(
                cyclomatic_complexity=0,
                max_complexity=0,
                maintainability_index=0,
                lines_of_code=0,
                logical_lines=0,
                source_lines=0,
                comments=0,
                complexity_grade="-",
                maintainability_grade="-",
                functions=[],
                function_count=0,
                error=str(e),
            )

    @staticmethod
    def calculate_hot_zone_score(
        complexity: float,
        coupling: int,
        complexity_threshold: float = 10.0,
        coupling_threshold: int = 5,
    ) -> dict:
        """
        Calculate hot zone score based on complexity and coupling.

        Hot zones are files with both high complexity and high coupling,
        indicating critical refactoring targets.

        Args:
            complexity: Cyclomatic complexity
            coupling: Coupling metric (afferent or efferent)
            complexity_threshold: Threshold for high complexity
            coupling_threshold: Threshold for high coupling

        Returns:
            Dict with:
                - is_hot_zone: bool
                - severity: 'critical' | 'warning' | 'info' | 'ok'
                - score: Combined risk score (0-100)
                - reason: Explanation string
        """
        # Normalize metrics to 0-1 scale
        complexity_normalized = min(complexity / 20, 1.0)  # Cap at 20
        coupling_normalized = min(coupling / 10, 1.0)  # Cap at 10

        # Combined score (weighted average: complexity 60%, coupling 40%)
        score = (complexity_normalized * 0.6 + coupling_normalized * 0.4) * 100

        # Determine severity
        is_hot_zone = (
            complexity >= complexity_threshold and coupling >= coupling_threshold
        )

        if is_hot_zone and score >= 75:
            severity = "critical"
            reason = f"Critical: High complexity ({complexity:.1f}) + High coupling ({coupling})"
        elif is_hot_zone:
            severity = "warning"
            reason = f"Warning: Elevated complexity ({complexity:.1f}) + coupling ({coupling})"
        elif complexity >= complexity_threshold:
            severity = "info"
            reason = f"Complex code ({complexity:.1f}) but manageable coupling"
        elif coupling >= coupling_threshold:
            severity = "info"
            reason = f"High coupling ({coupling}) but low complexity"
        else:
            severity = "ok"
            reason = "Healthy complexity and coupling levels"

        return {
            "is_hot_zone": is_hot_zone,
            "severity": severity,
            "score": round(score, 2),
            "reason": reason,
        }
