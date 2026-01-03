import pytest
from app.core.models import (
    DependencyGraph,
    GlobalMetrics,
    Node,
    Edge,
    NodeMetrics,
    Position3D,
    FitnessRule,
    CircularDependency,
)
from app.services import FitnessService


@pytest.fixture
def sample_graph():
    nodes = [
        Node(
            id="app.api.users",
            label="users.py",
            type="internal",
            module="app.api",
            position=Position3D(x=0, y=0, z=0),
            color="#ff0000",
            metrics=NodeMetrics(
                afferent_coupling=2,
                efferent_coupling=3,
                instability=0.6,
                cyclomatic_complexity=5,
                maintainability_index=80,
            ),
        ),
        Node(
            id="app.services.user_service",
            label="user_service.py",
            type="internal",
            module="app.services",
            position=Position3D(x=1, y=1, z=1),
            color="#00ff00",
            metrics=NodeMetrics(
                afferent_coupling=3,
                efferent_coupling=2,
                instability=0.4,
                cyclomatic_complexity=5,
                maintainability_index=80,
            ),
        ),
        Node(
            id="app.database.user_model",
            label="user_model.py",
            type="internal",
            module="app.database",
            position=Position3D(x=2, y=2, z=2),
            color="#0000ff",
            metrics=NodeMetrics(
                afferent_coupling=5,
                efferent_coupling=0,
                instability=0.0,
                cyclomatic_complexity=5,
                maintainability_index=80,
            ),
        ),
        Node(
            id="requests",
            label="requests",
            type="third_party",
            module="requests",
            position=Position3D(x=3, y=3, z=3),
            color="#ffff00",
            metrics=NodeMetrics(
                afferent_coupling=10,
                efferent_coupling=0,
                instability=0.0,
            ),
        ),
    ]

    edges = [
        Edge(
            id="edge1",
            source="app.api.users",
            target="app.services.user_service",
            imports=["get_user", "create_user"],
            weight=2,
            thickness=1.0,
        ),
        Edge(
            id="edge2",
            source="app.services.user_service",
            target="app.database.user_model",
            imports=["User"],
            weight=1,
            thickness=0.5,
        ),
        Edge(
            id="edge3",
            source="app.api.users",
            target="requests",
            imports=["get", "post"],
            weight=2,
            thickness=1.0,
        ),
    ]

    return DependencyGraph(nodes=nodes, edges=edges)


@pytest.fixture
def sample_metrics():
    """Create sample global metrics."""
    return GlobalMetrics(
        total_files=4,
        total_internal=3,
        total_third_party=1,
        avg_afferent_coupling=5.0,
        avg_efferent_coupling=1.67,
        circular_dependencies=[],
        high_coupling_files=[],
        coupling_threshold=3.0,
    )


