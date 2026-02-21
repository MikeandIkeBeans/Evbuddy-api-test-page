"""
Users service proxy routes (/api/users/...).
Proxies to the Spring Boot Users microservice on port 9000.
"""

import requests as http_requests
from flask import Blueprint, jsonify

from helpers import proxy_json_request, get_json_body, ms_url, service_status_url

users_bp = Blueprint("users", __name__)


@users_bp.get("/api/users/status")
def users_service_status():
    """Check Users service health."""
    return proxy_json_request("GET", service_status_url("users"),
                              timeout=5, error_message="Users service unavailable")


@users_bp.get("/api/users")
def get_all_users():
    """Get all users."""
    return proxy_json_request("GET", ms_url("users"),
                              error_message="Failed to fetch users")


@users_bp.get("/api/users/<int:user_id>")
def get_user_by_id(user_id):
    """Get a single user by ID."""
    return proxy_json_request("GET", ms_url("users", f"/{user_id}"),
                              error_message="Failed to fetch user",
                              not_found="User not found")


@users_bp.post("/api/users")
def create_user():
    """Create a new user."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", ms_url("users"), body=data,
                              error_message="Failed to create user")


@users_bp.delete("/api/users/<int:user_id>")
def delete_user(user_id):
    """Delete a user by ID."""
    return proxy_json_request("DELETE", ms_url("users", f"/{user_id}"),
                              error_message="Failed to delete user",
                              not_found="User not found",
                              empty_message="User deleted")


@users_bp.put("/api/users/<int:user_id>")
def update_user(user_id):
    """Update an existing user (full replacement)."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PUT", ms_url("users", f"/{user_id}"), body=data,
                              error_message="Failed to update user",
                              not_found="User not found")


@users_bp.patch("/api/users/<int:user_id>")
def patch_user(user_id):
    """
    Partially update an existing user.
    Fetches current user, merges fields, sends PUT with full object.
    """
    data, err = get_json_body()
    if err:
        return err

    try:
        get_resp = http_requests.get(ms_url("users", f"/{user_id}"), timeout=10)
        if get_resp.status_code == 404:
            return jsonify({"error": "User not found"}), 404
        if get_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch user for update"}), get_resp.status_code

        current_user = get_resp.json()
        updated_user = {**current_user, **data}

        return proxy_json_request("PUT", ms_url("users", f"/{user_id}"), body=updated_user,
                                  error_message="Failed to patch user")
    except http_requests.RequestException as e:
        return jsonify({"error": "Failed to patch user", "details": str(e)}), 503
