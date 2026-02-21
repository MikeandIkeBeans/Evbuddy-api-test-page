"""
Driver site access, invitations, audit log, and auth check routes.
"""

from flask import Blueprint, jsonify, request

from config import EV_REAL_BUSINESS_API_BASE
from helpers import get_json_body, proxy_json_request, with_query_params

drivers_bp = Blueprint("drivers", __name__)


# ---------------------------------------------------------------------------
# Driver Site Access
# ---------------------------------------------------------------------------

@drivers_bp.get("/api/sites/<int:site_id>/drivers")
def get_site_drivers(site_id):
    """Get all drivers with access to this site."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers",
                              error_message="Failed to fetch site drivers")


@drivers_bp.post("/api/sites/<int:site_id>/drivers/invite")
def invite_driver(site_id):
    """Invite a driver to a private site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/invite",
                              body=data, error_message="Failed to invite driver")


@drivers_bp.post("/api/sites/<int:site_id>/access-request")
def request_site_access(site_id):
    """Driver requests access to a private site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/access-request",
                              body=data, error_message="Failed to submit access request")


@drivers_bp.post("/api/sites/<int:site_id>/drivers/<int:driver_id>/approve")
def approve_driver(site_id, driver_id):
    """Approve a driver's access to a private site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/{driver_id}/approve",
                              body=data, error_message="Failed to approve driver")


@drivers_bp.post("/api/sites/<int:site_id>/drivers/<int:driver_id>/block")
def block_driver(site_id, driver_id):
    """Block a driver from a private site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/{driver_id}/block",
                              body=data, error_message="Failed to block driver")


@drivers_bp.post("/api/sites/<int:site_id>/drivers/<int:driver_id>/revoke")
def revoke_driver(site_id, driver_id):
    """Revoke a driver's access."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/{driver_id}/revoke",
                              body=data, error_message="Failed to revoke driver")


@drivers_bp.post("/api/sites/<int:site_id>/drivers/<int:driver_id>/unblock")
def unblock_driver(site_id, driver_id):
    """Unblock a previously blocked driver."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/drivers/{driver_id}/unblock",
                              body=data, error_message="Failed to unblock driver")


# ---------------------------------------------------------------------------
# Driver-facing endpoints
# ---------------------------------------------------------------------------

@drivers_bp.get("/api/me/site-access")
def get_my_site_access():
    """Get all sites the current driver has approved access to."""
    driver_id = request.args.get("driver_user_id", type=int)
    if not driver_id:
        return jsonify({"error": "driver_user_id query param required"}), 400
    url = with_query_params(
        f"{EV_REAL_BUSINESS_API_BASE}/me/site-access",
        driver_user_id=driver_id,
    )
    return proxy_json_request("GET", url, error_message="Failed to fetch site access")


@drivers_bp.get("/api/me/site-access/all")
def get_my_all_site_access():
    """Get all site access records for a driver (including pending, revoked)."""
    driver_id = request.args.get("driver_user_id", type=int)
    if not driver_id:
        return jsonify({"error": "driver_user_id query param required"}), 400
    url = with_query_params(
        f"{EV_REAL_BUSINESS_API_BASE}/me/site-access/all",
        driver_user_id=driver_id,
    )
    return proxy_json_request("GET", url, error_message="Failed to fetch access records")


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------

@drivers_bp.get("/api/invitations/<token>")
def get_invitation(token):
    """Get invitation details by token."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/invitations/{token}",
                              error_message="Failed to fetch invitation",
                              not_found="Invitation not found")


@drivers_bp.post("/api/invitations/<token>/accept")
def accept_invitation(token):
    """Accept an invitation."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/invitations/{token}/accept",
                              body=data, error_message="Failed to accept invitation")


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

@drivers_bp.get("/api/audit-log")
def get_audit_log():
    """Get audit log entries."""
    qs = request.query_string.decode()
    url = f"{EV_REAL_BUSINESS_API_BASE}/audit-log"
    if qs:
        url += f"?{qs}"
    return proxy_json_request("GET", url, error_message="Failed to fetch audit log")


# ---------------------------------------------------------------------------
# Authorization Check Endpoints
# ---------------------------------------------------------------------------

@drivers_bp.get("/api/auth/can-manage-site/<int:site_id>")
def check_can_manage_site(site_id):
    """Check if a user can manage a specific site."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id query param required"}), 400
    url = with_query_params(
        f"{EV_REAL_BUSINESS_API_BASE}/auth/can-manage-site/{site_id}",
        user_id=user_id,
    )
    return proxy_json_request(
        "GET",
        url,
        error_message="Failed to check management access")


@drivers_bp.get("/api/auth/can-use-site/<int:site_id>")
def check_can_use_site(site_id):
    """Check if a driver can use a specific site."""
    driver_id = request.args.get("driver_user_id", type=int)
    visibility = request.args.get("visibility", "private")
    if not driver_id:
        return jsonify({"error": "driver_user_id query param required"}), 400
    url = with_query_params(
        f"{EV_REAL_BUSINESS_API_BASE}/auth/can-use-site/{site_id}",
        driver_user_id=driver_id,
        visibility=visibility,
    )
    return proxy_json_request(
        "GET",
        url,
        error_message="Failed to check site access")
