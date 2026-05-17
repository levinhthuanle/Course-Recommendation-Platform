"""Persistent chat history service stored per user."""

import logging
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from app.core.config import Settings

logger = logging.getLogger(__name__)


class ChatHistoryService:
    """Persist and retrieve per-user chat threads and messages."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.use_postgres = bool(settings.database_url)

        if not self.use_postgres:
            import sqlite3

            self._sqlite = sqlite3
            self.db_path = Path(settings.analytics_db_path).with_name("chat_history.db")
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
                    CREATE TABLE IF NOT EXISTS chat_threads (
                        id TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        title TEXT NOT NULL,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS chat_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        thread_id TEXT NOT NULL,
                        user_id INTEGER NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
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
                        CREATE TABLE IF NOT EXISTS chat_threads (
                            id TEXT PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            title TEXT NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                        )
                        """
                    )
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS chat_messages (
                            id SERIAL PRIMARY KEY,
                            thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
                            user_id INTEGER NOT NULL,
                            role TEXT NOT NULL,
                            content TEXT NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                        )
                        """
                    )
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_chat_threads_user_updated ON chat_threads (user_id, updated_at DESC)")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages (thread_id, created_at ASC, id ASC)")
                    conn.commit()
            finally:
                conn.close()

    def _normalize_title(self, title: Optional[str]) -> str:
        value = (title or "").strip()
        return value[:120] if value else "New chat"

    def _thread_row_to_dict(self, row) -> Dict:
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "title": row["title"],
            "created_at": str(row["created_at"]),
            "updated_at": str(row["updated_at"]),
            "message_count": int(row["message_count"]) if "message_count" in row.keys() else 0,
        }

    def create_thread(self, user_id: int, title: Optional[str] = None) -> Dict:
        thread_id = uuid.uuid4().hex
        thread_title = self._normalize_title(title)

        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                conn.execute(
                    "INSERT INTO chat_threads (id, user_id, title) VALUES (?, ?, ?)",
                    (thread_id, user_id, thread_title),
                )
                conn.commit()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO chat_threads (id, user_id, title) VALUES (%s, %s, %s)",
                        (thread_id, user_id, thread_title),
                    )
                    conn.commit()
            finally:
                conn.close()

        return self.get_thread(user_id, thread_id) or {
            "id": thread_id,
            "user_id": user_id,
            "title": thread_title,
            "created_at": "",
            "updated_at": "",
            "message_count": 0,
        }

    def get_thread(self, user_id: int, thread_id: str) -> Optional[Dict]:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                row = conn.execute(
                    """
                    SELECT t.id, t.user_id, t.title, t.created_at, t.updated_at,
                           COUNT(m.id) AS message_count
                    FROM chat_threads t
                    LEFT JOIN chat_messages m ON m.thread_id = t.id
                    WHERE t.id = ? AND t.user_id = ?
                    GROUP BY t.id
                    """,
                    (thread_id, user_id),
                ).fetchone()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor(cursor_factory=self._psycopg2_extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT t.id, t.user_id, t.title, t.created_at, t.updated_at,
                               COUNT(m.id) AS message_count
                        FROM chat_threads t
                        LEFT JOIN chat_messages m ON m.thread_id = t.id
                        WHERE t.id = %s AND t.user_id = %s
                        GROUP BY t.id
                        """,
                        (thread_id, user_id),
                    )
                    row = cur.fetchone()
            finally:
                conn.close()

        if not row:
            return None
        return self._thread_row_to_dict(row)

    def list_threads(self, user_id: int) -> List[Dict]:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                rows = conn.execute(
                    """
                    SELECT t.id, t.user_id, t.title, t.created_at, t.updated_at,
                           COUNT(m.id) AS message_count
                    FROM chat_threads t
                    LEFT JOIN chat_messages m ON m.thread_id = t.id
                    WHERE t.user_id = ?
                    GROUP BY t.id
                    ORDER BY t.updated_at DESC, t.created_at DESC
                    """,
                    (user_id,),
                ).fetchall()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor(cursor_factory=self._psycopg2_extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT t.id, t.user_id, t.title, t.created_at, t.updated_at,
                               COUNT(m.id) AS message_count
                        FROM chat_threads t
                        LEFT JOIN chat_messages m ON m.thread_id = t.id
                        WHERE t.user_id = %s
                        GROUP BY t.id
                        ORDER BY t.updated_at DESC, t.created_at DESC
                        """,
                        (user_id,),
                    )
                    rows = cur.fetchall()
            finally:
                conn.close()

        return [self._thread_row_to_dict(row) for row in rows]

    def adopt_debug_threads(self, user_id: int) -> int:
        """Move legacy debug-mode conversations from user 0 to the real user."""
        if user_id == 0:
            return 0

        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                existing = conn.execute(
                    "SELECT COUNT(*) AS c FROM chat_threads WHERE user_id = ?",
                    (user_id,),
                ).fetchone()["c"]
                if existing:
                    return 0
                cursor = conn.execute("UPDATE chat_threads SET user_id = ? WHERE user_id = 0", (user_id,))
                conn.execute("UPDATE chat_messages SET user_id = ? WHERE user_id = 0", (user_id,))
                conn.commit()
                return cursor.rowcount

        conn = self._get_pg_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM chat_threads WHERE user_id = %s", (user_id,))
                existing = cur.fetchone()[0]
                if existing:
                    return 0
                cur.execute("UPDATE chat_threads SET user_id = %s WHERE user_id = 0", (user_id,))
                adopted = cur.rowcount
                cur.execute("UPDATE chat_messages SET user_id = %s WHERE user_id = 0", (user_id,))
                conn.commit()
                return adopted
        finally:
            conn.close()

    def rename_thread(self, user_id: int, thread_id: str, title: str) -> Optional[Dict]:
        thread_title = self._normalize_title(title)
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                conn.execute(
                    "UPDATE chat_threads SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
                    (thread_title, thread_id, user_id),
                )
                conn.commit()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE chat_threads SET title = %s, updated_at = now() WHERE id = %s AND user_id = %s",
                        (thread_title, thread_id, user_id),
                    )
                    conn.commit()
            finally:
                conn.close()
        return self.get_thread(user_id, thread_id)

    def delete_thread(self, user_id: int, thread_id: str) -> bool:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                cursor = conn.execute(
                    "DELETE FROM chat_threads WHERE id = ? AND user_id = ?",
                    (thread_id, user_id),
                )
                conn.commit()
                return cursor.rowcount > 0
        conn = self._get_pg_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM chat_threads WHERE id = %s AND user_id = %s",
                    (thread_id, user_id),
                )
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
        finally:
            conn.close()

    def get_messages(self, user_id: int, thread_id: str) -> List[Dict]:
        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                rows = conn.execute(
                    """
                    SELECT id, thread_id, user_id, role, content, created_at
                    FROM chat_messages
                    WHERE thread_id = ? AND user_id = ?
                    ORDER BY created_at ASC, id ASC
                    """,
                    (thread_id, user_id),
                ).fetchall()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor(cursor_factory=self._psycopg2_extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT id, thread_id, user_id, role, content, created_at
                        FROM chat_messages
                        WHERE thread_id = %s AND user_id = %s
                        ORDER BY created_at ASC, id ASC
                        """,
                        (thread_id, user_id),
                    )
                    rows = cur.fetchall()
            finally:
                conn.close()

        return [
            {
                "id": row["id"],
                "thread_id": row["thread_id"],
                "user_id": row["user_id"],
                "role": row["role"],
                "content": row["content"],
                "created_at": str(row["created_at"]),
            }
            for row in rows
        ]

    def add_message(self, user_id: int, thread_id: str, role: str, content: str) -> None:
        text = (content or "").strip()
        if not text:
            return

        if not self.use_postgres:
            with self._get_sqlite_conn() as conn:
                conn.execute(
                    "INSERT INTO chat_messages (thread_id, user_id, role, content) VALUES (?, ?, ?, ?)",
                    (thread_id, user_id, role, text),
                )
                conn.execute(
                    "UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
                    (thread_id, user_id),
                )
                conn.commit()
        else:
            conn = self._get_pg_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO chat_messages (thread_id, user_id, role, content) VALUES (%s, %s, %s, %s)",
                        (thread_id, user_id, role, text),
                    )
                    cur.execute(
                        "UPDATE chat_threads SET updated_at = now() WHERE id = %s AND user_id = %s",
                        (thread_id, user_id),
                    )
                    conn.commit()
            finally:
                conn.close()

    def ensure_thread(self, user_id: int, thread_id: Optional[str], title_hint: Optional[str] = None) -> Dict:
        if thread_id:
            existing = self.get_thread(user_id, thread_id)
            if existing:
                return existing
        return self.create_thread(user_id, title_hint)
