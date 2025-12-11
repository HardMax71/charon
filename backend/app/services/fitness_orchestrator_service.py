import json
import os
from pathlib import Path

from app.core.models import (
    FitnessValidationResult,
    FitnessValidationRequest,
    FitnessRuleConfig,
    FitnessRule,
    FitnessTrendResponse,
    FitnessTrendPoint,
    DependencyGraph,
    GlobalMetrics,
    SaveResultResponse,
)
from app.services import FitnessService


class FitnessOrchestratorService:
    """Orchestrates fitness validation and result storage operations."""

    @staticmethod
    def validate_fitness_functions(
        request: FitnessValidationRequest,
    ) -> FitnessValidationResult:
        """Validate architectural fitness functions against a dependency graph."""
        service = FitnessService(request.graph, request.global_metrics)
        return service.validate_rules(
            rules=request.rules,
            fail_on_error=request.fail_on_error,
            fail_on_warning=request.fail_on_warning,
        )

    @staticmethod
    def validate_from_config(
        graph: DependencyGraph,
        global_metrics: GlobalMetrics,
        config: FitnessRuleConfig,
        fail_on_error: bool = True,
        fail_on_warning: bool = False,
    ) -> FitnessValidationResult:
        """Validate using a fitness rule configuration file."""
        service = FitnessService(graph, global_metrics)
        return service.validate_rules(
            rules=config.rules,
            fail_on_error=fail_on_error,
            fail_on_warning=fail_on_warning,
        )

    @staticmethod
    def save_validation_result(
        project_name: str,
        result: FitnessValidationResult,
    ) -> SaveResultResponse:
        """Save fitness validation result for historical tracking."""
        storage_path = os.getenv("FITNESS_STORAGE_PATH", ".charon_fitness")

        project_dir = Path(storage_path) / project_name
        project_dir.mkdir(parents=True, exist_ok=True)

        history_file = project_dir / "fitness_history.jsonl"

        with open(history_file, "a") as f:
            result_data = result.model_dump()
            f.write(json.dumps(result_data) + "\n")

        return SaveResultResponse(
            success=True,
            message=f"Result saved to {history_file}",
            file_path=str(history_file),
        )

    @staticmethod
    def get_fitness_trend(
        project_name: str,
        rule_id: str | None = None,
        limit: int = 100,
    ) -> FitnessTrendResponse:
        """Get historical fitness trend data for a project."""
        storage_path = os.getenv("FITNESS_STORAGE_PATH", ".charon_fitness")

        project_dir = Path(storage_path) / project_name
        history_file = project_dir / "fitness_history.jsonl"

        if not history_file.exists():
            return FitnessTrendResponse(
                project_name=project_name,
                rule_id=rule_id,
                data_points=[],
                summary={
                    "message": "No historical data found",
                    "total_validations": 0,
                },
            )

        data_points = FitnessOrchestratorService._parse_history_file(
            history_file, rule_id, limit
        )
        summary = FitnessOrchestratorService._calculate_trend_summary(data_points)

        return FitnessTrendResponse(
            project_name=project_name,
            rule_id=rule_id,
            data_points=data_points,
            summary=summary,
        )

    @staticmethod
    def _parse_history_file(
        history_file: Path, rule_id: str | None, limit: int
    ) -> list[FitnessTrendPoint]:
        """Parse history file and extract trend points."""
        data_points = []
        with open(history_file) as f:
            lines = f.readlines()
            for line in lines[-limit:]:
                result = json.loads(line.strip())

                if rule_id:
                    filtered_violations = [
                        v for v in result["violations"] if v["rule_id"] == rule_id
                    ]
                    errors = sum(
                        1 for v in filtered_violations if v["severity"] == "error"
                    )
                    warnings = sum(
                        1 for v in filtered_violations if v["severity"] == "warning"
                    )
                    infos = sum(
                        1 for v in filtered_violations if v["severity"] == "info"
                    )
                else:
                    errors = result["errors"]
                    warnings = result["warnings"]
                    infos = result["infos"]

                data_points.append(
                    FitnessTrendPoint(
                        timestamp=result["timestamp"],
                        passed=result["passed"],
                        errors=errors,
                        warnings=warnings,
                        infos=infos,
                        total_violations=errors + warnings + infos,
                    )
                )

        return data_points

    @staticmethod
    def _calculate_trend_summary(data_points: list[FitnessTrendPoint]) -> dict:
        """Calculate summary statistics for trend data."""
        total_validations = len(data_points)
        if total_validations == 0:
            return {
                "total_validations": 0,
                "passed": 0,
                "failed": 0,
                "pass_rate": 0,
                "avg_errors": 0,
                "avg_warnings": 0,
            }

        passed_count = sum(1 for dp in data_points if dp.passed)
        failed_count = total_validations - passed_count

        avg_errors = sum(dp.errors for dp in data_points) / total_validations
        avg_warnings = sum(dp.warnings for dp in data_points) / total_validations

        return {
            "total_validations": total_validations,
            "passed": passed_count,
            "failed": failed_count,
            "pass_rate": (passed_count / total_validations * 100),
            "avg_errors": round(avg_errors, 2),
            "avg_warnings": round(avg_warnings, 2),
        }

    @staticmethod
    def get_example_config() -> FitnessRuleConfig:
        """Get an example fitness rule configuration."""
        example_rules = [
            FitnessRule(
                id="no-api-to-db",
                name="API Layer Isolation",
                description="API layer modules should not directly import from database layer",
                rule_type="import_restriction",
                severity="error",
                enabled=True,
                parameters={
                    "forbidden_source_pattern": r"/api/",
                    "forbidden_target_pattern": r"/database/",
                    "message_template": "API modules must not import directly from database layer. Use repository pattern.",
                },
            ),
            FitnessRule(
                id="max-efferent-coupling",
                name="Maximum Efferent Coupling",
                description="No module should depend on more than 10 other modules",
                rule_type="max_coupling",
                severity="warning",
                enabled=True,
                parameters={
                    "max_efferent": 10,
                    "module_pattern": r".*",
                },
            ),
            FitnessRule(
                id="no-circular-deps",
                name="No Circular Dependencies",
                description="Circular dependencies are not allowed",
                rule_type="no_circular",
                severity="error",
                enabled=True,
                parameters={},
            ),
            FitnessRule(
                id="third-party-limit",
                name="Third-Party Dependency Limit",
                description="Third-party dependencies should be less than 20% of total",
                rule_type="max_third_party_percent",
                severity="warning",
                enabled=True,
                parameters={
                    "max_percent": 20,
                },
            ),
            FitnessRule(
                id="max-complexity",
                name="Maximum Complexity",
                description="Modules should maintain reasonable complexity",
                rule_type="max_complexity",
                severity="warning",
                enabled=True,
                parameters={
                    "max_cyclomatic": 15,
                    "min_maintainability": 20,
                },
            ),
        ]

        return FitnessRuleConfig(
            version="1.0",
            rules=example_rules,
        )
