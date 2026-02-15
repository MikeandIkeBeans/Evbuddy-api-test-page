"""
EV Buddy Security Module
=========================
RBAC + CPO Enforcement for multi-tenant EV charging platform.

This module implements:
- Two-layer authorization (Role + Scope)
- Multi-tenant isolation
- Audit logging
- Security decorators for Flask routes

See .github/COPILOT_SECURITY_POLICY.md for full policy.
"""

from functools import wraps
from flask import request, jsonify, g, abort
from datetime import datetime
from typing import List, Optional, Callable, Any
import uuid

# =============================================================================
# Role Definitions (NEVER INVENT NEW ROLES)
# =============================================================================

GLOBAL_ROLES = frozenset([
    "platform_admin",
    "ops", 
    "host",
    "driver",
    "community_admin",
])

SITE_ROLES = frozenset([
    "owner",
    "supervisor", 
    "staff",
    "viewer",
])

ASSET_ROLES = frozenset([
    "asset_admin",
    "operator",
    "technician",
    "viewer",
])

OPERATOR_ROLES = frozenset([
    "operator_owner",
    "operator_admin",
    "operator_ops",
    "operator_support",
    "operator_tech",
    "operator_finance",
    "operator_viewer",
])

ALL_VALID_ROLES = GLOBAL_ROLES | SITE_ROLES | ASSET_ROLES | OPERATOR_ROLES

# =============================================================================
# Permission Matrices
# =============================================================================

# RentACharger (Host Sites) permissions
SITE_PERMISSIONS = {
    "invite_member": ["owner"],
    "revoke_member": ["owner"],
    "change_roles": ["owner"],
    "approve_driver": ["owner", "supervisor"],
    "block_driver": ["owner", "supervisor"],
    "revoke_driver": ["owner", "supervisor"],
    "read_sessions": ["owner", "supervisor", "staff", "viewer"],
    "manage_settings": ["owner", "supervisor"],
}

# CPMS Operations permissions
CPMS_PERMISSIONS = {
    "remote_start": ["operator_owner", "operator_admin", "operator_ops", "operator_support"],
    "remote_stop": ["operator_owner", "operator_admin", "operator_ops", "operator_support"],
    "maintenance_mode": ["operator_owner", "operator_admin", "operator_ops", "operator_tech"],
    "diagnostics_read": list(OPERATOR_ROLES),  # All operator roles
    "diagnostics_write": ["operator_owner", "operator_admin", "operator_tech"],
    "refund": ["operator_owner", "operator_admin", "operator_finance"],
    "tariff_change": ["operator_owner", "operator_admin"],
    "firmware_update": ["operator_owner", "operator_admin"],
}

# OCPP Commands - RESTRICTED (Owner/Admin only)
OCPP_RESTRICTED_COMMANDS = frozenset([
    "ChangeConfiguration",
    "UpdateFirmware", 
    "HardReset",
    "Reset",
    "UnlockConnector",
    "SetChargingProfile",
])

OCPP_PERMISSIONS = {
    "RemoteStartTransaction": ["operator_owner", "operator_admin", "operator_ops"],
    "RemoteStopTransaction": ["operator_owner", "operator_admin", "operator_ops"],
    "ChangeConfiguration": ["operator_owner", "operator_admin"],
    "UpdateFirmware": ["operator_owner", "operator_admin"],
    "HardReset": ["operator_owner", "operator_admin"],
    "Reset": ["operator_owner", "operator_admin"],
    "GetDiagnostics": list(OPERATOR_ROLES),
    "TriggerMessage": ["operator_owner", "operator_admin", "operator_ops", "operator_tech"],
}

# =============================================================================
# In-Memory Storage (Replace with DB)
# =============================================================================

# User -> operator_id mapping
USER_OPERATORS = {}  # {user_id: operator_id}

# User -> global roles
USER_GLOBAL_ROLES = {}  # {user_id: ["platform_admin", ...]}

# (site_id, user_id) -> site role
USER_SITE_ROLES = {}  # {(site_id, user_id): "owner"}

# (operator_id, user_id) -> operator role
USER_OPERATOR_ROLES = {}  # {(operator_id, user_id): "operator_admin"}

# Asset -> operator_id mapping
ASSET_OPERATORS = {}  # {asset_id: operator_id}

# Site -> operator_id mapping  
SITE_OPERATORS = {}  # {site_id: operator_id}

# Security audit log
SECURITY_AUDIT_LOG = []

# =============================================================================
# Audit Logging
# =============================================================================

