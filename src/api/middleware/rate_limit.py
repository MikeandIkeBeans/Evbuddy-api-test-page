import os
import threading
import time

from flask import Flask, jsonify, request


class _WindowRateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self._limit = limit
        self._window_seconds = window_seconds
        self._lock = threading.Lock()
        self._buckets: dict[str, list[float]] = {}

    def allow(self, key: str) -> bool:
        now = time.time()
        floor = now - self._window_seconds
        with self._lock:
            points = [p for p in self._buckets.get(key, []) if p >= floor]
            if len(points) >= self._limit:
                self._buckets[key] = points
                return False
            points.append(now)
            self._buckets[key] = points
            return True


def register_rate_limit_middleware(app: Flask) -> None:
    enabled = os.environ.get("RATE_LIMIT_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}
    limit = int(os.environ.get("RATE_LIMIT_REQUESTS", "240"))
    window = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))
    limiter = _WindowRateLimiter(limit=limit, window_seconds=window)

    @app.before_request
    def enforce_rate_limit():
        if not enabled:
            return None
        if request.path in {"/health", "/api/platform/health"}:
            return None
        identity = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
        if not limiter.allow(identity):
            return jsonify({"ok": False, "error": {"code": "RATE_LIMITED", "message": "too many requests"}}), 429
        return None
