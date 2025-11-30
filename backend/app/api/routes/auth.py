import aiohttp
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.core.models import (
    GitHubAuthConfig,
    GitHubAuthData,
    GitHubDeviceCodeResponse,
    GitHubDevicePollRequest,
    GitHubDevicePollResponse,
    GitHubRepo,
    GitHubTokenExchange,
    GitHubTokenResponse,
    GitHubUser,
)

router = APIRouter()


@router.get("/auth/github/config", response_model=GitHubAuthConfig)
async def get_github_config() -> GitHubAuthConfig:
    """Get GitHub OAuth configuration (client_id only, never secret)."""
    return GitHubAuthConfig(
        client_id=settings.github_client_id,
        enabled=settings.github_client_id is not None
        and settings.github_client_secret is not None,
    )


@router.post("/auth/github/token", response_model=GitHubTokenResponse)
async def exchange_github_token(request: GitHubTokenExchange) -> GitHubTokenResponse:
    """Exchange OAuth code for access token (stateless proxy)."""
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": request.code,
            },
            headers={"Accept": "application/json"},
        ) as response:
            if response.status != 200:
                raise HTTPException(status_code=400, detail="Token exchange failed")

            data = await response.json()
            if "error" in data:
                raise HTTPException(
                    status_code=400,
                    detail=data.get("error_description", data["error"]),
                )

            return GitHubTokenResponse(
                access_token=data["access_token"],
                token_type=data.get("token_type", "bearer"),
                scope=data.get("scope", ""),
            )


@router.get("/auth/github/me", response_model=GitHubAuthData)
async def get_github_auth_data(token: str) -> GitHubAuthData:
    """Get authenticated user info + their repos in one call."""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        # Fetch user
        async with session.get("https://api.github.com/user") as user_resp:
            if user_resp.status != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            user_data = await user_resp.json()

        # Fetch repos (owned + accessible)
        async with session.get(
            "https://api.github.com/user/repos",
            params={
                "per_page": 100,
                "sort": "pushed",
                "affiliation": "owner,collaborator,organization_member",
            },
        ) as repos_resp:
            repos_data = await repos_resp.json() if repos_resp.status == 200 else []

        return GitHubAuthData(
            user=GitHubUser(
                login=user_data["login"],
                avatar_url=user_data["avatar_url"],
                name=user_data.get("name"),
            ),
            repos=[
                GitHubRepo(
                    full_name=r["full_name"],
                    private=r["private"],
                    default_branch=r.get("default_branch", "main"),
                )
                for r in repos_data
            ],
        )


@router.post("/auth/github/device", response_model=GitHubDeviceCodeResponse)
async def start_device_flow() -> GitHubDeviceCodeResponse:
    """Start GitHub Device Flow - returns user code for user to enter on GitHub."""
    if not settings.github_client_id:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://github.com/login/device/code",
            data={
                "client_id": settings.github_client_id,
                "scope": "repo",
            },
            headers={"Accept": "application/json"},
        ) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=400, detail="Failed to start device flow"
                )

            data = await response.json()
            return GitHubDeviceCodeResponse(
                device_code=data["device_code"],
                user_code=data["user_code"],
                verification_uri=data["verification_uri"],
                expires_in=data["expires_in"],
                interval=data["interval"],
            )


@router.post("/auth/github/device/poll", response_model=GitHubDevicePollResponse)
async def poll_device_flow(
    request: GitHubDevicePollRequest,
) -> GitHubDevicePollResponse:
    """Poll for device flow token - returns token when user authorizes."""
    if not settings.github_client_id:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "device_code": request.device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
            headers={"Accept": "application/json"},
        ) as response:
            data = await response.json()

            if "error" in data:
                error = data["error"]
                if error == "authorization_pending":
                    return GitHubDevicePollResponse(status="pending")
                elif error == "slow_down":
                    return GitHubDevicePollResponse(status="pending")
                elif error == "expired_token":
                    return GitHubDevicePollResponse(
                        status="expired", error="Code expired"
                    )
                else:
                    return GitHubDevicePollResponse(
                        status="error", error=data.get("error_description", error)
                    )

            return GitHubDevicePollResponse(
                status="success",
                access_token=data["access_token"],
            )
