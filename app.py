"""
Simple Flask scaffold for EVBuddy.

Run (PowerShell):
  .venv/Scripts/Activate.ps1
  $env:FLASK_APP = "app.py"
  python -m flask run

Or use the VS Code Flask debug configuration ("Python: Flask (module)").

SECURITY: See .github/COPILOT_SECURITY_POLICY.md for RBAC rules.
"""

import os
import io
import time
import secrets
import base64
from pathlib import Path
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
import qrcode
import requests as http_requests
from flask import Flask, jsonify, render_template, send_from_directory, request, abort, g, Response, send_file
from flask_cors import CORS

# Import security module
from security import (
    require_auth,
    require_global_role,
    require_site_access,
    require_asset_operation,
    audit_action,
    validate_ocpp_command,
    security_audit,
    get_security_audit_log,
    assign_global_role,
    assign_site_role,
    assign_operator_role,
    assign_user_to_operator,
    register_asset,
    register_site,
    check_global_role,
    require_site_role,
    require_operator_role,
    GLOBAL_ROLES,
    SITE_ROLES,
    OPERATOR_ROLES,
    CPMS_PERMISSIONS,
    OCPP_PERMISSIONS,
    AuthorizationError,
)

app = Flask(__name__, static_folder='client/dist', static_url_path='')

# =============================================================================
# EV Charging Flow Configuration
# =============================================================================
EV_BASE_DIR = Path(__file__).resolve().parent

EV_REAL_API_BASE = os.environ.get("REAL_API_BASE", "http://20.119.73.31:9000")
EV_REAL_HOSTROOM_API_BASE = os.environ.get("REAL_HOSTROOM_API_BASE", "http://20.119.73.31:9027")
EV_REAL_OCPP_API_BASE = os.environ.get("REAL_OCPP_API_BASE", "http://20.119.73.31:9029")
EV_REAL_HOSTSITES_API_BASE = os.environ.get("REAL_HOSTSITES_API_BASE", "http://20.119.73.31:9004")
EV_REAL_CHARGERS_API_BASE = os.environ.get("REAL_CHARGERS_API_BASE", "http://20.119.73.31:9017")

EV_USE_REAL_API = os.environ.get("USE_REAL_API", "true").lower() != "false"
EV_USE_REAL_CHARGER = os.environ.get("USE_REAL_CHARGER", "false").lower() == "true"
EV_JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
EV_TIME_SCALE = int(os.environ.get("DEMO_TIME_SCALE", 30))

EV_DEFAULT_SITE_ID = "HTL-DEMO-001"
EV_DEFAULT_CHARGER_ID = "atl001"
EV_PRICING = {"currency": "USD", "perKwh": 0.38, "sessionFee": 1.0}

# In-memory session storage (guest charging flow)
EV_SESSIONS = {}

# =============================================================================
# Microservices Configuration (Spring Boot backend)
# =============================================================================
SERVICES = {
    "users": {"port": 9000, "base": "/user"},
    "user_vehicles": {"port": 9001, "base": "/user-vehicle/vehicles"},
    "user_payments": {"port": 9002, "base": "/userpayments"},
    "user_subscriptions": {"port": 9003, "base": "/user-subscriptions"},
    "host_sites": {"port": 9004, "base": "/host-sites"},
    "evbuddy_homepage": {"port": 9005, "base": "/api"},
    "accounts": {"port": 9007, "base": "/accounts"},
    "community_comments": {"port": 9012, "base": "/communitycomments"},
    "community_posts": {"port": 9013, "base": "/communityposts"},
    "news_posts": {"port": 9014, "base": "/newsposts"},
    "group_memberships": {"port": 9016, "base": "/groupmemberships"},
    "chargers": {"port": 9017, "base": "/chargers"},
    "preorders": {"port": 9018, "base": "/preorders"},
}

# Base URL for microservices (change for production)
MICROSERVICE_HOST = os.environ.get("MICROSERVICE_HOST", "http://20.119.73.31")

# Status endpoints for each service (used for health checks)
SERVICE_STATUS_PATHS = {
    "users": "/user/status",
    "user_vehicles": "/user-vehicle/status",
    "user_payments": "/userpayments/status",
    "user_subscriptions": "/user-subscriptions/status",
    "host_sites": "/host-sites/status",
    "evbuddy_homepage": "/health",
    "accounts": "/accounts/status",
    "community_comments": "/communitycomments/status",
    "community_posts": "/communityposts/status",
    "news_posts": "/newsposts/status",
    "group_memberships": "/user-profiles/status",
    "chargers": "/chargers/status",
    "preorders": "/preorders/status",
}

# Enable CORS for the API so the dev server can call endpoints in development
CORS(app)

# =============================================================================
# EV Charging Flow Helpers
# =============================================================================
def ev_now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def ev_http(method, url, *, params=None, body=None, timeout=10):
    return http_requests.request(method, url, params=params, json=body, headers=JSON_HEADERS, timeout=timeout)


def ev_simple_get(url, *, params=None, timeout=10, error_label="API error"):
    try:
        response = ev_http("GET", url, params=params, timeout=timeout)
        if not response.ok:
            return jsonify({"error": f"{error_label} ({response.status_code})"}), response.status_code
        return jsonify(response.json())
    except Exception as e:
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
# Microservice Proxy Helpers
# =============================================================================
JSON_HEADERS = {"Content-Type": "application/json"}


def ms_url(service_key, suffix=""):
    """Build URL for a microservice by key."""
    svc = SERVICES[service_key]
    return f"{MICROSERVICE_HOST}:{svc['port']}{svc['base']}{suffix}"


def service_status_url(service_key):
    """Build status URL for a microservice by key."""
    svc = SERVICES[service_key]
    status_path = SERVICE_STATUS_PATHS.get(service_key, f"{svc['base']}/status")
    return f"{MICROSERVICE_HOST}:{svc['port']}{status_path}"


def proxy_json_request(method, url, *, body=None, timeout=10, error_message="Service unavailable",
                       not_found=None, empty_message=None):
    """Proxy JSON requests with consistent error handling."""
    headers = JSON_HEADERS if body is not None else None
    try:
        resp = http_requests.request(method, url, json=body, headers=headers, timeout=timeout)
    except http_requests.RequestException as e:
        return jsonify({"error": error_message, "details": str(e)}), 503

    if resp.status_code == 404 and not_found:
        return jsonify({"error": not_found}), 404
    if resp.status_code == 204 and empty_message:
        return jsonify({"ok": True, "message": empty_message}), 200
    if not resp.content:
        return jsonify({}), resp.status_code
    return jsonify(resp.json()), resp.status_code


def get_json_body(error="Request body required"):
    data = request.get_json() or {}
    if not data:
        return None, (jsonify({"error": error}), 400)
    return data, None


def ocpp_guard(user_id, asset_id, command):
    try:
        validate_ocpp_command(user_id, asset_id, command)
        return None
    except AuthorizationError as e:
        return jsonify({"error": str(e), "code": "FORBIDDEN"}), 403


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


def ev_call_real_api(endpoint, body=None, method="POST"):
    url = f"{EV_REAL_API_BASE}{endpoint}"

    if method == "GET":
        response = ev_http("GET", url, timeout=10)
    elif method == "POST":
        response = ev_http("POST", url, body=body or {}, timeout=10)
    elif method == "PUT":
        response = ev_http("PUT", url, body=body or {}, timeout=10)
    elif method == "PATCH":
        response = ev_http("PATCH", url, body=body or {}, timeout=10)
    else:
        raise ValueError(f"Unsupported method: {method}")

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
        pass

    import re

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
        import re

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
        except jwt.ExpiredSignatureError:
            return Response("Invalid/expired token", status=401)
        except jwt.InvalidTokenError:
            return Response("Invalid/expired token", status=401)

    return decorated


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

