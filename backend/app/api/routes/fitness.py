"""Fitness function API routes."""

import json
import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from datetime import datetime

from app.core.models import (
    FitnessValidationRequest,
    FitnessValidationResult,
    FitnessRuleConfig,
    FitnessTrendResponse,
    FitnessTrendPoint,
)
from app.services.fitness_service import FitnessService

router = APIRouter()


@router.post("/fitness/validate", response_model=FitnessValidationResult)
async def validate_fitness_functions(request: FitnessValidationRequest):
    """Validate architectural fitness functions against a dependency graph.

    This endpoint evaluates a set of architectural rules against the provided
    dependency graph and returns a detailed validation report.

    The validation can be configured to fail on errors, warnings, or both.
    This is useful for CI/CD integration where you want to fail builds based
    on architectural rule violations.

    Example rules:
    - No modules in /api may import from /database directly
    - Maximum efferent coupling: 10
    - No circular dependencies allowed
    - Third-party dependencies must be < 20% of total imports
    """
    try:
        service = FitnessService(request.graph, request.global_metrics)
        result = service.validate_rules(
            rules=request.rules,
            fail_on_error=request.fail_on_error,
            fail_on_warning=request.fail_on_warning,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/fitness/validate-from-config", response_model=FitnessValidationResult)
async def validate_from_config(
    graph_data: dict,
    global_metrics: dict,
    config: FitnessRuleConfig,
    fail_on_error: bool = True,
    fail_on_warning: bool = False,
):
    """Validate using a fitness rule configuration file.

    This endpoint accepts a FitnessRuleConfig object instead of individual rules,
    making it easier to maintain rules in a version-controlled configuration file.
    """
    from app.core.models import DependencyGraph, GlobalMetrics

    try:
        graph = DependencyGraph(**graph_data)
        metrics = GlobalMetrics(**global_metrics)

        service = FitnessService(graph, metrics)
        result = service.validate_rules(
            rules=config.rules,
            fail_on_error=fail_on_error,
            fail_on_warning=fail_on_warning,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/fitness/save-result")
async def save_validation_result(
    project_name: str,
    result: FitnessValidationResult,
    storage_path: Optional[str] = None,
):
    """Save fitness validation result for historical tracking.

    Results are saved to a JSON file in the format:
    {storage_path}/{project_name}/fitness_history.jsonl

    Each validation result is appended as a new line to enable trend analysis.
    """
    try:
        if storage_path is None:
            storage_path = os.getenv("FITNESS_STORAGE_PATH", ".charon_fitness")

        project_dir = Path(storage_path) / project_name
        project_dir.mkdir(parents=True, exist_ok=True)

        history_file = project_dir / "fitness_history.jsonl"

        # Append result as JSON line
        with open(history_file, "a") as f:
            result_data = result.model_dump()
            f.write(json.dumps(result_data) + "\n")

        return {
            "success": True,
            "message": f"Result saved to {history_file}",
            "file_path": str(history_file),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save result: {str(e)}")


@router.get("/fitness/trend/{project_name}", response_model=FitnessTrendResponse)
async def get_fitness_trend(
    project_name: str,
    rule_id: Optional[str] = None,
    storage_path: Optional[str] = None,
    limit: int = 100,
):
    """Get historical fitness trend data for a project.

    Returns a time series of validation results, optionally filtered by rule_id.
    Useful for tracking architectural health over time and identifying regressions.
    """
    try:
        if storage_path is None:
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

        # Read and parse history
        data_points = []
        with open(history_file, "r") as f:
            lines = f.readlines()
            # Get last N lines
            for line in lines[-limit:]:
                result = json.loads(line.strip())

                # Filter by rule_id if specified
                if rule_id:
                    filtered_violations = [
                        v for v in result["violations"] if v["rule_id"] == rule_id
                    ]
                    errors = sum(1 for v in filtered_violations if v["severity"] == "error")
                    warnings = sum(1 for v in filtered_violations if v["severity"] == "warning")
                    infos = sum(1 for v in filtered_violations if v["severity"] == "info")
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

        # Calculate summary statistics
        total_validations = len(data_points)
        passed_count = sum(1 for dp in data_points if dp.passed)
        failed_count = total_validations - passed_count

        avg_errors = sum(dp.errors for dp in data_points) / total_validations if total_validations > 0 else 0
        avg_warnings = sum(dp.warnings for dp in data_points) / total_validations if total_validations > 0 else 0

        summary = {
            "total_validations": total_validations,
            "passed": passed_count,
            "failed": failed_count,
            "pass_rate": (passed_count / total_validations * 100) if total_validations > 0 else 0,
            "avg_errors": round(avg_errors, 2),
            "avg_warnings": round(avg_warnings, 2),
        }

        return FitnessTrendResponse(
            project_name=project_name,
            rule_id=rule_id,
            data_points=data_points,
            summary=summary,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trend data: {str(e)}")


@router.get("/fitness/config/example", response_model=FitnessRuleConfig)
async def get_example_config():
    """Get an example fitness rule configuration.

    This returns a sample configuration demonstrating all supported rule types.
    Use this as a starting point for creating your own fitness rules.
    """
    from app.core.models import FitnessRule

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
