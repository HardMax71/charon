import networkx as nx
from typing import Dict, List, Any
from collections import defaultdict


class RefactoringService:
    """Analyzes code structure and suggests refactoring opportunities."""

    def __init__(self, graph: nx.DiGraph):
        """
        Initialize the refactoring service.

        Args:
            graph: NetworkX directed graph with node attributes
        """
        self.graph = graph

    def analyze_refactoring_opportunities(self) -> List[Dict[str, Any]]:
        """
        Analyze the graph and generate refactoring suggestions.

        Returns:
            List of refactoring suggestions with severity, pattern, and recommendations
        """
        suggestions = []

        # Only analyze internal nodes
        internal_nodes = [
            n for n in self.graph.nodes
            if self.graph.nodes[n].get("type") == "internal"
        ]

        # Detect various anti-patterns
        suggestions.extend(self._detect_god_objects(internal_nodes))
        suggestions.extend(self._detect_feature_envy(internal_nodes))
        suggestions.extend(self._detect_inappropriate_intimacy(internal_nodes))
        suggestions.extend(self._detect_unused_modules(internal_nodes))
        suggestions.extend(self._detect_hub_modules(internal_nodes))
        suggestions.extend(self._suggest_circular_dependency_fixes())
        suggestions.extend(self._detect_unstable_dependencies(internal_nodes))

        # Sort by severity
        severity_order = {"critical": 0, "warning": 1, "info": 2}
        suggestions.sort(key=lambda x: (severity_order.get(x["severity"], 3), x["module"]))

        return suggestions

    def _detect_god_objects(self, internal_nodes: List[str]) -> List[Dict[str, Any]]:
        """
        Detect God Objects - modules with excessive dependencies.

        A God Object has:
        - Very high efferent coupling (many outgoing dependencies)
        - Likely violates Single Responsibility Principle
        """
        suggestions = []

        for node in internal_nodes:
            efferent = self.graph.out_degree(node)

            # Threshold for God Object: 15+ dependencies
            if efferent >= 15:
                afferent = self.graph.in_degree(node)

                # Get list of dependencies
                dependencies = list(self.graph.successors(node))
                dep_modules = set()
                for dep in dependencies[:10]:  # Show first 10
                    module = self.graph.nodes[dep].get("module", "")
                    if module:
                        dep_modules.add(module)

                suggestions.append({
                    "module": node,
                    "severity": "critical" if efferent >= 25 else "warning",
                    "pattern": "God Object",
                    "description": f"Module has {efferent} dependencies, violating Single Responsibility Principle.",
                    "metrics": {
                        "efferent_coupling": efferent,
                        "afferent_coupling": afferent,
                        "total_coupling": efferent + afferent
                    },
                    "recommendation": "Consider applying the Facade pattern or splitting into smaller, focused modules.",
                    "details": f"High efferent coupling ({efferent} dependencies) suggests this module is doing too much. "
                              f"Consider:\n"
                              f"1. Apply Facade Pattern - Create a simplified interface to group related dependencies\n"
                              f"2. Split Module - Extract distinct responsibilities into separate modules\n"
                              f"3. Dependency Injection - Use DI to reduce direct dependencies\n"
                              f"Affected modules: {', '.join(list(dep_modules)[:5])}{'...' if len(dep_modules) > 5 else ''}",
                    "suggested_refactoring": "Facade Pattern + Module Split"
                })

        return suggestions

    def _detect_feature_envy(self, internal_nodes: List[str]) -> List[Dict[str, Any]]:
        """
        Detect Feature Envy - modules that heavily depend on a specific other module.

        Feature Envy occurs when a module uses another module's functionality
        more than its own, suggesting the code might belong in the other module.
        """
        suggestions = []

        for node in internal_nodes:
            successors = list(self.graph.successors(node))
            if len(successors) < 3:
                continue

            # Count dependencies per module
            module_deps = defaultdict(int)
            for dep in successors:
                dep_module = self.graph.nodes[dep].get("module", "")
                if dep_module:
                    module_deps[dep_module] += 1

            # Check if one module dominates (>50% of dependencies)
            total_deps = len(successors)
            for module, count in module_deps.items():
                ratio = count / total_deps

                if ratio >= 0.5 and count >= 5:
                    suggestions.append({
                        "module": node,
                        "severity": "warning",
                        "pattern": "Feature Envy",
                        "description": f"Module heavily depends on '{module}' ({count}/{total_deps} dependencies, {ratio*100:.1f}%).",
                        "metrics": {
                            "target_module": module,
                            "dependency_ratio": ratio,
                            "dependency_count": count,
                            "total_dependencies": total_deps
                        },
                        "recommendation": "Consider moving functionality to the target module or creating a new module.",
                        "details": f"This module uses '{module}' extensively. Consider:\n"
                                  f"1. Move Method - Relocate methods that primarily use '{module}' data\n"
                                  f"2. Extract Class - Create a new class/module that bridges both\n"
                                  f"3. Introduce Parameter Object - Encapsulate frequently passed data\n"
                                  f"Dependency ratio: {ratio*100:.1f}% ({count} out of {total_deps} imports)",
                        "suggested_refactoring": "Move Method / Extract Class"
                    })

        return suggestions

    def _detect_inappropriate_intimacy(self, internal_nodes: List[str]) -> List[Dict[str, Any]]:
        """
        Detect Inappropriate Intimacy - bidirectional dependencies between modules.

        This violates the Acyclic Dependencies Principle and creates tight coupling.
        """
        suggestions = []
        seen_pairs = set()

        for node in internal_nodes:
            for successor in self.graph.successors(node):
                # Check if there's a back-edge
                if self.graph.has_edge(successor, node):
                    # Avoid duplicate suggestions
                    pair = tuple(sorted([node, successor]))
                    if pair in seen_pairs:
                        continue
                    seen_pairs.add(pair)

                    # Get edge weights if available
                    edge1_data = self.graph[node][successor]
                    edge2_data = self.graph[successor][node]

                    suggestions.append({
                        "module": node,
                        "severity": "critical",
                        "pattern": "Inappropriate Intimacy",
                        "description": f"Bidirectional dependency with '{successor}'.",
                        "metrics": {
                            "coupled_module": successor,
                            "forward_imports": len(edge1_data.get("imports", [])),
                            "backward_imports": len(edge2_data.get("imports", []))
                        },
                        "recommendation": "Break the circular dependency by extracting a common interface or using Dependency Inversion.",
                        "details": f"Modules '{node}' and '{successor}' depend on each other, creating tight coupling. Consider:\n"
                                  f"1. Extract Interface - Create a common interface that both can depend on\n"
                                  f"2. Dependency Inversion - Introduce abstractions to break the cycle\n"
                                  f"3. Merge Modules - If truly inseparable, consider merging\n"
                                  f"4. Move Method - Relocate functionality to break the dependency\n"
                                  f"Forward imports: {len(edge1_data.get('imports', []))}, "
                                  f"Backward imports: {len(edge2_data.get('imports', []))}",
                        "suggested_refactoring": "Extract Interface + Dependency Inversion"
                    })

        return suggestions

    def _detect_unused_modules(self, internal_nodes: List[str]) -> List[Dict[str, Any]]:
        """
        Detect unused or dead code - internal modules with no incoming dependencies.
        """
        suggestions = []

        for node in internal_nodes:
            in_degree = self.graph.in_degree(node)
            out_degree = self.graph.out_degree(node)

            # Module with no incoming dependencies might be dead code
            # Exception: entry points (modules with no dependencies at all or high out_degree)
            if in_degree == 0 and out_degree > 0:
                suggestions.append({
                    "module": node,
                    "severity": "info",
                    "pattern": "Potential Dead Code",
                    "description": f"Module has no incoming dependencies but {out_degree} outgoing dependencies.",
                    "metrics": {
                        "afferent_coupling": in_degree,
                        "efferent_coupling": out_degree
                    },
                    "recommendation": "Verify if this is an entry point or unused code that can be removed.",
                    "details": f"This module is not imported by any other internal module. Consider:\n"
                              f"1. If Entry Point - Mark it clearly as an application entry point\n"
                              f"2. If Unused - Remove the module to reduce code clutter\n"
                              f"3. If API - Document as public API endpoint\n"
                              f"Outgoing dependencies: {out_degree}",
                    "suggested_refactoring": "Verify Usage / Remove Dead Code"
                })

        return suggestions

    def _detect_hub_modules(self, internal_nodes: List[str]) -> List[Dict[str, Any]]:
        """
        Detect Hub Modules - modules with very high afferent coupling.

        High afferent coupling means many modules depend on this one,
        making it a critical stability point.
        """
        suggestions = []

        for node in internal_nodes:
            afferent = self.graph.in_degree(node)
            efferent = self.graph.out_degree(node)

            # Threshold for hub: 10+ incoming dependencies
            if afferent >= 10:
                # Calculate instability: I = efferent / (afferent + efferent)
                total = afferent + efferent
                instability = efferent / total if total > 0 else 0

                # Get dependents
                dependents = list(self.graph.predecessors(node))
                dependent_modules = set()
                for dep in dependents[:10]:
                    module = self.graph.nodes[dep].get("module", "")
                    if module:
                        dependent_modules.add(module)

                severity = "warning" if afferent >= 15 else "info"

                suggestions.append({
                    "module": node,
                    "severity": severity,
                    "pattern": "Hub Module",
                    "description": f"Module is heavily depended upon by {afferent} other modules.",
                    "metrics": {
                        "afferent_coupling": afferent,
                        "efferent_coupling": efferent,
                        "instability": instability,
                        "abstractness_needed": 1 - instability  # Stable modules should be abstract
                    },
                    "recommendation": "Ensure module is stable and well-tested. Consider applying Stable Dependencies Principle.",
                    "details": f"This hub module is critical to the system ({afferent} dependents). Consider:\n"
                              f"1. Stability - Ensure comprehensive test coverage (critical path)\n"
                              f"2. Interface Segregation - Split into smaller, focused interfaces\n"
                              f"3. Stable Abstractions - High stability should pair with high abstractness\n"
                              f"4. API Versioning - Implement versioning for breaking changes\n"
                              f"Instability: {instability:.2f} (lower is more stable)\n"
                              f"Dependent modules: {', '.join(list(dependent_modules)[:5])}{'...' if len(dependent_modules) > 5 else ''}",
                    "suggested_refactoring": "Interface Segregation + Stability Hardening"
                })

        return suggestions

    def _suggest_circular_dependency_fixes(self) -> List[Dict[str, Any]]:
        """
        Suggest fixes for circular dependencies already detected.
        """
        suggestions = []

        # Find all cycles
        try:
            cycles = list(nx.simple_cycles(self.graph))
        except:
            cycles = []

        # Filter to internal-only cycles
        internal_cycles = []
        for cycle in cycles:
            if all(self.graph.nodes[n].get("type") == "internal" for n in cycle):
                internal_cycles.append(cycle)

        # Only report cycles of reasonable size (2-5 modules)
        for cycle in internal_cycles:
            if 2 <= len(cycle) <= 5:
                cycle_str = " → ".join(cycle) + f" → {cycle[0]}"

                suggestions.append({
                    "module": cycle[0],
                    "severity": "critical",
                    "pattern": "Circular Dependency",
                    "description": f"Circular dependency detected involving {len(cycle)} modules.",
                    "metrics": {
                        "cycle_length": len(cycle),
                        "modules_in_cycle": cycle
                    },
                    "recommendation": "Break the cycle by extracting a common interface or inverting dependencies.",
                    "details": f"Circular dependency cycle: {cycle_str}\n\n"
                              f"Refactoring strategies:\n"
                              f"1. Extract Interface - Create common abstractions (e.g., create module C with interfaces A and B depend on)\n"
                              f"2. Dependency Inversion Principle - Depend on abstractions, not concretions\n"
                              f"3. Move Method - Relocate functionality to break the cycle\n"
                              f"4. Introduce Mediator - Create a mediator object to coordinate\n"
                              f"Example: If A imports B and B imports A, extract shared code into C, then A→C and B→C",
                    "suggested_refactoring": "Extract Interface + Dependency Inversion"
                })

        return suggestions

    def _detect_unstable_dependencies(self, internal_nodes: List[str]) -> List[Dict[str, Any]]:
        """
        Detect violations of Stable Dependencies Principle.

        A module should only depend on modules more stable than itself.
        Instability I = efferent / (afferent + efferent)
        """
        suggestions = []

        # Calculate instability for all nodes
        instability = {}
        for node in internal_nodes:
            afferent = self.graph.in_degree(node)
            efferent = self.graph.out_degree(node)
            total = afferent + efferent
            instability[node] = efferent / total if total > 0 else 0

        # Check if stable modules depend on unstable ones
        for node in internal_nodes:
            node_instability = instability[node]

            # Only check stable modules (instability < 0.5)
            if node_instability >= 0.5:
                continue

            # Check dependencies
            violations = []
            for successor in self.graph.successors(node):
                if successor in instability:
                    dep_instability = instability[successor]

                    # Violation: stable depends on unstable
                    if dep_instability > node_instability + 0.3:  # Significant difference
                        violations.append((successor, dep_instability))

            if violations:
                violations.sort(key=lambda x: x[1], reverse=True)
                worst_dep, worst_instability = violations[0]

                suggestions.append({
                    "module": node,
                    "severity": "warning",
                    "pattern": "Unstable Dependency",
                    "description": f"Stable module (I={node_instability:.2f}) depends on unstable modules.",
                    "metrics": {
                        "module_instability": node_instability,
                        "worst_dependency": worst_dep,
                        "worst_dependency_instability": worst_instability,
                        "violation_count": len(violations)
                    },
                    "recommendation": "Apply Dependency Inversion - depend on abstractions instead of unstable concretions.",
                    "details": f"This stable module (I={node_instability:.2f}) depends on unstable modules, violating SDP. Consider:\n"
                              f"1. Dependency Inversion - Introduce interfaces/abstractions\n"
                              f"2. Stabilize Dependencies - Reduce coupling of dependent modules\n"
                              f"3. Move Functionality - Relocate code to reduce dependency\n"
                              f"Worst violation: '{worst_dep}' (I={worst_instability:.2f})\n"
                              f"Total violations: {len(violations)}",
                    "suggested_refactoring": "Dependency Inversion Principle"
                })

        return suggestions

    def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics for the analysis."""
        internal_nodes = [
            n for n in self.graph.nodes
            if self.graph.nodes[n].get("type") == "internal"
        ]

        suggestions = self.analyze_refactoring_opportunities()

        # Count by severity
        severity_counts = {"critical": 0, "warning": 0, "info": 0}
        pattern_counts = defaultdict(int)

        for sugg in suggestions:
            severity_counts[sugg["severity"]] = severity_counts.get(sugg["severity"], 0) + 1
            pattern_counts[sugg["pattern"]] += 1

        return {
            "total_suggestions": len(suggestions),
            "by_severity": severity_counts,
            "by_pattern": dict(pattern_counts),
            "modules_analyzed": len(internal_nodes)
        }