@app.get("/")
def index():
    # If a built React app exists, serve it
    if os.path.exists(os.path.join(app.static_folder, "index.html")):
        return app.send_static_file("index.html")
    # Data extracted from the EV Buddy PDF
    features = [
        {"title": "Rent a Charger", "icon": "battery-charging", "desc": "On-demand mobile charging when you need it."},
        {"title": "Installation Services", "icon": "zap", "desc": "Professional setup for home and business clusters."},
        {"title": "EV Buddy Network", "icon": "landmark", "desc": "Join our massive market infrastructure opportunity."}
    ]

    steps = [
        {"step": "01", "title": "Connect Donor"},
        {"step": "02", "title": "Power Transfer"},
        {"step": "03", "title": "Vehicle Ready"},
        {"step": "04", "title": "Back on Road"}
    ]

    specs = [
        "32\" Multimedia Touch Screen",
        "Smart Cable Management",
        "Streaming Revenue Integration"
    ]

    return render_template("index.html", features=features, steps=steps, specs=specs)


# =============================================================================
# Guest Charging Flow UI
# =============================================================================
@app.route("/guest")
@app.route("/test-page.html")
def guest_page():
    return send_file(EV_BASE_DIR / "test-page.html")


@app.route("/guest/qr")
def guest_qr():
    guest_url = request.url_root.rstrip("/") + "/guest"

    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(guest_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_data_url = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"

    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EV Buddy Demo - Guest QR</title>
</head>
<body style="font-family: system-ui; display:flex; min-height:100vh; align-items:center; justify-content:center; background:#0f172a; color:white; margin:0;">
    <div style="background:white; color:#111; border-radius:16px; padding:24px; width:min(420px, 92vw); text-align:center;">
        <h2 style="margin:0 0 8px;">⚡ EV Buddy Guest Flow</h2>
        <p style="margin:0 0 16px; color:#444;">Scan to open the guest charging flow</p>
        <img src="{qr_data_url}" alt="QR" width="280" height="280" />
        <div style="margin-top:16px;">
            <a href="{guest_url}" style="display:inline-block; background:#2563eb; color:white; padding:10px 14px; border-radius:10px; text-decoration:none; font-weight:600;">
                Open Guest Flow
            </a>
        </div>
    </div>
</body>
</html>
"""
    return html

@app.route('/<path:path>')
def static_proxy(path):
    # serve static files from client/dist if present, otherwise fall back to index.html
    if os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return app.send_static_file('index.html')
    return render_template('index.html')


# =============================================================================
# EV Charging Flow API
# =============================================================================
@app.route("/v1/qr/resolve", methods=["POST"])
def ev_qr_resolve():
    data = request.get_json() or {}
    parsed = ev_parse_qr(data.get("qr"))
    return jsonify(
        {
            "siteId": parsed["siteId"],
            "chargerId": parsed["chargerId"],
            "connectorId": parsed["connectorId"],
            "displayName": "Demo Garage Level 1 - Spot 12",
            "pricing": EV_PRICING,
            "authModes": ["HOTEL_GUEST", "CARD"],
        }
    )


@app.route("/v1/auth/hotel", methods=["POST"])
def ev_auth_hotel():
    data = request.get_json() or {}

    site_id = data.get("siteId")
    charger_id = data.get("chargerId")
    room_number = data.get("roomNumber")
    last_name = data.get("lastName")
    host_id = data.get("hostId")

    if not site_id or not charger_id or not room_number or not last_name:
        return Response("Missing fields", status=400)

    if str(last_name).lower() == "fail":
        return Response("Reservation not found. Please try again or call the front desk.", status=401)

    reservation = None

    if EV_USE_REAL_API:
        host = host_id or 1030
        result = ev_find_guest_reservation(room_number, last_name, host)
        if not result["valid"]:
            return Response("Invalid entry. Please verify your room number and name.", status=401)
        reservation = result.get("reservation")

    access_token = ev_issue_token(site_id, charger_id, "HOTEL_GUEST")

    response = {
        "accessToken": access_token,
        "expiresInSec": 900,
        "guest": {"displayName": f"Room {room_number}"},
    }

    if reservation:
        response["guest"].update(
            {
                "reservationId": reservation.get("id"),
                "checkInDate": reservation.get("check_in_date"),
                "checkOutDate": reservation.get("check_out_date"),
            }
        )

    return jsonify(response)


@app.route("/v1/auth/card/init", methods=["POST"])
def ev_auth_card_init():
    data = request.get_json() or {}
    site_id = data.get("siteId")
    charger_id = data.get("chargerId")
    email = data.get("email")

    if not site_id or not charger_id or not email:
        return Response("Missing fields", status=400)

    user_info = None
    if EV_USE_REAL_API:
        user_info = ev_get_real_user_by_email(email)

    payment_ref = f"PAY-{datetime.now().year}-{secrets.randbelow(1000000):06d}"
    client_secret = f"pi_demo_{secrets.token_hex(8)}_secret_demo"
    access_token = ev_issue_token(site_id, charger_id, "CARD")

    response = {
        "paymentProvider": "demo",
        "clientSecret": client_secret,
        "paymentRef": payment_ref,
        "accessToken": access_token,
        "expiresInSec": 900,
    }

    if user_info:
        response["user"] = {
            "id": user_info.get("id"),
            "email": user_info.get("email"),
            "name": user_info.get("name"),
        }

    return jsonify(response)


@app.route("/v1/chargers", methods=["GET"])
def ev_get_all_chargers():
    site_id = request.args.get("siteId")
    status = request.args.get("status")

    if status:
        url = f"{EV_REAL_CHARGERS_API_BASE}/chargers/chargers/status/{status}"
    elif site_id:
        url = f"{EV_REAL_CHARGERS_API_BASE}/chargers/chargers/site/{site_id}"
    else:
        url = f"{EV_REAL_CHARGERS_API_BASE}/chargers/chargers/status/available"

    return ev_simple_get(url)


@app.route("/v1/chargers/<charger_id>", methods=["GET"])
def ev_get_charger(charger_id):
    return jsonify({"chargerId": charger_id, "connectors": ev_get_charger_connectors(charger_id), "lastUpdated": ev_now_iso()})


@app.route("/v1/chargers/<charger_id>/status", methods=["GET"])
def ev_get_charger_real_status(charger_id):
    connector_id = request.args.get("connector", 1, type=int)

    if EV_USE_REAL_CHARGER:
        result = ev_ocpp_get_connector_status(charger_id, connector_id)
        if result and result.get("success"):
            connector = result.get("connector", {})
            return jsonify(
                {
                    "chargerId": charger_id,
                    "connectorId": connector_id,
                    "status": connector.get("status", "Unknown"),
                    "errorCode": connector.get("error_code"),
                    "transactionId": connector.get("current_transaction_id"),
                    "meterStart": connector.get("meter_start"),
                    "timestamp": connector.get("timestamp"),
                    "source": "ocpp",
                }
            )
        return jsonify({"chargerId": charger_id, "connectorId": connector_id, "status": "Unknown", "error": "OCPP unavailable", "source": "ocpp"}), 502

    connectors = ev_get_charger_connectors(charger_id)
    connector = next((c for c in connectors if c["connectorId"] == connector_id), None)
    return jsonify({"chargerId": charger_id, "connectorId": connector_id, "status": connector["status"] if connector else "Unknown", "source": "simulated"})


@app.route("/v1/sessions", methods=["GET"])
def ev_list_sessions():
    result = []
    for session_id, session in EV_SESSIONS.items():
        s = ev_recompute_session(session)
        result.append({
            "sessionId": s["sessionId"],
            "status": s["status"],
            "chargerId": s["chargerId"],
            "connectorId": s["connectorId"],
            "elapsedSec": s["elapsedSec"],
            "energyKwh": s["energyKwh"],
            "powerKw": s["powerKw"],
            "cost": s["cost"],
            "startedAt": s.get("startedAt"),
            "endedAt": s.get("endedAt"),
        })
    return jsonify({"sessions": result, "count": len(result)})


@app.route("/v1/sessions", methods=["POST"])
@ev_require_auth
def ev_create_session():
    data = request.get_json() or {}

    charger_id = data.get("chargerId")
    connector_id = data.get("connectorId")
    limit = data.get("limit")
    payment_ref = data.get("paymentRef")

    if not charger_id or not connector_id or not limit:
        return Response("Missing fields", status=400)

    user = getattr(request, "user", None)
    if user and user.get("chargerId") and user["chargerId"] != charger_id:
        return Response("Token not valid for this charger", status=403)

    transaction_id = None

    if EV_USE_REAL_CHARGER:
        status_result = ev_ocpp_get_connector_status(charger_id, connector_id)

        if status_result and status_result.get("success"):
            connector_status = (status_result.get("connector", {}).get("status") or "").lower()
            if connector_status not in ("available", "preparing"):
                return Response(f"Connector is {connector_status}", status=409)

        start_result = ev_ocpp_remote_start(charger_id, connector_id, id_tag="HOTEL-GUEST")

        if not start_result or not start_result.get("success"):
            error_msg = start_result.get("error", "Unknown error") if start_result else "OCPP unavailable"
            return Response(f"Failed to start charging: {error_msg}", status=502)

        transaction_id = start_result.get("transaction_id")

    else:
        connectors = ev_get_charger_connectors(charger_id)
        current = next((c for c in connectors if c["connectorId"] == int(connector_id)), None)
        if not current:
            return Response("Unknown connector", status=404)
        if current["status"] != "AVAILABLE":
            return Response("Connector is already in use", status=409)

    session_id = f"SES-{int(time.time() * 1000)}-{secrets.token_hex(3)}"

    session = {
        "sessionId": session_id,
        "status": "STARTING",
        "chargerId": charger_id,
        "connectorId": int(connector_id),
        "limit": limit,
        "paymentRef": payment_ref,
        "startedAt": None,
        "endedAt": None,
        "elapsedSec": 0,
        "energyKwh": 0.0,
        "energyDeliveredKwh": 0.0,
        "powerKw": 11.2,
        "cost": 0.0,
        "costDetail": None,
        "socPercent": None,
        "message": None,
        "stopRequested": False,
        "_createdAtMs": time.time() * 1000,
        "_stopRequestedAtMs": None,
        "_transactionId": transaction_id,
        "_idTag": "HOTEL-GUEST",
        "_useRealCharger": EV_USE_REAL_CHARGER,
    }

    EV_SESSIONS[session_id] = session

    return jsonify({"sessionId": session_id, "status": "STARTING", "pollAfterMs": 2000, "transactionId": transaction_id}), 201


@app.route("/v1/sessions/<session_id>", methods=["GET"])
def ev_get_session(session_id):
    session = EV_SESSIONS.get(session_id)
    if not session:
        return Response("Unknown session", status=404)

    s = ev_recompute_session(session)

    real_status = None
    real_connector = None

    if s.get("_useRealCharger"):
        ocpp_result = ev_ocpp_get_connector_status(s["chargerId"], s["connectorId"])
        if ocpp_result and ocpp_result.get("success"):
            real_connector = ocpp_result.get("connector", {})
            real_status = real_connector.get("status")

            if real_status:
                status_lower = real_status.lower()
                if status_lower == "charging":
                    s["status"] = "CHARGING"
                    if not s.get("startedAt"):
                        s["startedAt"] = ev_now_iso()
                elif status_lower == "finishing":
                    s["status"] = "STOPPING"
                elif status_lower == "available" and s["status"] not in ("STARTING", "COMPLETE"):
                    if s.get("stopRequested") or s["status"] == "STOPPING":
                        s["status"] = "COMPLETE"
                        s["endedAt"] = s.get("endedAt") or ev_now_iso()
                elif status_lower == "preparing":
                    s["status"] = "STARTING"
                elif status_lower in ("suspendedev", "suspendedevse"):
                    s["status"] = "PAUSED"
                elif status_lower == "faulted":
                    s["status"] = "FAILED"
                    s["message"] = real_connector.get("error_code", "Charger fault")

    response = {
        "sessionId": s["sessionId"],
        "status": s["status"],
        "elapsedSec": s["elapsedSec"],
        "energyKwh": s["energyKwh"],
        "energyDeliveredKwh": s.get("energyDeliveredKwh", s["energyKwh"]),
        "powerKw": s["powerKw"],
        "cost": s["cost"],
        "costDetail": s.get("costDetail"),
        "socPercent": s["socPercent"],
        "message": s["message"],
    }

    if s.get("startedAt"):
        response["startedAt"] = s["startedAt"]

    if real_connector:
        response["realCharger"] = {
            "status": real_status,
            "transactionId": real_connector.get("current_transaction_id"),
            "errorCode": real_connector.get("error_code"),
            "meterStart": real_connector.get("meter_start"),
            "timestamp": real_connector.get("timestamp"),
        }

    return jsonify(response)


@app.route("/v1/sessions/<session_id>/stop", methods=["POST"])
@ev_require_auth
def ev_stop_session(session_id):
    session = EV_SESSIONS.get(session_id)
    if not session:
        return Response("Unknown session", status=404)

    user = getattr(request, "user", None)
    if user and user.get("chargerId") and user["chargerId"] != session["chargerId"]:
        return Response("Token not valid for this charger", status=403)

    if session.get("_useRealCharger") and session.get("_transactionId"):
        stop_result = ev_ocpp_remote_stop(
            charge_point_id=session["chargerId"],
            connector_id=session["connectorId"],
            transaction_id=session["_transactionId"],
            id_tag=session.get("_idTag", "HOTEL-GUEST"),
        )
        if not stop_result or not stop_result.get("success"):
            error_msg = stop_result.get("error", "Unknown error") if stop_result else "OCPP unavailable"
            session["stopRequested"] = True
            return jsonify({"sessionId": session_id, "status": "STOPPING", "warning": f"Stop may not have reached charger: {error_msg}"})

    session["stopRequested"] = True

    s = ev_recompute_session(session)
    return jsonify(
        {
            "sessionId": session_id,
            "status": "STOPPING",
            "energyDeliveredKwh": s.get("energyDeliveredKwh", s["energyKwh"]),
            "cost": s["cost"],
            "costDetail": s.get("costDetail"),
        }
    )


@app.route("/v1/sessions/<session_id>/receipt", methods=["GET"])
def ev_get_receipt(session_id):
    session = EV_SESSIONS.get(session_id)
    if not session:
        return Response("Unknown session", status=404)

    s = ev_recompute_session(session)
    if s["status"] != "COMPLETE":
        return Response("Receipt not available until session is complete", status=409)

    return jsonify(
        {
            "sessionId": s["sessionId"],
            "siteId": EV_DEFAULT_SITE_ID,
            "chargerId": s["chargerId"],
            "connectorId": s["connectorId"],
            "startedAt": s.get("startedAt") or ev_now_iso(),
            "endedAt": s.get("endedAt") or ev_now_iso(),
            "energyKwh": s["energyKwh"],
            "energyDeliveredKwh": s.get("energyDeliveredKwh", s["energyKwh"]),
            "total": s.get("costDetail") or {"currency": EV_PRICING["currency"], "amount": s["cost"]},
            "payment": {"mode": "CARD", "paymentRef": s["paymentRef"]} if s.get("paymentRef") else {"mode": "HOTEL_GUEST", "folioPosted": True},
        }
    )


@app.route("/v1/health", methods=["GET"])
def ev_health_check():
    health = {
        "status": "ok",
        "mode": "real" if EV_USE_REAL_API else "mock",
        "realApiBase": EV_REAL_API_BASE,
        "realApiConnected": False,
        "useRealCharger": EV_USE_REAL_CHARGER,
        "timeScale": EV_TIME_SCALE,
    }

    if EV_USE_REAL_API:
        try:
            ev_call_real_api("/user/getByEmail", {"email": "test@test.com"}, "POST")
            health["realApiConnected"] = True
        except Exception as e:
            error_msg = str(e)
            if "404" in error_msg or "not found" in error_msg.lower():
                health["realApiConnected"] = True
            else:
                health["realApiConnected"] = False
                health["realApiError"] = error_msg

    return jsonify(health)


@app.route("/v1/real/user/getByEmail", methods=["POST"])
def ev_real_get_user_by_email():
    data = request.get_json() or {}
    email = data.get("email")
    if not email:
        return Response("Missing email", status=400)

    try:
        user = ev_get_real_user_by_email(email)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/v1/real/users", methods=["GET"])
def ev_real_get_users():
    try:
        users = ev_get_real_users()
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/v1/real/proxy", methods=["POST"])
def ev_real_proxy():
    data = request.get_json() or {}
    endpoint = data.get("endpoint")
    body = data.get("body")

    if not endpoint:
        return Response("Missing endpoint", status=400)

    try:
        result = ev_call_real_api(endpoint, body or {})
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/v1/host-sites", methods=["GET"])
def ev_get_host_sites():
    url = f"{EV_REAL_HOSTSITES_API_BASE}/host-sites"
    return ev_simple_get(url)


@app.route("/v1/host-sites/<int:site_id>", methods=["GET"])
def ev_get_host_site(site_id):
    url = f"{EV_REAL_HOSTSITES_API_BASE}/host-sites/{site_id}"
    return ev_simple_get(url)


@app.route("/v1/host-sites", methods=["POST"])
def ev_create_host_site():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    url = f"{EV_REAL_HOSTSITES_API_BASE}/host-sites"
    try:
        response = ev_http("POST", url, body=data, timeout=10)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/v1/chargers/site/<int:site_id>", methods=["GET"])
def ev_get_chargers_by_site(site_id):
    url = f"{EV_REAL_CHARGERS_API_BASE}/chargers/chargers/site/{site_id}"
    return ev_simple_get(url)


@app.route("/v1/chargers/<int:charger_id>/details", methods=["GET"])
def ev_get_charger_details(charger_id):
    url = f"{EV_REAL_CHARGERS_API_BASE}/chargers/chargers/{charger_id}"
    return ev_simple_get(url)


@app.route("/v1/chargers/ocpp/<charge_point_id>/status", methods=["GET"])
def ev_get_charger_ocpp_status(charge_point_id):
    try:
        url = f"{EV_REAL_OCPP_API_BASE}/api/connectors"
        params = {"charge_point_id": charge_point_id}
        response = ev_http("GET", url, params=params, timeout=10)
        if not response.ok:
            return jsonify({"error": f"OCPP API error ({response.status_code})"}), response.status_code

        data = response.json()
        connectors = data.get("data", [])

        cp_url = f"{EV_REAL_OCPP_API_BASE}/api/charge-points"
        cp_response = ev_http("GET", cp_url, timeout=10)
        charge_point = None
        if cp_response.ok:
            cp_data = cp_response.json()
            charge_points = ev_list_from_response(cp_data, "data")
            charge_point = next((cp for cp in charge_points if cp.get("charge_point_id") == charge_point_id), None)

        return jsonify(
            {
                "charge_point_id": charge_point_id,
                "charge_point": charge_point,
                "connectors": connectors,
                "online": charge_point.get("online") if charge_point else None,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/v1/charge-points", methods=["GET"])
def ev_get_charge_points():
    url = f"{EV_REAL_OCPP_API_BASE}/api/charge-points"
    return ev_simple_get(url, error_label="OCPP API error")


@app.route("/v1/ocpp/sessions", methods=["GET"])
def ev_get_ocpp_sessions():
    """
    Aggregate live charging sessions from the OCPP Central System.
    Returns connectors that are actively charging or preparing.
    """
    try:
        cp_url = f"{EV_REAL_OCPP_API_BASE}/api/charge-points"
        cp_response = ev_http("GET", cp_url, timeout=10)
        if not cp_response.ok:
            return jsonify({"sessions": [], "count": 0, "error": f"OCPP API error ({cp_response.status_code})"}), cp_response.status_code

        cp_data = cp_response.json()
        charge_points = ev_list_from_response(cp_data, "data", "charge_points", "items")

        sessions = []
        for cp in charge_points:
            charge_point_id = cp.get("charge_point_id") or cp.get("ocpp_identity") or cp.get("id")
            if not charge_point_id:
                continue

            connectors_url = f"{EV_REAL_OCPP_API_BASE}/api/connectors"
            params = {"charge_point_id": str(charge_point_id)}
            conn_response = ev_http("GET", connectors_url, params=params, timeout=10)
            if not conn_response.ok:
                continue

            conn_data = conn_response.json()
            connectors = ev_list_from_response(conn_data, "data", "connectors", "items")

            for conn in connectors:
                status_raw = conn.get("status") or ""
                status = str(status_raw).upper()
                transaction_id = conn.get("current_transaction_id") or conn.get("transaction_id")
                is_active = status not in ("AVAILABLE", "UNAVAILABLE", "UNKNOWN", "")
                if is_active or transaction_id:
                    sessions.append(
                        {
                            "sessionId": f"OCPP-{charge_point_id}-{conn.get('connector_id')}",
                            "status": status or "UNKNOWN",
                            "statusRaw": status_raw,
                            "chargerId": charge_point_id,
                            "connectorId": conn.get("connector_id") or conn.get("connectorId"),
                            "transactionId": transaction_id,
                            "energyKwh": None,
                            "powerKw": None,
                            "elapsedSec": None,
                            "cost": None,
                            "source": "ocpp",
                        }
                    )

        return jsonify({"sessions": sessions, "count": len(sessions)})
    except Exception as e:
        return jsonify({"sessions": [], "count": 0, "error": str(e)}), 500

# =============================================================================
# Helpers
# =============================================================================

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")



# =============================================================================
# Business / Site / Employee / Permission API Endpoints
# =============================================================================
# These endpoints proxy to the real database-backed microservices.
# The Spring Boot backend on the MICROSERVICE_HOST handles persistence.
# No in-memory mock data — all CRUD goes through the real API.
# =============================================================================

EV_REAL_BUSINESS_API_BASE = os.environ.get("REAL_BUSINESS_API_BASE", f"{MICROSERVICE_HOST}:9005")


# ---------------------------------------------------------------------------
# Business CRUD
# ---------------------------------------------------------------------------

@app.get("/api/businesses")
def get_all_businesses():
    """List all businesses."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/businesses",
                              error_message="Failed to fetch businesses")


