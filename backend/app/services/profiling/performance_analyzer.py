from datetime import datetime, timezone
from pathlib import Path

from app.core.models import DependencyGraph
from app.core.parsing_models import (
    ModulePerformance,
    PerformanceAnalysisResult,
    PerformanceBottleneck,
    PriorityWeights,
    ProfilerType,
)


class PerformanceAnalyzer:
    """Analyzes performance data in context of dependency graph.

    Implements priority scoring algorithm that combines:
    - Execution time (40%)
    - Coupling (30%)
    - Complexity (15%)
    - Memory usage (10%)
    - Call frequency (5%)

    With boosters for circular dependencies (1.2×) and hot zones (1.3×).
    """

    def __init__(
        self,
        module_performance: dict[str, ModulePerformance],
        dependency_graph: DependencyGraph,
        profiler_type: ProfilerType,
        total_execution_time: float,
        total_samples: int | None = None,
        weights: PriorityWeights | None = None,
    ):
        """Initialize analyzer.

        Args:
            module_performance: Module path -> ModulePerformance mapping
            dependency_graph: Dependency graph with node metrics
            profiler_type: Type of profiler used
            total_execution_time: Total program execution time
            total_samples: Number of samples (for sampling profilers)
            weights: Custom priority weights (uses defaults if None)
        """
        self.module_performance = module_performance
        self.graph = dependency_graph
        self.profiler_type = profiler_type
        self.total_execution_time = total_execution_time
        self.total_samples = total_samples
        self.weights = weights or PriorityWeights()

        # Build filename -> node mapping for matching
        self._build_module_mapping()

    def _build_module_mapping(self):
        """Build mapping from module paths to graph nodes."""
        self.module_to_node = {}
        for node in self.graph.nodes:
            # Match by node.id (which is the module path)
            self.module_to_node[node.id] = node

    def analyze(self) -> PerformanceAnalysisResult:
        """Perform complete performance analysis.

        Returns:
            PerformanceAnalysisResult with bottlenecks and recommendations
        """
        # Detect bottlenecks
        bottlenecks = self._detect_bottlenecks()

        # Calculate priority scores
        bottlenecks = self._calculate_priority_scores(bottlenecks)

        # Sort by priority (highest first)
        bottlenecks.sort(key=lambda b: b.priority_score, reverse=True)

        # Assign ranks
        for rank, bottleneck in enumerate(bottlenecks, start=1):
            bottleneck.priority_rank = rank

        # Generate recommendations
        for bottleneck in bottlenecks:
            bottleneck.recommendation = self._generate_recommendation(bottleneck)

        # Count by severity
        critical_count = sum(1 for b in bottlenecks if b.estimated_impact == "critical")
        high_count = sum(1 for b in bottlenecks if b.estimated_impact == "high")

        return PerformanceAnalysisResult(
            profiler_type=self.profiler_type,
            total_execution_time=self.total_execution_time,
            total_samples=self.total_samples,
            timestamp=datetime.now(timezone.utc).isoformat(),
            module_performance=self.module_performance,
            bottlenecks=bottlenecks,
            total_modules_profiled=len(self.module_performance),
            critical_bottlenecks=critical_count,
            high_bottlenecks=high_count,
            weights_used=self.weights,
        )

    def _detect_bottlenecks(self) -> list[PerformanceBottleneck]:
        """Detect performance bottlenecks.

        Returns:
            List of PerformanceBottleneck objects (unsorted)
        """
        bottlenecks = []

        for module_path, perf in self.module_performance.items():
            # Skip modules with negligible performance impact
            if perf.time_percentage < 0.5:
                continue

            # Try to find matching node in dependency graph
            node = self._find_matching_node(module_path)

            if node:
                # Extract architectural metrics
                coupling_score = (
                    node.metrics.afferent_coupling + node.metrics.efferent_coupling
                )
                complexity_score = node.metrics.cyclomatic_complexity
                is_circular = node.metrics.is_circular
                is_hot_zone = node.metrics.is_hot_zone
            else:
                # No matching node (e.g., third-party library)
                coupling_score = 0
                complexity_score = 0
                is_circular = False
                is_hot_zone = False

            # Determine bottleneck type
            bottleneck_type = self._classify_bottleneck_type(perf)

            # Create bottleneck object (priority_score calculated later)
            bottleneck = PerformanceBottleneck(
                module_path=module_path,
                bottleneck_type=bottleneck_type,
                execution_time=perf.total_execution_time,
                time_percentage=perf.time_percentage,
                memory_usage_mb=perf.total_memory_mb,
                call_count=perf.total_calls,
                coupling_score=coupling_score,
                complexity_score=complexity_score,
                is_circular=is_circular,
                is_hot_zone=is_hot_zone,
                priority_score=0.0,  # Calculated in next step
                priority_rank=1,  # Assigned after sorting
                estimated_impact="medium",  # Updated in next step
                optimization_difficulty="medium",  # Updated in next step
                recommendation="",  # Generated later
                affected_modules=[],  # Calculated from graph
            )

            # Find affected modules (modules that depend on this one)
            if node:
                bottleneck.affected_modules = self._find_affected_modules(node.id)

            bottlenecks.append(bottleneck)

        return bottlenecks

    def _find_matching_node(self, module_path: str):
        """Find node in dependency graph matching module path.

        Args:
            module_path: Module path from profiling data

        Returns:
            Node object or None if not found
        """
        # Try direct match
        if module_path in self.module_to_node:
            return self.module_to_node[module_path]

        # Try fuzzy match (e.g., matching by filename)
        module_filename = Path(module_path).name
        for node_id, node in self.module_to_node.items():
            if Path(node_id).name == module_filename:
                return node

        return None

    def _classify_bottleneck_type(self, perf: ModulePerformance) -> str:
        """Classify bottleneck type based on metrics.

        Args:
            perf: ModulePerformance object

        Returns:
            Bottleneck type: "cpu", "memory", "io", or "combined"
        """
        is_cpu = perf.is_cpu_bottleneck
        is_memory = perf.is_memory_bottleneck
        is_io = perf.is_io_bottleneck

        if sum([is_cpu, is_memory, is_io]) > 1:
            return "combined"
        elif is_cpu:
            return "cpu"
        elif is_memory:
            return "memory"
        elif is_io:
            return "io"
        else:
            return "cpu"  # Default assumption

    def _find_affected_modules(self, node_id: str) -> list[str]:
        """Find modules that depend on the given node.

        Args:
            node_id: Node ID to find dependents for

        Returns:
            List of module paths that depend on this node
        """
        affected = []
        for edge in self.graph.edges:
            if edge.target == node_id:
                affected.append(edge.source)
        return affected

    def _calculate_priority_scores(
        self, bottlenecks: list[PerformanceBottleneck]
    ) -> list[PerformanceBottleneck]:
        """Calculate priority scores for all bottlenecks.

        Implements the weighted priority scoring algorithm:
        priority = (
            0.40 × execution_time_norm +
            0.30 × coupling_norm +
            0.15 × complexity_norm +
            0.10 × memory_norm +
            0.05 × call_frequency_norm
        ) × boosters

        Args:
            bottlenecks: List of bottlenecks to score

        Returns:
            Same list with priority_score, estimated_impact, and difficulty updated
        """
        if not bottlenecks:
            return bottlenecks

        # Find max values for normalization
        max_time = max(b.execution_time for b in bottlenecks)
        max_coupling = max(b.coupling_score for b in bottlenecks) or 1
        max_complexity = max(b.complexity_score for b in bottlenecks) or 1
        max_memory = max(
            (b.memory_usage_mb for b in bottlenecks if b.memory_usage_mb is not None),
            default=1,
        )
        max_calls = max(b.call_count for b in bottlenecks) or 1

        for bottleneck in bottlenecks:
            # Normalize factors to [0, 1]
            time_score = bottleneck.execution_time / max_time if max_time > 0 else 0
            coupling_score = bottleneck.coupling_score / max_coupling
            complexity_score = bottleneck.complexity_score / max_complexity
            memory_score = (
                (bottleneck.memory_usage_mb / max_memory)
                if bottleneck.memory_usage_mb
                else 0
            )
            call_score = bottleneck.call_count / max_calls

            # Calculate weighted priority (0-1 range)
            priority = (
                self.weights.execution_time * time_score
                + self.weights.coupling * coupling_score
                + self.weights.complexity * complexity_score
                + self.weights.memory_usage * memory_score
                + self.weights.call_frequency * call_score
            )

            # Apply boosters
            if bottleneck.is_circular:
                priority *= 1.2
            if bottleneck.is_hot_zone:
                priority *= 1.3

            # Scale to 0-100
            bottleneck.priority_score = min(max(priority * 100, 0), 100)

            # Estimate impact
            bottleneck.estimated_impact = self._estimate_impact(bottleneck)

            # Estimate difficulty
            bottleneck.optimization_difficulty = self._estimate_difficulty(bottleneck)

        return bottlenecks

    def _estimate_impact(self, bottleneck: PerformanceBottleneck) -> str:
        """Estimate optimization impact.

        Args:
            bottleneck: PerformanceBottleneck object

        Returns:
            Impact level: "critical", "high", "medium", or "low"
        """
        # High time percentage = high impact
        if bottleneck.time_percentage >= 20:
            return "critical"
        elif bottleneck.time_percentage >= 10:
            return "high"
        elif bottleneck.time_percentage >= 5:
            return "medium"
        else:
            return "low"

    def _estimate_difficulty(self, bottleneck: PerformanceBottleneck) -> str:
        """Estimate optimization difficulty.

        Args:
            bottleneck: PerformanceBottleneck object

        Returns:
            Difficulty: "easy", "medium", "hard", or "very_hard"
        """
        # High coupling + high complexity = harder to optimize
        difficulty_score = bottleneck.coupling_score + bottleneck.complexity_score

        if bottleneck.is_circular:
            difficulty_score += 10  # Circular deps add significant complexity

        if difficulty_score >= 30:
            return "very_hard"
        elif difficulty_score >= 20:
            return "hard"
        elif difficulty_score >= 10:
            return "medium"
        else:
            return "easy"

    def _generate_recommendation(self, bottleneck: PerformanceBottleneck) -> str:
        """Generate optimization recommendation.

        Args:
            bottleneck: PerformanceBottleneck object

        Returns:
            Recommendation string
        """
        recommendations = []

        # Performance-based recommendations
        if bottleneck.bottleneck_type == "cpu":
            recommendations.append("Optimize CPU-intensive operations")
            if bottleneck.time_percentage >= 15:
                recommendations.append("Consider caching or algorithmic improvements")
        elif bottleneck.bottleneck_type == "memory":
            recommendations.append("Reduce memory allocations")
        elif bottleneck.bottleneck_type == "io":
            recommendations.append("Optimize I/O operations with async or batching")

        # Architectural recommendations
        if bottleneck.is_circular:
            recommendations.append("Break circular dependency first")

        if bottleneck.coupling_score > 15:
            recommendations.append("High coupling - refactor to reduce dependencies")

        if bottleneck.complexity_score > 20:
            recommendations.append("High complexity - simplify logic before optimizing")

        if bottleneck.is_hot_zone:
            recommendations.append(
                "⚠️ HOT ZONE: Both complex and highly coupled - high-risk, high-reward target"
            )

        if not recommendations:
            recommendations.append("Profile deeper to identify specific hotspots")

        return "; ".join(recommendations)
