"""
Shared configuration for the EVBuddy Flask application.
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


# Remote backend (Spring Boot microservices on dev.evbuddy.net)
MICROSERVICE_HOST = os.environ.get("MICROSERVICE_HOST", "http://dev.evbuddy.net")

# Per-service base URLs (derived from MICROSERVICE_HOST)
EV_REAL_API_BASE = os.environ.get("REAL_API_BASE", f"{MICROSERVICE_HOST}:9000")
EV_REAL_HOSTSITES_API_BASE = os.environ.get("REAL_HOSTSITES_API_BASE", f"{MICROSERVICE_HOST}:9004")
EV_REAL_BUSINESS_API_BASE = os.environ.get("REAL_BUSINESS_API_BASE", f"{MICROSERVICE_HOST}:9005")
EV_REAL_CHARGERS_API_BASE = os.environ.get("REAL_CHARGERS_API_BASE", f"{MICROSERVICE_HOST}:9017")
EV_REAL_OCPP_API_BASE = os.environ.get("REAL_OCPP_API_BASE", f"{MICROSERVICE_HOST}:9029")
EV_REAL_HOSTROOM_API_BASE = os.environ.get("REAL_HOSTROOM_API_BASE", f"{MICROSERVICE_HOST}:9027")
EV_REAL_MESSAGING_API_BASE = os.environ.get("REAL_MESSAGING_API_BASE", f"{MICROSERVICE_HOST}:9011")

# Local Flask proxy settings
EV_BASE_DIR = Path(__file__).resolve().parent

EV_USE_REAL_API = os.environ.get("USE_REAL_API", "true").strip().lower() != "false"
EV_USE_REAL_CHARGER = _env_bool("USE_REAL_CHARGER", default=False)
EV_JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
EV_TIME_SCALE = _env_int("DEMO_TIME_SCALE", 30)

EV_DEFAULT_SITE_ID = "HTL-DEMO-001"
EV_DEFAULT_CHARGER_ID = "atl001"
EV_PRICING = {"currency": "USD", "perKwh": 0.38, "sessionFee": 1.0}

# In-memory session storage (local demo only)
EV_SESSIONS = {}

# Service registry: logical service name -> port/base path
SERVICES = {
    "users": {"port": 9000, "base": "/user"},
    "user_vehicles": {"port": 9001, "base": "/user-vehicle/vehicles"},
    "user_payments": {"port": 9002, "base": "/userpayments"},
    "user_subscriptions": {"port": 9003, "base": "/user-subscriptions"},
    "host_sites": {"port": 9004, "base": "/host-sites"},
    "evbuddy_homepage": {"port": 9005, "base": ""},
    "accounts": {"port": 9007, "base": "/accounts"},
    "community_comments": {"port": 9012, "base": "/communitycomments"},
    "community_posts": {"port": 9013, "base": "/communityposts"},
    "news_posts": {"port": 9014, "base": "/newsposts"},
    "group_memberships": {"port": 9016, "base": "/groupmemberships"},
    "operating_hours": {"port": 9008, "base": "/operating-hours"},
    "chargers": {"port": 9017, "base": "/chargers"},
    "preorders": {"port": 9018, "base": "/preorders"},
    "messaging": {"port": 9011, "base": ""},
}

# Health-check paths for each service (dev.evbuddy.net:<port><path>)
SERVICE_STATUS_PATHS = {
    "users": "/user/status",
    "user_vehicles": "/user-vehicle/status",
    "user_payments": "/userpayments/status",
    "user_subscriptions": "/user-subscriptions/status",
    "host_sites": "/host-sites/status",
    "evbuddy_homepage": "/invites",
    "accounts": "/accounts/status",
    "community_comments": "/communitycomments/status",
    "community_posts": "/communityposts/status",
    "news_posts": "/newsposts/status",
    "group_memberships": "/user-profiles/status",
    "operating_hours": "/operating-hours/status",
    "chargers": "/chargers/status",
    "preorders": "/preorders/status",
    "messaging": "/actuator/health",
}