@app.get("/api/businesses/<int:business_id>")
def get_business(business_id):
    """Get a single business by ID."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}",
                              error_message="Failed to fetch business",
                              not_found="Business not found")


@app.post("/api/businesses")
def create_business():
    """Create a new business / organization."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/businesses",
                              body=data, error_message="Failed to create business")


@app.put("/api/businesses/<int:business_id>")
def update_business(business_id):
    """Update an existing business."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PUT", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}",
                              body=data, error_message="Failed to update business",
                              not_found="Business not found")


@app.delete("/api/businesses/<int:business_id>")
def delete_business(business_id):
    """Delete a business."""
    return proxy_json_request("DELETE", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}",
                              error_message="Failed to delete business",
                              not_found="Business not found",
                              empty_message="Business deleted")


# ---------------------------------------------------------------------------
# Site CRUD  (DB-backed — replaces the old /v1/host-sites proxy)
# ---------------------------------------------------------------------------

@app.get("/api/sites")
def get_all_sites():
    """List all sites."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/sites",
                              error_message="Failed to fetch sites")


@app.get("/api/sites/<int:site_id>")
def get_site(site_id):
    """Get a single site."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}",
                              error_message="Failed to fetch site",
                              not_found="Site not found")


@app.get("/api/businesses/<int:business_id>/sites")
def get_business_sites(business_id):
    """List all sites belonging to a business."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}/sites",
                              error_message="Failed to fetch business sites")


