import asyncio

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.auth import get_auth_service
from app.api.endpoints.courses import get_search_service
from app.api.endpoints.chat import get_analytics_service
from app.models.user import UserPublic


class FakeAuthService:
    def __init__(self, settings=None):
        self._users = {}
        self._passwords = {}
        self._next_id = 1

    def get_user_by_email(self, email: str):
        for u in self._users.values():
            if u.email == email:
                return u
        return None

    def create_user(self, email: str, password: str, role: str = "user"):
        user = UserPublic(id=self._next_id, email=email, role=role)
        self._users[self._next_id] = user
        self._passwords[email] = password
        self._next_id += 1
        return user

    def get_user_by_id(self, user_id: int):
        return self._users.get(user_id)

    def verify_password_for_email(self, email: str, password: str) -> bool:
        expected = self._passwords.get(email)
        return expected is not None and expected == password


class FakeSearchService:
    def check_connection(self) -> bool:
        return True

    def search(self, query, limit, offset, filters=None, hybrid_search=False, semantic_ratio=0.5):
        return {
            "query": query,
            "hits": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
            "processing_time_ms": 1,
        }


class FakeAnalyticsService:
    def log_query(self, *args, **kwargs):
        return None


def test_register_login_and_search_flow():
    async def scenario():
        transport = ASGITransport(app=app)
        fake_auth = FakeAuthService()
        fake_search = FakeSearchService()
        fake_analytics = FakeAnalyticsService()

        app.dependency_overrides[get_auth_service] = lambda settings=None: fake_auth
        app.dependency_overrides[get_search_service] = lambda settings=None: fake_search
        app.dependency_overrides[get_analytics_service] = lambda settings=None: fake_analytics
        try:
            async with AsyncClient(transport=transport, base_url="http://testserver") as client:
                payload = {"email": "flow@example.com", "password": "pass1234"}
                r = await client.post("/api/v1/auth/register", json=payload)
                assert r.status_code == 200
                token = r.json()["access_token"]

                headers = {"Authorization": f"Bearer {token}"}
                r2 = await client.get("/api/v1/search?q=test", headers=headers)
                assert r2.status_code == 200
                data = r2.json()
                assert data["total"] == 0
        finally:
            app.dependency_overrides.clear()

    asyncio.run(scenario())
