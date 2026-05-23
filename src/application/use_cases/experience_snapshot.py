from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone

from werkzeug.routing import Map, Rule

from config import (
    EV_TIME_SCALE,
    EVBUDDY_DEV_HOST,
    EVBUDDY_DEV_SERVICE_STATUS_PATHS,
    EVBUDDY_DEV_SERVICES,
)
from src.config import AppSettings

SERVICE_LANES = {
    # Core
    "users": "Identity",
    "user_vehicles": "Driver Graph",
    "user_payments": "Wallet",
    "user_subscriptions": "Subscriptions",

    # Host Ops
    "host_sites": "Host Ops",
    "sites": "Host Ops",
    "access_control": "Host Ops",
    "access_invites": "Host Ops",
    "operating_hours": "Availability",
    "hostroom": "Host Ops",

    # Charging
    "chargers": "Realtime Energy",
    "chargebox": "Realtime Energy",
    "ev_chargers": "Realtime Energy",
    "service_pricing": "Pricing",
    "services_catalog": "Catalog",
    "provider_services": "Catalog",
    "ocpp": "Realtime Energy",
    "transactions": "Transactions",
    "pricing": "Pricing",
    "booking": "Booking",
    "session_billing": "Transactions",
    "stripe": "Transactions",
    "payouts": "Transactions",
    "webhooks": "Transactions",
    "promo_credit": "Pricing",
    "credits": "Pricing",
    "admin_api": "Control",

    # Messaging & Dispatch
    "messaging": "Communications",
    "notifications": "Communications",
    "dispatch": "Dispatch",

    # Community
    "ratings_reviews": "Trust",
    "service_reviews": "Trust",
    "community_comments": "Community",
    "community_posts": "Community",
    "news_posts": "Community",
}

MISSION_TIMELINE = [
    {
        "phase": "Signal",
        "title": "Aggregate the platform surface",
        "detail": "Blueprint routes, service ports, and platform controls are pulled into one operator-facing model.",
    },
    {
        "phase": "Align",
        "title": "Shape a single command narrative",
        "detail": "The homepage is treated like mission control instead of a stack of unrelated feature tabs.",
    },
    {
        "phase": "Move",
        "title": "Refresh on a short cadence",
        "detail": "Frontend polling rides a lightweight snapshot endpoint so the interface can animate without custom per-tab fetch logic.",
    },
    {
        "phase": "Scale",
        "title": "Keep the proxy mesh intact",
        "detail": "Existing Flask blueprints remain registered so experiments in the UI do not destroy the integration surface.",
    },
]

CONTROL_ROOMS = [
    {
        "name": "Operator Deck",
        "summary": "Live service lanes, route inventory, and runtime guard rails in one view.",
    },
    {
        "name": "Fallback Bridge",
        "summary": "Server-rendered homepage mirrors the same snapshot contract when the built client is missing.",
    },
    {
        "name": "Proxy Mesh",
        "summary": "Legacy and refactored API routes coexist behind the same Flask app factory.",
    },
]

ACTIVITY_FEED = [
    "Front door rebuilt around a snapshot contract instead of tab-local fetches.",
    "Route atlas is derived from the active Flask url map to reduce config drift.",
    "Guard rails remain visible: auth requirements, rate limiting, and demo time scale are surfaced in the UI.",
]


