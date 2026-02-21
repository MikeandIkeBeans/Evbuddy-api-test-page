"""
Shared helper functions used across multiple route blueprints.
"""

import re
import time
from datetime import datetime, timezone
from functools import wraps
from urllib.parse import urlencode

import jwt
import requests as http_requests
from flask import Response, jsonify, request

from config import (
    EV_REAL_API_BASE,
    EV_REAL_HOSTROOM_API_BASE,
    EV_REAL_OCPP_API_BASE,
    EV_JWT_SECRET,
    EV_TIME_SCALE,
    EV_DEFAULT_SITE_ID,
    EV_DEFAULT_CHARGER_ID,
    EV_PRICING,
    EV_SESSIONS,
    SERVICES,
    MICROSERVICE_HOST,
    SERVICE_STATUS_PATHS,
)
from security import validate_ocpp_command, AuthorizationError


# =============================================================================
# JSON / HTTP helpers
# =============================================================================
JSON_HEADERS = {"Content-Type": "application/json"}


def ev_now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def now_iso():
    return ev_now_iso()


def ev_http(method, url, *, params=None, body=None, timeout=10):
    headers = JSON_HEADERS if body is not None else None
    return http_requests.request(
        method,
        url,
        params=params,
        json=body,
        headers=headers,
        timeout=timeout,
    )


def ev_simple_get(url, *, params=None, timeout=10, error_label="API error"):
    try:
        response = ev_http("GET", url, params=params, timeout=timeout)
        if not response.ok:
            return jsonify({"error": f"{error_label} ({response.status_code})"}), response.status_code
        try:
            payload = response.json()
        except ValueError:
            payload = {"raw": response.text}
        return jsonify(payload)
    except http_requests.RequestException as e:
        return jsonify({"error": str(e)}), 500


def ev_list_from_response(data, *keys):
    if isinstance(data, dict):
        for key in keys:
            value = data.get(key)
            if isinstance(value, list):
                return value
        return []
    return data or []


# =============================================================================
# Microservice proxy helpers
# =============================================================================
def ms_url(service_key, suffix=""):
    """Build URL for a microservice by key."""
    svc = SERVICES[service_key]
    return f"{MICROSERVICE_HOST}:{svc['port']}{svc['base']}{suffix}"


def service_status_url(service_key):
    """Build status URL for a microservice by key."""
    svc = SERVICES[service_key]
    status_path = SERVICE_STATUS_PATHS.get(service_key, f"{svc['base']}/status")
    return f"{MICROSERVICE_HOST}:{svc['port']}{status_path}"


def with_query_params(url, **params):
    filtered = {k: v for k, v in params.items() if v is not None and v != ""}
    if not filtered:
        return url
    query = urlencode(filtered, doseq=True)
    delimiter = "&" if "?" in url else "?"
    return f"{url}{delimiter}{query}"


def proxy_json_request(
    method,
    url,
    *,
    body=None,
    params=None,
    timeout=10,
    error_message="Service unavailable",
    not_found=None,
    empty_message=None,
):
    """Proxy JSON requests with consistent error handling."""
    try:
        resp = ev_http(method, url, params=params, body=body, timeout=timeout)
    except http_requests.RequestException as e:
        return jsonify({"error": error_message, "details": str(e)}), 503

    if resp.status_code == 404 and not_found:
        return jsonify({"error": not_found}), 404
    if resp.status_code == 204 and empty_message:
        return jsonify({"ok": True, "message": empty_message}), 200
    if not resp.content:
        return jsonify({}), resp.status_code
    try:
        payload = resp.json()
    except ValueError:
        payload = {"raw": resp.text}
    return jsonify(payload), resp.status_code


def get_json_body(error="Request body required"):
    data = request.get_json() or {}
    if not data:
        return None, (jsonify({"error": error}), 400)
    return data, None


def ok_response(message=None, **payload):
    data = {"ok": True}
    if message is not None:
        data["message"] = message
    data.update(payload)
    return jsonify(data)


def required_fields(data, fields):
    missing = [field for field in fields if not data.get(field)]
    if missing:
        return jsonify({"ok": False, "error": "missing_fields", "required": fields}), 400
    return None


def require_field(data, field, message=None):
    if not data.get(field):
        return jsonify({"error": message or f"{field} is required"}), 400
    return None


def ocpp_guard(user_id, asset_id, command):
    try:
        validate_ocpp_command(user_id, asset_id, command)
        return None
    except AuthorizationError as e:
        return jsonify({"error": str(e), "code": "FORBIDDEN"}), 403


# =============================================================================
# EV Charging helpers
# =============================================================================
def ev_call_real_api(endpoint, body=None, method="POST"):
    url = f"{EV_REAL_API_BASE}{endpoint}"
    method = method.upper()
    methods_with_body = {"POST", "PUT", "PATCH", "DELETE"}
    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        raise ValueError(f"Unsupported method: {method}")

    payload = (body or {}) if method in methods_with_body else None
    response = ev_http(method, url, body=payload, timeout=10)

    if not response.ok:
        error_text = response.text or ""
        raise Exception(f"API error ({response.status_code}): {error_text or 'Request failed'}")

    return response.json()


