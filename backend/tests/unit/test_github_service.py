from unittest.mock import AsyncMock, patch
import pytest

from app.core.exceptions import (
    GitHubError,
    RateLimitError,
    RepositoryNotFoundError,
)
from app.services.infrastructure.github import (
    GitHubService,
    FetchResult,
    SKIP_DIRS,
    MAX_FILE_SIZE,
)


class MockResponse:
    def __init__(self, status, json_data=None, text_data=None):
        self.status = status
        self._json_data = json_data
        self._text_data = text_data

    async def json(self):
        return self._json_data

    async def text(self):
        return self._text_data

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass


class MockSession:
    def __init__(self, response):
        self._response = response

    def get(self, url, **kwargs):
        return self._response

    def post(self, url, **kwargs):
        return self._response

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass


class TestGitHubService:
    @pytest.fixture
    def service(self):
        return GitHubService()

    def test_init(self, service):
        assert service.api_base is not None
        assert service.raw_base is not None

    @pytest.mark.parametrize(
        "url,expected",
        [
            ("https://github.com/owner/repo", ("owner", "repo")),
            ("https://github.com/owner/repo/", ("owner", "repo")),
            ("http://github.com/user/project", ("user", "project")),
            ("https://github.com/org/repo-name", ("org", "repo-name")),
        ],
        ids=["basic", "trailing_slash", "http", "hyphen_repo"],
    )
    def test_parse_github_url(self, service, url, expected):
        result = service._parse_github_url(url)
        assert result == expected

    def test_parse_github_url_invalid(self, service):
        with pytest.raises(ValueError):
            service._parse_github_url("https://gitlab.com/user/repo")

    @pytest.mark.parametrize(
        "path,expected",
        [
            ("src/main.py", True),
            ("app/utils.ts", True),
            ("lib/helper.js", True),
            ("pkg/main.go", True),
            ("src/Main.java", True),
            ("src/lib.rs", True),
            ("README.md", False),
            ("package.json", False),
            ("image.png", False),
        ],
        ids=["py", "ts", "js", "go", "java", "rust", "md", "json", "png"],
    )
    def test_is_supported_file(self, service, path, expected):
        result = service._is_supported_file(path)
        assert result == expected

    @pytest.mark.parametrize(
        "path,expected",
        [
            ("src/main.py", False),
            ("node_modules/lib/index.js", True),
            ("dist/bundle.js", True),
            ("vendor/lib.go", True),
            ("__pycache__/mod.pyc", True),
            (".git/config", True),
            ("tests/test_app.py", True),
            ("src/.hidden/file.py", True),
            (".env/config.py", True),
        ],
        ids=[
            "normal_src",
            "node_modules",
            "dist",
            "vendor",
            "pycache",
            "git",
            "tests",
            "hidden_dir",
            "env",
        ],
    )
    def test_should_skip_path(self, service, path, expected):
        result = service._should_skip_path(path)
        assert result == expected

    @pytest.mark.asyncio
    async def test_get_default_branch_success(self, service):
        response = MockResponse(200, json_data={"default_branch": "develop"})
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            result = await service._get_default_branch("owner", "repo")
            assert result == "develop"

    @pytest.mark.asyncio
    async def test_get_default_branch_not_found(self, service):
        response = MockResponse(404)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(RepositoryNotFoundError):
                await service._get_default_branch("owner", "repo")

    @pytest.mark.asyncio
    async def test_get_default_branch_rate_limit(self, service):
        response = MockResponse(403)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(RateLimitError):
                await service._get_default_branch("owner", "repo")

    @pytest.mark.asyncio
    async def test_get_default_branch_other_error(self, service):
        response = MockResponse(500)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            result = await service._get_default_branch("owner", "repo")
            assert result == "main"

    @pytest.mark.asyncio
    async def test_get_repository_tree_success(self, service):
        response = MockResponse(
            200,
            json_data={
                "tree": [
                    {"path": "src/main.py", "type": "blob", "size": 100},
                    {"path": "src/utils.py", "type": "blob", "size": 200},
                ],
                "truncated": False,
            },
        )
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            result = await service._get_repository_tree("owner", "repo", "main")
            assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_repository_tree_not_found(self, service):
        response = MockResponse(404)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(RepositoryNotFoundError):
                await service._get_repository_tree("owner", "repo", "main")

    @pytest.mark.asyncio
    async def test_get_repository_tree_rate_limit(self, service):
        response = MockResponse(403)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(RateLimitError):
                await service._get_repository_tree("owner", "repo", "main")

    @pytest.mark.asyncio
    async def test_get_repository_tree_other_error(self, service):
        response = MockResponse(500)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(GitHubError):
                await service._get_repository_tree("owner", "repo", "main")

    @pytest.mark.asyncio
    async def test_get_repository_tree_truncated(self, service):
        response = MockResponse(200, json_data={"tree": [], "truncated": True})
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(GitHubError, match="truncated"):
                await service._get_repository_tree("owner", "repo", "main")

    @pytest.mark.asyncio
    async def test_fetch_commit_history_success(self, service):
        response = MockResponse(
            200,
            json_data=[
                {
                    "sha": "abc123",
                    "commit": {
                        "message": "Initial commit\nMore details",
                        "author": {"name": "User", "date": "2024-01-01T00:00:00Z"},
                    },
                },
                {
                    "sha": "def456",
                    "commit": {
                        "message": "Second commit",
                        "author": {"name": "User2", "date": "2024-01-02T00:00:00Z"},
                    },
                },
            ],
        )
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            result = await service.fetch_commit_history(
                "https://github.com/owner/repo",
                start_date="2024-01-01",
                end_date="2024-01-31",
                max_commits=50,
            )

            assert len(result) == 2
            assert result[0]["sha"] == "abc123"
            assert result[0]["message"] == "Initial commit"

    @pytest.mark.asyncio
    async def test_fetch_commit_history_not_found(self, service):
        response = MockResponse(404)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(RepositoryNotFoundError):
                await service.fetch_commit_history("https://github.com/owner/repo")

    @pytest.mark.asyncio
    async def test_fetch_commit_history_rate_limit(self, service):
        response = MockResponse(403)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(RateLimitError):
                await service.fetch_commit_history("https://github.com/owner/repo")

    @pytest.mark.asyncio
    async def test_fetch_commit_history_error(self, service):
        response = MockResponse(500)
        session = MockSession(response)

        with patch("aiohttp.ClientSession", return_value=session):
            with pytest.raises(GitHubError):
                await service.fetch_commit_history("https://github.com/owner/repo")

    @pytest.mark.asyncio
    async def test_fetch_repository_at_commit(self, service):
        with patch.object(
            service, "fetch_repository", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = FetchResult(
                files=[], total_files=0, failed_count=0
            )

            await service.fetch_repository_at_commit(
                "https://github.com/owner/repo",
                "abc123",
                token="token",
            )

            mock_fetch.assert_called_once_with(
                "https://github.com/owner/repo", ref="abc123", token="token"
            )

    def test_skip_dirs_contains_common_dirs(self):
        expected_dirs = {
            "node_modules",
            "dist",
            "build",
            ".git",
            "__pycache__",
            "venv",
            ".venv",
            "tests",
            "test",
        }
        for d in expected_dirs:
            assert d in SKIP_DIRS

    def test_max_file_size_reasonable(self):
        assert MAX_FILE_SIZE == 500_000
