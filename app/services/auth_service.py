"""Auth service for user management and authentication."""

import logging
import sqlite3
from pathlib import Path
from typing import Optional

from app.core.security import hash_password, verify_password
from app.core.config import Settings
from app.models.user import UserPublic

logger = logging.getLogger(__name__)


class AuthService:
    """SQLite-backed user store with password hashing."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.db_path = Path(settings.auth_db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._ensure_admin()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()

    def _ensure_admin(self) -> None:
        if not self.settings.admin_email or not self.settings.admin_password:
            return

        existing = self.get_user_by_email(self.settings.admin_email)
        if existing:
            return

        try:
            self.create_user(
                email=self.settings.admin_email,
                password=self.settings.admin_password,
                role="admin",
            )
            logger.info("Admin user created from settings")
        except Exception as exc:
            logger.error(f"Failed to create admin user: {exc}")

    def create_user(self, email: str, password: str, role: str = "user") -> UserPublic:
        if len(password.encode("utf-8")) > 72:
            raise ValueError("Password too long (max 72 bytes)")
        password_hash = hash_password(password)

        with self._get_conn() as conn:
            cursor = conn.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
                (email.lower(), password_hash, role),
            )
            conn.commit()

        user_id = cursor.lastrowid
        return UserPublic(id=user_id, email=email.lower(), role=role)

    def authenticate(self, email: str, password: str) -> Optional[UserPublic]:
        if len(password.encode("utf-8")) > 72:
            return None
        row = self._get_user_row_by_email(email)
        if not row:
            return None
        if not verify_password(password, row["password_hash"]):
            return None
        return UserPublic(id=row["id"], email=row["email"], role=row["role"])

    def get_user_by_email(self, email: str) -> Optional[UserPublic]:
        row = self._get_user_row_by_email(email)
        if not row:
            return None
        return UserPublic(id=row["id"], email=row["email"], role=row["role"])

    def get_user_by_id(self, user_id: int) -> Optional[UserPublic]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT id, email, role FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        if not row:
            return None
        return UserPublic(id=row["id"], email=row["email"], role=row["role"])

    def _get_user_row_by_email(self, email: str) -> Optional[sqlite3.Row]:
        with self._get_conn() as conn:
            return conn.execute(
                "SELECT id, email, role, password_hash FROM users WHERE email = ?",
                (email.lower(),),
            ).fetchone()

    def count_users(self) -> int:
        with self._get_conn() as conn:
            return conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]

    def count_admins(self) -> int:
        with self._get_conn() as conn:
            return conn.execute(
                "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'"
            ).fetchone()["c"]