def ev_get_real_user_by_email(email):
    try:
        users = ev_call_real_api("/user/getByEmail", {"email": email}, "POST")
        return users[0] if isinstance(users, list) and len(users) > 0 else None
    except Exception:
        return None


def ev_get_real_users():
    endpoints = [
        {"path": "/user", "method": "GET"},
        {"path": "/users", "method": "GET"},
        {"path": "/user/all", "method": "GET"},
        {"path": "/user/list", "method": "POST"},
    ]

    for ep in endpoints:
        try:
            users = ev_call_real_api(ep["path"], {}, ep["method"])
            if isinstance(users, list):
                return users
        except Exception:
            continue

    return []


def ev_find_guest_reservation(room, name, host=None):
    """
    Find reservation by room + last name, and ensure today is within stay window.
    Uses GET /hostrooms and filters locally.
    """
    try:
        url = f"{EV_REAL_HOSTROOM_API_BASE}/hostrooms"
        response = ev_http("GET", url, timeout=10)

        if not response.ok:
            error_text = response.text or ""
            raise Exception(f"API error ({response.status_code}): {error_text}")

        data = response.json()
        reservations = data.get("value", data) if isinstance(data, dict) else data
        if not isinstance(reservations, list):
            reservations = []

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        match = None
        for r in reservations:
            room_match = str(r.get("room_number", "")) == str(room)
            name_match = str(r.get("last_name", "")).lower() == str(name).lower()
            host_match = (not host) or str(r.get("host_id", "")) == str(host)

            check_in = r.get("check_in_date")
            check_out = r.get("check_out_date")
            date_valid = check_in and check_out and today >= check_in and today <= check_out

            if room_match and name_match and host_match and date_valid:
                match = r
                break

        if match:
            return {"valid": True, "reservation": match}
        return {"valid": False, "error": "Invalid entry"}
    except Exception as e:
        return {"valid": False, "error": str(e)}


def ev_parse_qr(qr):
    if not qr or not isinstance(qr, str):
        return {"chargerId": EV_DEFAULT_CHARGER_ID, "connectorId": 1, "siteId": EV_DEFAULT_SITE_ID}

    try:
        from urllib.parse import urlparse, parse_qs

        parsed = urlparse(qr)
        params = parse_qs(parsed.query)

        charger_id = params.get("chargerId", [EV_DEFAULT_CHARGER_ID])[0]
        connector_id = int(params.get("connectorId", [1])[0])
        site_id = params.get("siteId", [EV_DEFAULT_SITE_ID])[0]
        return {"chargerId": charger_id, "connectorId": connector_id, "siteId": site_id}
    except Exception:
        # If URL parsing fails, continue with compact "charger[:connector]" format.
        pass

    match = re.match(r"([A-Za-z0-9_-]+)(?::(\d+))?", qr)
    if match:
        charger_id = match.group(1) or EV_DEFAULT_CHARGER_ID
        connector_id = int(match.group(2)) if match.group(2) else 1
        return {"chargerId": charger_id, "connectorId": connector_id, "siteId": EV_DEFAULT_SITE_ID}

    return {"chargerId": EV_DEFAULT_CHARGER_ID, "connectorId": 1, "siteId": EV_DEFAULT_SITE_ID}


def ev_issue_token(site_id, charger_id, mode):
    payload = {"siteId": site_id, "chargerId": charger_id, "mode": mode}
    return jwt.encode(payload, EV_JWT_SECRET, algorithm="HS256")


def ev_require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        match = re.match(r"^Bearer\s+(.+)$", auth_header, re.IGNORECASE)
        if not match:
            return Response("Missing Authorization: Bearer <token>", status=401)

        token = match.group(1)

        if token == "demo-token":
            request.user = {"siteId": EV_DEFAULT_SITE_ID, "chargerId": EV_DEFAULT_CHARGER_ID, "mode": "DEMO"}
            return f(*args, **kwargs)

        try:
            decoded = jwt.decode(token, EV_JWT_SECRET, algorithms=["HS256"])
            request.user = decoded
            return f(*args, **kwargs)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return Response("Invalid/expired token", status=401)

    return decorated


# =============================================================================
# OCPP helpers
# =============================================================================
_ev_ocpp_status_cache = {}
EV_OCPP_CACHE_TTL_SEC = 10
EV_OCPP_ERROR_CACHE_TTL_SEC = 30


