import asyncio

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.api.endpoints.courses import get_search_service


class FakeSearchService:
    def check_connection(self) -> bool:
        return True


def build_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


def test_root_endpoint():
    async def scenario():
        async with build_client() as client:
            r = await client.get("/")
            assert r.status_code == 200
            data = r.json()
            assert "name" in data
            assert "health" in data

    asyncio.run(scenario())


def test_health_endpoint_overridden_dependency():
    async def scenario():
        app.dependency_overrides[get_search_service] = lambda settings=None: FakeSearchService()
        try:
            async with build_client() as client:
                r = await client.get("/api/v1/health")
                assert r.status_code == 200
                data = r.json()
                assert data["meilisearch_status"] == "connected"
        finally:
            app.dependency_overrides.clear()

    asyncio.run(scenario())
