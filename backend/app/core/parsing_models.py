from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


class ImportInfo(BaseModel):
    """Information about a single import statement.

    Replaces the NamedTuple version with Pydantic for validation.
    """

    module: str = Field(description="The module being imported from")
    names: list[str] = Field(description="The names being imported")
    level: int = Field(ge=0, description="Relative import level (0 for absolute)")
    lineno: int = Field(ge=1, description="Line number in source")

    model_config = ConfigDict(frozen=True)  # Immutable like NamedTuple


class ParseResult(BaseModel):
    """Result from parsing a Python file.

    Replaces tuple[list[ImportInfo], list[str]] with clearer semantics.
    """

    imports: list[ImportInfo] = Field(
        default_factory=list, description="Extracted imports"
    )
    errors: list[str] = Field(default_factory=list, description="Parse errors")

    @property
    def is_valid(self) -> bool:
        """Check if parsing was successful (no errors)."""
        return len(self.errors) == 0

    @property
    def import_count(self) -> int:
        """Get number of imports found."""
        return len(self.imports)


class FunctionComplexity(BaseModel):
    """Complexity metrics for a single function or method."""

    name: str = Field(description="Function/method name")
    complexity: int = Field(ge=0, description="Cyclomatic complexity")
    rank: str = Field(description="Complexity rank (A-F)")
    lineno: int = Field(ge=1, description="Line number")
    col_offset: int = Field(ge=0, description="Column offset")


class ComplexityMetrics(BaseModel):
    """Code complexity metrics for a file.

    Replaces plain dict returns from ComplexityService.
    """

    cyclomatic_complexity: float = Field(
        ge=0, description="Average cyclomatic complexity"
    )
    max_complexity: int = Field(ge=0, description="Highest complexity in file")
    maintainability_index: float = Field(ge=0, le=100, description="MI score (0-100)")
    lines_of_code: int = Field(ge=0, description="Total lines of code")
    logical_lines: int = Field(ge=0, description="Logical lines of code")
    source_lines: int = Field(ge=0, description="Source lines of code")
    comments: int = Field(ge=0, description="Comment lines")
    complexity_grade: str = Field(description="Overall complexity grade (A-F)")
    maintainability_grade: str = Field(description="Maintainability grade (A-F)")
    functions: list[FunctionComplexity] = Field(
        default_factory=list, description="Function-level metrics"
    )
    function_count: int = Field(ge=0, description="Number of functions/methods")
    error: str | None = Field(
        default=None, description="Error message if analysis failed"
    )


class ModuleMetadata(BaseModel):
    """Metadata for a single module (language, service, etc.)."""

    language: str = Field(description="Programming language")
    file_path: str = Field(description="Original file path")
    service: str | None = Field(
        default=None, description="Detected service/package name"
    )
    node_kind: str = Field(
        default="module", description="Node type (module, component, hook, etc.)"
    )


class DependencyAnalysis(BaseModel):
    """Complete dependency analysis result.

    Replaces DependencyData plain class with validated Pydantic model.
    """

    modules: dict[str, str] = Field(
        default_factory=dict, description="Module path -> file content"
    )
    imports: dict[str, list[ImportInfo]] = Field(
        default_factory=dict, description="Module path -> list of imports"
    )
    dependencies: dict[str, set[str]] = Field(
        default_factory=dict, description="From module -> set of to modules"
    )
    import_details: dict[tuple[str, str], list[str]] = Field(
        default_factory=dict, description="(from, to) -> list of imported names"
    )
    complexity: dict[str, ComplexityMetrics] = Field(
        default_factory=dict, description="Module path -> complexity metrics"
    )
    errors: list[str] = Field(
        default_factory=list, description="All errors encountered during analysis"
    )
    module_metadata: dict[str, ModuleMetadata] = Field(
        default_factory=dict,
        description="Module path -> metadata (language, service, etc.)",
    )

    model_config = ConfigDict(
        arbitrary_types_allowed=True  # Allow set in dependencies field
    )

    @property
    def module_count(self) -> int:
        """Get number of modules analyzed."""
        return len(self.modules)

    @property
    def has_errors(self) -> bool:
        """Check if analysis encountered errors."""
        return len(self.errors) > 0

    @property
    def total_imports(self) -> int:
        """Get total number of imports across all modules."""
        return sum(len(imports) for imports in self.imports.values())


