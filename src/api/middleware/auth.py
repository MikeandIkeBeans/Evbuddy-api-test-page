import os

from flask import Flask, jsonify, request


def register_auth_middleware(app: Flask) -> None:
    enabled = os.environ.get("API_REQUIRE_KEY", "false").strip().lower() in {"1", "true", "yes", "on"}
    api_key = os.environ.get("API_KEY", "")

    @app.before_request
    def enforce_api_key():
        if not enabled:
            return None
        if request.path in {"/health", "/api/platform/health"}:
            return None
        candidate = request.headers.get("X-API-Key", "")
        if not api_key or candidate != api_key:
            return jsonify({"ok": False, "error": {"code": "UNAUTHORIZED", "message": "invalid api key"}}), 401
        return None
