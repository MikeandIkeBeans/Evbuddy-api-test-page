"""
Employee CRUD, site assignments, permissions, and roles routes.
"""

from flask import Blueprint, jsonify

from config import EV_REAL_BUSINESS_API_BASE
from helpers import proxy_json_request, get_json_body
from security import GLOBAL_ROLES, SITE_ROLES, OPERATOR_ROLES

employees_bp = Blueprint("employees", __name__)


# ---------------------------------------------------------------------------
# Employee CRUD
# ---------------------------------------------------------------------------

@employees_bp.get("/api/businesses/<int:business_id>/employees")
def get_business_employees(business_id):
    """List all employees of a business."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/businesses/{business_id}/employees",
                              error_message="Failed to fetch employees")


@employees_bp.get("/api/employees/<int:employee_id>")
def get_employee(employee_id):
    """Get a single employee."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}",
                              error_message="Failed to fetch employee",
                              not_found="Employee not found")


@employees_bp.post("/api/businesses/<int:business_id>/employees")
def create_employee(business_id):
    """Create a new employee under a business."""
    data, err = get_json_body()
    if err:
        return err
    data["business_id"] = business_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/employees",
                              body=data, error_message="Failed to create employee")


@employees_bp.put("/api/employees/<int:employee_id>")
def update_employee(employee_id):
    """Update an employee."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PUT", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}",
                              body=data, error_message="Failed to update employee",
                              not_found="Employee not found")


@employees_bp.delete("/api/employees/<int:employee_id>")
def delete_employee(employee_id):
    """Delete an employee."""
    return proxy_json_request("DELETE", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}",
                              error_message="Failed to delete employee",
                              not_found="Employee not found",
                              empty_message="Employee deleted")


# ---------------------------------------------------------------------------
# Employee <-> Site Assignment
# ---------------------------------------------------------------------------

@employees_bp.get("/api/employees/<int:employee_id>/sites")
def get_employee_sites(employee_id):
    """Get all sites an employee is assigned to."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/sites",
                              error_message="Failed to fetch employee sites")


@employees_bp.post("/api/employees/<int:employee_id>/sites")
def assign_employee_to_site(employee_id):
    """Assign an employee to a site."""
    data, err = get_json_body()
    if err:
        return err
    data["employee_id"] = employee_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/sites",
                              body=data, error_message="Failed to assign employee to site")


@employees_bp.put("/api/employees/<int:employee_id>/sites/<int:site_id>")
def update_employee_site(employee_id, site_id):
    """Update an employee's role/status at a site."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("PUT", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/sites/{site_id}",
                              body=data, error_message="Failed to update site assignment")


@employees_bp.delete("/api/employees/<int:employee_id>/sites/<int:site_id>")
def remove_employee_from_site(employee_id, site_id):
    """Remove an employee from a site."""
    return proxy_json_request("DELETE", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/sites/{site_id}",
                              error_message="Failed to remove employee from site",
                              empty_message="Employee removed from site")


@employees_bp.get("/api/sites/<int:site_id>/employees")
def get_site_employees(site_id):
    """Get all employees assigned to a site."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/employees",
                              error_message="Failed to fetch site employees")


@employees_bp.post("/api/sites/<int:site_id>/employees")
def assign_existing_employee_to_site(site_id):
    """Assign an existing employee to a site (from site perspective)."""
    data, err = get_json_body()
    if err:
        return err
    data["site_id"] = site_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/sites/{site_id}/employees",
                              body=data, error_message="Failed to assign employee to site")


# ---------------------------------------------------------------------------
# Employee Permissions
# ---------------------------------------------------------------------------

@employees_bp.get("/api/employees/<int:employee_id>/permissions")
def get_employee_permissions(employee_id):
    """Get all permissions for an employee."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/permissions",
                              error_message="Failed to fetch permissions")


@employees_bp.post("/api/employees/<int:employee_id>/permissions")
def grant_employee_permission(employee_id):
    """Grant a permission to an employee."""
    data, err = get_json_body()
    if err:
        return err
    data["employee_id"] = employee_id
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/permissions",
                              body=data, error_message="Failed to grant permission")


@employees_bp.delete("/api/employees/<int:employee_id>/permissions/<int:permission_id>")
def revoke_employee_permission(employee_id, permission_id):
    """Revoke a specific permission."""
    return proxy_json_request(
        "DELETE",
        f"{EV_REAL_BUSINESS_API_BASE}/employees/{employee_id}/permissions/{permission_id}",
        error_message="Failed to revoke permission",
        empty_message="Permission revoked")


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------

@employees_bp.get("/api/roles")
def get_roles():
    """Get all available role definitions."""
    return jsonify({
        "global_roles": list(GLOBAL_ROLES),
        "site_roles": list(SITE_ROLES),
        "operator_roles": list(OPERATOR_ROLES),
    })


@employees_bp.get("/api/users/<int:user_id>/roles")
def get_user_roles_endpoint(user_id):
    """Get roles for a user — proxied to the backend."""
    return proxy_json_request("GET", f"{EV_REAL_BUSINESS_API_BASE}/users/{user_id}/roles",
                              error_message="Failed to fetch user roles")


@employees_bp.post("/api/users/<int:user_id>/roles")
def assign_user_role(user_id):
    """Assign a role to a user — proxied to the backend."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", f"{EV_REAL_BUSINESS_API_BASE}/users/{user_id}/roles",
                              body=data, error_message="Failed to assign role")
