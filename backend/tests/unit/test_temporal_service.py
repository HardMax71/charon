from unittest.mock import AsyncMock, patch

import pytest

from app.core.models import (
    ChurnHeatmapData,
    CircularDependencyTimelineEvent,
    TemporalAnalysisResponse,
    TemporalDependencyChange,
    TemporalSnapshotChanges,
    TemporalSnapshotData,
    TemporalSnapshotMetrics,
    TemporalGraphSnapshot,
)
from app.services.temporal.service import TemporalAnalysisService


class TestTemporalAnalysisService:
    @pytest.fixture
    def service(self):
        return TemporalAnalysisService()

    @pytest.fixture
    def sample_commits(self):
        return [
            {
                "sha": "abc123",
                "message": "Initial commit",
                "author": "User",
                "date": "2024-01-01T00:00:00Z",
            },
            {
                "sha": "def456",
                "message": "Second commit",
                "author": "User",
                "date": "2024-01-02T00:00:00Z",
            },
            {
                "sha": "ghi789",
                "message": "Third commit",
                "author": "User",
                "date": "2024-01-08T00:00:00Z",
            },
        ]

    @pytest.fixture
    def sample_graph_snapshot(self):
        return TemporalGraphSnapshot(nodes=[], edges=[])

    @pytest.fixture
    def sample_snapshot(self, sample_graph_snapshot):
        return TemporalSnapshotData(
            commit_sha="abc123",
            commit_message="Initial commit",
            commit_date="2024-01-01T00:00:00Z",
            author="User",
            node_count=5,
            edge_count=4,
            dependencies={"a": ["b", "c"], "b": ["c"]},
            circular_nodes=["a", "b"],
            circular_count=2,
            global_metrics=TemporalSnapshotMetrics(
                average_coupling=2.0,
                max_coupling=5,
                total_complexity=15.0,
                avg_afferent_coupling=1.0,
                avg_efferent_coupling=1.5,
            ),
            changes=None,
            graph_snapshot=sample_graph_snapshot,
        )

    @pytest.mark.parametrize(
        "strategy,commits_count,expected_count",
        [
            ("all", 10, 10),
            ("daily", 10, None),
            ("weekly", 10, None),
            ("monthly", 10, None),
        ],
    )
    def test_sample_commits_strategy(
        self, service, strategy, commits_count, expected_count
    ):
        commits = [
            {
                "sha": f"sha{i}",
                "message": f"Commit {i}",
                "author": "User",
                "date": f"2024-01-{(i % 28) + 1:02d}T{i % 24:02d}:00:00Z",
            }
            for i in range(commits_count)
        ]

        result = service._sample_commits(commits, strategy)

        if expected_count is not None:
            assert len(result) == expected_count
        else:
            assert len(result) <= commits_count

    def test_sample_commits_empty(self, service):
        result = service._sample_commits([], "all")
        assert result == []

    def test_sample_commits_daily(self, service, sample_commits):
        result = service._sample_commits(sample_commits, "daily")

        assert len(result) == 3

    def test_sample_commits_weekly(self, service, sample_commits):
        result = service._sample_commits(sample_commits, "weekly")

        assert len(result) >= 1
        assert len(result) <= 3

    def test_sample_commits_monthly(self, service, sample_commits):
        result = service._sample_commits(sample_commits, "monthly")

        assert len(result) == 1

    def test_calculate_changes(self, service, sample_snapshot):
        current_deps = {"a": ["b", "d"], "c": ["d"]}
        current_nodes = 6
        current_edges = 5
        current_circular = 1

        result = service._calculate_changes(
            sample_snapshot,
            current_deps,
            current_nodes,
            current_edges,
            current_circular,
        )

        assert isinstance(result, TemporalSnapshotChanges)
        assert "c" in result.added_nodes
        assert "b" in result.removed_nodes
        assert result.node_count_delta == 1
        assert result.edge_count_delta == 1
        assert result.circular_count_delta == -1

    def test_calculate_churn_empty(self, service):
        result = service._calculate_churn([])

        assert isinstance(result, ChurnHeatmapData)
        assert result.total_changes == 0
        assert result.average_churn_per_snapshot == 0

    def test_calculate_churn_with_changes(
        self, service, sample_snapshot, sample_graph_snapshot
    ):
        snapshot_with_changes = TemporalSnapshotData(
            commit_sha="def456",
            commit_message="Second commit",
            commit_date="2024-01-02T00:00:00Z",
            author="User",
            node_count=6,
            edge_count=5,
            dependencies={"a": ["b", "c", "d"]},
            circular_nodes=[],
            circular_count=0,
            global_metrics=sample_snapshot.global_metrics,
            changes=TemporalSnapshotChanges(
                added_nodes=["d"],
                removed_nodes=[],
                modified_dependencies=[
                    TemporalDependencyChange(node="a", added=["d"], removed=[])
                ],
                node_count_delta=1,
                edge_count_delta=1,
                circular_count_delta=-2,
            ),
            graph_snapshot=sample_graph_snapshot,
        )

        snapshots = [sample_snapshot, snapshot_with_changes]
        result = service._calculate_churn(snapshots)

        assert result.total_changes == 1
        assert "a" in result.node_churn

    def test_generate_churn_heatmap(
        self, service, sample_snapshot, sample_graph_snapshot
    ):
        snapshot_with_changes = TemporalSnapshotData(
            commit_sha="def456",
            commit_message="Second",
            commit_date="2024-01-02T00:00:00Z",
            author="User",
            node_count=5,
            edge_count=4,
            dependencies={},
            circular_nodes=[],
            circular_count=0,
            global_metrics=sample_snapshot.global_metrics,
            changes=TemporalSnapshotChanges(
                added_nodes=[],
                removed_nodes=[],
                modified_dependencies=[
                    TemporalDependencyChange(node="a", added=["x"], removed=[])
                ],
                node_count_delta=0,
                edge_count_delta=0,
                circular_count_delta=0,
            ),
            graph_snapshot=sample_graph_snapshot,
        )

        heatmap = service._generate_churn_heatmap(
            [sample_snapshot, snapshot_with_changes]
        )

        assert len(heatmap) == 2
        assert heatmap[1].churn_count == 1
        assert "a" in heatmap[1].nodes_changed

    def test_track_circular_dependencies_empty(self, service):
        result = service._track_circular_dependencies([])

        assert result == []

    def test_track_circular_dependencies(
        self, service, sample_snapshot, sample_graph_snapshot
    ):
        snapshot2 = TemporalSnapshotData(
            commit_sha="def456",
            commit_message="Second",
            commit_date="2024-01-02T00:00:00Z",
            author="User",
            node_count=5,
            edge_count=4,
            dependencies={},
            circular_nodes=["a", "b", "c"],
            circular_count=3,
            global_metrics=sample_snapshot.global_metrics,
            changes=None,
            graph_snapshot=sample_graph_snapshot,
        )

        snapshots = [sample_snapshot, snapshot2]
        result = service._track_circular_dependencies(snapshots)

        assert len(result) == 2
        first_event = result[0]
        assert isinstance(first_event, CircularDependencyTimelineEvent)
        assert set(first_event.new_circular_nodes) == {"a", "b"}

        second_event = result[1]
        assert "c" in second_event.new_circular_nodes

    def test_get_cached_analysis_miss(self, service):
        result = service.get_cached_analysis("nonexistent")
        assert result is None

    def test_get_cached_analysis_hit(self, service):
        analysis = TemporalAnalysisResponse(
            analysis_id="test-id",
            repository="https://github.com/test/repo",
            start_date=None,
            end_date=None,
            total_commits=10,
            analyzed_commits=5,
            sample_strategy="all",
            snapshots=[],
            churn_data=ChurnHeatmapData(
                total_changes=0,
                average_churn_per_snapshot=0,
                node_churn={},
                top_churning_nodes=[],
                churn_heatmap=[],
            ),
            circular_deps_timeline=[],
        )

        service.snapshots_cache["test-id"] = analysis

        result = service.get_cached_analysis("test-id")

        assert result is not None
        assert result.analysis_id == "test-id"

    @pytest.mark.asyncio
    async def test_analyze_repository_history_streaming_no_commits(self, service):
        with patch.object(
            service.github_service,
            "fetch_commit_history",
            new_callable=AsyncMock,
        ) as mock_fetch:
            mock_fetch.return_value = []

            events = []
            async for event in service.analyze_repository_history_streaming(
                "https://github.com/test/repo"
            ):
                events.append(event)

            assert any(e.get("type") == "error" for e in events)

    @pytest.mark.asyncio
    async def test_analyze_repository_history_streaming_progress(self, service):
        with patch.object(
            service.github_service,
            "fetch_commit_history",
            new_callable=AsyncMock,
        ) as mock_history:
            mock_history.return_value = [
                {
                    "sha": "abc123",
                    "message": "Initial",
                    "author": "User",
                    "date": "2024-01-01T00:00:00Z",
                }
            ]

            with patch.object(
                service, "_analyze_commit", new_callable=AsyncMock
            ) as mock_analyze:
                mock_analyze.return_value = None

                events = []
                async for event in service.analyze_repository_history_streaming(
                    "https://github.com/test/repo"
                ):
                    events.append(event)

                progress_events = [e for e in events if e.get("type") == "progress"]
                assert len(progress_events) > 0

    def test_sample_commits_unknown_strategy_defaults_to_daily(self, service):
        commits = [
            {
                "sha": f"sha{i}",
                "message": f"Commit {i}",
                "author": "User",
                "date": f"2024-01-{i+1:02d}T00:00:00Z",
            }
            for i in range(5)
        ]

        result = service._sample_commits(commits, "unknown")

        assert len(result) == 5