def security_audit(
    action: str,
    actor_user_id: int,
    resource_type: str,
    resource_id: Any,
    operator_id: Optional[int] = None,
    site_id: Optional[int] = None,
    asset_id: Optional[str] = None,
    details: Optional[dict] = None,
    outcome: str = "success"
):
    """
    Log security-relevant action. REQUIRED for:
    - Remote commands
    - Refunds
    - Tariff changes
    - Firmware updates
    - Role changes
    """
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "action": action,
        "actor_user_id": actor_user_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "operator_id": operator_id,
        "site_id": site_id,
        "asset_id": asset_id,
        "details": details or {},
        "outcome": outcome,
        "ip_address": request.remote_addr if request else None,
    }
    SECURITY_AUDIT_LOG.append(entry)
    return entry


# =============================================================================
# Authorization Errors
# =============================================================================

class AuthorizationError(Exception):
    """Raised when authorization fails."""
    def __init__(self, message: str, code: str = "FORBIDDEN"):
        self.message = message
        self.code = code
        super().__init__(message)


class ScopeViolationError(AuthorizationError):
    """Raised when scope check fails (cross-tenant access attempt)."""
    def __init__(self, message: str = "Cross-tenant access denied"):
        super().__init__(message, "SCOPE_VIOLATION")


class RoleViolationError(AuthorizationError):
    """Raised when role check fails."""
    def __init__(self, required_roles: List[str]):
        message = f"Required roles: {required_roles}"
        super().__init__(message, "ROLE_VIOLATION")


# =============================================================================
# Core Authorization Functions
# =============================================================================

def get_current_user():
    """Get current authenticated user from request context."""
    # In production, this would decode JWT/session
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        user_id = request.args.get("actor_user_id")
    if not user_id:
        data = request.get_json(silent=True) or {}
        user_id = data.get("actor_user_id")
    
    if not user_id:
        return None
    
    return {"id": int(user_id)}


# External roles source (set by app.py to share USER_ROLES storage)
_external_user_roles = None

def set_external_user_roles(roles_dict):
    """Set external user roles source for integration with app.py."""
    global _external_user_roles
    _external_user_roles = roles_dict


def get_user_global_roles(user_id: int) -> List[str]:
    """Get user's global roles from both internal and external sources."""
    roles = list(USER_GLOBAL_ROLES.get(user_id, []))
    
    # Also check external source (app.py's USER_ROLES)
    if _external_user_roles is not None:
        external = _external_user_roles.get(user_id, [])
        for role in external:
            if role not in roles:
                roles.append(role)
    
    return roles


def get_user_operator_id(user_id: int) -> Optional[int]:
    """Get the operator_id the user belongs to."""
    return USER_OPERATORS.get(user_id)


def get_user_site_role(user_id: int, site_id: int) -> Optional[str]:
    """Get user's role for a specific site."""
    return USER_SITE_ROLES.get((site_id, user_id))


def get_user_operator_role(user_id: int, operator_id: int) -> Optional[str]:
    """Get user's role within an operator."""
    return USER_OPERATOR_ROLES.get((operator_id, user_id))


def get_asset_operator(asset_id: str) -> Optional[int]:
    """Get the operator_id that owns an asset."""
    return ASSET_OPERATORS.get(asset_id)


def get_site_operator(site_id: int) -> Optional[int]:
    """Get the operator_id that owns a site."""
    return SITE_OPERATORS.get(site_id)


# =============================================================================
# Two-Layer Authorization Checks
# =============================================================================

def check_global_role(user_id: int, allowed_roles: List[str]) -> bool:
    """
    Layer A: Check if user has any of the allowed global roles.
    """
    user_roles = get_user_global_roles(user_id)
    return any(role in allowed_roles for role in user_roles)


def check_operator_scope(user_id: int, operator_id: int) -> bool:
    """
    Layer B: Check if user belongs to the operator.
    CRITICAL: Prevents cross-tenant access.
    """
    user_operator = get_user_operator_id(user_id)
    
    # Platform admins can access any operator
    if check_global_role(user_id, ["platform_admin"]):
        return True
    
    return user_operator == operator_id


def check_site_scope(user_id: int, site_id: int) -> bool:
    """
    Layer B: Check if user has any role on the site.
    """
    # Platform admins/ops can access any site
    if check_global_role(user_id, ["platform_admin", "ops"]):
        return True
    
    return get_user_site_role(user_id, site_id) is not None


def check_asset_scope(user_id: int, asset_id: str) -> bool:
    """
    Layer B: Check if user's operator owns the asset.
    """
    asset_operator = get_asset_operator(asset_id)
    if asset_operator is None:
        return False
    return check_operator_scope(user_id, asset_operator)


def require_site_role(user_id: int, site_id: int, allowed_roles: List[str]) -> bool:
    """
    Combined Layer A + B for site access.
    Returns True if authorized, raises exception otherwise.
    """
    # Platform admins/ops bypass site role check
    if check_global_role(user_id, ["platform_admin", "ops"]):
        return True
    
    # Check scope first
    if not check_site_scope(user_id, site_id):
        raise ScopeViolationError(f"No access to site {site_id}")
    
    # Check role
    user_role = get_user_site_role(user_id, site_id)
    if user_role not in allowed_roles:
        raise RoleViolationError(allowed_roles)
    
    return True


