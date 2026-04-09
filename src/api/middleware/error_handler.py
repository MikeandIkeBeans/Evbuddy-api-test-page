import logging
from flask import Flask, jsonify, g
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):
        request_id = getattr(g, "request_id", None)

        if isinstance(exc, HTTPException):
            payload = {
                "ok": False,
                "error": {
                    "code": exc.name.upper().replace(" ", "_"),
                    "message": exc.description,
                },
            }
            if request_id:
                payload["requestId"] = request_id
            return jsonify(payload), exc.code

        logger.exception("unhandled exception request_id=%s", request_id)
        payload = {
            "ok": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            },
        }
        if request_id:
            payload["requestId"] = request_id
        return jsonify(payload), 500
