"""
Business CRUD routes (/api/businesses/...).
"""

from flask import Blueprint

from config import EV_REAL_BUSINESS_API_BASE
from helpers import proxy_json_request, get_json_body

businesses_bp = Blueprint("businesses", __name__)


@businesses_bp.get("/api/businesses")
def get_all_businesses():
    """List all businesses."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/businesses",
                              error_message="Failed to fetch businesses")


@businesses_bp.get("/api/businesses/<int:business_id>")
def get_business(business_id):
    """Get a single business by ID."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}",
                              error_message="Failed to fetch business",
                              not_found="Business not found")


@businesses_bp.post("/api/businesses")
def create_business():
    """Create a new business / organization."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/businesses",
                              body=data, error_message="Failed to create business")


@businesses_bp.put("/api/businesses/<int:business_id>")
def update_business(business_id):
    """Update an existing business."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PUT", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}",
                              body=data, error_message="Failed to update business",
                              not_found="Business not found")


@businesses_bp.delete("/api/businesses/<int:business_id>")
def delete_business(business_id):
    """Delete a business."""
    return proxy_json_request("DELETE", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}",
                              error_message="Failed to delete business",
                              not_found="Business not found",
                              empty_message="Business deleted")
