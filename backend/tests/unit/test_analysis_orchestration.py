from unittest.mock import AsyncMock, MagicMock, patch

import networkx as nx
import pytest

from app.core.models import (
    AnalysisResult,
    ClusteringResult,
    ClusterMetrics,
    DependencyGraph,
    FileInput,
    GlobalMetrics,
    GitHubAnalyzeRequest,
    ImportAnalyzeRequest,
    LocalAnalyzeRequest,
    Node,
    Position3D,
)
from app.core.exceptions import BadRequestError
from app.services.orchestration.analysis import AnalysisOrchestratorService


class TestAnalysisOrchestratorService:
    @pytest.fixture
    def sample_graph(self):
        g = nx.DiGraph()
        g.add_node(
            "app.main",
            label="main.py",
            type="internal",
            module="app",
            position={"x": 0, "y": 0, "z": 0},
            metrics={
                "afferent_coupling": 0,
                "efferent_coupling": 2,
                "instability": 1.0,
            },
            language="python",
            node_kind="module",
            file_path="/app/main.py",
            service="app",
        )
        g.add_node(
            "app.utils",
            label="utils.py",
            type="internal",
            module="app",
            position={"x": 1, "y": 0, "z": 0},
            metrics={
                "afferent_coupling": 1,
                "efferent_coupling": 0,
                "instability": 0.0,
            },
        )
        g.add_node(
            "third_party.requests",
            label="requests",
            type="third_party",
            module="requests",
            position={"x": 2, "y": 0, "z": 0},
            metrics={
                "afferent_coupling": 1,
                "efferent_coupling": 0,
                "instability": 0.0,
            },
        )
        g.add_edge("app.main", "app.utils", imports=["helper"], weight=1)
        g.add_edge("app.main", "third_party.requests", imports=["get"], weight=2)
        return g

    @pytest.fixture
    def sample_clustering_result(self):
        return ClusteringResult(
            clusters={0: {"app.main", "app.utils"}, 1: {"third_party.requests"}},
            node_to_cluster={
                "app.main": 0,
                "app.utils": 0,
                "third_party.requests": 1,
            },
            metrics=[
                ClusterMetrics(
                    cluster_id=0,
                    size=2,
                    internal_edges=1,
                    external_edges=1,
                    cohesion=0.5,
                    modularity_contribution=0.3,
                    avg_internal_coupling=1.0,
                    is_package_candidate=True,
                    nodes=["app.main", "app.utils"],
                ),
                ClusterMetrics(
                    cluster_id=1,
                    size=1,
                    internal_edges=0,
                    external_edges=1,
                    cohesion=0.0,
                    modularity_contribution=0.2,
                    avg_internal_coupling=0.0,
                    is_package_candidate=False,
                    nodes=["third_party.requests"],
                ),
            ],
        )

    @pytest.fixture
    def sample_global_metrics(self):
        return GlobalMetrics(
            total_files=3,
            total_internal=2,
            total_third_party=1,
            avg_afferent_coupling=0.5,
            avg_efferent_coupling=1.0,
            avg_complexity=5.0,
            avg_maintainability=75.0,
            circular_dependencies=[],
            high_coupling_files=[],
            coupling_threshold=5.0,
            hot_zone_files=[],
        )

    def test_build_nodes_and_edges(self, sample_graph, sample_clustering_result):
        nodes, edges = AnalysisOrchestratorService.build_nodes_and_edges(
            sample_graph, sample_clustering_result
        )

        assert len(nodes) == 3
        assert len(edges) == 2

        main_node = next(n for n in nodes if n.id == "app.main")
        assert main_node.type == "internal"
        assert main_node.cluster_id == 0

        third_party_node = next(n for n in nodes if n.id == "third_party.requests")
        assert third_party_node.type == "third_party"

    def test_build_nodes_and_edges_with_unknown_language(
        self, sample_graph, sample_clustering_result
    ):
        sample_graph.nodes["app.main"]["language"] = "unknown_lang"

        nodes, edges = AnalysisOrchestratorService.build_nodes_and_edges(
            sample_graph, sample_clustering_result
        )

        main_node = next(n for n in nodes if n.id == "app.main")
        assert main_node.language is None

    def test_build_nodes_and_edges_with_unknown_node_kind(
        self, sample_graph, sample_clustering_result
    ):
        sample_graph.nodes["app.main"]["node_kind"] = "unknown_kind"

        nodes, edges = AnalysisOrchestratorService.build_nodes_and_edges(
            sample_graph, sample_clustering_result
        )

        from app.core.models import NodeType

        main_node = next(n for n in nodes if n.id == "app.main")
        assert main_node.node_kind == NodeType.MODULE

    def test_enrich_global_metrics(
        self, sample_global_metrics, sample_clustering_result
    ):
        mock_clustering_service = MagicMock()
        mock_clustering_service.get_cluster_suggestions.return_value = []

        mock_refactoring_service = MagicMock()
        mock_refactoring_service.analyze_refactoring_opportunities.return_value = []
        mock_refactoring_service.get_summary_stats.return_value = MagicMock(
            modules_analyzed=2,
            total_suggestions=0,
            by_severity={},
        )

        result = AnalysisOrchestratorService.enrich_global_metrics(
            sample_global_metrics,
            sample_clustering_result,
            mock_clustering_service,
            mock_refactoring_service,
        )

        assert result.clusters is not None
        mock_clustering_service.get_cluster_suggestions.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_source_files_local(self):
        files = [FileInput(path="main.py", content="pass")]
        request = LocalAnalyzeRequest(source="local", files=files)

        result = await AnalysisOrchestratorService.fetch_source_files(request)

        assert result.success is True
        assert len(result.files) == 1
        assert result.project_name == "local_project"

    @pytest.mark.asyncio
    async def test_fetch_source_files_import(self, default_node_metrics):
        graph = DependencyGraph(
            nodes=[
                Node(
                    id="a",
                    label="a",
                    type="internal",
                    module="app",
                    position=Position3D(x=0, y=0, z=0),
                    color="#fff",
                    metrics=default_node_metrics,
                )
            ],
            edges=[],
        )
        global_metrics = GlobalMetrics(
            total_files=1,
            total_internal=1,
            total_third_party=0,
            avg_afferent_coupling=0,
            avg_efferent_coupling=0,
            avg_complexity=0,
            avg_maintainability=80,
            circular_dependencies=[],
            high_coupling_files=[],
            coupling_threshold=5.0,
            hot_zone_files=[],
        )
        data = AnalysisResult(graph=graph, global_metrics=global_metrics)
        request = ImportAnalyzeRequest(source="import", data=data)

        result = await AnalysisOrchestratorService.fetch_source_files(request)

        assert result.success is True
        assert result.files == []
        assert result.project_name == "imported_project"

    @pytest.mark.asyncio
    async def test_fetch_source_files_github_success(self):
        request = GitHubAnalyzeRequest(
            source="github",
            url="https://github.com/owner/repo",
            github_token="token123",
        )

        mock_fetch_result = MagicMock(
            files=[FileInput(path="main.py", content="pass")],
            total_files=1,
            failed_count=0,
        )

        with patch(
            "app.services.orchestration.analysis.GitHubService"
        ) as MockGitHubService:
            mock_service = MockGitHubService.return_value
            mock_service.fetch_repository = AsyncMock(return_value=mock_fetch_result)

            result = await AnalysisOrchestratorService.fetch_source_files(request)

            assert result.success is True
            assert len(result.files) == 1
            assert result.project_name == "repo"

    @pytest.mark.asyncio
    async def test_fetch_source_files_github_no_files(self):
        request = GitHubAnalyzeRequest(
            source="github",
            url="https://github.com/owner/repo",
        )

        mock_fetch_result = MagicMock(
            files=[],
            total_files=0,
            failed_count=0,
        )

        with patch(
            "app.services.orchestration.analysis.GitHubService"
        ) as MockGitHubService:
            mock_service = MockGitHubService.return_value
            mock_service.fetch_repository = AsyncMock(return_value=mock_fetch_result)

            with pytest.raises(BadRequestError):
                await AnalysisOrchestratorService.fetch_source_files(request)

    @pytest.mark.asyncio
    async def test_fetch_source_files_github_with_failures(self):
        request = GitHubAnalyzeRequest(
            source="github",
            url="https://github.com/owner/repo",
        )

        mock_fetch_result = MagicMock(
            files=[FileInput(path="main.py", content="pass")],
            total_files=5,
            failed_count=4,
        )

        with patch(
            "app.services.orchestration.analysis.GitHubService"
        ) as MockGitHubService:
            mock_service = MockGitHubService.return_value
            mock_service.fetch_repository = AsyncMock(return_value=mock_fetch_result)

            result = await AnalysisOrchestratorService.fetch_source_files(request)

            assert result.success is True
            assert len(result.warnings) == 1
            assert "Failed to fetch" in result.warnings[0]

    @pytest.mark.asyncio
    async def test_perform_analysis_import(self, default_node_metrics):
        graph = DependencyGraph(
            nodes=[
                Node(
                    id="a",
                    label="a",
                    type="internal",
                    module="app",
                    position=Position3D(x=0, y=0, z=0),
                    color="#fff",
                    metrics=default_node_metrics,
                )
            ],
            edges=[],
        )
        global_metrics = GlobalMetrics(
            total_files=1,
            total_internal=1,
            total_third_party=0,
            avg_afferent_coupling=0,
            avg_efferent_coupling=0,
            avg_complexity=0,
            avg_maintainability=80,
            circular_dependencies=[],
            high_coupling_files=[],
            coupling_threshold=5.0,
            hot_zone_files=[],
        )
        data = AnalysisResult(graph=graph, global_metrics=global_metrics)
        request = ImportAnalyzeRequest(source="import", data=data)

        mock_tracker = MagicMock()
        mock_tracker.emit_step = AsyncMock(return_value="step")
        mock_tracker.emit_result = AsyncMock(return_value="result")

        events = []
        async for event in AnalysisOrchestratorService.perform_analysis(
            request, mock_tracker
        ):
            events.append(event)

        assert len(events) == 2
        mock_tracker.emit_result.assert_called_once()

    @pytest.mark.asyncio
    async def test_perform_analysis_local(self):
        files = [
            FileInput(path="app/main.py", content="import os\n"),
            FileInput(path="app/utils.py", content="def helper(): pass\n"),
        ]
        request = LocalAnalyzeRequest(source="local", files=files)

        mock_tracker = MagicMock()
        mock_tracker.emit_step = AsyncMock(return_value="step")
        mock_tracker.emit_result = AsyncMock(return_value="result")

        events = []
        async for event in AnalysisOrchestratorService.perform_analysis(
            request, mock_tracker
        ):
            events.append(event)

        assert len(events) > 0
        mock_tracker.emit_result.assert_called_once()
