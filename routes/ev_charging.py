"""
EV Charging Flow API routes (/v1/...).
QR resolve, hotel/card auth, charger status, sessions, receipts, health.
"""

import time
import secrets
from datetime import datetime

from flask import Blueprint, jsonify, request, Response

from config import (
    EV_USE_REAL_API,
    EV_USE_REAL_CHARGER,
    EV_DEFAULT_SITE_ID,
    EV_DEFAULT_CHARGER_ID,
    EV_PRICING,
    EV_SESSIONS,
    EV_REAL_API_BASE,
    EV_REAL_HOSTSITES_API_BASE,
    EV_REAL_CHARGERS_API_BASE,
    EV_REAL_OCPP_API_BASE,
)
from helpers import (
    ev_now_iso,
    ev_http,
    ev_simple_get,
    ev_list_from_response,
    ev_parse_qr,
    ev_issue_token,
    ev_require_auth,
    ev_find_guest_reservation,
    ev_get_real_user_by_email,
    ev_get_real_users,
    ev_call_real_api,
    ev_get_charger_connectors,
    ev_recompute_session,
    ev_ocpp_get_connector_status,
    ev_ocpp_remote_start,
    ev_ocpp_remote_stop,
)

ev_charging_bp = Blueprint("ev_charging", __name__)


# =============================================================================
# QR / Auth
# =============================================================================

@ev_charging_bp.route("/v1/qr/resolve", methods=["POST"])
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


@ev_charging_bp.route("/v1/auth/hotel", methods=["POST"])
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


@ev_charging_bp.route("/v1/auth/card/init", methods=["POST"])
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


# =============================================================================
# Chargers
# =============================================================================

@ev_charging_bp.route("/v1/chargers", methods=["GET"])
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


@ev_charging_bp.route("/v1/chargers/<charger_id>", methods=["GET"])
def ev_get_charger(charger_id):
    return jsonify({"chargerId": charger_id, "connectors": ev_get_charger_connectors(charger_id), "lastUpdated": ev_now_iso()})


@ev_charging_bp.route("/v1/chargers/<charger_id>/status", methods=["GET"])
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


# =============================================================================
# Sessions
# =============================================================================

@ev_charging_bp.route("/v1/sessions", methods=["GET"])
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


@ev_charging_bp.route("/v1/sessions", methods=["POST"])
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


@ev_charging_bp.route("/v1/sessions/<session_id>", methods=["GET"])
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


@ev_charging_bp.route("/v1/sessions/<session_id>/stop", methods=["POST"])
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


@ev_charging_bp.route("/v1/sessions/<session_id>/receipt", methods=["GET"])
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


# =============================================================================
# Health / Real API proxy
# =============================================================================

@ev_charging_bp.route("/v1/health", methods=["GET"])
def ev_health_check():
    health = {
        "status": "ok",
        "mode": "real" if EV_USE_REAL_API else "mock",
        "realApiBase": EV_REAL_API_BASE,
        "realApiConnected": False,
        "useRealCharger": EV_USE_REAL_CHARGER,
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


@ev_charging_bp.route("/v1/real/user/getByEmail", methods=["POST"])
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


@ev_charging_bp.route("/v1/real/users", methods=["GET"])
def ev_real_get_users():
    try:
        users = ev_get_real_users()
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ev_charging_bp.route("/v1/real/proxy", methods=["POST"])
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


# =============================================================================
# Host Sites / Charger proxies (v1 endpoints)
# =============================================================================

@ev_charging_bp.route("/v1/host-sites", methods=["GET"])
def ev_get_host_sites():
    url = f"{EV_REAL_HOSTSITES_API_BASE}/host-sites"
    return ev_simple_get(url)


@ev_charging_bp.route("/v1/host-sites/<int:site_id>", methods=["GET"])
def ev_get_host_site(site_id):
    url = f"{EV_REAL_HOSTSITES_API_BASE}/host-sites/{site_id}"
    return ev_simple_get(url)


@ev_charging_bp.route("/v1/host-sites", methods=["POST"])
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


@ev_charging_bp.route("/v1/host-sites/<int:site_id>", methods=["PUT"])
def ev_update_host_site(site_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    url = f"{EV_REAL_HOSTSITES_API_BASE}/host-sites/{site_id}"
    try:
        response = ev_http("PUT", url, body=data, timeout=10)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ev_charging_bp.route("/v1/host-sites/<int:site_id>", methods=["DELETE"])
def ev_delete_host_site(site_id):
    url = f"{EV_REAL_HOSTSITES_API_BASE}/host-sites/{site_id}"
    try:
        response = ev_http("DELETE", url, timeout=10)
        if response.status_code == 204 or not response.text:
            return "", 204
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ev_charging_bp.route("/v1/chargers/site/<int:site_id>", methods=["GET"])
def ev_get_chargers_by_site(site_id):
    url = f"{EV_REAL_CHARGERS_API_BASE}/chargers/chargers/site/{site_id}"
    return ev_simple_get(url)


@ev_charging_bp.route("/v1/chargers/<int:charger_id>/details", methods=["GET"])
def ev_get_charger_details(charger_id):
    url = f"{EV_REAL_CHARGERS_API_BASE}/chargers/chargers/{charger_id}"
    return ev_simple_get(url)


@ev_charging_bp.route("/v1/chargers/ocpp/<charge_point_id>/status", methods=["GET"])
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


@ev_charging_bp.route("/v1/charge-points", methods=["GET"])
def ev_get_charge_points():
    url = f"{EV_REAL_OCPP_API_BASE}/api/charge-points"
    return ev_simple_get(url, error_label="OCPP API error")


@ev_charging_bp.route("/v1/ocpp/sessions", methods=["GET"])
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
