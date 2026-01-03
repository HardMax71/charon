import pytest

from app.core.models import GlobalMetrics
from app.services.analysis.health_score import HealthScoreService


# =============================================================================
# Health Score Service Tests
# =============================================================================


class TestHealthScoreService:
    """Tests for HealthScoreService."""

    def test_healthy_score(self, healthy_nx_graph, healthy_global_metrics):
        """Test health score for healthy codebase."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        result = service.calculate_health_score()

        assert result.overall_score >= 60
        assert result.overall_grade in ["A", "B", "C"]

    def test_unhealthy_score(self, unhealthy_nx_graph, unhealthy_global_metrics):
        """Test health score for unhealthy codebase."""
        service = HealthScoreService(unhealthy_nx_graph, unhealthy_global_metrics)
        result = service.calculate_health_score()

        assert result.overall_score < 60
        assert result.overall_grade in ["D", "F"]

    def test_score_components(self, healthy_nx_graph, healthy_global_metrics):
        """Test that all components are calculated."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        result = service.calculate_health_score()

        assert result.components.circular_dependencies is not None
        assert result.components.coupling_health is not None
        assert result.components.complexity_health is not None
        assert result.components.architecture_health is not None
        assert result.components.stability_distribution is not None

    def test_weights_sum_to_one(self, healthy_nx_graph, healthy_global_metrics):
        """Test that weights sum to 1.0."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        result = service.calculate_health_score()

        total_weight = (
            result.weights.circular
            + result.weights.coupling
            + result.weights.complexity
            + result.weights.architecture
            + result.weights.stability
        )
        assert abs(total_weight - 1.0) < 0.001

    def test_recommendations_generated(
        self, unhealthy_nx_graph, unhealthy_global_metrics
    ):
        """Test that recommendations are generated for unhealthy code."""
        service = HealthScoreService(unhealthy_nx_graph, unhealthy_global_metrics)
        result = service.calculate_health_score()

        assert len(result.recommendations) >= 1

    def test_summary_generated(self, healthy_nx_graph, healthy_global_metrics):
        """Test that summary is generated."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        result = service.calculate_health_score()

        assert result.summary is not None
        assert len(result.summary) > 0
        assert result.overall_grade in result.summary


# =============================================================================
# Component Score Tests
# =============================================================================


class TestCircularDependencyScore:
    """Tests for circular dependency scoring."""

    def test_no_circular_dependencies(self, healthy_nx_graph, healthy_global_metrics):
        """Test perfect score with no circular dependencies."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        score = service._calculate_circular_dependency_score()

        assert score.score >= 90
        assert score.grade == "A"

    def test_with_circular_dependencies(
        self, unhealthy_nx_graph, unhealthy_global_metrics
    ):
        """Test reduced score with circular dependencies."""
        service = HealthScoreService(unhealthy_nx_graph, unhealthy_global_metrics)
        score = service._calculate_circular_dependency_score()

        assert score.score < 80
        assert score.details["circular_dependency_count"] >= 1


class TestCouplingScore:
    """Tests for coupling scoring."""

    def test_low_coupling(self, healthy_nx_graph, healthy_global_metrics):
        """Test good score with low coupling."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        score = service._calculate_coupling_score()

        assert score.score >= 70
        assert score.details["avg_total_coupling"] <= 10

    def test_high_coupling(self, unhealthy_nx_graph, unhealthy_global_metrics):
        """Test poor score with high coupling."""
        service = HealthScoreService(unhealthy_nx_graph, unhealthy_global_metrics)
        score = service._calculate_coupling_score()

        assert score.score < 70
        assert score.details["avg_total_coupling"] > 10


