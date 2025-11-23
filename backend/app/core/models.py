from typing import Literal
from pydantic import BaseModel, Field


class Position3D(BaseModel):
    """3D position coordinates."""

    x: float
    y: float
    z: float


class NodeMetrics(BaseModel):
    """Metrics for a single node."""

    afferent_coupling: int = Field(description="Number of modules that depend on this one")
    efferent_coupling: int = Field(description="Number of modules this one depends on")
    instability: float = Field(description="Ce / (Ca + Ce)")
    is_circular: bool = Field(default=False, description="Part of circular dependency")
    is_high_coupling: bool = Field(default=False, description="In top 20% of coupling")
    # Complexity metrics
    cyclomatic_complexity: float = Field(default=0, description="Average cyclomatic complexity")
    max_complexity: int = Field(default=0, description="Maximum function complexity")
    maintainability_index: float = Field(default=0, description="Maintainability index (0-100)")
    lines_of_code: int = Field(default=0, description="Total lines of code")
    complexity_grade: str = Field(default="A", description="Complexity grade (A-F)")
    maintainability_grade: str = Field(default="A", description="Maintainability grade (A-F)")
    # Hot zone detection
    is_hot_zone: bool = Field(default=False, description="High complexity + high coupling")
    hot_zone_severity: Literal["critical", "warning", "info", "ok"] = Field(default="ok", description="Hot zone severity level")
    hot_zone_score: float = Field(default=0, description="Hot zone score (0-100)")
    hot_zone_reason: str = Field(default="", description="Reason for hot zone classification")


class Node(BaseModel):
    """Graph node representing a file/module."""

    id: str = Field(description="Unique identifier (module path)")
    label: str = Field(description="Display name (filename)")
    type: Literal["internal", "third_party"] = Field(description="Node classification")
    module: str = Field(description="Parent module path")
    position: Position3D
    color: str = Field(description="Hex color code")
    metrics: NodeMetrics
    cluster_id: int | None = Field(default=None, description="Community/cluster ID")


class Edge(BaseModel):
    """Graph edge representing a dependency."""

    id: str = Field(description="Unique edge identifier")
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    imports: list[str] = Field(description="List of imported names")
    weight: int = Field(description="Number of imports")
    thickness: float = Field(description="Visual thickness for rendering")


class CircularDependency(BaseModel):
    """Circular dependency cycle."""

    cycle: list[str] = Field(description="List of node IDs forming the cycle")


class ClusterMetrics(BaseModel):
    """Metrics for a single cluster/community."""

    cluster_id: int = Field(description="Cluster identifier")
    size: int = Field(description="Number of nodes in cluster")
    internal_edges: int = Field(description="Edges within cluster")
    external_edges: int = Field(description="Edges crossing cluster boundary")
    cohesion: float = Field(description="Internal/total edges ratio")
    modularity_contribution: float = Field(description="Modularity score")
    avg_internal_coupling: float = Field(description="Average coupling within cluster")
    is_package_candidate: bool = Field(description="Suggests good package boundary")
    nodes: list[str] = Field(description="Node IDs in this cluster")


class ClusteringResult(BaseModel):
    """Result from community detection."""

    communities: dict[int, set[str]] = Field(description="Cluster ID to set of node IDs")
    node_to_community: dict[str, int] = Field(description="Node ID to cluster ID mapping")
    metrics: list[ClusterMetrics] = Field(description="Metrics for each cluster")


class PackageSuggestion(BaseModel):
    """Package reorganization suggestion."""

    cluster_id: int
    suggested_package_name: str
    modules: list[str]
    size: int
    cohesion: float
    reason: str


