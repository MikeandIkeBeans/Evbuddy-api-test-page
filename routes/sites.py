"""
Site CRUD, site members, data, preorder, and subscribe routes.
"""

from flask import Blueprint, jsonify

import requests as http_requests

from config import EVBUDDY_DEV_HOST_SITES_BASE
from helpers import get_json_body, proxy_json_request

sites_bp = Blueprint("sites", __name__)

LANDING_FEATURES = [
    {"title": "Rent a Charger", "icon": "battery-charging", "desc": "On-demand mobile charging when you need it."},
    {"title": "Installation Services", "icon": "zap", "desc": "Professional setup for home and business clusters."},
    {"title": "EV Buddy Network", "icon": "landmark", "desc": "Join our massive market infrastructure opportunity."},
]

LANDING_STEPS = [
    {"step": "01", "title": "Connect Donor"},
    {"step": "02", "title": "Power Transfer"},
    {"step": "03", "title": "Vehicle Ready"},
    {"step": "04", "title": "Back on Road"},
]

LANDING_STATS = [
    {"label": "Stations", "value": "1.2M+"},
    {"label": "Users", "value": "250k+"},
    {"label": "Market", "value": "$1.3B"},
]

LANDING_META = {"siteName": "EV Buddy", "tagline": "V2V Charging for a mobile future"}


@sites_bp.get("/api/sites")
def get_all_sites():
    """List all sites from host-sites service (live dev-compatible)."""
    return proxy_json_request(
        "GET",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/host-sites",
        error_message="Failed to fetch sites",
    )


@sites_bp.get("/api/sites/<int:site_id>")
def get_site(site_id):
    """Get a single site by ID via collection filtering."""
    try:
        response = http_requests.get(f"{EVBUDDY_DEV_HOST_SITES_BASE}/host-sites", timeout=10)
    except http_requests.RequestException as exc:
        return jsonify({"error": "Failed to fetch site", "details": str(exc)}), 503

    if not response.ok:
        return jsonify({"error": "Failed to fetch site"}), response.status_code

    try:
        sites = response.json()
    except ValueError:
        return jsonify({"error": "Failed to parse site response"}), 502

    if not isinstance(sites, list):
        return jsonify({"error": "Unexpected site response format"}), 502

    site = next((s for s in sites if int(s.get("id", -1)) == site_id), None)
    if not site:
        return jsonify({"error": "Site not found"}), 404

    return jsonify(site)


@sites_bp.get("/api/businesses/<int:business_id>/sites")
def get_business_sites(business_id):
    """List sites by host/business ID from host-sites service."""
    return proxy_json_request(
        "GET",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/host-sites?host_id={business_id}",
        error_message="Failed to fetch business sites",
    )


@sites_bp.post("/api/businesses/<int:business_id>/sites")
def create_site(business_id):
    """Create a new site under a business."""
    data, err = get_json_body()
    if err:
        return err

    data["business_id"] = business_id
    return proxy_json_request(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites",
        body=data,
        error_message="Failed to create site",
    )


@sites_bp.put("/api/sites/<int:site_id>")
def update_site(site_id):
    """Update a site."""
    data, err = get_json_body()
    if err:
        return err

    return proxy_json_request(
        "PUT",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/{site_id}",
        body=data,
        error_message="Failed to update site",
        not_found="Site not found",
    )


@sites_bp.delete("/api/sites/<int:site_id>")
def delete_site(site_id):
    """Delete a site."""
    return proxy_json_request(
        "DELETE",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/{site_id}",
        error_message="Failed to delete site",
        not_found="Site not found",
        empty_message="Site deleted",
    )


@sites_bp.get("/api/sites/<int:site_id>/members")
def get_site_members(site_id):
    """Get all members of a host site."""
    return proxy_json_request(
        "GET",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/{site_id}/members",
        error_message="Failed to fetch site members",
    )


@sites_bp.post("/api/sites/<int:site_id>/members/invite")
def invite_site_member(site_id):
    """Invite a user to manage a host site."""
    data, err = get_json_body()
    if err:
        return err

    return proxy_json_request(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/{site_id}/members/invite",
        body=data,
        error_message="Failed to invite member",
    )


@sites_bp.post("/api/sites/<int:site_id>/members/<int:user_id>")
def add_site_member(site_id, user_id):
    """Directly add a user as a site member."""
    data, err = get_json_body()
    if err:
        return err

    return proxy_json_request(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/{site_id}/members/{user_id}",
        body=data,
        error_message="Failed to add member",
    )


@sites_bp.delete("/api/sites/<int:site_id>/members/<int:user_id>")
def remove_site_member(site_id, user_id):
    """Remove a user from site membership."""
    return proxy_json_request(
        "DELETE",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/{site_id}/members/{user_id}",
        error_message="Failed to remove member",
        empty_message="Member removed",
    )


@sites_bp.get("/api/data")
def api_data():
    """Return landing page content for the SPA."""
    return jsonify(
        {
            "meta": LANDING_META,
            "features": LANDING_FEATURES,
            "steps": LANDING_STEPS,
            "stats": LANDING_STATS,
        }
    )


@sites_bp.post("/api/preorder")
def api_preorder():
    """Submit a pre-order to the business backend."""
    data, err = get_json_body()
    if err:
        return err

    return proxy_json_request(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/preorders",
        body=data,
        error_message="Failed to submit pre-order",
    )


@sites_bp.post("/api/subscribe")
def api_subscribe():
    """Subscribe to newsletter updates."""
    data, err = get_json_body()
    if err:
        return err

    return proxy_json_request(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/subscribers",
        body=data,
        error_message="Failed to subscribe",
    )
