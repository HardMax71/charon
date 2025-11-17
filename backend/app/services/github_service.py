import aiohttp
from typing import List, Optional
from datetime import datetime
from app.core.models import FileInput
from app.core.config import settings


class GitHubService:
    """Service for fetching files from GitHub repositories."""

    def __init__(self):
        self.api_base = settings.github_api_base
        self.raw_base = settings.github_raw_base

    async def fetch_repository(self, url: str, ref: str = "main") -> List[FileInput]:
        """
        Fetch all Python files from a GitHub repository.

        Args:
            url: GitHub repository URL (e.g., https://github.com/owner/repo)
            ref: Git reference (branch, tag, or commit SHA)

        Returns:
            List of FileInput objects
        """
        # Parse owner and repo from URL
        owner, repo = self._parse_github_url(url)

        # Get repository tree
        tree = await self._get_repository_tree(owner, repo, ref)

        # Filter Python files
        python_files = [
            item for item in tree if item["path"].endswith(".py") and item["type"] == "blob"
        ]

        # Fetch file contents
        files = []
        async with aiohttp.ClientSession() as session:
            for file_info in python_files:
                content = await self._fetch_file_content(
                    session, owner, repo, file_info["path"], ref
                )
                if content:
                    files.append(FileInput(path=file_info["path"], content=content))

        return files

    async def fetch_commit_history(
        self,
        url: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        max_commits: int = 50
    ) -> List[dict]:
        """
        Fetch commit history from a GitHub repository.

        Args:
            url: GitHub repository URL
            start_date: Optional start date (ISO format)
            end_date: Optional end date (ISO format)
            max_commits: Maximum number of commits to fetch

        Returns:
            List of commit dictionaries
        """
        owner, repo = self._parse_github_url(url)

        # Build API URL with parameters
        api_url = f"{self.api_base}/repos/{owner}/{repo}/commits"
        params = {"per_page": min(max_commits, 100)}

        if start_date:
            params["since"] = start_date
        if end_date:
            params["until"] = end_date

        commits = []
        async with aiohttp.ClientSession() as session:
            async with session.get(api_url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(
                        f"Failed to fetch commits (status {response.status}): {error_text}"
                    )

                data = await response.json()

                for commit_data in data[:max_commits]:
                    commits.append({
                        "sha": commit_data["sha"],
                        "message": commit_data["commit"]["message"].split("\n")[0],  # First line only
                        "author": commit_data["commit"]["author"]["name"],
                        "date": commit_data["commit"]["author"]["date"],
                    })

        return commits

    async def fetch_repository_at_commit(
        self, url: str, commit_sha: str
    ) -> List[FileInput]:
        """
        Fetch repository files at a specific commit.

        Args:
            url: GitHub repository URL
            commit_sha: Commit SHA

        Returns:
            List of FileInput objects
        """
        return await self.fetch_repository(url, ref=commit_sha)

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
        self, owner: str, repo: str, ref: str
    ) -> List[dict]:
        """
        Get the repository file tree recursively.

        Args:
            owner: Repository owner
            repo: Repository name
            ref: Git reference

        Returns:
            List of file/directory items
        """
        url = f"{self.api_base}/repos/{owner}/{repo}/git/trees/{ref}?recursive=1"

        async with aiohttp.ClientSession() as session:
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
        self, session: aiohttp.ClientSession, owner: str, repo: str, path: str, ref: str
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