class RefactoringSuggestion(BaseModel):
    """Automated refactoring suggestion based on code smells and anti-patterns."""

    module: str = Field(description="Module that needs refactoring")
    severity: Literal["critical", "warning", "info"] = Field(description="Suggestion severity")
    pattern: str = Field(description="Anti-pattern or code smell name")
    description: str = Field(description="Brief description of the issue")
    metrics: dict = Field(description="Relevant metrics for this suggestion")
    recommendation: str = Field(description="High-level refactoring recommendation")
    details: str = Field(description="Detailed explanation with concrete steps")
    suggested_refactoring: str = Field(description="Specific refactoring pattern to apply")


class RefactoringSummary(BaseModel):
    """Summary statistics for refactoring analysis."""

    total_suggestions: int
    by_severity: dict[str, int] = Field(description="Count by severity level")
    by_pattern: dict[str, int] = Field(description="Count by anti-pattern type")
    modules_analyzed: int


class HotZoneFile(BaseModel):
    """Hot zone file with high complexity and coupling."""

    file: str = Field(description="Module path")
    severity: Literal["critical", "warning", "info", "ok"] = Field(description="Severity level")
    score: float = Field(description="Hot zone score (0-100)")
    reason: str = Field(description="Reason for classification")
    complexity: float = Field(description="Cyclomatic complexity")
    coupling: int = Field(description="Total coupling (afferent + efferent)")


class GlobalMetrics(BaseModel):
    """Global project metrics."""

    total_files: int
    total_internal: int
    total_third_party: int
    avg_afferent_coupling: float
    avg_efferent_coupling: float
    circular_dependencies: list[CircularDependency]
    high_coupling_files: list[str]
    coupling_threshold: float
    # Complexity metrics
    avg_complexity: float = Field(default=0, description="Average cyclomatic complexity")
    avg_maintainability: float = Field(default=0, description="Average maintainability index")
    hot_zone_files: list[HotZoneFile] = Field(default_factory=list, description="Files with high complexity and coupling")
    # Clustering and refactoring
    clusters: list[ClusterMetrics] = Field(default_factory=list, description="Detected communities")
    package_suggestions: list[PackageSuggestion] = Field(default_factory=list, description="Package reorganization suggestions")
    refactoring_suggestions: list[RefactoringSuggestion] = Field(default_factory=list, description="Automated refactoring suggestions")
    refactoring_summary: RefactoringSummary | None = Field(default=None, description="Refactoring analysis summary")


class DependencyGraph(BaseModel):
    """Complete dependency graph with metrics."""

    nodes: list[Node]
    edges: list[Edge]


class AnalysisResult(BaseModel):
    """Complete analysis result."""

    graph: DependencyGraph
    global_metrics: GlobalMetrics
    warnings: list[str] = Field(default_factory=list)


class FileInput(BaseModel):
    """Uploaded file content."""

    path: str
    content: str


class SourceFilesResult(BaseModel):
    """Result from fetching source files."""

    success: bool = Field(description="Whether file fetching succeeded")
    files: list[FileInput] | None = Field(default=None, description="Fetched files if successful")
    project_name: str | None = Field(default=None, description="Project name if successful")
    error_message: str | None = Field(default=None, description="Error message if failed")


class AnalyzeRequest(BaseModel):
    """Request to analyze code."""

    source: Literal["github", "local", "import"]
    url: str | None = None
    files: list[FileInput] | None = None
    data: AnalysisResult | None = None


class ExportRequest(BaseModel):
    """Request to export analysis."""

    graph: DependencyGraph
    global_metrics: GlobalMetrics
    format: Literal["json", "toml"]
    project_name: str


class ExportDiagramRequest(BaseModel):
    """Request model for diagram export."""

    graph_data: DependencyGraph
    format: Literal["plantuml", "c4", "mermaid", "uml", "drawio"] = "plantuml"
    system_name: str = "Software System"


class ExportDocumentationRequest(BaseModel):
    """Request model for documentation export."""

    graph: DependencyGraph
    global_metrics: GlobalMetrics
    format: Literal["md", "html", "pdf"]
    project_name: str = "Project"