ImportType = Literal["internal", "third_party", "stdlib"]


# ============================================================================
# Performance Profiling Models
# ============================================================================


class FunctionProfile(BaseModel):
    """Performance profile for a single function.

    Extracted from profiling tools like cProfile, py-spy, or scalene.
    """

    function_name: str = Field(description="Function name (e.g., 'calculate_metrics')")
    module: str = Field(
        description="Module path (e.g., 'app.services.metrics_service')"
    )
    filename: str = Field(description="Source file path")
    lineno: int = Field(ge=1, description="Line number where function is defined")

    # Time metrics (in seconds)
    total_time: float = Field(ge=0, description="Total time including subcalls")
    self_time: float = Field(ge=0, description="Time excluding subcalls")
    cumulative_time: float = Field(ge=0, description="Cumulative time across all calls")
    avg_time_per_call: float = Field(ge=0, description="Average time per call")
    time_percentage: float = Field(
        ge=0, le=100, description="% of total execution time"
    )

    # Call metrics
    call_count: int = Field(ge=0, description="Number of times called")
    primitive_calls: int = Field(ge=0, description="Non-recursive calls")

    # Memory metrics (optional, from tools like scalene or memory_profiler)
    memory_usage_mb: float | None = Field(
        default=None, description="Memory usage in MB"
    )
    memory_peak_mb: float | None = Field(
        default=None, description="Peak memory usage in MB"
    )


class ModulePerformance(BaseModel):
    """Aggregated performance metrics for a module.

    Combines all function-level metrics for a single module/file.
    """

    module_path: str = Field(
        description="Module path (e.g., 'app/services/metrics_service.py')"
    )

    # Aggregated time metrics
    total_execution_time: float = Field(
        ge=0, description="Total time spent in this module (seconds)"
    )
    self_execution_time: float = Field(
        ge=0, description="Time excluding subcalls (seconds)"
    )
    time_percentage: float = Field(
        ge=0, le=100, description="% of total program execution time"
    )

    # Call metrics
    total_calls: int = Field(ge=0, description="Total function calls in this module")
    unique_functions: int = Field(ge=0, description="Number of unique functions")

    # Memory metrics
    total_memory_mb: float | None = Field(
        default=None, description="Total memory usage (MB)"
    )

    # Function details
    functions: list[FunctionProfile] = Field(
        default_factory=list, description="Individual function profiles"
    )

    # Bottleneck classification
    is_cpu_bottleneck: bool = Field(
        default=False, description="Identified as CPU bottleneck"
    )
    is_memory_bottleneck: bool = Field(
        default=False, description="Identified as memory bottleneck"
    )
    is_io_bottleneck: bool = Field(
        default=False, description="Identified as I/O bottleneck"
    )
    performance_severity: Literal["critical", "high", "medium", "low", "normal"] = (
        Field(default="normal", description="Performance issue severity")
    )


class PriorityWeights(BaseModel):
    """Configurable weights for priority scoring algorithm.

    Total should sum to 1.0 for normalized scoring.
    Default weights based on research and best practices.
    """

    execution_time: float = Field(
        default=0.40,
        ge=0,
        le=1,
        description="Weight for execution time (default: 0.40)",
    )
    coupling: float = Field(
        default=0.30,
        ge=0,
        le=1,
        description="Weight for coupling metrics (default: 0.30)",
    )
    complexity: float = Field(
        default=0.15,
        ge=0,
        le=1,
        description="Weight for code complexity (default: 0.15)",
    )
    memory_usage: float = Field(
        default=0.10, ge=0, le=1, description="Weight for memory usage (default: 0.10)"
    )
    call_frequency: float = Field(
        default=0.05,
        ge=0,
        le=1,
        description="Weight for call frequency (default: 0.05)",
    )

    @property
    def total_weight(self) -> float:
        """Calculate total weight (should be 1.0)."""
        return (
            self.execution_time
            + self.coupling
            + self.complexity
            + self.memory_usage
            + self.call_frequency
        )


