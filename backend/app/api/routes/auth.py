import asyncio

import httpx
from fastapi import APIRouter, Cookie, Response
from httpx_oauth.clients.github import GitHubOAuth2

from app.api.routes import ERROR_RESPONSES
from app.core.config import settings
from app.core.exceptions import (
    FeatureNotConfiguredError,
    GitHubError,
    UnauthorizedError,
)
from app.core.models import (
    GitHubAuthConfig,
    GitHubDeviceCodeResponse,
    GitHubDevicePollRequest,
    GitHubDevicePollResponse,
    GitHubRepo,
    GitHubSessionResponse,
    GitHubTokenExchange,
    GitHubUser,
)
from app.services.infrastructure.session import SessionService

router = APIRouter()
_sessions = SessionService()


def get_session_token(session_id: str | None) -> str | None:
    return _sessions.get_token(session_id)


_github_oauth = (
    GitHubOAuth2(
        client_id=settings.github_client_id or "",
        client_secret=settings.github_client_secret or "",
        scopes=["repo"],
    )
    if settings.github_client_id and settings.github_client_secret
    else None
)


async def _fetch_user_and_repos(token: str) -> tuple[GitHubUser, list[GitHubRepo]]:
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    async with httpx.AsyncClient(headers=headers, timeout=30) as client:
        user_resp, repos_resp = await asyncio.gather(
            client.get(f"{settings.github_api_base}/user"),
            client.get(
                f"{settings.github_api_base}/user/repos",
                params={
                    "per_page": 100,
                    "sort": "pushed",
                    "affiliation": "owner,collaborator,organization_member",
                },
            ),
        )
        if user_resp.status_code != 200:
            raise UnauthorizedError("Invalid token")
        user_data = user_resp.json()
        repos_data = repos_resp.json() if repos_resp.status_code == 200 else []

    return (
        GitHubUser(
            login=user_data["login"],
            avatar_url=user_data["avatar_url"],
            name=user_data.get("name"),
        ),
        [
            GitHubRepo(
                full_name=r["full_name"],
                private=r["private"],
                default_branch=r.get("default_branch", "main"),
            )
            for r in repos_data
        ],
    )


def _set_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=settings.session_expiry_hours * 3600,
        path="/",
    )


@router.get(
    "/auth/github/config",
    response_model=GitHubAuthConfig,
    responses=ERROR_RESPONSES,
)
async def get_config() -> GitHubAuthConfig:
    return GitHubAuthConfig(
        client_id=settings.github_client_id,
        enabled=bool(settings.github_client_id and settings.github_client_secret),
    )


@router.post(
    "/auth/github/callback",
    response_model=GitHubSessionResponse,
    responses=ERROR_RESPONSES,
)
async def oauth_callback(
    request: GitHubTokenExchange,
    response: Response,
) -> GitHubSessionResponse:
    if not _github_oauth:
        raise FeatureNotConfiguredError("GitHub OAuth not configured")

    token = await _github_oauth.get_access_token(request.code, "")
    user, repos = await _fetch_user_and_repos(token["access_token"])
    session = _sessions.create(token["access_token"], user, repos)
    _set_cookie(response, session.session_id)
    return GitHubSessionResponse(success=True, user=user, repos=repos)


@router.get(
    "/auth/github/session",
    response_model=GitHubSessionResponse,
    responses=ERROR_RESPONSES,
)
async def get_session(
    session_id: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> GitHubSessionResponse:
    if not session_id:
        return GitHubSessionResponse(success=False, message="No session")
    session = _sessions.get(session_id)
    if not session:
        return GitHubSessionResponse(success=False, message="Session expired")
    return GitHubSessionResponse(success=True, user=session.user, repos=session.repos)


@router.post(
    "/auth/github/logout",
    response_model=GitHubSessionResponse,
    responses=ERROR_RESPONSES,
)
async def logout(
    response: Response,
    session_id: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> GitHubSessionResponse:
    if session_id:
        _sessions.delete(session_id)
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    return GitHubSessionResponse(success=True, message="Logged out")


@router.post(
    "/auth/github/device",
    response_model=GitHubDeviceCodeResponse,
    responses=ERROR_RESPONSES,
)
async def start_device_flow() -> GitHubDeviceCodeResponse:
    if not settings.github_client_id:
        raise FeatureNotConfiguredError("GitHub OAuth not configured")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://github.com/login/device/code",
            data={"client_id": settings.github_client_id, "scope": "repo"},
            headers={"Accept": "application/json"},
        )
        if resp.status_code != 200:
            raise GitHubError("Failed to start device flow")
        data = resp.json()

    return GitHubDeviceCodeResponse(
        device_code=data["device_code"],
        user_code=data["user_code"],
        verification_uri=data["verification_uri"],
        expires_in=data["expires_in"],
        interval=data["interval"],
    )


@router.post(
    "/auth/github/device/poll",
    response_model=GitHubDevicePollResponse,
    responses=ERROR_RESPONSES,
)
async def poll_device_flow(
    request: GitHubDevicePollRequest,
    response: Response,
) -> GitHubDevicePollResponse:
    if not settings.github_client_id:
        raise FeatureNotConfiguredError("GitHub OAuth not configured")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "device_code": request.device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
            headers={"Accept": "application/json"},
        )
        data = resp.json()

    if "error" in data:
        error = data["error"]
        if error in ("authorization_pending", "slow_down"):
            return GitHubDevicePollResponse(status="pending")
        if error == "expired_token":
            return GitHubDevicePollResponse(status="expired", error="Code expired")
        return GitHubDevicePollResponse(
            status="error", error=data.get("error_description", error)
        )

    access_token = data["access_token"]
    user, repos = await _fetch_user_and_repos(access_token)
    session = _sessions.create(access_token, user, repos)
    _set_cookie(response, session.session_id)
    return GitHubDevicePollResponse(status="success")