class TemporalAnalysisRequest(BaseModel):
    """Request model for temporal analysis."""

    repository_url: str
    start_date: str | None = None
    end_date: str | None = None
    sample_strategy: Literal["all", "daily", "weekly", "monthly"] = "all"


class DiffRequest(BaseModel):
    """Request to compare two versions."""

    repo: str = Field(description="GitHub repo (owner/repo)")
    ref1: str = Field(description="First reference (commit/branch/tag)")
    ref2: str = Field(description="Second reference (commit/branch/tag)")
    ref_type: Literal["commit", "branch", "tag"] = "commit"


class DiffResult(BaseModel):
    """Dependency diff result."""

    added_nodes: list[str]
    removed_nodes: list[str]
    added_edges: list[dict]
    removed_edges: list[dict]
    changed_edges: list[dict]


class ImpactAnalysisRequest(BaseModel):
    """Request to analyze impact of changes to a node."""

    node_id: str = Field(description="ID of the node to analyze")
    graph: DependencyGraph = Field(description="Current dependency graph")
    max_depth: int = Field(default=10, ge=1, le=50, description="Maximum depth for transitive search")


class SelectedNodeInfo(BaseModel):
    """Information about the selected node."""

    id: str
    label: str
    module: str


class AffectedNodeDetail(BaseModel):
    """Details about an affected node."""

    id: str
    label: str
    module: str
    type: Literal["internal", "third_party"]
    distance: int
    color: str


class DistanceBreakdown(BaseModel):
    """Breakdown of impact by distance."""

    count: int
    percentage: float
    label: str


class ImpactMetrics(BaseModel):
    """Impact analysis metrics."""

    total_nodes: int
    total_affected: int
    impact_percentage: float
    max_depth_reached: int
    distance_breakdown: dict[int, DistanceBreakdown]


class ImpactAnalysisResponse(BaseModel):
    """Response from impact analysis."""

    selected_node: SelectedNodeInfo
    affected_nodes: dict[str, int] = Field(description="Mapping of node_id to distance")
    impact_levels: dict[str, list[str]] = Field(description="Mapping of distance to list of node_ids")
    affected_node_details: list[AffectedNodeDetail]
    metrics: ImpactMetrics


class HealthScoreComponent(BaseModel):
    """Individual health score component."""

    score: float = Field(ge=0, le=100, description="Score from 0-100")
    grade: Literal["A", "B", "C", "D", "F"]
    details: dict


class HealthScoreComponents(BaseModel):
    """All health score components."""

    circular_dependencies: HealthScoreComponent
    coupling_health: HealthScoreComponent
    complexity_health: HealthScoreComponent
    architecture_health: HealthScoreComponent
    stability_distribution: HealthScoreComponent


class HealthScoreWeights(BaseModel):
    """Weights for health score components."""

    circular: float = Field(default=0.20, description="Circular dependencies weight")
    coupling: float = Field(default=0.20, description="Coupling health weight")
    complexity: float = Field(default=0.30, description="Complexity health weight")
    architecture: float = Field(default=0.20, description="Architecture health weight")
    stability: float = Field(default=0.10, description="Stability distribution weight")


class HealthScoreResponse(BaseModel):
    """Complete health score response."""

    overall_score: float = Field(ge=0, le=100, description="Overall health score from 0-100")
    overall_grade: Literal["A", "B", "C", "D", "F"]
    components: HealthScoreComponents
    weights: HealthScoreWeights
    summary: str
    recommendations: list[str]


class FitnessRule(BaseModel):
    """Architectural fitness function rule."""

    id: str = Field(description="Unique rule identifier")
    name: str = Field(description="Human-readable rule name")
    description: str = Field(description="Detailed description of the rule")
    rule_type: Literal[
        "import_restriction",
        "max_coupling",
        "no_circular",
        "max_third_party_percent",
        "max_depth",
        "max_complexity"
    ] = Field(description="Type of rule")
    severity: Literal["error", "warning", "info"] = Field(default="error", description="Violation severity")
    enabled: bool = Field(default=True, description="Whether the rule is active")
    parameters: dict = Field(description="Rule-specific parameters")


