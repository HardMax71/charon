import re
from datetime import datetime
import networkx as nx

from app.core.models import (
    FitnessRule,
    FitnessViolation,
    FitnessValidationResult,
    DependencyGraph,
    GlobalMetrics,
)


class FitnessService:
    """Service for evaluating architectural fitness functions."""

    def __init__(self, graph: DependencyGraph, global_metrics: GlobalMetrics):
        self.graph = graph
        self.global_metrics = global_metrics
        self.nx_graph = self._build_networkx_graph()

    def _build_networkx_graph(self) -> nx.DiGraph:
        """Build NetworkX graph from dependency graph."""
        G = nx.DiGraph()

        # Add nodes
        for node in self.graph.nodes:
            G.add_node(
                node.id,
                label=node.label,
                type=node.type,
                module=node.module,
                metrics=node.metrics.model_dump(),
            )

        # Add edges
        for edge in self.graph.edges:
            G.add_edge(edge.source, edge.target, weight=edge.weight)

        return G

    def validate_rules(
        self,
        rules: list[FitnessRule],
        fail_on_error: bool = True,
        fail_on_warning: bool = False,
    ) -> FitnessValidationResult:
        """Validate all rules and return results."""
        violations = []

        for rule in rules:
            if not rule.enabled:
                continue

            rule_violations = self._evaluate_rule(rule)
            violations.extend(rule_violations)

        # Count violations by severity
        errors = sum(1 for v in violations if v.severity == "error")
        warnings = sum(1 for v in violations if v.severity == "warning")
        infos = sum(1 for v in violations if v.severity == "info")

        # Determine if validation passed
        passed = True
        if fail_on_error and errors > 0:
            passed = False
        if fail_on_warning and warnings > 0:
            passed = False

        # Generate summary
        summary = self._generate_summary(violations, errors, warnings, infos, passed)

        return FitnessValidationResult(
            passed=passed,
            total_rules=len([r for r in rules if r.enabled]),
            violations=violations,
            errors=errors,
            warnings=warnings,
            infos=infos,
            timestamp=datetime.utcnow().isoformat(),
            summary=summary,
        )

    def _evaluate_rule(self, rule: FitnessRule) -> list[FitnessViolation]:
        """Evaluate a single rule."""
        evaluators = {
            "import_restriction": self._evaluate_import_restriction,
            "max_coupling": self._evaluate_max_coupling,
            "no_circular": self._evaluate_no_circular,
            "max_third_party_percent": self._evaluate_max_third_party_percent,
            "max_depth": self._evaluate_max_depth,
            "max_complexity": self._evaluate_max_complexity,
        }

        evaluator = evaluators.get(rule.rule_type)
        if not evaluator:
            return [
                FitnessViolation(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    severity="error",
                    message=f"Unknown rule type: {rule.rule_type}",
                    details={},
                    affected_modules=[],
                )
            ]

        return evaluator(rule)

    def _evaluate_import_restriction(self, rule: FitnessRule) -> list[FitnessViolation]:
        """Evaluate import restriction rules.

        Parameters:
            forbidden_source_pattern: Regex pattern for source modules that shouldn't import
            forbidden_target_pattern: Regex pattern for target modules that shouldn't be imported
            message_template: Optional custom message template
        """
        violations = []
        params = rule.parameters

        source_pattern = params.get("forbidden_source_pattern", "")
        target_pattern = params.get("forbidden_target_pattern", "")

        if not source_pattern or not target_pattern:
            return []

        source_regex = re.compile(source_pattern)
        target_regex = re.compile(target_pattern)

        for edge in self.graph.edges:
            source_match = source_regex.search(edge.source)
            target_match = target_regex.search(edge.target)

            if source_match and target_match:
                message = params.get(
                    "message_template",
                    f"Module '{edge.source}' violates import restriction by importing from '{edge.target}'",
                )

                violations.append(
                    FitnessViolation(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        severity=rule.severity,
                        message=message,
                        details={
                            "source": edge.source,
                            "target": edge.target,
                            "imports": edge.imports,
                        },
                        affected_modules=[edge.source, edge.target],
                    )
                )

        return violations

    def _evaluate_max_coupling(self, rule: FitnessRule) -> list[FitnessViolation]:
        """Evaluate maximum coupling rules.

        Parameters:
            max_efferent: Maximum allowed efferent coupling
            max_afferent: Maximum allowed afferent coupling
            max_total: Maximum allowed total coupling
            module_pattern: Optional regex pattern to filter modules
        """
        violations = []
        params = rule.parameters

        max_efferent = params.get("max_efferent")
        max_afferent = params.get("max_afferent")
        max_total = params.get("max_total")
        module_pattern = params.get("module_pattern", ".*")

        module_regex = re.compile(module_pattern)

        for node in self.graph.nodes:
            if node.type != "internal":
                continue

            if not module_regex.search(node.id):
                continue

            metrics = node.metrics
            violated = False
            reasons = []

            if max_efferent is not None and metrics.efferent_coupling > max_efferent:
                violated = True
                reasons.append(
                    f"Efferent coupling ({metrics.efferent_coupling}) exceeds maximum ({max_efferent})"
                )

            if max_afferent is not None and metrics.afferent_coupling > max_afferent:
                violated = True
                reasons.append(
                    f"Afferent coupling ({metrics.afferent_coupling}) exceeds maximum ({max_afferent})"
                )

            if max_total is not None:
                total = metrics.afferent_coupling + metrics.efferent_coupling
                if total > max_total:
                    violated = True
                    reasons.append(
                        f"Total coupling ({total}) exceeds maximum ({max_total})"
                    )

            if violated:
                violations.append(
                    FitnessViolation(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        severity=rule.severity,
                        message=f"Module '{node.id}' violates coupling constraint: {'; '.join(reasons)}",
                        details={
                            "module": node.id,
                            "afferent_coupling": metrics.afferent_coupling,
                            "efferent_coupling": metrics.efferent_coupling,
                            "total_coupling": metrics.afferent_coupling
                            + metrics.efferent_coupling,
                        },
                        affected_modules=[node.id],
                    )
                )

        return violations

    def _evaluate_no_circular(self, rule: FitnessRule) -> list[FitnessViolation]:
        """Evaluate no circular dependencies rule."""
        violations = []

        circular_deps = self.global_metrics.circular_dependencies

        if circular_deps:
            for cycle_data in circular_deps:
                cycle = cycle_data.cycle
                violations.append(
                    FitnessViolation(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        severity=rule.severity,
                        message=f"Circular dependency detected: {' -> '.join(cycle)} -> {cycle[0]}",
                        details={
                            "cycle": cycle,
                            "cycle_length": len(cycle),
                        },
                        affected_modules=cycle,
                    )
                )

        return violations

    def _evaluate_max_third_party_percent(
        self, rule: FitnessRule
    ) -> list[FitnessViolation]:
        """Evaluate maximum third-party dependency percentage.

        Parameters:
            max_percent: Maximum allowed percentage of third-party dependencies
        """
        violations = []
        params = rule.parameters

        max_percent = params.get("max_percent")
        if max_percent is None:
            return []

        total_files = self.global_metrics.total_files
        third_party_files = self.global_metrics.total_third_party

        if total_files == 0:
            return []

        actual_percent = (third_party_files / total_files) * 100

        if actual_percent > max_percent:
            violations.append(
                FitnessViolation(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    severity=rule.severity,
                    message=f"Third-party dependency percentage ({actual_percent:.1f}%) exceeds maximum ({max_percent}%)",
                    details={
                        "actual_percent": round(actual_percent, 2),
                        "max_percent": max_percent,
                        "third_party_count": third_party_files,
                        "total_count": total_files,
                    },
                    affected_modules=[],
                )
            )

        return violations

    def _evaluate_max_depth(self, rule: FitnessRule) -> list[FitnessViolation]:
        """Evaluate maximum dependency depth/chain length.

        Parameters:
            max_depth: Maximum allowed dependency chain length
        """
        violations = []
        params = rule.parameters

        max_depth = params.get("max_depth")
        if max_depth is None:
            return []

        # Find longest paths in the graph
        internal_nodes = [n.id for n in self.graph.nodes if n.type == "internal"]

        for source in internal_nodes:
            try:
                # Get longest path from this source
                lengths = nx.single_source_shortest_path_length(self.nx_graph, source)
                max_length = max(lengths.values()) if lengths else 0

                if max_length > max_depth:
                    # Find the actual path
                    target = max(lengths, key=lengths.get)
                    path = nx.shortest_path(self.nx_graph, source, target)

                    violations.append(
                        FitnessViolation(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            severity=rule.severity,
                            message=f"Dependency chain depth ({max_length}) exceeds maximum ({max_depth})",
                            details={
                                "depth": max_length,
                                "max_depth": max_depth,
                                "path": path,
                                "source": source,
                                "target": target,
                            },
                            affected_modules=path,
                        )
                    )
            except (nx.NetworkXError, ValueError):
                continue

        return violations

    def _evaluate_max_complexity(self, rule: FitnessRule) -> list[FitnessViolation]:
        """Evaluate maximum complexity rule.

        Parameters:
            max_cyclomatic: Maximum allowed cyclomatic complexity
            max_maintainability_index: Minimum required maintainability index
            module_pattern: Optional regex pattern to filter modules
        """
        violations = []
        params = rule.parameters

        max_cyclomatic = params.get("max_cyclomatic")
        min_maintainability = params.get("min_maintainability")
        module_pattern = params.get("module_pattern", ".*")

        module_regex = re.compile(module_pattern)

        for node in self.graph.nodes:
            if node.type != "internal":
                continue

            if not module_regex.search(node.id):
                continue

            metrics = node.metrics
            violated = False
            reasons = []

            if (
                max_cyclomatic is not None
                and metrics.cyclomatic_complexity > max_cyclomatic
            ):
                violated = True
                reasons.append(
                    f"Cyclomatic complexity ({metrics.cyclomatic_complexity:.1f}) exceeds maximum ({max_cyclomatic})"
                )

            if (
                min_maintainability is not None
                and metrics.maintainability_index < min_maintainability
            ):
                violated = True
                reasons.append(
                    f"Maintainability index ({metrics.maintainability_index:.1f}) below minimum ({min_maintainability})"
                )

            if violated:
                violations.append(
                    FitnessViolation(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        severity=rule.severity,
                        message=f"Module '{node.id}' violates complexity constraint: {'; '.join(reasons)}",
                        details={
                            "module": node.id,
                            "cyclomatic_complexity": metrics.cyclomatic_complexity,
                            "maintainability_index": metrics.maintainability_index,
                            "complexity_grade": metrics.complexity_grade,
                            "maintainability_grade": metrics.maintainability_grade,
                        },
                        affected_modules=[node.id],
                    )
                )

        return violations

    def _generate_summary(
        self,
        violations: list[FitnessViolation],
        errors: int,
        warnings: int,
        infos: int,
        passed: bool,
    ) -> str:
        """Generate a human-readable summary."""
        if passed and not violations:
            return "All architectural fitness rules passed successfully."

        parts = []
        if errors > 0:
            parts.append(f"{errors} error(s)")
        if warnings > 0:
            parts.append(f"{warnings} warning(s)")
        if infos > 0:
            parts.append(f"{infos} info message(s)")

        status = "PASSED" if passed else "FAILED"
        return f"Validation {status}: Found {', '.join(parts)}"
