import json
from unittest.mock import patch
import os

import pytest

from app.core.models import (
    DependencyGraph,
    Edge,
    FitnessRule,
    FitnessRuleConfig,
    FitnessValidationRequest,
    FitnessValidationResult,
    FitnessTrendPoint,
    GlobalMetrics,
    Node,
    Position3D,
)
from app.services.orchestration.fitness import FitnessOrchestratorService


class TestFitnessOrchestratorService:
    @pytest.fixture
    def sample_graph(self, default_node_metrics):
        return DependencyGraph(
            nodes=[
                Node(
                    id="app.main",
                    label="main.py",
                    type="internal",
                    module="app",
                    position=Position3D(x=0, y=0, z=0),
                    color="#fff",
                    metrics=default_node_metrics,
                ),
                Node(
                    id="app.utils",
                    label="utils.py",
                    type="internal",
                    module="app",
                    position=Position3D(x=1, y=0, z=0),
                    color="#fff",
                    metrics=default_node_metrics,
                ),
            ],
            edges=[
                Edge(
                    id="e1",
                    source="app.main",
                    target="app.utils",
                    imports=["helper"],
                    weight=1,
                    thickness=1,
                )
            ],
        )

    @pytest.fixture
    def sample_metrics(self):
        return GlobalMetrics(
            total_files=2,
            total_internal=2,
            total_third_party=0,
            avg_afferent_coupling=1.0,
            avg_efferent_coupling=1.0,
            avg_complexity=5.0,
            avg_maintainability=75.0,
            circular_dependencies=[],
            high_coupling_files=[],
            coupling_threshold=5.0,
            hot_zone_files=[],
        )

    @pytest.fixture
    def sample_rules(self):
        return [
            FitnessRule(
                id="no-circular",
                name="No Circular Dependencies",
                description="No circular deps allowed",
                rule_type="no_circular",
                severity="error",
                enabled=True,
                parameters={},
            ),
            FitnessRule(
                id="max-coupling",
                name="Max Coupling",
                description="Max 10 dependencies",
                rule_type="max_coupling",
                severity="warning",
                enabled=True,
                parameters={"max_efferent": 10},
            ),
        ]

    def test_validate_fitness_functions(
        self, sample_graph, sample_metrics, sample_rules
    ):
        request = FitnessValidationRequest(
            graph=sample_graph,
            global_metrics=sample_metrics,
            rules=sample_rules,
            fail_on_error=True,
            fail_on_warning=False,
        )

        result = FitnessOrchestratorService.validate_fitness_functions(request)

        assert isinstance(result, FitnessValidationResult)
        assert result.total_rules == 2

    def test_validate_from_config(self, sample_graph, sample_metrics, sample_rules):
        config = FitnessRuleConfig(version="1.0", rules=sample_rules)

        result = FitnessOrchestratorService.validate_from_config(
            graph=sample_graph,
            global_metrics=sample_metrics,
            config=config,
            fail_on_error=True,
            fail_on_warning=False,
        )

        assert isinstance(result, FitnessValidationResult)
        assert result.passed is True

    def test_save_validation_result(self, tmp_path):
        with patch.dict(os.environ, {"FITNESS_STORAGE_PATH": str(tmp_path)}):
            result = FitnessValidationResult(
                passed=True,
                timestamp="2024-01-01T00:00:00Z",
                total_rules=1,
                violations=[],
                errors=0,
                warnings=0,
                infos=0,
                summary="All passed",
            )

            response = FitnessOrchestratorService.save_validation_result(
                project_name="test-project",
                result=result,
            )

            assert response.success is True
            history_file = tmp_path / "test-project" / "fitness_history.jsonl"
            assert history_file.exists()

    def test_get_fitness_trend_no_history(self, tmp_path):
        with patch.dict(os.environ, {"FITNESS_STORAGE_PATH": str(tmp_path)}):
            response = FitnessOrchestratorService.get_fitness_trend(
                project_name="nonexistent",
            )

            assert response.project_name == "nonexistent"
            assert len(response.data_points) == 0
            assert response.summary["total_validations"] == 0

    def test_get_fitness_trend_with_history(self, tmp_path):
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()
        history_file = project_dir / "fitness_history.jsonl"

        for i in range(5):
            entry = {
                "passed": i % 2 == 0,
                "timestamp": f"2024-01-0{i + 1}T00:00:00Z",
                "total_rules": 2,
                "violations": [],
                "errors": 0 if i % 2 == 0 else 1,
                "warnings": 1,
                "infos": 0,
                "summary": "Test",
            }
            with open(history_file, "a") as f:
                f.write(json.dumps(entry) + "\n")

        with patch.dict(os.environ, {"FITNESS_STORAGE_PATH": str(tmp_path)}):
            response = FitnessOrchestratorService.get_fitness_trend(
                project_name="test-project",
            )

            assert len(response.data_points) == 5
            assert response.summary["total_validations"] == 5
            assert response.summary["passed"] == 3
            assert response.summary["failed"] == 2

    def test_get_fitness_trend_with_rule_filter(self, tmp_path):
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()
        history_file = project_dir / "fitness_history.jsonl"

        entry = {
            "passed": False,
            "timestamp": "2024-01-01T00:00:00Z",
            "total_rules": 2,
            "violations": [
                {"rule_id": "rule-a", "severity": "error", "message": "Error"},
                {"rule_id": "rule-b", "severity": "warning", "message": "Warning"},
            ],
            "errors": 1,
            "warnings": 1,
            "infos": 0,
            "summary": "1 error, 1 warning",
        }
        with open(history_file, "w") as f:
            f.write(json.dumps(entry) + "\n")

        with patch.dict(os.environ, {"FITNESS_STORAGE_PATH": str(tmp_path)}):
            response = FitnessOrchestratorService.get_fitness_trend(
                project_name="test-project",
                rule_id="rule-a",
            )

            assert len(response.data_points) == 1
            assert response.data_points[0].errors == 1
            assert response.data_points[0].warnings == 0

    def test_get_fitness_trend_with_limit(self, tmp_path):
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()
        history_file = project_dir / "fitness_history.jsonl"

        for i in range(20):
            entry = {
                "passed": True,
                "timestamp": f"2024-01-{i + 1:02d}T00:00:00Z",
                "total_rules": 1,
                "violations": [],
                "errors": 0,
                "warnings": 0,
                "infos": 0,
                "summary": "Pass",
            }
            with open(history_file, "a") as f:
                f.write(json.dumps(entry) + "\n")

        with patch.dict(os.environ, {"FITNESS_STORAGE_PATH": str(tmp_path)}):
            response = FitnessOrchestratorService.get_fitness_trend(
                project_name="test-project",
                limit=5,
            )

            assert len(response.data_points) == 5

    def test_get_example_config(self):
        config = FitnessOrchestratorService.get_example_config()

        assert isinstance(config, FitnessRuleConfig)
        assert config.version == "1.0"
        assert len(config.rules) > 0

        rule_types = {r.rule_type for r in config.rules}
        assert "no_circular" in rule_types
        assert "max_coupling" in rule_types

    def test_calculate_trend_summary_empty(self):
        summary = FitnessOrchestratorService._calculate_trend_summary([])

        assert summary["total_validations"] == 0
        assert summary["pass_rate"] == 0

    def test_calculate_trend_summary(self):
        points = [
            FitnessTrendPoint(
                timestamp="2024-01-01T00:00:00Z",
                passed=True,
                errors=0,
                warnings=1,
                infos=0,
                total_violations=1,
            ),
            FitnessTrendPoint(
                timestamp="2024-01-02T00:00:00Z",
                passed=False,
                errors=2,
                warnings=0,
                infos=1,
                total_violations=3,
            ),
        ]

        summary = FitnessOrchestratorService._calculate_trend_summary(points)

        assert summary["total_validations"] == 2
        assert summary["passed"] == 1
        assert summary["failed"] == 1
        assert summary["pass_rate"] == 50.0
        assert summary["avg_errors"] == 1.0
        assert summary["avg_warnings"] == 0.5
