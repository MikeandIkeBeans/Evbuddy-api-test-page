"""
User Vehicles proxy routes (/api/vehicles/...).
Proxies to the Spring Boot User Vehicles microservice on port 9001.
"""

from flask import Blueprint, jsonify

from helpers import get_json_body, ms_url, proxy_json_request, with_query_params

vehicles_bp = Blueprint("vehicles", __name__)


@vehicles_bp.get("/api/vehicles")
def get_all_vehicles():
    """Get all vehicles."""
    return proxy_json_request("GET", ms_url("user_vehicles"),
                              error_message="Failed to fetch vehicles")


@vehicles_bp.get("/api/vehicles/<int:vehicle_id>")
def get_vehicle_by_id(vehicle_id):
    """Get a single vehicle by ID."""
    return proxy_json_request("GET", ms_url("user_vehicles", f"/{vehicle_id}"),
                              error_message="Failed to fetch vehicle",
                              not_found="Vehicle not found")


@vehicles_bp.get("/api/users/<int:user_id>/vehicles")
def get_user_vehicles(user_id):
    """Get all vehicles belonging to a specific user."""
    return proxy_json_request(
        "GET",
        with_query_params(ms_url("user_vehicles"), user_id=user_id),
        error_message="Failed to fetch user vehicles",
    )


@vehicles_bp.post("/api/vehicles")
def create_vehicle():
    """Create a new vehicle."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", ms_url("user_vehicles"), body=data,
                              error_message="Failed to create vehicle")


@vehicles_bp.put("/api/vehicles/<int:vehicle_id>")
def update_vehicle(vehicle_id):
    """Update an existing vehicle (full replacement). Note: Backend may not support PUT."""
    data, err = get_json_body()
    if err:
        return err
    response = proxy_json_request("PUT", ms_url("user_vehicles", f"/{vehicle_id}"), body=data,
                                  error_message="Failed to update vehicle",
                                  not_found="Vehicle not found")
    if response[1] == 405:
        return jsonify({"error": "PUT not supported by backend, use PATCH instead"}), 405
    return response


@vehicles_bp.patch("/api/vehicles/<int:vehicle_id>")
def patch_vehicle(vehicle_id):
    """Partially update an existing vehicle."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PATCH", ms_url("user_vehicles", f"/{vehicle_id}"), body=data,
                              error_message="Failed to patch vehicle",
                              not_found="Vehicle not found")


@vehicles_bp.delete("/api/vehicles/<int:vehicle_id>")
def delete_vehicle(vehicle_id):
    """Delete a vehicle by ID."""
    return proxy_json_request("DELETE", ms_url("user_vehicles", f"/{vehicle_id}"),
                              error_message="Failed to delete vehicle",
                              not_found="Vehicle not found",
                              empty_message="Vehicle deleted")
