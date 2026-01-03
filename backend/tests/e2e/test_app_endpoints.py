import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest_asyncio.fixture
async def async_client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_health_endpoint(async_client: AsyncClient) -> None:
    response = await async_client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_auth_config_disabled(
    async_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "github_client_id", None)
    monkeypatch.setattr(settings, "github_client_secret", None)

    response = await async_client.get("/api/auth/github/config")

    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is False
    assert payload["client_id"] is None


@pytest.mark.asyncio
async def test_auth_device_requires_config(
    async_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "github_client_id", None)

    response = await async_client.post("/api/auth/github/device")

    assert response.status_code == 501
    payload = response.json()
    assert payload["error"] == "NotImplemented"
    assert payload["detail"] == "GitHub OAuth not configured"
    assert payload["status_code"] == 501


@pytest.mark.asyncio
async def test_validation_error_payload(async_client: AsyncClient) -> None:
    response = await async_client.post("/api/fitness/validate", json={})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"] == "ValidationError"
    assert payload["detail"] == "Request validation failed"
    assert payload["status_code"] == 422
    assert isinstance(payload["details"], list)