class FitnessViolation(BaseModel):
    """Violation of an architectural fitness function."""

    rule_id: str = Field(description="ID of the violated rule")
    rule_name: str = Field(description="Name of the violated rule")
    severity: Literal["error", "warning", "info"]
    message: str = Field(description="Human-readable violation message")
    details: dict = Field(description="Additional context about the violation")
    affected_modules: list[str] = Field(default_factory=list, description="Modules involved in violation")


class FitnessValidationResult(BaseModel):
    """Result of fitness function validation."""

    passed: bool = Field(description="Whether all rules passed")
    total_rules: int = Field(description="Total number of rules evaluated")
    violations: list[FitnessViolation] = Field(default_factory=list)
    errors: int = Field(default=0, description="Number of error-level violations")
    warnings: int = Field(default=0, description="Number of warning-level violations")
    infos: int = Field(default=0, description="Number of info-level violations")
    timestamp: str = Field(description="Validation timestamp")
    summary: str = Field(description="Summary of validation results")


class FitnessRuleConfig(BaseModel):
    """Configuration file for fitness functions."""

    version: str = Field(default="1.0", description="Config version")
    rules: list[FitnessRule] = Field(description="List of fitness rules")


class FitnessValidationRequest(BaseModel):
    """Request to validate fitness functions."""

    graph: DependencyGraph = Field(description="Dependency graph to validate")
    global_metrics: GlobalMetrics = Field(description="Global metrics")
    rules: list[FitnessRule] = Field(description="Rules to validate against")
    fail_on_error: bool = Field(default=True, description="Fail if errors found")
    fail_on_warning: bool = Field(default=False, description="Fail if warnings found")


class FitnessTrendPoint(BaseModel):
    """Single point in fitness trend history."""

    timestamp: str
    passed: bool
    errors: int
    warnings: int
    infos: int
    total_violations: int


class FitnessTrendResponse(BaseModel):
    """Historical fitness trend data."""

    project_name: str
    rule_id: str | None = Field(default=None, description="Optional filter by rule")
    data_points: list[FitnessTrendPoint]
    summary: dict


class SaveResultResponse(BaseModel):
    """Response from saving fitness validation result."""

    success: bool = Field(description="Whether the save was successful")
    message: str = Field(description="Status message")
    file_path: str = Field(description="Path to the saved file")


class TemporalSnapshotData(BaseModel):
    """Snapshot data for a single commit in temporal analysis."""

    commit_hash: str
    timestamp: str
    author: str
    message: str
    files_analyzed: int
    dependencies_count: int
    circular_dependencies: int
    avg_coupling: float
    metrics: dict = Field(default_factory=dict)


class ChurnData(BaseModel):
    """Code churn data for files."""

    file_path: str
    churn_count: int


class CircularDependencyEvent(BaseModel):
    """Event tracking when circular dependencies were introduced."""

    commit_hash: str
    timestamp: str
    cycle: list[str]


class TemporalAnalysisResponse(BaseModel):
    """Response from temporal analysis."""

    analysis_id: str = Field(description="Unique identifier for this analysis")
    repository: str = Field(description="Repository URL")
    start_date: str | None = Field(default=None, description="Analysis start date")
    end_date: str | None = Field(default=None, description="Analysis end date")
    total_commits: int = Field(description="Total commits in range")
    analyzed_commits: int = Field(description="Number of commits analyzed")
    sample_strategy: str = Field(description="Sampling strategy used")
    snapshots: list[dict] = Field(description="Snapshot data for each analyzed commit")
    churn_data: dict = Field(description="Code churn data")
    circular_deps_timeline: list[dict] = Field(description="Timeline of circular dependency events")