def ev_ocpp_get_connector_status(charge_point_id, connector_id, use_cache=True):
    cache_key = f"{charge_point_id}:{connector_id}"
    now = time.time()

    if use_cache and cache_key in _ev_ocpp_status_cache:
        cached = _ev_ocpp_status_cache[cache_key]
        cache_ttl = EV_OCPP_ERROR_CACHE_TTL_SEC if cached.get("_is_error") else EV_OCPP_CACHE_TTL_SEC
        if now - cached["_timestamp"] < cache_ttl:
            return cached["data"]

    try:
        url = f"{EV_REAL_OCPP_API_BASE}/api/connectors"
        params = {"charge_point_id": str(charge_point_id)}
        response = ev_http("GET", url, params=params, timeout=10)

        if not response.ok:
            _ev_ocpp_status_cache[cache_key] = {"data": None, "_timestamp": now, "_is_error": True}
            return None

        data = response.json()
        connectors = ev_list_from_response(data, "data")
        connector = next((c for c in connectors if c.get("connector_id") == int(connector_id)), None)

        if connector:
            result = {
                "success": True,
                "connector": {
                    "status": connector.get("status"),
                    "error_code": connector.get("error_code"),
                    "current_transaction_id": connector.get("current_transaction_id"),
                    "meter_start": connector.get("meter_start"),
                    "timestamp": connector.get("timestamp"),
                },
            }
            _ev_ocpp_status_cache[cache_key] = {"data": result, "_timestamp": now, "_is_error": False}
            return result

        _ev_ocpp_status_cache[cache_key] = {"data": None, "_timestamp": now, "_is_error": True}
        return None

    except Exception:
        _ev_ocpp_status_cache[cache_key] = {"data": None, "_timestamp": now, "_is_error": True}
        return None


def ev_ocpp_remote_start(charge_point_id, connector_id, id_tag="HOTEL-GUEST"):
    try:
        url = f"{EV_REAL_OCPP_API_BASE}/api/operations/remote-start"
        body = {"charge_point_id": str(charge_point_id), "connector_id": int(connector_id), "id_tag": str(id_tag)}
        response = ev_http("POST", url, body=body, timeout=15)

        if not response.ok:
            return {"success": False, "status": "Failed", "error": response.text}

        return response.json()
    except Exception as e:
        return {"success": False, "status": "Failed", "error": str(e)}


def ev_ocpp_remote_stop(charge_point_id, connector_id, transaction_id, id_tag="HOTEL-GUEST"):
    try:
        url = f"{EV_REAL_OCPP_API_BASE}/api/operations/remote-stop"
        body = {
            "charge_point_id": str(charge_point_id),
            "connector_id": int(connector_id),
            "transaction_id": int(transaction_id),
            "id_tag": str(id_tag),
        }
        response = ev_http("POST", url, body=body, timeout=15)

        if not response.ok:
            return {"success": False, "status": "Failed", "error": response.text}

        return response.json()
    except Exception as e:
        return {"success": False, "status": "Failed", "error": str(e)}


# =============================================================================
# Session helpers
# =============================================================================
def ev_compute_virtual_elapsed_sec(session):
    real_elapsed_sec = max(0, int((time.time() * 1000 - session["_createdAtMs"]) / 1000))
    return real_elapsed_sec * EV_TIME_SCALE


def ev_recompute_session(session):
    elapsed_sec = ev_compute_virtual_elapsed_sec(session)

    if session["status"] == "STARTING" and elapsed_sec >= 10:
        session["status"] = "CHARGING"
        session["startedAt"] = session.get("startedAt") or ev_now_iso()

    if session.get("stopRequested") and session["status"] not in ("COMPLETE", "FAILED"):
        if session["status"] != "STOPPING":
            session["status"] = "STOPPING"
            session["_stopRequestedAtMs"] = time.time() * 1000
        else:
            stop_elapsed = int((time.time() * 1000 - session["_stopRequestedAtMs"]) / 1000) * EV_TIME_SCALE
            if stop_elapsed >= 10:
                session["status"] = "COMPLETE"
                session["endedAt"] = ev_now_iso()

    if not session.get("stopRequested") and session["status"] not in ("COMPLETE", "FAILED"):
        limit = session.get("limit")
        if limit and limit.get("type") == "TIME_MIN":
            limit_sec = float(limit.get("value", 0)) * 60
            if elapsed_sec >= limit_sec:
                session["status"] = "COMPLETE"
                session["endedAt"] = ev_now_iso()

    power_kw = session["powerKw"]
    energy_kwh = (elapsed_sec / 3600) * power_kw
    session["elapsedSec"] = elapsed_sec
    session["energyKwh"] = round(energy_kwh, 3)
    session["energyDeliveredKwh"] = session["energyKwh"]
    total = EV_PRICING["sessionFee"] + energy_kwh * EV_PRICING["perKwh"]
    session["cost"] = round(total, 2)
    session["costDetail"] = {"currency": EV_PRICING["currency"], "amount": round(total, 2)}
    session["socPercent"] = None
    session["message"] = None
    return session


def ev_get_charger_connectors(charger_id):
    c1 = None
    c2 = None
    for s in EV_SESSIONS.values():
        if s["chargerId"] == charger_id and s["status"] in ("STARTING", "CHARGING", "STOPPING"):
            if s["connectorId"] == 1:
                c1 = s
            if s["connectorId"] == 2:
                c2 = s

    return [
        {"connectorId": 1, "status": "IN_USE", "sessionId": c1["sessionId"]} if c1 else {"connectorId": 1, "status": "AVAILABLE"},
        {"connectorId": 2, "status": "IN_USE", "sessionId": c2["sessionId"]} if c2 else {"connectorId": 2, "status": "AVAILABLE"},
    ]
