import asyncio

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.auth import get_auth_service
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


def test_register_and_login_flow():
    async def scenario():
        transport = ASGITransport(app=app)
        fake = FakeAuthService()
        app.dependency_overrides[get_auth_service] = lambda settings=None: fake
        try:
            async with AsyncClient(transport=transport, base_url="http://testserver") as client:
                payload = {"email": "tester@example.com", "password": "password123"}

                r = await client.post("/api/v1/auth/register", json=payload)
                assert r.status_code == 200, r.text
                data = r.json()
                assert "access_token" in data
                assert data["user"]["email"] == "tester@example.com"

                r2 = await client.post("/api/v1/auth/login", json=payload)
                assert r2.status_code == 200, r2.text
                data2 = r2.json()
                assert "access_token" in data2

                r3 = await client.post(
                    "/api/v1/auth/login",
                    json={"email": "nope@example.com", "password": "password123"},
                )
                assert r3.status_code == 401
        finally:
            app.dependency_overrides.clear()

    asyncio.run(scenario())
