"""
Invites and access-grant proxy routes (port 9005).
"""

from flask import Blueprint

from config import EV_REAL_BUSINESS_API_BASE
from helpers import proxy_json_request

invites_bp = Blueprint("invites", __name__)


# ---------------------------------------------------------------------------
# Invites
# ---------------------------------------------------------------------------

@invites_bp.get("/api/invites")
def get_all_invites():
    """Get all invites."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/invites",
                              error_message="Failed to fetch invites")


@invites_bp.get("/api/invites/invited-by/<int:user_id>")
def get_invites_by_user(user_id):
    """Get invites sent by a specific user."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/invites/invited-by/{user_id}",
                              error_message="Failed to fetch invites for user")


# ---------------------------------------------------------------------------
# Access Grants
# ---------------------------------------------------------------------------

@invites_bp.get("/api/accessgrants/charger_access/grants")
def get_all_grants():
    """Get all charger access grants."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/accessgrants/charger_access/grants",
                              error_message="Failed to fetch access grants")


@invites_bp.get("/api/accessgrants/charger_access/grantsbyuser/<int:user_id>")
def get_grants_by_user(user_id):
    """Get charger access grants granted by a specific user."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/accessgrants/charger_access/grantsbyuser/{user_id}",
                              error_message="Failed to fetch grants for user")
