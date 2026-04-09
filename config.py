"""
Shared configuration for the EVBuddy Flask application.

Canonical naming in this module uses ``EVBUDDY_DEV_*`` constants to target
the dev.evbuddy.net upstream surface. Legacy names are still exported as
aliases for backward compatibility.
"""

import os
from pathlib import Path


def _env_bool(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name, default):
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


# Canonical upstream host (Spring Boot microservices on dev.evbuddy.net)
EVBUDDY_DEV_HOST = os.environ.get(
    "EVBUDDY_DEV_HOST",
    os.environ.get("MICROSERVICE_HOST", "http://dev.evbuddy.net"),
)

# Canonical per-service base URLs (derived from EVBUDDY_DEV_HOST)
EVBUDDY_DEV_USERS_BASE = os.environ.get(
    "EVBUDDY_DEV_USERS_BASE",
    os.environ.get("REAL_API_BASE", f"{EVBUDDY_DEV_HOST}:9000"),
)
EVBUDDY_DEV_HOST_SITES_BASE = os.environ.get(
    "EVBUDDY_DEV_HOST_SITES_BASE",
    os.environ.get("REAL_HOSTSITES_API_BASE", f"{EVBUDDY_DEV_HOST}:9004"),
)
EVBUDDY_DEV_BUSINESS_BASE = os.environ.get(
    "EVBUDDY_DEV_BUSINESS_BASE",
    os.environ.get("REAL_BUSINESS_API_BASE", f"{EVBUDDY_DEV_HOST}:9005"),
)
EVBUDDY_DEV_CHARGERS_BASE = os.environ.get(
    "EVBUDDY_DEV_CHARGERS_BASE",
    os.environ.get("REAL_CHARGERS_API_BASE", f"{EVBUDDY_DEV_HOST}:9017"),
)
EVBUDDY_DEV_OCPP_BASE = os.environ.get(
    "EVBUDDY_DEV_OCPP_BASE",
    os.environ.get("REAL_OCPP_API_BASE", f"{EVBUDDY_DEV_HOST}:9029"),
)
EVBUDDY_DEV_HOST_ROOMS_BASE = os.environ.get(
    "EVBUDDY_DEV_HOST_ROOMS_BASE",
    os.environ.get("REAL_HOSTROOM_API_BASE", f"{EVBUDDY_DEV_HOST}:9027"),
)
EVBUDDY_DEV_MESSAGING_BASE = os.environ.get(
    "EVBUDDY_DEV_MESSAGING_BASE",
    os.environ.get("REAL_MESSAGING_API_BASE", f"{EVBUDDY_DEV_HOST}:9011"),
)

# Local Flask proxy settings
EV_BASE_DIR = Path(__file__).resolve().parent

EV_JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
EV_TIME_SCALE = _env_int("DEMO_TIME_SCALE", 30)

EV_DEFAULT_SITE_ID = "HTL-DEMO-001"
EV_DEFAULT_CHARGER_ID = "atl001"
EV_PRICING = {"currency": "USD", "perKwh": 0.38, "sessionFee": 1.0}

# In-memory session storage (local demo only)
EV_SESSIONS = {}

# Service registry: canonical service key -> port/base path
EVBUDDY_DEV_SERVICES = {
    "users": {"port": 9000, "base": "/user"},
    "user_vehicles": {"port": 9001, "base": "/user-vehicle/vehicles"},
    "user_payments": {"port": 9002, "base": "/userpayments"},
    "host_sites": {"port": 9004, "base": "/host-sites"},
    "businesses": {"port": 9005, "base": ""},
    "operating_hours": {"port": 9008, "base": "/operating-hours"},
    "feedback_reviews": {"port": 9015, "base": "/feedback-reviews"},
    "chargers": {"port": 9017, "base": "/chargers"},
    "preorders": {"port": 9018, "base": "/preorders"},
    "services_catalog": {"port": 9026, "base": "/services"},
    "messaging": {"port": 9011, "base": ""},
}

# Health-check paths for each service (dev.evbuddy.net:<port><path>)
EVBUDDY_DEV_SERVICE_STATUS_PATHS = {
    "users": "/user/status",
    "user_vehicles": "/user-vehicle/status",
    "user_payments": "/userpayments/status",
    "host_sites": "/host-sites/status",
    "businesses": "/invites",
    "operating_hours": "/operating-hours/status",
    "feedback_reviews": "/actuator/health",
    "chargers": "/chargers/status",
    "preorders": "/preorders/status",
    "services_catalog": "/provider-services/status",
    "messaging": "/actuator/health",
}

# Legacy key aliases accepted at route level.
EVBUDDY_DEV_SERVICE_ALIASES = {
    "evbuddy_homepage": "businesses",
}


def normalize_service_key(service_key):
    """Normalize legacy service keys to canonical EVBUDDY_DEV service keys."""
    return EVBUDDY_DEV_SERVICE_ALIASES.get(service_key, service_key)


# -----------------------------------------------------------------------------
# Legacy compatibility aliases
# -----------------------------------------------------------------------------
MICROSERVICE_HOST = EVBUDDY_DEV_HOST

EV_REAL_API_BASE = EVBUDDY_DEV_USERS_BASE
EV_REAL_HOSTSITES_API_BASE = EVBUDDY_DEV_HOST_SITES_BASE
EV_REAL_BUSINESS_API_BASE = EVBUDDY_DEV_BUSINESS_BASE
EV_REAL_CHARGERS_API_BASE = EVBUDDY_DEV_CHARGERS_BASE
EV_REAL_OCPP_API_BASE = EVBUDDY_DEV_OCPP_BASE
EV_REAL_HOSTROOM_API_BASE = EVBUDDY_DEV_HOST_ROOMS_BASE
EV_REAL_MESSAGING_API_BASE = EVBUDDY_DEV_MESSAGING_BASE

SERVICES = EVBUDDY_DEV_SERVICES
SERVICE_STATUS_PATHS = EVBUDDY_DEV_SERVICE_STATUS_PATHS