@app.post("/api/businesses/<int:business_id>/sites")
def create_site(business_id):
    """Create a new site under a business."""
    data, err = get_json_body()
    if err:
        return err
    data["business_id"] = business_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites",
                              body=data, error_message="Failed to create site")


@app.put("/api/sites/<int:site_id>")
def update_site(site_id):
    """Update a site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PUT", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}",
                              body=data, error_message="Failed to update site",
                              not_found="Site not found")


@app.delete("/api/sites/<int:site_id>")
def delete_site(site_id):
    """Delete a site."""
    return proxy_json_request("DELETE", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}",
                              error_message="Failed to delete site",
                              not_found="Site not found",
                              empty_message="Site deleted")


# ---------------------------------------------------------------------------
# Employee CRUD
# ---------------------------------------------------------------------------

@app.get("/api/businesses/<int:business_id>/employees")
def get_business_employees(business_id):
    """List all employees of a business."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}/employees",
                              error_message="Failed to fetch employees")


@app.get("/api/employees/<int:employee_id>")
def get_employee(employee_id):
    """Get a single employee."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}",
                              error_message="Failed to fetch employee",
                              not_found="Employee not found")


@app.post("/api/businesses/<int:business_id>/employees")
def create_employee(business_id):
    """Create a new employee under a business."""
    data, err = get_json_body()
    if err:
        return err
    data["business_id"] = business_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/employees",
                              body=data, error_message="Failed to create employee")


@app.put("/api/employees/<int:employee_id>")
def update_employee(employee_id):
    """Update an employee."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PUT", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}",
                              body=data, error_message="Failed to update employee",
                              not_found="Employee not found")


