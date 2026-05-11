"""Analytics service for admin dashboards."""

import logging
import re
import sqlite3
from collections import Counter
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List

from app.core.config import Settings

logger = logging.getLogger(__name__)


class AnalyticsService:
    """SQLite-backed analytics for query logging."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.db_path = Path(settings.analytics_db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS query_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_type TEXT NOT NULL,
                    query_text TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()

    def log_query(self, query_type: str, query_text: str) -> None:
        text = (query_text or "").strip()
        if not text:
            return
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO query_logs (query_type, query_text) VALUES (?, ?)",
                (query_type, text),
            )
            conn.commit()

    def get_counts(self) -> Dict[str, int]:
        with self._get_conn() as conn:
            total = conn.execute("SELECT COUNT(*) AS c FROM query_logs").fetchone()["c"]
            search = conn.execute(
                "SELECT COUNT(*) AS c FROM query_logs WHERE query_type = 'search'"
            ).fetchone()["c"]
            chat = conn.execute(
                "SELECT COUNT(*) AS c FROM query_logs WHERE query_type = 'chat'"
            ).fetchone()["c"]

        return {
            "total": total,
            "search": search,
            "chat": chat,
        }

    def get_top_terms(self, limit: int = 12) -> List[Dict[str, int]]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT query_text FROM query_logs ORDER BY id DESC LIMIT 1000"
            ).fetchall()

        tokens: List[str] = []
        for row in rows:
            text = row["query_text"].lower()
            parts = re.split(r"[^a-z0-9\u00c0-\u1ef9]+", text)
            tokens.extend([p for p in parts if len(p) >= 2])

        counts = Counter(tokens)
        return [{"term": term, "count": count} for term, count in counts.most_common(limit)]

    def get_daily_counts(self, days: int = 7) -> List[Dict[str, int]]:
        if days < 1:
            return []

        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT date(created_at) AS day,
                       COUNT(*) AS total,
                       SUM(CASE WHEN query_type = 'search' THEN 1 ELSE 0 END) AS search,
                       SUM(CASE WHEN query_type = 'chat' THEN 1 ELSE 0 END) AS chat
                FROM query_logs
                WHERE date(created_at) >= date('now', ?)
                GROUP BY day
                ORDER BY day ASC
                """,
                (f"-{days - 1} day",),
            ).fetchall()

        data = {row["day"]: row for row in rows}
        results: List[Dict[str, int]] = []
        start_day = date.today() - timedelta(days=days - 1)

        for i in range(days):
            day = start_day + timedelta(days=i)
            key = day.isoformat()
            row = data.get(key)
            results.append({
                "day": key,
                "total": int(row["total"]) if row else 0,
                "search": int(row["search"]) if row else 0,
                "chat": int(row["chat"]) if row else 0,
            })

        return results
