import secrets
from dataclasses import dataclass

from cachetools import TTLCache

from app.core.config import settings
from app.core.models import GitHubUser, GitHubRepo


@dataclass
class Session:
    session_id: str
    github_token: str
    user: GitHubUser
    repos: list[GitHubRepo]


class SessionService:
    def __init__(self):
        self._sessions: TTLCache[str, Session] = TTLCache(
            maxsize=settings.session_max_count,
            ttl=settings.session_expiry_hours * 3600,
        )

    def create(
        self, github_token: str, user: GitHubUser, repos: list[GitHubRepo]
    ) -> Session:
        session_id = secrets.token_urlsafe(32)
        session = Session(
            session_id=session_id, github_token=github_token, user=user, repos=repos
        )
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    def delete(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    def get_token(self, session_id: str | None) -> str | None:
        if not session_id:
            return None
        session = self.get(session_id)
        return session.github_token if session else None
