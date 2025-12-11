class CharonError(Exception):
    """Base exception for all Charon errors."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class GitHubError(CharonError):
    """Errors related to GitHub API operations."""

    pass


class RepositoryNotFoundError(GitHubError):
    """Repository does not exist or is not accessible."""

    pass


class RateLimitError(GitHubError):
    """GitHub API rate limit exceeded."""

    pass


class ParseError(CharonError):
    """Errors during file parsing."""

    def __init__(self, message: str, file_path: str):
        self.file_path = file_path
        super().__init__(f"{file_path}: {message}")


class AnalysisError(CharonError):
    """Errors during code analysis."""

    pass


class NotFoundError(CharonError):
    """Requested resource not found."""

    pass
