"""
CPMS (Charge Point Management System) operations.
"""

from flask import Blueprint, jsonify, request

from helpers import now_iso, ok_response

cpms_bp = Blueprint("cpms", __name__)


@cpms_bp.post("/api/assets/<asset_id>/remote-start")
def cpms_remote_start(asset_id):
    """Start a charging session remotely."""
    data = request.get_json() or {}
    connector_id = data.get("connector_id", 1)
    id_tag = data.get("id_tag", "HOTEL-GUEST")
    return ok_response(
        "Remote start command sent",
        asset_id=asset_id,
        connector_id=connector_id,
        id_tag=id_tag,
    )


@cpms_bp.post("/api/assets/<asset_id>/remote-stop")
def cpms_remote_stop(asset_id):
    """Stop a charging session remotely."""
    data = request.get_json() or {}
    transaction_id = data.get("transaction_id")
    if not transaction_id:
        return jsonify({"error": "transaction_id required"}), 400
    return ok_response("Remote stop command sent", asset_id=asset_id, transaction_id=transaction_id)


@cpms_bp.post("/api/assets/<asset_id>/maintenance-mode")
def cpms_maintenance_mode(asset_id):
    """Set charger to maintenance mode."""
    data = request.get_json() or {}
    enabled = data.get("enabled", True)
    reason = data.get("reason", "")
    return ok_response(
        f"Maintenance mode {'enabled' if enabled else 'disabled'}",
        asset_id=asset_id,
        enabled=enabled,
        reason=reason,
    )


@cpms_bp.get("/api/assets/<asset_id>/diagnostics")
def cpms_get_diagnostics(asset_id):
    """Get charger diagnostics."""
    return jsonify(
        {
            "asset_id": asset_id,
            "status": "Available",
            "error_code": "NoError",
            "connector_status": [
                {"connector_id": 1, "status": "Available"},
                {"connector_id": 2, "status": "Available"},
            ],
            "last_heartbeat": now_iso(),
            "firmware_version": "1.2.3",
        }
    )


@cpms_bp.post("/api/assets/<asset_id>/reset")
def cpms_reset(asset_id):
    """Reset the charger (soft or hard)."""
    data = request.get_json() or {}
    reset_type = data.get("type", "Soft")
    return ok_response(f"{reset_type} reset command sent", asset_id=asset_id, reset_type=reset_type)


@cpms_bp.post("/api/assets/<asset_id>/firmware-update")
def cpms_firmware_update(asset_id):
    """Trigger a firmware update."""
    data = request.get_json() or {}
    firmware_url = data.get("firmware_url")
    if not firmware_url:
        return jsonify({"error": "firmware_url required"}), 400

    return ok_response("Firmware update scheduled", asset_id=asset_id, firmware_url=firmware_url)


@cpms_bp.post("/api/assets/<asset_id>/change-configuration")
def cpms_change_configuration(asset_id):
    """Change charger configuration."""
    data = request.get_json() or {}
    key = data.get("key")
    value = data.get("value")
    if not key:
        return jsonify({"error": "key required"}), 400

    return ok_response("Configuration change sent", asset_id=asset_id, key=key, value=value)


@cpms_bp.post("/api/sessions/<session_id>/refund")
def cpms_refund_session(session_id):
    """Issue a refund for a charging session."""
    data = request.get_json() or {}
    operator_id = data.get("operator_id")
    amount = data.get("amount")
    reason = data.get("reason", "")

    if not operator_id:
        return jsonify({"error": "operator_id required"}), 400
    if not amount:
        return jsonify({"error": "amount required"}), 400

    return ok_response("Refund processed", session_id=session_id, amount=amount, reason=reason)


@cpms_bp.put("/api/assets/<asset_id>/tariff")
def cpms_update_tariff(asset_id):
    """Update charging tariff for an asset."""
    data = request.get_json() or {}
    return ok_response("Tariff updated", asset_id=asset_id, tariff=data.get("tariff"))
