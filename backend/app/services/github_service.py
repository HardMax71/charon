import asyncio

import aiohttp

from app.core import SUPPORTED_EXTENSIONS
from app.core.config import settings
from app.core.models import FileInput

SKIP_DIRS = frozenset({
    'node_modules', 'dist', 'build', '.git', 'vendor', '__pycache__',
    'venv', '.venv', 'env', '.env', 'coverage', '.next', 'target',
    'out', '.cache', 'bower_components', '.tox', 'eggs', '.mypy_cache',
    '.pytest_cache', '.ruff_cache', 'site-packages', '.gradle',
    'bin', 'obj', 'packages', '.nuget', 'Debug', 'Release', 'test',
    'tests', '__tests__', 'spec', 'specs', 'fixtures', '__fixtures__',
    'mocks', '__mocks__', 'e2e', 'cypress', 'playwright',
})

MAX_FILE_SIZE = 500_000


class GitHubService:
    """Service for fetching files from GitHub repositories."""

    def __init__(self):
        self.api_base = settings.github_api_base
        self.raw_base = settings.github_raw_base

    async def _get_default_branch(
        self, owner: str, repo: str, token: str | None = None
    ) -> str:
        """Get the default branch of a repository."""
        url = f"{self.api_base}/repos/{owner}/{repo}"
        headers = {"Authorization": f"token {token}"} if token else {}

        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url) as response:
                if response.status == 404:
                    raise Exception(
                        f"Repository '{owner}/{repo}' not found. Make sure the repository exists and you have access."
                    )
                elif response.status != 200:
                    return "main"  # Fallback

                data = await response.json()
                return data.get("default_branch", "main")

    async def fetch_repository(
        self, url: str, ref: str | None = None, token: str | None = None
    ) -> list[FileInput]:
        """
        Fetch all supported source files from a GitHub repository.

        Supports: Python, JavaScript, TypeScript, Go, Java, Rust

        Args:
            url: GitHub repository URL (e.g., https://github.com/owner/repo)
            ref: Git reference (branch, tag, or commit SHA)
            token: Optional GitHub token for private repos / higher rate limits

        Returns:
            List of FileInput objects
        """
        owner, repo = self._parse_github_url(url)

        # Auto-detect default branch if not specified
        if ref is None:
            ref = await self._get_default_branch(owner, repo, token)

        tree = await self._get_repository_tree(owner, repo, ref, token)

        source_files = [
            item
            for item in tree
            if item["type"] == "blob"
            and item.get("size", 0) < MAX_FILE_SIZE
            and self._is_supported_file(item["path"])
            and not self._should_skip_path(item["path"])
        ]

        sem = asyncio.Semaphore(100)

        async def fetch_one(
            session: aiohttp.ClientSession, path: str
        ) -> FileInput | None:
            async with sem:
                content = await self._fetch_file_content(
                    session, owner, repo, path, ref, token
                )
                return FileInput(path=path, content=content) if content else None

        connector = aiohttp.TCPConnector(limit=100, limit_per_host=50)
        headers = {"Authorization": f"token {token}"} if token else {}
        async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
            tasks = [fetch_one(session, f["path"]) for f in source_files]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        return [r for r in results if isinstance(r, FileInput)]

    def _should_skip_path(self, path: str) -> bool:
        parts = path.split('/')
        return any(
            part in SKIP_DIRS or part.startswith('.')
            for part in parts[:-1]
        )

    def _is_supported_file(self, path: str) -> bool:
        return any(path.endswith(ext) for ext in SUPPORTED_EXTENSIONS)

    async def fetch_commit_history(
        self,
        url: str,
        start_date: str | None = None,
        end_date: str | None = None,
        max_commits: int = 50,
        token: str | None = None,
    ) -> list[dict]:
        """
        Fetch commit history from a GitHub repository.

        Args:
            url: GitHub repository URL
            start_date: Optional start date (ISO format)
            end_date: Optional end date (ISO format)
            max_commits: Maximum number of commits to fetch
            token: Optional GitHub token for authentication

        Returns:
            List of commit dictionaries
        """
        owner, repo = self._parse_github_url(url)

        api_url = f"{self.api_base}/repos/{owner}/{repo}/commits"
        params = {"per_page": min(max_commits, 100)}
        headers = {"Authorization": f"token {token}"} if token else {}

        if start_date:
            params["since"] = start_date
        if end_date:
            params["until"] = end_date

        commits = []
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(api_url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(
                        f"Failed to fetch commits (status {response.status}): {error_text}"
                    )

                data = await response.json()

                for commit_data in data[:max_commits]:
                    commits.append(
                        {
                            "sha": commit_data["sha"],
                            "message": commit_data["commit"]["message"].split("\n")[
                                0
                            ],  # First line only
                            "author": commit_data["commit"]["author"]["name"],
                            "date": commit_data["commit"]["author"]["date"],
                        }
                    )

        return commits

    async def fetch_repository_at_commit(
        self, url: str, commit_sha: str, token: str | None = None
    ) -> list[FileInput]:
        """
        Fetch repository files at a specific commit.

        Args:
            url: GitHub repository URL
            commit_sha: Commit SHA
            token: Optional GitHub token for authentication

        Returns:
            List of FileInput objects
        """
        return await self.fetch_repository(url, ref=commit_sha, token=token)

    def _parse_github_url(self, url: str) -> tuple[str, str]:
        """
        Parse GitHub URL to extract owner and repo.

        Args:
            url: GitHub URL

        Returns:
            Tuple of (owner, repo)
        """
        # Remove trailing slash
        url = url.rstrip("/")

        # Handle different URL formats
        if "github.com" in url:
            parts = url.split("github.com/")[-1].split("/")
            if len(parts) >= 2:
                return parts[0], parts[1]

        raise ValueError(f"Invalid GitHub URL: {url}")

    async def _get_repository_tree(
        self, owner: str, repo: str, ref: str, token: str | None = None
    ) -> list[dict]:
        """
        Get the repository file tree recursively.

        Args:
            owner: Repository owner
            repo: Repository name
            ref: Git reference
            token: Optional GitHub token for authentication

        Returns:
            List of file/directory items
        """
        url = f"{self.api_base}/repos/{owner}/{repo}/git/trees/{ref}?recursive=1"
        headers = {"Authorization": f"token {token}"} if token else {}

        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url) as response:
                if response.status == 404:
                    raise Exception(
                        f"Repository '{owner}/{repo}' not found or ref '{ref}' doesn't exist. Make sure the repository is public."
                    )
                elif response.status == 403:
                    raise Exception(
                        "GitHub API rate limit exceeded. Try again later or use a GitHub token."
                    )
                elif response.status != 200:
                    error_text = await response.text()
                    raise Exception(
                        f"Failed to fetch repository (status {response.status}): {error_text}"
                    )

                data = await response.json()
                return data.get("tree", [])

    async def _fetch_file_content(
        self, session: aiohttp.ClientSession, owner: str, repo: str, path: str, ref: str, token: str | None = None
    ) -> str | None:
        """
        Fetch content of a single file.

        Args:
            session: aiohttp session
            owner: Repository owner
            repo: Repository name
            path: File path
            ref: Git reference

        Returns:
            File content as string, or None if failed
        """
        url = f"{self.raw_base}/{owner}/{repo}/{ref}/{path}"

        try:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.text()
                return None
        except Exception:
            return None
