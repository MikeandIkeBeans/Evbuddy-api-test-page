"""
V2V Charging demo routes.

Lightweight proxy to the OCPP Central System for the EVB-V2V-001-JP charge point.
"""

from flask import Blueprint, jsonify, request

from config import EVBUDDY_DEV_OCPP_BASE
from helpers import ev_http, ev_ocpp_remote_start, ev_ocpp_remote_stop

v2v_bp = Blueprint("v2v", __name__)

CHARGE_POINT_ID = "EVB-V2V-001-JP"


@v2v_bp.get("/v1/v2v/status")
def v2v_status():
    """Get charge point metadata and connector statuses."""
    try:
        cp_resp = ev_http("GET", f"{EVBUDDY_DEV_OCPP_BASE}/api/charge-points", timeout=8)
        charge_points = cp_resp.json() if cp_resp.ok else {}
        cp_list = charge_points.get("data", charge_points) if isinstance(charge_points, dict) else charge_points
        charger = next((cp for cp in cp_list if cp.get("charge_point_id") == CHARGE_POINT_ID), None)

        conn_resp = ev_http("GET", f"{EVBUDDY_DEV_OCPP_BASE}/api/connectors?charge_point_id={CHARGE_POINT_ID}", timeout=8)
        conn_data = conn_resp.json() if conn_resp.ok else []
        connectors = conn_data.get("data", conn_data) if isinstance(conn_data, dict) else conn_data

        return jsonify({"success": True, "charger": charger, "connectors": connectors})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502


@v2v_bp.post("/v1/v2v/reset")
def v2v_reset():
    """Send a reset command to the V2V charge point."""
    data = request.get_json() or {}
    reset_type = data.get("type", "Soft")
    try:
        resp = ev_http(
            "POST",
            f"{EVBUDDY_DEV_OCPP_BASE}/api/operations/reset",
            body={"charge_point_id": CHARGE_POINT_ID, "type": reset_type},
            timeout=15,
        )
        if resp.ok:
            return jsonify(resp.json())
        return jsonify({"success": False, "error": resp.text}), 502
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502


@v2v_bp.get("/v1/v2v/sessions")
def v2v_sessions():
    """Get recent sessions for the V2V charge point."""
    try:
        resp = ev_http("GET", f"{EVBUDDY_DEV_OCPP_BASE}/api/sessions?chargePointId={CHARGE_POINT_ID}", timeout=8)
        if resp.ok:
            data = resp.json()
            sessions = data.get("sessions", data.get("data", []))
            # Return only sessions for our charge point, limit to 15
            v2v_sessions = [s for s in sessions if s.get("charge_point_id") == CHARGE_POINT_ID][:15]
            return jsonify({"success": True, "sessions": v2v_sessions})
        return jsonify({"success": False, "error": f"OCPP returned {resp.status_code}"}), 502
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502


@v2v_bp.post("/v1/v2v/start")
def v2v_start():
    """Remote start a connector on the V2V charge point."""
    data = request.get_json() or {}
    connector_id = data.get("connector_id", 1)
    id_tag = data.get("id_tag", "RFID001")
    result = ev_ocpp_remote_start(CHARGE_POINT_ID, connector_id, id_tag=id_tag)
    status_code = 200 if result.get("success") else 502
    return jsonify(result), status_code


@v2v_bp.post("/v1/v2v/stop")
def v2v_stop():
    """Remote stop a session on the V2V charge point."""
    data = request.get_json() or {}
    connector_id = data.get("connector_id", 1)
    transaction_id = data.get("transaction_id")
    id_tag = data.get("id_tag", "RFID001")
    if not transaction_id:
        return jsonify({"success": False, "error": "transaction_id required"}), 400
    result = ev_ocpp_remote_stop(CHARGE_POINT_ID, connector_id, transaction_id, id_tag=id_tag)
    status_code = 200 if result.get("success") else 502
    return jsonify(result), status_code
