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
# Source: APIHealthCheckViewModel.swift + APIEnvironment.swift
# Dev host: appdev.evbuddy.net | Prod host: app.evbuddy.net
#
# Categories: Core, Host Ops, Charging, Messaging & Dispatch, Community
# Total: 24 registered services, 30 health check endpoints

EVBUDDY_DEV_SERVICES = {
    # --- Core Services ---
    "users":                {"port": 9000, "base": "/user",                    "category": "core"},
    "user_vehicles":        {"port": 9001, "base": "/user-vehicle/vehicles",   "category": "core"},
    "user_payments":        {"port": 9002, "base": "/userpayments",            "category": "core",     "deployed": False},
    "user_subscriptions":   {"port": 9003, "base": "/user-subscriptions",      "category": "core"},

    # --- Host Ops Services ---
    "host_sites":           {"port": 9004, "base": "/host-sites",              "category": "host_ops"},
    "access_invites":       {"port": 9005, "base": "",                         "category": "host_ops"},
    "operating_hours":      {"port": 9008, "base": "/operating-hours",         "category": "host_ops"},
    "hostroom":             {"port": 9027, "base": "/hostrooms",               "category": "host_ops"},

    # --- Charging Services ---
    "chargers":             {"port": 9017, "base": "/chargers",                "category": "charging"},
    "chargebox":            {"port": 9018, "base": "/chargeboxes",             "category": "charging"},
    "ev_chargers":          {"port": 9028, "base": "/api/ev-chargers",         "category": "charging"},
    "service_pricing":      {"port": 9026, "base": "/service-pricing",         "category": "charging"},
    "services_catalog":     {"port": 9026, "base": "/services",                "category": "charging"},
    "provider_services":    {"port": 9026, "base": "/provider-services",       "category": "charging"},
    "ocpp":                 {"port": 9029, "base": "",                         "category": "charging"},
    "transactions":         {"port": 9032, "base": "/transactions",            "category": "charging"},
    "pricing":              {"port": 9030, "base": "",                         "category": "charging",  "deployed": False},
    "booking":              {"port": 9031, "base": "",                         "category": "charging",  "deployed": False},

    # --- Messaging & Dispatch Services ---
    "messaging":            {"port": 9011, "base": "",                         "category": "messaging"},
    "dispatch":             {"port": 9024, "base": "",                         "category": "dispatch",  "deployed": False},

    # --- Community Services ---
    "service_reviews":      {"port": 9015, "base": "/service-reviews",         "category": "community"},
    "community_comments":   {"port": 9012, "base": "/communitycomments",       "category": "community"},
    "community_posts":      {"port": 9013, "base": "/communityposts",          "category": "community"},
    "news_posts":           {"port": 9014, "base": "/newsposts",               "category": "community"},
}

# Health-check paths for each service (dev.evbuddy.net:<port><path>)
# Multiple check paths per port are supported via separate service keys.
EVBUDDY_DEV_SERVICE_STATUS_PATHS = {
    # Core
    "users":                "/user/status",
    "user_vehicles":        "/user-vehicle/status",
    "user_payments":        "/userpayments/status",
    "user_subscriptions":   "/user-subscriptions/status",

    # Host Ops
    "host_sites":           "/host-sites/status",
    "access_invites":       "/invites",
    "operating_hours":      "/operating-hours/status",
    "hostroom":             "/hostrooms/status",

    # Charging
    "chargers":             "/chargers/status",
    "chargebox":            "/chargeboxes/status",
    "ev_chargers":          "/api/ev-chargers/nearby?lat=33.749&lon=-84.388&radius=50",
    "service_pricing":      "/service-pricing",
    "services_catalog":     "/services",
    "provider_services":    "/provider-services/status",
    "ocpp":                 "/api/charge-points",
    "transactions":         "/transactions/history/test",

    # Messaging & Dispatch
    "messaging":            "/api-docs",
    "dispatch":             "/assets",

    # Community
    "service_reviews":      "/service-reviews/status",
    "community_comments":   "/communitycomments/status",
    "community_posts":      "/communityposts/status",
    "news_posts":           "/newsposts/status",
}

# Legacy key aliases accepted at route level.
EVBUDDY_DEV_SERVICE_ALIASES = {
    "evbuddy_homepage": "access_invites",
    "businesses": "access_invites",
    "feedback_reviews": "service_reviews",
    "preorders": "chargebox",
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
