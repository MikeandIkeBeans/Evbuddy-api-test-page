from functools import wraps

from flask import jsonify, request


def require_json_fields(*required_fields: str):
    def decorator(func):
        @wraps(func)
        def wrapped(*args, **kwargs):
            data = request.get_json(silent=True) or {}
            missing = [field for field in required_fields if data.get(field) in (None, "")]
            if missing:
                return jsonify({
                    "ok": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "missing required fields",
                        "details": {"missing": missing},
                    },
                }), 400
            return func(*args, **kwargs)

        return wrapped

    return decorator
