import threading
from typing import Any


class SessionRepository:
    def __init__(self):
        self._lock = threading.Lock()
        self._sessions: dict[str, dict[str, Any]] = {}

    def list_all(self) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(value) for value in self._sessions.values()]

    def get(self, session_id: str) -> dict[str, Any] | None:
        with self._lock:
            value = self._sessions.get(session_id)
            return dict(value) if value else None

    def upsert(self, session: dict[str, Any]) -> None:
        session_id = str(session["sessionId"])
        with self._lock:
            self._sessions[session_id] = dict(session)

    def patch(self, session_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            current = self._sessions.get(session_id)
            if not current:
                return None
            current.update(updates)
            return dict(current)
