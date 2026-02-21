"""
Operating Hours proxy routes.

Proxies requests to the Operating Hours microservice on port 9008.
  - GET / PUT  /api/operating-hours
  - GET / POST /api/operating-hours-exceptions
"""

from flask import Blueprint, request

from config import MICROSERVICE_HOST
from helpers import get_json_body, proxy_json_request, with_query_params

operating_hours_bp = Blueprint("operating_hours", __name__)

OPERATING_HOURS_BASE = f"{MICROSERVICE_HOST}:9008"


@operating_hours_bp.get("/api/operating-hours")
def get_operating_hours():
    """GET operating hours for a scope (site / business / charger)."""
    url = with_query_params(
        f"{OPERATING_HOURS_BASE}/operating-hours",
        scope_type=request.args.get("scope_type", ""),
        scope_id=request.args.get("scope_id", ""),
    )
    return proxy_json_request("GET", url, error_message="Failed to fetch operating hours")


@operating_hours_bp.put("/api/operating-hours")
def put_operating_hours():
    """PUT (upsert) weekly operating hours for a scope."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "PUT",
        f"{OPERATING_HOURS_BASE}/operating-hours",
        body=data,
        error_message="Failed to save operating hours",
    )


@operating_hours_bp.get("/api/operating-hours-exceptions")
def get_operating_hours_exceptions():
    """GET exceptions for a scope within a date range."""
    url = with_query_params(
        f"{OPERATING_HOURS_BASE}/operating-hours-exceptions",
        scope_type=request.args.get("scope_type", ""),
        scope_id=request.args.get("scope_id", ""),
        **{"from": request.args.get("from", ""), "to": request.args.get("to", "")},
    )
    return proxy_json_request("GET", url, error_message="Failed to fetch operating-hours exceptions")


@operating_hours_bp.post("/api/operating-hours-exceptions")
def create_operating_hours_exception():
    """POST create a new operating-hours exception (holiday / override)."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "POST",
        f"{OPERATING_HOURS_BASE}/operating-hours-exceptions",
        body=data,
        error_message="Failed to create operating-hours exception",
    )
