"""
Security info, audit log, and operator/asset setup routes (/api/security/...).
"""

from flask import Blueprint, jsonify, request

from helpers import ok_response
from security import (
    require_auth,
    require_global_role,
    get_security_audit_log,
    assign_operator_role,
    register_asset,
    GLOBAL_ROLES,
    SITE_ROLES,
    OPERATOR_ROLES,
    CPMS_PERMISSIONS,
    OCPP_PERMISSIONS,
)

security_bp = Blueprint("security_routes", __name__)


@security_bp.get("/api/security/roles")
def get_all_security_roles():
    """Get all valid role definitions (detailed with permissions)."""
    return jsonify({
        "global_roles": list(GLOBAL_ROLES),
        "site_roles": list(SITE_ROLES),
        "operator_roles": list(OPERATOR_ROLES),
        "cpms_permissions": {k: list(v) for k, v in CPMS_PERMISSIONS.items()},
        "ocpp_permissions": {k: list(v) if isinstance(v, list) else v for k, v in OCPP_PERMISSIONS.items()},
    })


@security_bp.get("/api/security/audit-log")
@require_auth
@require_global_role(["platform_admin", "ops"])
def get_security_audit():
    """Get security audit log. Requires platform_admin or ops role."""
    limit = request.args.get("limit", 100, type=int)
    action = request.args.get("action")
    asset_id = request.args.get("asset_id")

    filters = {}
    if action:
        filters["action"] = action
    if asset_id:
        filters["asset_id"] = asset_id

    logs = get_security_audit_log(limit=limit, **filters)
    return jsonify({"logs": logs, "count": len(logs)})


# ---------------------------------------------------------------------------
# Operator / Asset Setup (admin-only, for testing)
# ---------------------------------------------------------------------------

@security_bp.post("/api/security/setup/operator")
@require_auth
@require_global_role(["platform_admin"])
def setup_operator():
    """Set up operator and assign roles (platform_admin only)."""
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


@security_bp.post("/api/security/setup/asset")
@require_auth
@require_global_role(["platform_admin"])
def setup_asset():
    """Register asset to operator (platform_admin only)."""
    data = request.get_json() or {}
    asset_id = data.get("asset_id")
    operator_id = data.get("operator_id")

    if not all([asset_id, operator_id]):
        return jsonify({"error": "asset_id and operator_id required"}), 400

    register_asset(str(asset_id), int(operator_id))
    return ok_response(f"Asset {asset_id} registered to operator {operator_id}")
