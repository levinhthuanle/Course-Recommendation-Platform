"""Auth service for user management and authentication.

Supports PostgreSQL via `Settings.database_url`. Falls back to SQLite when
`database_url` is empty (preserves previous behavior).
"""

import logging
from pathlib import Path
from typing import Optional

from app.core.security import hash_password, verify_password
from app.core.config import Settings
from app.models.user import UserPublic

logger = logging.getLogger(__name__)


class AuthService:
    """User store supporting SQLite (default) or PostgreSQL when configured."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.use_postgres = bool(settings.database_url)

        if not self.use_postgres:
            import sqlite3

            self._sqlite = sqlite3
            self.db_path = Path(settings.auth_db_path)
            self.db_path.parent.mkdir(parents=True, exist_ok=True)

        else:
            # Lazy import psycopg2 extras
            import psycopg2
            import psycopg2.extras

            self._psycopg2 = psycopg2
            self._psycopg2_extras = psycopg2.extras

        self._init_db()
        self._ensure_admin()

    # Connection helpers
    def _get_sqlite_conn(self):
        conn = self._sqlite.connect(self.db_path)
        conn.row_factory = self._sqlite.Row
        return conn

    def _get_pg_conn(self):
        return self._psycopg2.connect(self.settings.database_url)

    def _init_db(self) -> None:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
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
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS users (
                            id SERIAL PRIMARY KEY,
                            email TEXT UNIQUE NOT NULL,
                            password_hash TEXT NOT NULL,
                            role TEXT NOT NULL DEFAULT 'user',
                            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                        )
                        """
                    )
                    conn.commit()
            finally:
                conn.close()

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

        email_l = email.lower()
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                cursor = conn.execute(
                    "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
                    (email_l, password_hash, role),
                )
                conn.commit()
                user_id = cursor.lastrowid
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s) RETURNING id",
                        (email_l, password_hash, role),
                    )
                    user_id = cur.fetchone()[0]
                    conn.commit()
            finally:
                conn.close()

        return UserPublic(id=user_id, email=email_l, role=role)

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
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                row = conn.execute(
                    "SELECT id, email, role FROM users WHERE id = ?",
                    (user_id,),
                ).fetchone()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor(cursor_factory=self._psycopg2_extras.RealDictCursor) as cur:
                    cur.execute("SELECT id, email, role FROM users WHERE id = %s", (user_id,))
                    row = cur.fetchone()
            finally:
                conn.close()

        if not row:
            return None
        return UserPublic(id=row["id"], email=row["email"], role=row["role"]) 

    def _get_user_row_by_email(self, email: str):
        email_l = email.lower()
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                return conn.execute(
                    "SELECT id, email, role, password_hash FROM users WHERE email = ?",
                    (email_l,),
                ).fetchone()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor(cursor_factory=self._psycopg2_extras.RealDictCursor) as cur:
                    cur.execute(
                        "SELECT id, email, role, password_hash FROM users WHERE email = %s",
                        (email_l,),
                    )
                    return cur.fetchone()
            finally:
                conn.close()

    def verify_password_for_email(self, email: str, password: str) -> bool:
        """Return True if the password matches the stored hash for the given email."""
        row = self._get_user_row_by_email(email)
        if not row:
            return False
        return verify_password(password, row["password_hash"])

    def count_users(self) -> int:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                return conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) AS c FROM users")
                    return cur.fetchone()[0]
            finally:
                conn.close()

    def count_admins(self) -> int:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                return conn.execute(
                    "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'"
                ).fetchone()["c"]
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")
                    return cur.fetchone()[0]
            finally:
                conn.close()