@app.delete("/api/employees/<int:employee_id>")
def delete_employee(employee_id):
    """Delete an employee."""
    return proxy_json_request("DELETE", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}",
                              error_message="Failed to delete employee",
                              not_found="Employee not found",
                              empty_message="Employee deleted")


# ---------------------------------------------------------------------------
# Employee ↔ Site Assignment
# ---------------------------------------------------------------------------

@app.get("/api/employees/<int:employee_id>/sites")
def get_employee_sites(employee_id):
    """Get all sites an employee is assigned to."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/sites",
                              error_message="Failed to fetch employee sites")


@app.post("/api/employees/<int:employee_id>/sites")
def assign_employee_to_site(employee_id):
    """Assign an employee to a site."""
    data, err = get_json_body()
    if err:
        return err
    data["employee_id"] = employee_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/sites",
                              body=data, error_message="Failed to assign employee to site")


@app.put("/api/employees/<int:employee_id>/sites/<int:site_id>")
def update_employee_site(employee_id, site_id):
    """Update an employee's role/status at a site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PUT", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/sites/{site_id}",
                              body=data, error_message="Failed to update site assignment")


@app.delete("/api/employees/<int:employee_id>/sites/<int:site_id>")
def remove_employee_from_site(employee_id, site_id):
    """Remove an employee from a site."""
    return proxy_json_request("DELETE", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/sites/{site_id}",
                              error_message="Failed to remove employee from site",
                              empty_message="Employee removed from site")


@app.get("/api/sites/<int:site_id>/employees")
def get_site_employees(site_id):
    """Get all employees assigned to a site."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/employees",
                              error_message="Failed to fetch site employees")


@app.post("/api/sites/<int:site_id>/employees")
def assign_existing_employee_to_site(site_id):
    """Assign an existing employee to a site (from site perspective)."""
    data, err = get_json_body()
    if err:
        return err
    data["site_id"] = site_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/employees",
                              body=data, error_message="Failed to assign employee to site")


# ---------------------------------------------------------------------------
# Employee Permissions
# ---------------------------------------------------------------------------

@app.get("/api/employees/<int:employee_id>/permissions")
def get_employee_permissions(employee_id):
    """Get all permissions for an employee."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/permissions",
                              error_message="Failed to fetch permissions")


@app.post("/api/employees/<int:employee_id>/permissions")
def grant_employee_permission(employee_id):
    """
    Grant a permission to an employee.
    Body: {"site_id": 1, "permission_type": "charger.manage", "granted_by": 5}
    site_id is optional — null means business-wide.
    """
    data, err = get_json_body()
    if err:
        return err
    data["employee_id"] = employee_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/permissions",
                              body=data, error_message="Failed to grant permission")


@app.delete("/api/employees/<int:employee_id>/permissions/<int:permission_id>")
def revoke_employee_permission(employee_id, permission_id):
    """Revoke a specific permission."""
    return proxy_json_request(
        "DELETE",
        f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/permissions/{permission_id}",
        error_message="Failed to revoke permission",
        empty_message="Permission revoked")


# ---------------------------------------------------------------------------
# Roles (read-only reference from security module)
# ---------------------------------------------------------------------------

@app.get("/api/roles")
def get_roles():
    """Get all available role definitions."""
    return jsonify({
        "global_roles": list(GLOBAL_ROLES),
        "site_roles": list(SITE_ROLES),
        "operator_roles": list(OPERATOR_ROLES),
    })


@app.get("/api/users/<int:user_id>/roles")
def get_user_roles_endpoint(user_id):
    """Get roles for a user — proxied to the backend."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/users/{user_id}/roles",
                              error_message="Failed to fetch user roles")


@app.post("/api/users/<int:user_id>/roles")
def assign_user_role(user_id):
    """Assign a role to a user — proxied to the backend."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/users/{user_id}/roles",
                              body=data, error_message="Failed to assign role")


# ---------------------------------------------------------------------------
# Site Members (proxied — replaces old in-memory HOST_SITE_MEMBERS)
# ---------------------------------------------------------------------------

@app.get("/api/sites/<int:site_id>/members")
def get_site_members(site_id):
    """Get all members of a host site."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/members",
                              error_message="Failed to fetch site members")


@app.post("/api/sites/<int:site_id>/members/invite")
def invite_site_member(site_id):
    """Invite a user to manage a host site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/members/invite",
                              body=data, error_message="Failed to invite member")


@app.post("/api/sites/<int:site_id>/members/<int:user_id>")
def add_site_member(site_id, user_id):
    """Directly add a user as a site member."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/members/{user_id}",
                              body=data, error_message="Failed to add member")


@app.delete("/api/sites/<int:site_id>/members/<int:user_id>")
def remove_site_member(site_id, user_id):
    """Remove a user from site membership."""
    return proxy_json_request("DELETE", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/members/{user_id}",
                              error_message="Failed to remove member",
                              empty_message="Member removed")


# ---------------------------------------------------------------------------
# Driver Site Access (proxied — replaces old in-memory DRIVER_SITE_ACCESS)
# ---------------------------------------------------------------------------

@app.get("/api/sites/<int:site_id>/drivers")
def get_site_drivers(site_id):
    """Get all drivers with access to this site."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers",
                              error_message="Failed to fetch site drivers")


@app.post("/api/sites/<int:site_id>/drivers/invite")
def invite_driver(site_id):
    """Invite a driver to a private site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/invite",
                              body=data, error_message="Failed to invite driver")


@app.post("/api/sites/<int:site_id>/access-request")
def request_site_access(site_id):
    """Driver requests access to a private site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/access-request",
                              body=data, error_message="Failed to submit access request")


@app.post("/api/sites/<int:site_id>/drivers/<int:driver_id>/approve")
def approve_driver(site_id, driver_id):
    """Approve a driver's access to a private site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/{driver_id}/approve",
                              body=data, error_message="Failed to approve driver")


@app.post("/api/sites/<int:site_id>/drivers/<int:driver_id>/block")
def block_driver(site_id, driver_id):
    """Block a driver from a private site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/{driver_id}/block",
                              body=data, error_message="Failed to block driver")


@app.post("/api/sites/<int:site_id>/drivers/<int:driver_id>/revoke")
def revoke_driver(site_id, driver_id):
    """Revoke a driver's access."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/{driver_id}/revoke",
                              body=data, error_message="Failed to revoke driver")


@app.post("/api/sites/<int:site_id>/drivers/<int:driver_id>/unblock")
def unblock_driver(site_id, driver_id):
    """Unblock a previously blocked driver."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/{driver_id}/unblock",
                              body=data, error_message="Failed to unblock driver")


# ---------------------------------------------------------------------------
# Driver-facing endpoints (proxied)
# ---------------------------------------------------------------------------

@app.get("/api/me/site-access")
def get_my_site_access():
    """Get all sites the current driver has approved access to."""
    driver_id = request.args.get("driver_user_id", type=int)
    if not driver_id:
        return jsonify({"error": "driver_user_id query param required"}), 400
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/me/site-access?driver_user_id={driver_id}",
                              error_message="Failed to fetch site access")


@app.get("/api/me/site-access/all")
def get_my_all_site_access():
    """Get all site access records for a driver (including pending, revoked)."""
    driver_id = request.args.get("driver_user_id", type=int)
    if not driver_id:
        return jsonify({"error": "driver_user_id query param required"}), 400
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/me/site-access/all?driver_user_id={driver_id}",
                              error_message="Failed to fetch access records")