def test_import_restriction_violation(sample_graph, sample_metrics):
    """Test import restriction rule detects violations."""
    rule = FitnessRule(
        id="no-api-to-db",
        name="API Layer Isolation",
        description="API should not import from database",
        rule_type="import_restriction",
        severity="error",
        enabled=True,
        parameters={
            "forbidden_source_pattern": r"app\.api",
            "forbidden_target_pattern": r"app\.database",
        },
    )

    # Add a violating edge
    sample_graph.edges.append(
        Edge(
            id="violation",
            source="app.api.users",
            target="app.database.user_model",
            imports=["User"],
            weight=1,
            thickness=0.5,
        )
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_import_restriction(rule)

    assert len(violations) == 1
    assert violations[0].severity == "error"
    assert "app.api.users" in violations[0].affected_modules
    assert "app.database.user_model" in violations[0].affected_modules


def test_import_restriction_no_violation(sample_graph, sample_metrics):
    """Test import restriction rule passes when no violations."""
    rule = FitnessRule(
        id="no-api-to-db",
        name="API Layer Isolation",
        description="API should not import from database",
        rule_type="import_restriction",
        severity="error",
        enabled=True,
        parameters={
            "forbidden_source_pattern": r"app\.api",
            "forbidden_target_pattern": r"app\.database",
        },
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_import_restriction(rule)

    assert len(violations) == 0


def test_max_coupling_violation(sample_graph, sample_metrics):
    """Test max coupling rule detects violations."""
    rule = FitnessRule(
        id="max-coupling",
        name="Maximum Coupling",
        description="Max efferent coupling of 2",
        rule_type="max_coupling",
        severity="warning",
        enabled=True,
        parameters={
            "max_efferent": 2,
        },
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_max_coupling(rule)

    # app.api.users has efferent coupling of 3, should violate
    assert len(violations) == 1
    assert violations[0].severity == "warning"
    assert "app.api.users" in violations[0].affected_modules


def test_max_total_coupling_violation(sample_graph, sample_metrics):
    """Test max total coupling rule."""
    rule = FitnessRule(
        id="max-total-coupling",
        name="Maximum Total Coupling",
        description="Max total coupling of 4",
        rule_type="max_coupling",
        severity="error",
        enabled=True,
        parameters={
            "max_total": 4,
        },
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_max_coupling(rule)

    # app.api.users: 2 + 3 = 5, violates
    # app.services.user_service: 3 + 2 = 5, violates
    # app.database.user_model: 5 + 0 = 5, violates
    assert len(violations) == 3


def test_no_circular_dependencies_pass(sample_graph, sample_metrics):
    """Test no circular dependencies rule passes when none exist."""
    rule = FitnessRule(
        id="no-circular",
        name="No Circular Dependencies",
        description="No circular deps allowed",
        rule_type="no_circular",
        severity="error",
        enabled=True,
        parameters={},
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_no_circular(rule)

    assert len(violations) == 0


def test_no_circular_dependencies_violation(sample_graph, sample_metrics):
    """Test no circular dependencies rule detects cycles."""
    # Add circular dependency
    sample_metrics.circular_dependencies = [
        CircularDependency(
            cycle=["app.api.users", "app.services.user_service", "app.api.users"]
        )
    ]

    rule = FitnessRule(
        id="no-circular",
        name="No Circular Dependencies",
        description="No circular deps allowed",
        rule_type="no_circular",
        severity="error",
        enabled=True,
        parameters={},
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_no_circular(rule)

    assert len(violations) == 1
    assert violations[0].severity == "error"
    assert len(violations[0].affected_modules) == 3


def test_max_third_party_percent_pass(sample_graph, sample_metrics):
    """Test third-party percentage rule passes."""
    rule = FitnessRule(
        id="third-party-limit",
        name="Third-Party Limit",
        description="Max 30% third-party",
        rule_type="max_third_party_percent",
        severity="warning",
        enabled=True,
        parameters={
            "max_percent": 30,
        },
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_max_third_party_percent(rule)

    # 1/4 = 25%, should pass
    assert len(violations) == 0


def test_max_third_party_percent_violation(sample_graph, sample_metrics):
    """Test third-party percentage rule detects violations."""
    rule = FitnessRule(
        id="third-party-limit",
        name="Third-Party Limit",
        description="Max 20% third-party",
        rule_type="max_third_party_percent",
        severity="warning",
        enabled=True,
        parameters={
            "max_percent": 20,
        },
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_max_third_party_percent(rule)

    # 1/4 = 25%, should violate 20% limit
    assert len(violations) == 1
    assert violations[0].severity == "warning"


def test_max_complexity_violation(sample_graph, sample_metrics):
    """Test max complexity rule detects violations."""
    # Set complexity on a node
    sample_graph.nodes[0].metrics.cyclomatic_complexity = 20.0
    sample_graph.nodes[0].metrics.maintainability_index = 15.0

    rule = FitnessRule(
        id="max-complexity",
        name="Maximum Complexity",
        description="Max complexity 15",
        rule_type="max_complexity",
        severity="warning",
        enabled=True,
        parameters={
            "max_cyclomatic": 15,
            "min_maintainability": 20,
        },
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_max_complexity(rule)

    # Should violate both complexity and maintainability
    assert len(violations) == 1
    assert "cyclomatic complexity" in violations[0].message.lower()
    assert "maintainability" in violations[0].message.lower()


def test_validate_rules_all_pass(sample_graph, sample_metrics):
    """Test validation with all rules passing."""
    rules = [
        FitnessRule(
            id="no-circular",
            name="No Circular Dependencies",
            description="No circular deps",
            rule_type="no_circular",
            severity="error",
            enabled=True,
            parameters={},
        ),
        FitnessRule(
            id="third-party-limit",
            name="Third-Party Limit",
            description="Max 30% third-party",
            rule_type="max_third_party_percent",
            severity="warning",
            enabled=True,
            parameters={"max_percent": 30},
        ),
    ]

    service = FitnessService(sample_graph, sample_metrics)
    result = service.validate_rules(rules, fail_on_error=True)

    assert result.passed is True
    assert result.total_rules == 2
    assert len(result.violations) == 0
    assert result.errors == 0
    assert result.warnings == 0


def test_validate_rules_with_violations(sample_graph, sample_metrics):
    """Test validation with violations."""
    rules = [
        FitnessRule(
            id="max-coupling",
            name="Maximum Coupling",
            description="Max efferent coupling of 2",
            rule_type="max_coupling",
            severity="error",
            enabled=True,
            parameters={"max_efferent": 2},
        ),
    ]

    service = FitnessService(sample_graph, sample_metrics)
    result = service.validate_rules(rules, fail_on_error=True)

    assert result.passed is False
    assert result.total_rules == 1
    assert len(result.violations) > 0
    assert result.errors > 0


def test_validate_rules_disabled_rule(sample_graph, sample_metrics):
    """Test that disabled rules are not evaluated."""
    rules = [
        FitnessRule(
            id="max-coupling",
            name="Maximum Coupling",
            description="Max efferent coupling of 2",
            rule_type="max_coupling",
            severity="error",
            enabled=False,  # Disabled
            parameters={"max_efferent": 2},
        ),
    ]

    service = FitnessService(sample_graph, sample_metrics)
    result = service.validate_rules(rules, fail_on_error=True)

    assert result.passed is True
    assert result.total_rules == 0
    assert len(result.violations) == 0


def test_validate_rules_fail_on_warning(sample_graph, sample_metrics):
    """Test fail_on_warning parameter."""
    rules = [
        FitnessRule(
            id="third-party-limit",
            name="Third-Party Limit",
            description="Max 20% third-party",
            rule_type="max_third_party_percent",
            severity="warning",
            enabled=True,
            parameters={"max_percent": 20},
        ),
    ]

    service = FitnessService(sample_graph, sample_metrics)

    # Should pass if not failing on warnings
    result1 = service.validate_rules(rules, fail_on_error=True, fail_on_warning=False)
    assert result1.passed is True

    # Should fail if failing on warnings
    result2 = service.validate_rules(rules, fail_on_error=True, fail_on_warning=True)
    assert result2.passed is False


def test_module_pattern_filtering(sample_graph, sample_metrics):
    """Test that module_pattern filters correctly."""
    rule = FitnessRule(
        id="api-max-coupling",
        name="API Max Coupling",
        description="API modules max coupling 2",
        rule_type="max_coupling",
        severity="error",
        enabled=True,
        parameters={
            "max_efferent": 2,
            "module_pattern": r"app\.api",
        },
    )

    service = FitnessService(sample_graph, sample_metrics)
    violations = service._evaluate_max_coupling(rule)

    # Should only check app.api.users, not others
    assert len(violations) == 1
    assert "app.api.users" in violations[0].affected_modules


def test_summary_generation(sample_graph, sample_metrics):
    """Test that summary is generated correctly."""
    rules = [
        FitnessRule(
            id="max-coupling",
            name="Maximum Coupling",
            description="Max coupling",
            rule_type="max_coupling",
            severity="error",
            enabled=True,
            parameters={"max_efferent": 2},
        ),
    ]

    service = FitnessService(sample_graph, sample_metrics)
    result = service.validate_rules(rules)

    assert "FAILED" in result.summary or "error" in result.summary.lower()
    assert result.errors > 0