def _titleize(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").title()


def _path_family(path: str) -> str:
    segments = [segment for segment in path.split("/") if segment and not segment.startswith("<")]
    if not segments:
        return "Root"
    if len(segments) == 1:
        return f"/{segments[0]}"
    return f"/{segments[0]}/{segments[1]}"


def _sanitize_methods(rule: Rule) -> list[str]:
    return sorted(method for method in rule.methods if method not in {"HEAD", "OPTIONS"})


def _route_inventory(url_map: Map) -> dict:
    rules_by_blueprint: dict[str, list[dict]] = defaultdict(list)
    prefix_counter: Counter[str] = Counter()
    total_rules = 0

    for rule in sorted(url_map.iter_rules(), key=lambda candidate: candidate.rule):
        if rule.endpoint == "static":
            continue

        total_rules += 1
        blueprint_name = rule.endpoint.split(".", 1)[0]
        family = _path_family(rule.rule)
        prefix_counter[family] += 1

        rules_by_blueprint[blueprint_name].append(
            {
                "path": rule.rule,
                "methods": _sanitize_methods(rule),
                "family": family,
            }
        )

    atlas = []
    for blueprint_name, entries in sorted(
        rules_by_blueprint.items(),
        key=lambda item: (-len(item[1]), item[0]),
    ):
        families = sorted({entry["family"] for entry in entries})
        sample_routes = [
            {"path": entry["path"], "methods": entry["methods"]}
            for entry in sorted(entries, key=lambda candidate: candidate["path"])[:3]
        ]
        atlas.append(
            {
                "name": _titleize(blueprint_name),
                "count": len(entries),
                "surface": ", ".join(families[:3]),
                "sampleRoutes": sample_routes,
            }
        )

    channels = [
        {"name": name, "count": count}
        for name, count in prefix_counter.most_common(6)
    ]

    return {
        "total": total_rules,
        "namespaces": len(rules_by_blueprint),
        "atlas": atlas[:8],
        "channels": channels,
    }


def _service_matrix() -> list[dict]:
    matrix = []
    for index, (service_name, metadata) in enumerate(EVBUDDY_DEV_SERVICES.items()):
        matrix.append(
            {
                "name": _titleize(service_name),
                "slug": service_name,
                "lane": SERVICE_LANES.get(service_name, "Platform"),
                "port": metadata["port"],
                "basePath": metadata["base"] or "/",
                "statusPath": EVBUDDY_DEV_SERVICE_STATUS_PATHS.get(service_name, "/"),
                "tone": "accent" if index % 3 == 0 else "neutral",
            }
        )
    return matrix


def build_experience_snapshot(
    url_map: Map,
    *,
    settings: AppSettings | None = None,
    static_index_present: bool = False,
) -> dict:
    runtime_settings = settings or AppSettings.from_env()
    route_inventory = _route_inventory(url_map)
    service_matrix = _service_matrix()
    generated_at = datetime.now(timezone.utc).isoformat()
    availability_budget = f"{runtime_settings.rate_limit_requests} req / {runtime_settings.rate_limit_window_seconds}s"

    return {
        "brand": {
            "name": "EVBuddy",
            "headline": "Grid Signal Room",
            "subheading": "A refactored command-center shell for the EVBuddy proxy mesh.",
        },
        "generatedAt": generated_at,
        "hero": {
            "eyebrow": "Proxy Platform",
            "title": "The homepage now behaves like mission control.",
            "description": (
                "This experience condenses EVBuddy's Flask routes, upstream service registry, "
                "and runtime guard rails into a single operational surface."
            ),
            "primaryCta": {"label": "Inspect Services", "href": "#service-matrix"},
            "secondaryCta": {"label": "Trace Routes", "href": "#route-atlas"},
        },
        "signals": [
            {
                "label": "Service lanes",
                "value": str(len(service_matrix)),
                "detail": "Microservice targets registered through the Flask proxy.",
            },
            {
                "label": "Route surface",
                "value": str(route_inventory["total"]),
                "detail": f"{route_inventory['namespaces']} blueprint namespaces discovered live.",
            },
            {
                "label": "Guard rails",
                "value": "Rate limited" if runtime_settings.rate_limit_enabled else "Open local mode",
                "detail": availability_budget if runtime_settings.rate_limit_enabled else "Protection can be enabled with env flags.",
            },
            {
                "label": "Demo time",
                "value": f"{EV_TIME_SCALE}x",
                "detail": "Simulation multiplier applied to local session flows.",
            },
        ],
        "stability": {
            "apiKeyRequired": runtime_settings.api_require_key,
            "rateLimitEnabled": runtime_settings.rate_limit_enabled,
            "rateLimitBudget": availability_budget,
            "flaskDebug": runtime_settings.flask_debug,
            "renderMode": "spa-build" if static_index_present else "server-fallback",
        },
        "serviceSummary": {
            "host": EVBUDDY_DEV_HOST,
            "total": len(service_matrix),
            "activePorts": [service["port"] for service in service_matrix],
        },
        "serviceMatrix": service_matrix,
        "routeChannels": route_inventory["channels"],
        "routeAtlas": route_inventory["atlas"],
        "missionTimeline": MISSION_TIMELINE,
        "controlRooms": CONTROL_ROOMS,
        "activityFeed": ACTIVITY_FEED,
    }