# ---------------------------------------------------------------------------
# Invitations (proxied)
# ---------------------------------------------------------------------------

@app.get("/api/invitations/<token>")
def get_invitation(token):
    """Get invitation details by token."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/invitations/{token}",
                              error_message="Failed to fetch invitation",
                              not_found="Invitation not found")


@app.post("/api/invitations/<token>/accept")
def accept_invitation(token):
    """Accept an invitation."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/invitations/{token}/accept",
                              body=data, error_message="Failed to accept invitation")


# ---------------------------------------------------------------------------
# Audit Log (proxied)
# ---------------------------------------------------------------------------

@app.get("/api/audit-log")
def get_audit_log():
    """Get audit log entries."""
    qs = request.query_string.decode()
    url = f"{EV_REAL_BUSINESS_API_BASE}/audit-log"
    if qs:
        url += f"?{qs}"
    return proxy_json_request("GET", url, error_message="Failed to fetch audit log")


# ---------------------------------------------------------------------------
# Authorization Check Endpoints (proxied)
# ---------------------------------------------------------------------------

@app.get("/api/auth/can-manage-site/<int:site_id>")
def check_can_manage_site(site_id):
    """Check if a user can manage a specific site."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id query param required"}), 400
    return proxy_json_request(
        "GET",
        f"{EV_REAL_BUSINESS_API_BASE}/auth/can-manage-site/{site_id}?user_id={user_id}",
        error_message="Failed to check management access")


@app.get("/api/auth/can-use-site/<int:site_id>")
def check_can_use_site(site_id):
    """Check if a driver can use a specific site."""
    driver_id = request.args.get("driver_user_id", type=int)
    visibility = request.args.get("visibility", "private")
    if not driver_id:
        return jsonify({"error": "driver_user_id query param required"}), 400
    return proxy_json_request(
        "GET",
        f"{EV_REAL_BUSINESS_API_BASE}/auth/can-use-site/{site_id}?driver_user_id={driver_id}&visibility={visibility}",
        error_message="Failed to check site access")


@app.get("/api/data")
def api_data():
    # Return site content so the React SPA can render everything dynamically
    features = [
        {"title": "Rent a Charger", "icon": "battery-charging", "desc": "On-demand mobile charging when you need it."},
        {"title": "Installation Services", "icon": "zap", "desc": "Professional setup for home and business clusters."},
        {"title": "EV Buddy Network", "icon": "landmark", "desc": "Join our massive market infrastructure opportunity."}
    ]

    steps = [
        {"step": "01", "title": "Connect Donor"},
        {"step": "02", "title": "Power Transfer"},
        {"step": "03", "title": "Vehicle Ready"},
        {"step": "04", "title": "Back on Road"}
    ]

    stats = [
        {"label": "Stations", "value": "1.2M+"},
        {"label": "Users", "value": "250k+"},
        {"label": "Market", "value": "$1.3B"}
    ]

    meta = {"siteName": "EV Buddy", "tagline": "V2V Charging for a mobile future"}

    return jsonify({"meta": meta, "features": features, "steps": steps, "stats": stats})


@app.post("/api/preorder")
def api_preorder():
    """Submit a pre-order — proxied to backend."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/preorders",
                              body=data, error_message="Failed to submit pre-order")


@app.post("/api/subscribe")
def api_subscribe():
    """Subscribe to newsletter — proxied to backend."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/subscribers",
                              body=data, error_message="Failed to subscribe")


# =============================================================================
# Users Service Proxy (Port 9000)
# =============================================================================


@app.get("/api/users/status")
def users_service_status():
    """Check Users service health."""
    return proxy_json_request(
        "GET",
        service_status_url("users"),
        timeout=5,
        error_message="Users service unavailable",
    )


@app.get("/api/users")
def get_all_users():
    """Get all users (if supported) or use query params to filter."""
    return proxy_json_request(
        "GET",
        ms_url("users"),
        error_message="Failed to fetch users",
    )


@app.get("/api/users/<int:user_id>")
def get_user_by_id(user_id):
    """Get a single user by ID."""
    return proxy_json_request(
        "GET",
        ms_url("users", f"/{user_id}"),
        error_message="Failed to fetch user",
        not_found="User not found",
    )


@app.post("/api/users")
def create_user():
    """
    Create a new user.
    
    Expected body (subset - full schema in Spring Boot docs):
    {
        "first_name": "...",
        "last_name": "...",
        "email": "...",
        "phone_number": "...",
        "is_host": false,
        "is_driver": true,
        "is_admin": false,
        ...
    }
    """
    data, err = get_json_body()
    if err:
        return err
    
    return proxy_json_request(
        "POST",
        ms_url("users"),
        body=data,
        error_message="Failed to create user",
    )


@app.delete("/api/users/<int:user_id>")
def delete_user(user_id):
    """Delete a user by ID."""
    return proxy_json_request(
        "DELETE",
        ms_url("users", f"/{user_id}"),
        error_message="Failed to delete user",
        not_found="User not found",
        empty_message="User deleted",
    )


@app.put("/api/users/<int:user_id>")
def update_user(user_id):
    """
    Update an existing user (full replacement).
    
    PUT replaces the entire user resource with the provided data.
    """
    data, err = get_json_body()
    if err:
        return err
    
    return proxy_json_request(
        "PUT",
        ms_url("users", f"/{user_id}"),
        body=data,
        error_message="Failed to update user",
        not_found="User not found",
    )


@app.patch("/api/users/<int:user_id>")
def patch_user(user_id):
    """
    Partially update an existing user.
    
    Since the backend only supports PUT (full replacement), this endpoint:
    1. Fetches the current user
    2. Merges the provided fields
    3. Sends a PUT with the complete updated user
    """
    data, err = get_json_body()
    if err:
        return err
    
    try:
        # First, get the current user
        get_resp = http_requests.get(ms_url("users", f"/{user_id}"), timeout=10)
        if get_resp.status_code == 404:
            return jsonify({"error": "User not found"}), 404
        if get_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch user for update"}), get_resp.status_code
        
        # Merge the existing user with the new data
        current_user = get_resp.json()
        updated_user = {**current_user, **data}
        
        # Send PUT with the merged data
        return proxy_json_request(
            "PUT",
            ms_url("users", f"/{user_id}"),
            body=updated_user,
            error_message="Failed to patch user",
        )
    except http_requests.RequestException as e:
        return jsonify({"error": "Failed to patch user", "details": str(e)}), 503


# =============================================================================
# User Vehicles API
# =============================================================================


@app.get("/api/vehicles")
def get_all_vehicles():
    """Get all vehicles."""
    return proxy_json_request(
        "GET",
        ms_url("user_vehicles"),
        error_message="Failed to fetch vehicles",
    )


@app.get("/api/vehicles/<int:vehicle_id>")
def get_vehicle_by_id(vehicle_id):
    """Get a single vehicle by ID."""
    return proxy_json_request(
        "GET",
        ms_url("user_vehicles", f"/{vehicle_id}"),
        error_message="Failed to fetch vehicle",
        not_found="Vehicle not found",
    )


@app.get("/api/users/<int:user_id>/vehicles")
def get_user_vehicles(user_id):
    """Get all vehicles belonging to a specific user."""
    # Backend uses query param for user filtering
    return proxy_json_request(
        "GET",
        ms_url("user_vehicles", f"?user_id={user_id}"),
        error_message="Failed to fetch user vehicles",
    )


@app.post("/api/vehicles")
def create_vehicle():
    """
    Create a new vehicle.
    
    Expected body:
    {
        "user_id": 123,
        "make": "Tesla",
        "model": "Model 3",
        "year": 2024,
        "vin": "5YJ3E1EA1PF123456",
        "license_plate": "ABC1234",
        "color": "White",
        "battery_capacity_kwh": 75.0,
        "max_charge_rate_kw": 250.0,
        "connector_type": "CCS"
    }
    """
    data, err = get_json_body()
    if err:
        return err
    
    return proxy_json_request(
        "POST",
        ms_url("user_vehicles"),
        body=data,
        error_message="Failed to create vehicle",
    )


# Note: The backend microservice does not support PUT, only PATCH
# Keeping this for API completeness but it will return 405
@app.put("/api/vehicles/<int:vehicle_id>")
def update_vehicle(vehicle_id):
    """Update an existing vehicle (full replacement). Note: Backend may not support PUT."""
    data, err = get_json_body()
    if err:
        return err
    
    response = proxy_json_request(
        "PUT",
        ms_url("user_vehicles", f"/{vehicle_id}"),
        body=data,
        error_message="Failed to update vehicle",
        not_found="Vehicle not found",
    )
    if response[1] == 405:
        return jsonify({"error": "PUT not supported by backend, use PATCH instead"}), 405
    return response


@app.patch("/api/vehicles/<int:vehicle_id>")
def patch_vehicle(vehicle_id):
    """Partially update an existing vehicle."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "PATCH",
        ms_url("user_vehicles", f"/{vehicle_id}"),
        body=data,
        error_message="Failed to patch vehicle",
        not_found="Vehicle not found",
    )