class TestComplexityScore:
    """Tests for complexity scoring."""

    def test_low_complexity(self, healthy_nx_graph, healthy_global_metrics):
        """Test good score with low complexity."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        score = service._calculate_complexity_score()

        assert score.score >= 60
        assert score.details["complexity_classification"] == "Simple"

    def test_high_complexity(self, unhealthy_nx_graph, unhealthy_global_metrics):
        """Test poor score with high complexity."""
        service = HealthScoreService(unhealthy_nx_graph, unhealthy_global_metrics)
        score = service._calculate_complexity_score()

        assert score.score < 60
        assert score.details["complexity_classification"] == "Very Complex"


class TestArchitectureScore:
    """Tests for architecture scoring."""

    def test_no_god_objects(self, healthy_nx_graph, healthy_global_metrics):
        """Test good score without god objects."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        score = service._calculate_architecture_score()

        assert score.score >= 80
        assert score.details["god_objects"] == 0

    def test_with_god_objects(self, unhealthy_nx_graph, unhealthy_global_metrics):
        """Test poor score with god objects."""
        service = HealthScoreService(unhealthy_nx_graph, unhealthy_global_metrics)
        score = service._calculate_architecture_score()

        assert score.score < 80
        assert score.details["god_objects"] >= 1


class TestStabilityScore:
    """Tests for stability distribution scoring."""

    def test_well_distributed_stability(self, healthy_nx_graph, healthy_global_metrics):
        """Test good score with modules in stable/unstable zones."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        score = service._calculate_stability_score()

        assert score.score >= 50

    def test_intermediate_instability(
        self, unhealthy_nx_graph, unhealthy_global_metrics
    ):
        """Test poor score with modules in intermediate zone."""
        service = HealthScoreService(unhealthy_nx_graph, unhealthy_global_metrics)
        score = service._calculate_stability_score()

        assert score.details["intermediate_modules"] == 3


# =============================================================================
# Grading Tests
# =============================================================================


class TestGrading:
    """Tests for grade assignment."""

    @pytest.mark.parametrize(
        "score,expected_grade",
        [
            (95, "A"),
            (90, "A"),
            (85, "B"),
            (80, "B"),
            (75, "C"),
            (70, "C"),
            (65, "D"),
            (60, "D"),
            (50, "F"),
            (0, "F"),
        ],
    )
    def test_grade_assignment(
        self, healthy_nx_graph, healthy_global_metrics, score, expected_grade
    ):
        """Test grade assignment for various scores."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        assert service._get_grade(score) == expected_grade


# =============================================================================
# Classification Tests
# =============================================================================


class TestClassifications:
    """Tests for classification methods."""

    @pytest.mark.parametrize(
        "value,expected",
        [
            (5, "Simple"),
            (15, "Complex"),
            (25, "Very Complex"),
        ],
    )
    def test_complexity_classification(
        self, healthy_nx_graph, healthy_global_metrics, value, expected
    ):
        """Test complexity classification."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        assert service._classify_complexity(value) == expected

    @pytest.mark.parametrize(
        "value,expected",
        [
            (75, "Good"),
            (15, "Moderate"),
            (5, "Low"),
        ],
    )
    def test_maintainability_classification(
        self, healthy_nx_graph, healthy_global_metrics, value, expected
    ):
        """Test maintainability classification."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        assert service._classify_maintainability(value) == expected


# =============================================================================
# Edge Cases
# =============================================================================


class TestEmptyGraph:
    """Tests with empty graph."""

    def test_empty_graph_score(self, empty_nx_graph):
        """Test health score with empty graph."""
        metrics = GlobalMetrics(
            total_files=0,
            total_internal=0,
            total_third_party=0,
            avg_afferent_coupling=0,
            avg_efferent_coupling=0,
            circular_dependencies=[],
            high_coupling_files=[],
            coupling_threshold=5.0,
        )

        service = HealthScoreService(empty_nx_graph, metrics)
        result = service.calculate_health_score()

        assert result.overall_score >= 80


class TestSummaryGeneration:
    """Tests for summary generation."""

    @pytest.mark.parametrize(
        "score,grade,expected_text",
        [
            (85, "B", "Excellent health"),
            (15, "F", "Critical health"),
        ],
        ids=["excellent", "critical"],
    )
    def test_summary_text(
        self, healthy_nx_graph, healthy_global_metrics, score, grade, expected_text
    ):
        """Test summary text generation."""
        service = HealthScoreService(healthy_nx_graph, healthy_global_metrics)
        summary = service._generate_summary(score, grade)

        assert expected_text in summary
