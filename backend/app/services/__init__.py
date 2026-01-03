# Level 0: Core models (no service dependencies)
from app.core.models import DependencyAnalysis

# Level 1: Infrastructure services (no internal service dependencies)
from app.services.infrastructure import (
    GitHubService,
    ProgressTracker,
    SessionService,
)

# Level 2: Graph services
from app.services.graph import (
    apply_layout,
    build_graph,
    build_networkx_graph,
    circular_layout_3d,
    ClusteringService,
    force_directed_layout_3d,
    hierarchical_layout_3d,
    ImpactAnalysisService,
)

# Level 3: Analysis services
from app.services.analysis import (
    analyze_files,
    analyze_files_multi_language,
    ComplexityService,
    HealthScoreService,
    MetricsCalculator,
    MultiLanguageAnalyzer,
)

# Level 4: Export services
from app.services.export import (
    DiagramExporter,
    DocumentationService,
    export_to_json,
    export_to_toml,
    generate_filename,
)

# Level 5: Fitness services
from app.services.fitness import (
    FitnessService,
    RefactoringService,
)

# Level 6: Temporal services
from app.services.temporal import (
    DiffService,
    TemporalAnalysisService,
)

# Level 7: Orchestrator services (depend on many other services) - MUST BE LAST
from app.services.orchestration import (
    AnalysisOrchestratorService,
    FitnessOrchestratorService,
    TemporalOrchestratorService,
)

__all__ = [
    "AnalysisOrchestratorService",
    "analyze_files",
    "analyze_files_multi_language",
    "apply_layout",
    "build_graph",
    "build_networkx_graph",
    "circular_layout_3d",
    "ClusteringService",
    "ComplexityService",
    "DependencyAnalysis",
    "DiagramExporter",
    "DiffService",
    "DocumentationService",
    "export_to_json",
    "export_to_toml",
    "FitnessOrchestratorService",
    "FitnessService",
    "force_directed_layout_3d",
    "generate_filename",
    "GitHubService",
    "HealthScoreService",
    "hierarchical_layout_3d",
    "ImpactAnalysisService",
    "MetricsCalculator",
    "MultiLanguageAnalyzer",
    "ProgressTracker",
    "RefactoringService",
    "SessionService",
    "TemporalAnalysisService",
    "TemporalOrchestratorService",
]
