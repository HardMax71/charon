from unittest.mock import AsyncMock, MagicMock, patch

import networkx as nx
import pytest

from app.core.models import (
    DiffEdge,
    DiffEdgeChange,
    DiffResult,
    FileInput,
    GitHubRepo,
    GitHubUser,
)
from app.services.infrastructure.session import Session, SessionService
from app.services.temporal.diff import DiffService


class TestSessionService:
    @pytest.fixture
    def service(self):
        return SessionService()

    @pytest.fixture
    def sample_user(self):
        return GitHubUser(
            login="testuser",
            avatar_url="https://example.com/avatar.png",
            name="Test User",
        )

    @pytest.fixture
    def sample_repos(self):
        return [
            GitHubRepo(full_name="user/repo1", private=False, default_branch="main"),
            GitHubRepo(full_name="user/repo2", private=True, default_branch="develop"),
        ]

    def test_create_session(self, service, sample_user, sample_repos):
        session = service.create("github_token_123", sample_user, sample_repos)

        assert isinstance(session, Session)
        assert session.github_token == "github_token_123"
        assert session.user == sample_user
        assert len(session.repos) == 2
        assert len(session.session_id) > 0

    def test_get_session_exists(self, service, sample_user, sample_repos):
        created = service.create("token", sample_user, sample_repos)

        result = service.get(created.session_id)

        assert result is not None
        assert result.session_id == created.session_id

    def test_get_session_not_exists(self, service):
        result = service.get("nonexistent_session_id")

        assert result is None

    def test_delete_session_exists(self, service, sample_user, sample_repos):
        created = service.create("token", sample_user, sample_repos)

        result = service.delete(created.session_id)

        assert result is True
        assert service.get(created.session_id) is None

    def test_delete_session_not_exists(self, service):
        result = service.delete("nonexistent_session_id")

        assert result is False

    def test_get_token_with_session(self, service, sample_user, sample_repos):
        created = service.create("my_token", sample_user, sample_repos)

        token = service.get_token(created.session_id)

        assert token == "my_token"

    def test_get_token_no_session_id(self, service):
        token = service.get_token(None)

        assert token is None

    def test_get_token_session_not_found(self, service):
        token = service.get_token("nonexistent")

        assert token is None


class TestSession:
    def test_session_dataclass(self):
        user = GitHubUser(login="user", avatar_url="url", name="Name")
        repos = [GitHubRepo(full_name="u/r", private=False, default_branch="main")]

        session = Session(
            session_id="sid123",
            github_token="token123",
            user=user,
            repos=repos,
        )

        assert session.session_id == "sid123"
        assert session.github_token == "token123"
        assert session.user.login == "user"
        assert len(session.repos) == 1


class TestDiffService:
    @pytest.fixture
    def graph1(self):
        g = nx.DiGraph()
        g.add_node("a", type="internal")
        g.add_node("b", type="internal")
        g.add_node("c", type="internal")
        g.add_edge("a", "b", imports=["x", "y"])
        g.add_edge("b", "c", imports=["z"])
        return g

    @pytest.fixture
    def graph2(self):
        g = nx.DiGraph()
        g.add_node("a", type="internal")
        g.add_node("b", type="internal")
        g.add_node("d", type="internal")
        g.add_edge("a", "b", imports=["x", "w"])
        g.add_edge("a", "d", imports=["new"])
        return g

    def test_compare_graphs_added_nodes(self, graph1, graph2):
        result = DiffService.compare_graphs(graph1, graph2)

        assert "d" in result.added_nodes
        assert "c" in result.removed_nodes

    def test_compare_graphs_added_edges(self, graph1, graph2):
        result = DiffService.compare_graphs(graph1, graph2)

        added_edge_pairs = [(e.source, e.target) for e in result.added_edges]
        assert ("a", "d") in added_edge_pairs

    def test_compare_graphs_removed_edges(self, graph1, graph2):
        result = DiffService.compare_graphs(graph1, graph2)

        removed_edge_pairs = [(e.source, e.target) for e in result.removed_edges]
        assert ("b", "c") in removed_edge_pairs

    def test_compare_graphs_changed_imports(self, graph1, graph2):
        result = DiffService.compare_graphs(graph1, graph2)

        assert len(result.changed_edges) == 1
        change = result.changed_edges[0]
        assert change.source == "a"
        assert change.target == "b"
        assert "w" in change.added_imports
        assert "y" in change.removed_imports

    def test_compare_graphs_identical(self):
        g1 = nx.DiGraph()
        g1.add_node("a")
        g1.add_edge("a", "b", imports=["x"])

        g2 = nx.DiGraph()
        g2.add_node("a")
        g2.add_edge("a", "b", imports=["x"])

        result = DiffService.compare_graphs(g1, g2)

        assert len(result.added_nodes) == 0
        assert len(result.removed_nodes) == 0
        assert len(result.changed_edges) == 0

    def test_compare_graphs_empty(self):
        g1 = nx.DiGraph()
        g2 = nx.DiGraph()

        result = DiffService.compare_graphs(g1, g2)

        assert isinstance(result, DiffResult)
        assert len(result.added_nodes) == 0

    @pytest.mark.asyncio
    async def test_fetch_version_files(self):
        mock_github = MagicMock()
        mock_github.fetch_repository = AsyncMock(
            return_value=MagicMock(
                files=[
                    FileInput(path="main.py", content="pass"),
                ]
            )
        )

        result = await DiffService.fetch_version_files(
            "https://github.com/owner/repo",
            "v1.0.0",
            mock_github,
        )

        assert len(result) == 1
        mock_github.fetch_repository.assert_called_once()

    @pytest.mark.asyncio
    async def test_analyze_and_build_graph(self):
        files = [
            FileInput(path="app/main.py", content="import os\n"),
            FileInput(path="app/utils.py", content="def helper(): pass\n"),
        ]

        with patch("app.services.temporal.diff.analyze_files") as mock_analyze:
            mock_analyze.return_value = MagicMock(
                modules={"app.main": "", "app.utils": ""},
                dependencies={"app.main": set()},
                import_details={},
                complexity={},
                module_metadata={},
            )

            result = await DiffService.analyze_and_build_graph(files, "test")

            assert isinstance(result, nx.DiGraph)


class TestDiffResult:
    def test_diff_result_model(self):
        result = DiffResult(
            added_nodes=["a", "b"],
            removed_nodes=["c"],
            added_edges=[DiffEdge(source="a", target="b")],
            removed_edges=[DiffEdge(source="c", target="d")],
            changed_edges=[
                DiffEdgeChange(
                    source="x",
                    target="y",
                    added_imports=["new"],
                    removed_imports=["old"],
                )
            ],
        )

        assert len(result.added_nodes) == 2
        assert len(result.removed_nodes) == 1
        assert len(result.added_edges) == 1
        assert len(result.removed_edges) == 1
        assert len(result.changed_edges) == 1


class TestDiffEdge:
    def test_diff_edge_model(self):
        edge = DiffEdge(source="module.a", target="module.b")

        assert edge.source == "module.a"
        assert edge.target == "module.b"


class TestDiffEdgeChange:
    def test_diff_edge_change_model(self):
        change = DiffEdgeChange(
            source="a",
            target="b",
            added_imports=["new_import"],
            removed_imports=["old_import"],
        )

        assert change.source == "a"
        assert "new_import" in change.added_imports
        assert "old_import" in change.removed_imports
