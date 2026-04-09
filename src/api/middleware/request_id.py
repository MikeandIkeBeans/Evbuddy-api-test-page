import uuid
from flask import Flask, g, request


def _resolve_request_id() -> str:
    incoming = request.headers.get("X-Request-ID", "").strip()
    if incoming:
        return incoming
    return str(uuid.uuid4())


def register_request_id_middleware(app: Flask) -> None:
    @app.before_request
    def attach_request_id() -> None:
        g.request_id = _resolve_request_id()

    @app.after_request
    def add_request_id_header(response):
        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers["X-Request-ID"] = request_id
        return response
