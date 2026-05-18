"""Per-user saved course storage."""

from pathlib import Path
from typing import Dict, List

from app.core.config import Settings


class FavoritesService:
    """Persist favorite course ids using SQLite by default or PostgreSQL when configured."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.use_postgres = bool(settings.database_url)

        if not self.use_postgres:
            import sqlite3

            self._sqlite = sqlite3
            self.db_path = Path(settings.auth_db_path)
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            import psycopg2
            import psycopg2.extras

            self._psycopg2 = psycopg2
            self._psycopg2_extras = psycopg2.extras

        self._init_db()

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
                    CREATE TABLE IF NOT EXISTS favorite_courses (
                        user_id INTEGER NOT NULL,
                        course_id TEXT NOT NULL,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (user_id, course_id)
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
                        CREATE TABLE IF NOT EXISTS favorite_courses (
                            user_id INTEGER NOT NULL,
                            course_id TEXT NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                            PRIMARY KEY (user_id, course_id)
                        )
                        """
                    )
                    conn.commit()
            finally:
                conn.close()

    def add(self, user_id: int, course_id: str) -> None:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                conn.execute(
                    "INSERT OR IGNORE INTO favorite_courses (user_id, course_id) VALUES (?, ?)",
                    (user_id, course_id),
                )
                conn.commit()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO favorite_courses (user_id, course_id)
                        VALUES (%s, %s)
                        ON CONFLICT (user_id, course_id) DO NOTHING
                        """,
                        (user_id, course_id),
                    )
                    conn.commit()
            finally:
                conn.close()

    def remove(self, user_id: int, course_id: str) -> bool:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                cursor = conn.execute(
                    "DELETE FROM favorite_courses WHERE user_id = ? AND course_id = ?",
                    (user_id, course_id),
                )
                conn.commit()
                return cursor.rowcount > 0

        conn = self._get_pg_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM favorite_courses WHERE user_id = %s AND course_id = %s",
                    (user_id, course_id),
                )
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
        finally:
            conn.close()

    def list(self, user_id: int) -> List[Dict[str, str]]:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                rows = conn.execute(
                    """
                    SELECT course_id, created_at
                    FROM favorite_courses
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    """,
                    (user_id,),
                ).fetchall()
                return [dict(row) for row in rows]

        conn = self._get_pg_conn()
        try:
            with conn.cursor(cursor_factory=self._psycopg2_extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT course_id, created_at
                    FROM favorite_courses
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    """,
                    (user_id,),
                )
                return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()

    def ids(self, user_id: int) -> List[str]:
        return [row["course_id"] for row in self.list(user_id)]