class PerformanceBottleneck(BaseModel):
    """Detected performance bottleneck with priority scoring.

    Combines performance metrics with architectural metrics (coupling, complexity)
    to identify high-priority optimization targets.
    """

    module_path: str = Field(description="Module path")

    # Bottleneck classification
    bottleneck_type: Literal["cpu", "memory", "io", "combined"] = Field(
        description="Type of performance bottleneck"
    )

    # Performance metrics
    execution_time: float = Field(ge=0, description="Total execution time (seconds)")
    time_percentage: float = Field(ge=0, le=100, description="% of total time")
    memory_usage_mb: float | None = Field(default=None, description="Memory usage (MB)")
    call_count: int = Field(ge=0, description="Number of function calls")

    # Architectural metrics (from dependency graph)
    coupling_score: float = Field(
        ge=0, description="Total coupling (afferent + efferent)"
    )
    complexity_score: float = Field(ge=0, description="Cyclomatic complexity")
    is_circular: bool = Field(default=False, description="Part of circular dependency")
    is_hot_zone: bool = Field(default=False, description="High complexity + coupling")

    # Priority scoring
    priority_score: float = Field(
        ge=0,
        le=100,
        description="Optimization priority score (0-100, higher = more urgent)",
    )
    priority_rank: int = Field(ge=1, description="Rank among all bottlenecks")

    # Impact estimation
    estimated_impact: Literal["critical", "high", "medium", "low"] = Field(
        description="Estimated impact of optimizing this bottleneck"
    )
    optimization_difficulty: Literal["easy", "medium", "hard", "very_hard"] = Field(
        description="Estimated difficulty of optimization"
    )

    # Recommendations
    recommendation: str = Field(description="High-level optimization recommendation")
    affected_modules: list[str] = Field(
        default_factory=list,
        description="Modules that depend on this (high coupling impact)",
    )


ProfilerType = Literal["cprofile", "pyspy", "scalene", "unknown"]


class PerformanceAnalysisResult(BaseModel):
    """Complete performance analysis result.

    Output from analyzing profiling data and combining it with dependency graph.
    """

    # Metadata
    profiler_type: ProfilerType = Field(description="Profiling tool used")
    total_execution_time: float = Field(
        ge=0, description="Total program runtime (seconds)"
    )
    total_samples: int | None = Field(
        default=None, description="Number of samples (for sampling profilers)"
    )
    timestamp: str = Field(description="Analysis timestamp (ISO format)")

    # Performance data
    module_performance: dict[str, ModulePerformance] = Field(
        default_factory=dict, description="Module path -> performance metrics"
    )

    # Bottleneck analysis
    bottlenecks: list[PerformanceBottleneck] = Field(
        default_factory=list, description="Detected bottlenecks (priority-sorted)"
    )

    # Statistics
    total_modules_profiled: int = Field(ge=0, description="Number of modules with data")
    critical_bottlenecks: int = Field(ge=0, description="Count of critical bottlenecks")
    high_bottlenecks: int = Field(
        ge=0, description="Count of high-priority bottlenecks"
    )

    # Configuration
    weights_used: PriorityWeights = Field(
        default_factory=PriorityWeights, description="Weights used for priority scoring"
    )

    @property
    def has_bottlenecks(self) -> bool:
        """Check if any bottlenecks were detected."""
        return len(self.bottlenecks) > 0

    @property
    def top_bottleneck(self) -> PerformanceBottleneck | None:
        """Get highest priority bottleneck."""
        return self.bottlenecks[0] if self.bottlenecks else None