@app.delete("/api/vehicles/<int:vehicle_id>")
def delete_vehicle(vehicle_id):
    """Delete a vehicle by ID."""
    return proxy_json_request(
        "DELETE",
        ms_url("user_vehicles", f"/{vehicle_id}"),
        error_message="Failed to delete vehicle",
        not_found="Vehicle not found",
        empty_message="Vehicle deleted",
    )


# =============================================================================
# User Payments API
# =============================================================================


@app.get("/api/payments")
def get_all_payments():
    """Get all payment methods."""
    return proxy_json_request(
        "GET",
        ms_url("user_payments"),
        error_message="Failed to fetch payments",
    )


@app.get("/api/payments/<int:payment_id>")
def get_payment_by_id(payment_id):
    """Get a single payment method by ID."""
    return proxy_json_request(
        "GET",
        ms_url("user_payments", f"/{payment_id}"),
        error_message="Failed to fetch payment",
        not_found="Payment method not found",
    )


@app.get("/api/users/<int:user_id>/payments")
def get_user_payments(user_id):
    """Get all payment methods belonging to a specific user."""
    return proxy_json_request(
        "GET",
        ms_url("user_payments", f"?user_id={user_id}"),
        error_message="Failed to fetch user payments",
    )


@app.post("/api/payments")
def create_payment():
    """
    Create a new payment method.
    
    Expected body:
    {
        "user_id": 123,
        "cardtype": 1,
        "nickname": "My Visa",
        "primary_number": "4111111111111111",
        "cardholder_name": "John Doe",
        "expiration": "2028-12-01",
        "cvc": "123",
        "billing_street": "123 Main St",
        "billing_city": "New York",
        "billing_state": "NY",
        "billing_country": "US",
        "billing_phone": "5551234567"
    }
    """
    data, err = get_json_body()
    if err:
        return err
    
    return proxy_json_request(
        "POST",
        ms_url("user_payments"),
        body=data,
        error_message="Failed to create payment",
    )


@app.delete("/api/payments/<int:payment_id>")
def delete_payment(payment_id):
    """Delete a payment method by ID."""
    return proxy_json_request(
        "DELETE",
        ms_url("user_payments", f"/{payment_id}"),
        error_message="Failed to delete payment",
        not_found="Payment method not found",
        empty_message="Payment method deleted",
    )


# =============================================================================
# Services Discovery Endpoint
# =============================================================================

