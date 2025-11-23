# Level 0: Core models (no service dependencies)
from app.core.parsing_models import DependencyAnalysis

# Level 1: Leaf services (no internal service dependencies)
from app.services.complexity_service import ComplexityService
from app.services.github_service import GitHubService
from app.services.progress_service import ProgressTracker
from app.services.layout_service import (
    apply_layout,
    hierarchical_layout_3d,
    force_directed_layout_3d,
    circular_layout_3d,
)
from app.services.export_service import (
    export_to_json,
    export_to_toml,
    generate_filename,
)

# Level 2: Services that may depend on Level 1
from app.services.analyzer_service import analyze_files
from app.services.graph_service import build_graph
from app.services.metrics_service import MetricsCalculator
from app.services.clustering_service import ClusteringService
from app.services.impact_service import ImpactAnalysisService
from app.services.health_score_service import HealthScoreService
from app.services.refactoring_service import RefactoringService
from app.services.fitness_service import FitnessService
from app.services.documentation_service import DocumentationService
from app.services.diagram_service import DiagramExporter

# Level 3: Services that depend on Level 2
from app.services.temporal_service import TemporalAnalysisService

# Level 4: Orchestrator services (depend on many other services) - MUST BE LAST
from app.services.analysis_orchestrator_service import AnalysisOrchestratorService
from app.services.diff_service import DiffService
from app.services.fitness_orchestrator_service import FitnessOrchestratorService
from app.services.temporal_orchestrator_service import TemporalOrchestratorService

__all__ = [
    "DependencyAnalysis",
    "analyze_files",
    "build_graph",
    "ComplexityService",
    "MetricsCalculator",
    "ClusteringService",
    "ImpactAnalysisService",
    "HealthScoreService",
    "RefactoringService",
    "FitnessService",
    "AnalysisOrchestratorService",
    "DiffService",
    "FitnessOrchestratorService",
    "TemporalOrchestratorService",
    "DocumentationService",
    "DiagramExporter",
    "GitHubService",
    "TemporalAnalysisService",
    "ProgressTracker",
    "apply_layout",
    "hierarchical_layout_3d",
    "force_directed_layout_3d",
    "circular_layout_3d",
    "export_to_json",
    "export_to_toml",
    "generate_filename",
]