def require_operator_scope(user_id: int, operator_id: int) -> bool:
    """
    Require user belongs to operator. Raises exception if not.
    """
    if not check_operator_scope(user_id, operator_id):
        raise ScopeViolationError(f"No access to operator {operator_id}")
    return True


def require_operator_role(user_id: int, operator_id: int, allowed_roles: List[str]) -> bool:
    """
    Combined Layer A + B for operator/CPMS access.
    """
    # Platform admins bypass
    if check_global_role(user_id, ["platform_admin"]):
        return True
    
    # Check scope
    require_operator_scope(user_id, operator_id)
    
    # Check role
    user_role = get_user_operator_role(user_id, operator_id)
    if user_role not in allowed_roles:
        raise RoleViolationError(allowed_roles)
    
    return True


def require_asset_access(user_id: int, asset_id: str, allowed_roles: List[str]) -> bool:
    """
    Combined scope + role check for asset operations.
    """
    # Get asset's operator
    operator_id = get_asset_operator(asset_id)
    if operator_id is None:
        raise ScopeViolationError(f"Asset {asset_id} not found or no operator")
    
    return require_operator_role(user_id, operator_id, allowed_roles)


# =============================================================================
# Flask Decorators
# =============================================================================

def require_auth(f: Callable) -> Callable:
    """
    Decorator: Require authenticated user.
    Sets g.user for downstream handlers.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({
                "error": "Authentication required",
                "code": "UNAUTHORIZED"
            }), 401
        g.user = user
        return f(*args, **kwargs)
    return decorated


def require_global_role(allowed_roles: List[str]) -> Callable:
    """
    Decorator: Require user has one of the global roles.
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'user', None) or get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            
            if not check_global_role(user["id"], allowed_roles):
                security_audit(
                    action=f"ACCESS_DENIED:{f.__name__}",
                    actor_user_id=user["id"],
                    resource_type="endpoint",
                    resource_id=f.__name__,
                    outcome="denied",
                    details={"required_roles": allowed_roles}
                )
                return jsonify({
                    "error": f"Required roles: {allowed_roles}",
                    "code": "ROLE_VIOLATION"
                }), 403
            
            g.user = user
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_site_access(site_id_param: str, allowed_roles: List[str]) -> Callable:
    """
    Decorator: Require site scope + role.
    
    Usage:
        @require_site_access("site_id", ["owner", "supervisor"])
        def approve_driver(site_id, driver_id):
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'user', None) or get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            
            site_id = kwargs.get(site_id_param)
            if site_id is None:
                return jsonify({"error": f"Missing {site_id_param}"}), 400
            
            try:
                require_site_role(user["id"], int(site_id), allowed_roles)
            except ScopeViolationError as e:
                security_audit(
                    action=f"SCOPE_VIOLATION:{f.__name__}",
                    actor_user_id=user["id"],
                    resource_type="site",
                    resource_id=site_id,
                    outcome="denied"
                )
                return jsonify({"error": e.message, "code": e.code}), 403
            except RoleViolationError as e:
                security_audit(
                    action=f"ROLE_VIOLATION:{f.__name__}",
                    actor_user_id=user["id"],
                    resource_type="site",
                    resource_id=site_id,
                    outcome="denied",
                    details={"required_roles": allowed_roles}
                )
                return jsonify({"error": e.message, "code": e.code}), 403
            
            g.user = user
            g.site_id = site_id
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_asset_operation(asset_id_param: str, operation: str) -> Callable:
    """
    Decorator: Require asset scope + CPMS operation permission.
    
    Usage:
        @require_asset_operation("asset_id", "remote_start")
        def remote_start(asset_id):
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'user', None) or get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            
            asset_id = kwargs.get(asset_id_param)
            if asset_id is None:
                return jsonify({"error": f"Missing {asset_id_param}"}), 400
            
            # Get allowed roles for this operation
            allowed_roles = CPMS_PERMISSIONS.get(operation, [])
            if not allowed_roles:
                return jsonify({"error": f"Unknown operation: {operation}"}), 400
            
            try:
                require_asset_access(user["id"], str(asset_id), allowed_roles)
            except (ScopeViolationError, RoleViolationError) as e:
                security_audit(
                    action=f"ACCESS_DENIED:{operation}",
                    actor_user_id=user["id"],
                    resource_type="asset",
                    resource_id=asset_id,
                    outcome="denied",
                    details={"operation": operation}
                )
                return jsonify({"error": e.message, "code": e.code}), 403
            
            g.user = user
            g.asset_id = asset_id
            return f(*args, **kwargs)
        return decorated
    return decorator


