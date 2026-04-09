from flask import jsonify


def success_response(data=None, status_code: int = 200):
    payload = {"ok": True}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def error_response(code: str, message: str, status_code: int = 400, details=None):
    payload = {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details is not None:
        payload["error"]["details"] = details
    return jsonify(payload), status_code