@app.get("/api/services")
def get_services_status():
    """
    Query all microservices and return their availability status.
    
    Returns:
        {
            "services": {
                "users": {"available": true, "port": 9000, "url": "http://localhost:9000/user/users"},
                "chargers": {"available": false, "port": 9017, "url": "http://localhost:9017/chargers", "error": "..."},
                ...
            },
            "summary": {
                "total": 11,
                "available": 3,
                "unavailable": 8
            }
        }
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    def check_service(name):
        url = service_status_url(name)
        
        result = {
            "port": SERVICES[name]["port"],
            "base_url": ms_url(name),
            "status_url": url,
        }
        
        try:
            resp = http_requests.get(url, timeout=2)
            result["available"] = resp.status_code == 200
            result["status_code"] = resp.status_code
            if resp.status_code == 200:
                try:
                    result["response"] = resp.json()
                except:
                    result["response"] = resp.text[:100]
        except http_requests.RequestException as e:
            result["available"] = False
            result["error"] = str(e)
        
        return name, result
    
    services_status = {}
    
    # Check all services in parallel for faster response
    with ThreadPoolExecutor(max_workers=len(SERVICES)) as executor:
        futures = {executor.submit(check_service, name): name for name in SERVICES}
        for future in as_completed(futures):
            name, result = future.result()
            services_status[name] = result
    
    # Calculate summary
    available_count = sum(1 for s in services_status.values() if s.get("available"))
    
    return jsonify({
        "services": services_status,
        "summary": {
            "total": len(SERVICES),
            "available": available_count,
            "unavailable": len(SERVICES) - available_count
        },
        "microservice_host": MICROSERVICE_HOST
    })


@app.get("/api/services/<service_name>")
def get_single_service_status(service_name):
    """Check status of a single service by name."""
    if service_name not in SERVICES:
        return jsonify({
            "error": f"Unknown service: {service_name}",
            "available_services": list(SERVICES.keys())
        }), 404
    
    svc = SERVICES[service_name]
    url = service_status_url(service_name)
    
    result = {
        "service": service_name,
        "port": svc["port"],
        "base_url": ms_url(service_name),
        "status_url": url,
    }
    
    try:
        resp = http_requests.get(url, timeout=5)
        result["available"] = resp.status_code == 200
        result["status_code"] = resp.status_code
        if resp.status_code == 200:
            try:
                result["response"] = resp.json()
            except:
                result["response"] = resp.text[:100]
    except http_requests.RequestException as e:
        result["available"] = False
        result["error"] = str(e)
    
    return jsonify(result)


@app.get("/health")
def health():
    return jsonify(status="ok")


# =============================================================================
# CPMS Operations (Secured with RBAC)
# =============================================================================
# These endpoints enforce two-layer authorization:
# Layer A: Role capability (does the role allow this action?)
# Layer B: Scope ownership (does the user belong to the operator that owns the asset?)

@app.post("/api/assets/<asset_id>/remote-start")
@require_auth
@require_asset_operation("asset_id", "remote_start")
@audit_action("REMOTE_START", "asset")
def cpms_remote_start(asset_id):
    """
    Start a charging session remotely.
    Requires: operator_owner, operator_admin, operator_ops, or operator_support role.
    """
    data = request.get_json() or {}
    connector_id = data.get("connector_id", 1)
    id_tag = data.get("id_tag")
    
    # In production: validate_ocpp_command then dispatch to OCPP
    # ocpp_service.remote_start(asset_id, connector_id, id_tag)
    
    return ok_response("Remote start command sent", asset_id=asset_id, connector_id=connector_id)


@app.post("/api/assets/<asset_id>/remote-stop")
@require_auth
@require_asset_operation("asset_id", "remote_stop")
@audit_action("REMOTE_STOP", "asset")
def cpms_remote_stop(asset_id):
    """
    Stop a charging session remotely.
    Requires: operator_owner, operator_admin, operator_ops, or operator_support role.
    """
    data = request.get_json() or {}
    transaction_id = data.get("transaction_id")
    
    if not transaction_id:
        return jsonify({"error": "transaction_id required"}), 400
    
    return ok_response("Remote stop command sent", asset_id=asset_id, transaction_id=transaction_id)


@app.post("/api/assets/<asset_id>/maintenance-mode")
@require_auth
@require_asset_operation("asset_id", "maintenance_mode")
@audit_action("MAINTENANCE_MODE", "asset")
def cpms_maintenance_mode(asset_id):
    """
    Set charger to maintenance mode.
    Requires: operator_owner, operator_admin, operator_ops, or operator_tech role.
    """
    data = request.get_json() or {}
    enabled = data.get("enabled", True)
    reason = data.get("reason", "")
    
    return ok_response(
        f"Maintenance mode {'enabled' if enabled else 'disabled'}",
        asset_id=asset_id,
        enabled=enabled,
        reason=reason,
    )


@app.get("/api/assets/<asset_id>/diagnostics")
@require_auth
@require_asset_operation("asset_id", "diagnostics_read")
def cpms_get_diagnostics(asset_id):
    """
    Get charger diagnostics.
    Requires: Any operator role (read access).
    """
    # In production: fetch from OCPP/charger
    return jsonify({
        "asset_id": asset_id,
        "status": "Available",
        "error_code": "NoError",
        "connector_status": [
            {"connector_id": 1, "status": "Available"},
            {"connector_id": 2, "status": "Available"}
        ],
        "last_heartbeat": now_iso(),
        "firmware_version": "1.2.3"
    })


@app.post("/api/assets/<asset_id>/reset")
@require_auth
@require_asset_operation("asset_id", "maintenance_mode")  # Same permission as maintenance
@audit_action("RESET", "asset")
def cpms_reset(asset_id):
    """
    Reset the charger (soft or hard).
    Requires: operator_owner, operator_admin, operator_ops, or operator_tech role.
    Hard reset requires operator_owner or operator_admin only.
    """
    data = request.get_json() or {}
    reset_type = data.get("type", "Soft")  # Soft or Hard
    
    # Hard reset is restricted further
    if reset_type == "Hard":
        user = g.user
        # Hard reset requires owner/admin only
        guard = ocpp_guard(user["id"], asset_id, "HardReset")
        if guard:
            return guard
    
    return ok_response(f"{reset_type} reset command sent", asset_id=asset_id, reset_type=reset_type)


@app.post("/api/assets/<asset_id>/firmware-update")
@require_auth
@audit_action("FIRMWARE_UPDATE", "asset")
def cpms_firmware_update(asset_id):
    """
    Trigger firmware update.
    Requires: operator_owner or operator_admin only.
    RESTRICTED COMMAND.
    """
    user = g.user
    
    guard = ocpp_guard(user["id"], asset_id, "UpdateFirmware")
    if guard:
        return guard
    
    data = request.get_json() or {}
    firmware_url = data.get("firmware_url")
    
    if not firmware_url:
        return jsonify({"error": "firmware_url required"}), 400
    
    return ok_response("Firmware update scheduled", asset_id=asset_id, firmware_url=firmware_url)


@app.post("/api/assets/<asset_id>/change-configuration")
@require_auth
@audit_action("CHANGE_CONFIGURATION", "asset")
def cpms_change_configuration(asset_id):
    """
    Change charger configuration.
    Requires: operator_owner or operator_admin only.
    RESTRICTED COMMAND.
    """
    user = g.user
    
    guard = ocpp_guard(user["id"], asset_id, "ChangeConfiguration")
    if guard:
        return guard
    
    data = request.get_json() or {}
    key = data.get("key")
    value = data.get("value")
    
    if not key:
        return jsonify({"error": "key required"}), 400
    
    return ok_response("Configuration change sent", asset_id=asset_id, key=key, value=value)


# =============================================================================
# Refunds (CPMS - Finance Operations)
# =============================================================================

@app.post("/api/sessions/<session_id>/refund")
@require_auth
@audit_action("REFUND", "session")
def cpms_refund_session(session_id):
    """
    Issue a refund for a charging session.
    Requires: operator_owner, operator_admin, or operator_finance role.
    
    NOTE: operator_tech and operator_viewer CANNOT issue refunds.
    """
    user = g.user
    data = request.get_json() or {}
    
    operator_id = data.get("operator_id")
    amount = data.get("amount")
    reason = data.get("reason", "")
    
    if not operator_id:
        return jsonify({"error": "operator_id required"}), 400
    if not amount:
        return jsonify({"error": "amount required"}), 400
    
    try:
        require_operator_role(user["id"], int(operator_id), 
                              ["operator_owner", "operator_admin", "operator_finance"])
    except AuthorizationError as e:
        security_audit(
            action="REFUND_DENIED",
            actor_user_id=user["id"],
            resource_type="session",
            resource_id=session_id,
            operator_id=int(operator_id),
            outcome="denied",
            details={"amount": amount, "reason": reason}
        )
        return jsonify({"error": str(e), "code": "FORBIDDEN"}), 403
    
    # In production: process refund via payment gateway
    
    return ok_response("Refund processed", session_id=session_id, amount=amount, reason=reason)


# =============================================================================
# Tariff Management (CPMS - Owner/Admin Only)
# =============================================================================

@app.put("/api/assets/<asset_id>/tariff")
@require_auth
@audit_action("TARIFF_CHANGE", "asset")
def cpms_update_tariff(asset_id):
    """
    Update charging tariff for an asset.
    Requires: operator_owner or operator_admin only.
    
    NOTE: operator_tech and operator_finance CANNOT modify tariffs.
    """
    user = g.user
    data = request.get_json() or {}
    
    # Get asset's operator
    from security import get_asset_operator
    operator_id = get_asset_operator(asset_id)
    
    if not operator_id:
        return jsonify({"error": "Asset not found"}), 404
    
    try:
        require_operator_role(user["id"], operator_id, 
                              ["operator_owner", "operator_admin"])
    except AuthorizationError as e:
        return jsonify({"error": str(e), "code": "FORBIDDEN"}), 403
    
    tariff = data.get("tariff")  # e.g., {"per_kwh": 0.35, "per_minute": 0.05}
    
    return ok_response("Tariff updated", asset_id=asset_id, tariff=tariff)


# =============================================================================
# Security Info Endpoints
# =============================================================================

@app.get("/api/security/roles")
def get_all_security_roles():
    """Get all valid role definitions (detailed with permissions)."""
    return jsonify({
        "global_roles": list(GLOBAL_ROLES),
        "site_roles": list(SITE_ROLES),
        "operator_roles": list(OPERATOR_ROLES),
        "cpms_permissions": {k: list(v) for k, v in CPMS_PERMISSIONS.items()},
        "ocpp_permissions": {k: list(v) if isinstance(v, list) else v for k, v in OCPP_PERMISSIONS.items()}
    })


@app.get("/api/security/audit-log")
@require_auth
@require_global_role(["platform_admin", "ops"])
def get_security_audit():
    """
    Get security audit log.
    Requires: platform_admin or ops role.
    """
    limit = request.args.get("limit", 100, type=int)
    action = request.args.get("action")
    asset_id = request.args.get("asset_id")
    
    filters = {}
    if action:
        filters["action"] = action
    if asset_id:
        filters["asset_id"] = asset_id
    
    logs = get_security_audit_log(limit=limit, **filters)
    
    return jsonify({
        "logs": logs,
        "count": len(logs)
    })


# =============================================================================
# Operator/Asset Setup (for testing - would be admin-only in production)
# =============================================================================

@app.post("/api/security/setup/operator")
@require_auth
@require_global_role(["platform_admin"])
def setup_operator():
    """
    Set up operator and assign roles (platform_admin only).
    For testing the RBAC system.
    """
    data = request.get_json() or {}
    
    operator_id = data.get("operator_id")
    user_id = data.get("user_id")
    role = data.get("role")
    
    if not all([operator_id, user_id, role]):
        return jsonify({"error": "operator_id, user_id, and role required"}), 400
    
    try:
        assign_operator_role(int(user_id), int(operator_id), role)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    
    return ok_response(f"User {user_id} assigned {role} for operator {operator_id}")


@app.post("/api/security/setup/asset")
@require_auth
@require_global_role(["platform_admin"])
def setup_asset():
    """
    Register asset to operator (platform_admin only).
    """
    data = request.get_json() or {}
    
    asset_id = data.get("asset_id")
    operator_id = data.get("operator_id")
    
    if not all([asset_id, operator_id]):
        return jsonify({"error": "asset_id and operator_id required"}), 400
    
    register_asset(str(asset_id), int(operator_id))
    
    return ok_response(f"Asset {asset_id} registered to operator {operator_id}")


if __name__ == "__main__":
    # Running directly is useful for quick local testing; for debugging prefer the VS Code launch config
    print(f"Starting Flask app. Serving static files from: {app.static_folder} (exists: {os.path.exists(app.static_folder)})")
    print(f"index.html present: {os.path.exists(os.path.join(app.static_folder, 'index.html'))}")
    app.run(host="127.0.0.1", port=9005, debug=True)