def audit_action(action: str, resource_type: str) -> Callable:
    """
    Decorator: Automatically audit the action.
    
    Usage:
        @audit_action("DRIVER_APPROVED", "driver_access")
        def approve_driver(...):
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'user', None)
            user_id = user["id"] if user else None
            
            # Execute the function
            result = f(*args, **kwargs)
            
            # Log if successful (2xx response)
            if isinstance(result, tuple):
                response, status = result
                outcome = "success" if 200 <= status < 300 else "failure"
            else:
                outcome = "success"
            
            security_audit(
                action=action,
                actor_user_id=user_id,
                resource_type=resource_type,
                resource_id=kwargs.get("site_id") or kwargs.get("asset_id") or kwargs.get("driver_id"),
                site_id=kwargs.get("site_id"),
                asset_id=kwargs.get("asset_id"),
                outcome=outcome
            )
            
            return result
        return decorated
    return decorator


# =============================================================================
# OCPP Security Gate
# =============================================================================

def validate_ocpp_command(user_id: int, asset_id: str, command: str) -> bool:
    """
    Validate that user can execute OCPP command.
    RULE: Humans NEVER call OCPP directly - must go through CPMS.
    
    This function is called by CPMS service before dispatching to OCPP.
    """
    # Check if command is allowed
    allowed_roles = OCPP_PERMISSIONS.get(command)
    if allowed_roles is None:
        security_audit(
            action=f"OCPP_UNKNOWN_COMMAND",
            actor_user_id=user_id,
            resource_type="ocpp",
            resource_id=command,
            asset_id=asset_id,
            outcome="denied"
        )
        raise AuthorizationError(f"Unknown OCPP command: {command}")
    
    # Restricted commands need extra scrutiny
    if command in OCPP_RESTRICTED_COMMANDS:
        security_audit(
            action=f"OCPP_RESTRICTED_ATTEMPT:{command}",
            actor_user_id=user_id,
            resource_type="ocpp",
            resource_id=command,
            asset_id=asset_id,
            outcome="attempted"
        )
    
    # Check asset access
    try:
        require_asset_access(user_id, asset_id, allowed_roles)
    except AuthorizationError:
        security_audit(
            action=f"OCPP_DENIED:{command}",
            actor_user_id=user_id,
            resource_type="ocpp",
            resource_id=command,
            asset_id=asset_id,
            outcome="denied"
        )
        raise
    
    # Log successful authorization
    security_audit(
        action=f"OCPP_AUTHORIZED:{command}",
        actor_user_id=user_id,
        resource_type="ocpp",
        resource_id=command,
        asset_id=asset_id,
        outcome="success"
    )
    
    return True


# =============================================================================
# Setup Functions (for testing/seeding)
# =============================================================================

def assign_user_to_operator(user_id: int, operator_id: int):
    """Assign user to an operator."""
    USER_OPERATORS[user_id] = operator_id


def assign_global_role(user_id: int, role: str):
    """Assign global role to user."""
    if role not in GLOBAL_ROLES:
        raise ValueError(f"Invalid global role: {role}. Valid: {GLOBAL_ROLES}")
    if user_id not in USER_GLOBAL_ROLES:
        USER_GLOBAL_ROLES[user_id] = []
    if role not in USER_GLOBAL_ROLES[user_id]:
        USER_GLOBAL_ROLES[user_id].append(role)


def assign_site_role(user_id: int, site_id: int, role: str):
    """Assign site role to user."""
    if role not in SITE_ROLES:
        raise ValueError(f"Invalid site role: {role}. Valid: {SITE_ROLES}")
    USER_SITE_ROLES[(site_id, user_id)] = role


def assign_operator_role(user_id: int, operator_id: int, role: str):
    """Assign operator role to user."""
    if role not in OPERATOR_ROLES:
        raise ValueError(f"Invalid operator role: {role}. Valid: {OPERATOR_ROLES}")
    USER_OPERATOR_ROLES[(operator_id, user_id)] = role
    USER_OPERATORS[user_id] = operator_id


def register_asset(asset_id: str, operator_id: int):
    """Register asset to operator."""
    ASSET_OPERATORS[asset_id] = operator_id


def register_site(site_id: int, operator_id: int):
    """Register site to operator."""
    SITE_OPERATORS[site_id] = operator_id


def get_security_audit_log(limit: int = 50, **filters) -> List[dict]:
    """Get security audit log entries."""
    logs = SECURITY_AUDIT_LOG
    
    for key, value in filters.items():
        if value is not None:
            logs = [l for l in logs if l.get(key) == value]
    
    return sorted(logs, key=lambda x: x["timestamp"], reverse=True)[:limit]
