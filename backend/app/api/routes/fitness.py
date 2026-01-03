from app.api.routes import ERROR_RESPONSES
from app.core.models import (
    FitnessValidationRequest,
    FitnessValidationResult,
    FitnessRuleConfig,
    FitnessTrendResponse,
    DependencyGraph,
    GlobalMetrics,
    SaveResultResponse,
    SafeProjectName,
)
from app.services import FitnessOrchestratorService
from fastapi import APIRouter

router = APIRouter()


@router.post(
    "/fitness/validate",
    response_model=FitnessValidationResult,
    responses=ERROR_RESPONSES,
)
async def validate_fitness_functions(
    request: FitnessValidationRequest,
) -> FitnessValidationResult:
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
    return FitnessOrchestratorService.validate_fitness_functions(request)


@router.post(
    "/fitness/validate-from-config",
    response_model=FitnessValidationResult,
    responses=ERROR_RESPONSES,
)
async def validate_from_config(
    graph: DependencyGraph,
    global_metrics: GlobalMetrics,
    config: FitnessRuleConfig,
    fail_on_error: bool = True,
    fail_on_warning: bool = False,
) -> FitnessValidationResult:
    """Validate using a fitness rule configuration file.

    This endpoint accepts a FitnessRuleConfig object instead of individual rules,
    making it easier to maintain rules in a version-controlled configuration file.
    """
    return FitnessOrchestratorService.validate_from_config(
        graph, global_metrics, config, fail_on_error, fail_on_warning
    )


@router.post(
    "/fitness/save-result",
    response_model=SaveResultResponse,
    responses=ERROR_RESPONSES,
)
async def save_validation_result(
    project_name: SafeProjectName,
    result: FitnessValidationResult,
) -> SaveResultResponse:
    """Save fitness validation result for historical tracking.

    Results are saved to a JSON file in the format:
    {FITNESS_STORAGE_PATH}/{project_name}/fitness_history.jsonl

    Each validation result is appended as a new line to enable trend analysis.
    Storage path is configured via FITNESS_STORAGE_PATH environment variable.
    """
    return FitnessOrchestratorService.save_validation_result(project_name, result)


@router.get(
    "/fitness/trend/{project_name}",
    response_model=FitnessTrendResponse,
    responses=ERROR_RESPONSES,
)
async def get_fitness_trend(
    project_name: SafeProjectName,
    rule_id: str | None = None,
    limit: int = 100,
) -> FitnessTrendResponse:
    """Get historical fitness trend data for a project.

    Returns a time series of validation results, optionally filtered by rule_id.
    Useful for tracking architectural health over time and identifying regressions.
    Storage path is configured via FITNESS_STORAGE_PATH environment variable.
    """
    return FitnessOrchestratorService.get_fitness_trend(project_name, rule_id, limit)


@router.get(
    "/fitness/config/example",
    response_model=FitnessRuleConfig,
    responses=ERROR_RESPONSES,
)
async def get_example_config() -> FitnessRuleConfig:
    """Get an example fitness rule configuration.

    This returns a sample configuration demonstrating all supported rule types.
    Use this as a starting point for creating your own fitness rules.
    """
    return FitnessOrchestratorService.get_example_config()
