"""
Users service proxy routes (/api/users/...).
Proxies to the Spring Boot Users microservice on port 9000.
"""

from flask import Blueprint, jsonify, request

from helpers import proxy_json_request, get_json_body, ms_url, normalized_limit, service_status_url
from src.api.validation import require_json_fields
from src.application.use_cases import ValidationError, build_create_user_payload, build_update_user_payload
from src.infrastructure.upstream_clients import UsersClient

users_bp = Blueprint("users", __name__)
USERS_CLIENT = UsersClient()


@users_bp.get("/api/users/status")
def users_service_status():
    """Check Users service health."""
    return proxy_json_request("GET", service_status_url("users"),
                              timeout=5, error_message="Users service unavailable")


@users_bp.get("/api/users")
def get_all_users():
    """Get all users."""
    limit = normalized_limit(default=100, maximum=500)
    page = max(1, int(request.args.get("page", 1, type=int) or 1))
    offset = (page - 1) * limit
    return USERS_CLIENT.list_users(limit=limit, offset=offset)


@users_bp.get("/api/users/<int:user_id>")
def get_user_by_id(user_id):
    """Get a single user by ID."""
    return proxy_json_request("GET", ms_url("users", f"/{user_id}"),
                              error_message="Failed to fetch user",
                              not_found="User not found")


@users_bp.post("/api/users")
@require_json_fields("email")
def create_user():
    """Create a new user."""
    data, err = get_json_body(required_fields=["email"])
    if err:
        return err
    try:
        data = build_create_user_payload(data)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
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
@require_json_fields("email")
def update_user(user_id):
    """Update an existing user (full replacement)."""
    data, err = get_json_body(required_fields=["email"])
    if err:
        return err
    try:
        data = build_create_user_payload(data)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
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
        get_resp = USERS_CLIENT.get_user_raw(user_id)
        if get_resp.status_code == 404:
            return jsonify({"error": "User not found"}), 404
        if get_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch user for update"}), get_resp.status_code

        current_user = get_resp.json()
        updated_user = build_update_user_payload(current_user, data)

        return USERS_CLIENT.update_user(user_id, updated_user)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to patch user", "details": str(e)}), 503
