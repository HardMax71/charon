"""Core data models for dependency graph."""

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
