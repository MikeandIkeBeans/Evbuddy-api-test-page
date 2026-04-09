"""
Service discovery and health check routes (/api/services/..., /health).
"""

from concurrent.futures import ThreadPoolExecutor, as_completed

import requests as http_requests
from flask import Blueprint, jsonify

from config import EVBUDDY_DEV_SERVICES, EVBUDDY_DEV_HOST, normalize_service_key
from helpers import ms_url, service_status_url
from src.api.response import error_response, success_response

services_bp = Blueprint("services", __name__)


def _probe_service(service_name: str, timeout: int = 5):
    canonical_service_name = normalize_service_key(service_name)
    svc = EVBUDDY_DEV_SERVICES[canonical_service_name]
    url = service_status_url(canonical_service_name)
    result = {
        "service": canonical_service_name,
        "port": svc["port"],
        "base_url": ms_url(canonical_service_name),
        "status_url": url,
    }
    try:
        resp = http_requests.get(url, timeout=timeout)
        result["available"] = resp.status_code == 200
        result["status_code"] = resp.status_code
        if resp.status_code == 200:
            try:
                result["response"] = resp.json()
            except Exception:
                result["response"] = resp.text[:100]
    except http_requests.RequestException as e:
        result["available"] = False
        result["error"] = str(e)
    return result


@services_bp.get("/api/services")
def get_services_status():
    """Query all microservices and return their availability status."""

    def check_service(name):
        return name, _probe_service(name, timeout=2)

    services_status = {}
    with ThreadPoolExecutor(max_workers=len(EVBUDDY_DEV_SERVICES)) as executor:
        futures = {executor.submit(check_service, name): name for name in EVBUDDY_DEV_SERVICES}
        for future in as_completed(futures):
            name, result = future.result()
            services_status[name] = result

    available_count = sum(1 for s in services_status.values() if s.get("available"))

    return jsonify({
        "services": services_status,
        "summary": {
            "total": len(EVBUDDY_DEV_SERVICES),
            "available": available_count,
            "unavailable": len(EVBUDDY_DEV_SERVICES) - available_count,
        },
        "evbuddy_dev_host": EVBUDDY_DEV_HOST,
        "microservice_host": EVBUDDY_DEV_HOST,
    })


@services_bp.get("/api/services/<service_name>")
def get_single_service_status(service_name):
    """Check status of a single service by name."""
    canonical_service_name = normalize_service_key(service_name)
    if canonical_service_name not in EVBUDDY_DEV_SERVICES:
        return jsonify({
            "error": f"Unknown service: {service_name}",
            "available_services": list(EVBUDDY_DEV_SERVICES.keys()),
        }), 404

    return jsonify(_probe_service(canonical_service_name, timeout=5))


@services_bp.get("/health")
def health():
    return jsonify(status="ok")


@services_bp.get("/api/platform/health")
def platform_health():
    """Contract-normalized health endpoint for clients migrating to the new envelope."""
    return success_response({"status": "ok"})


@services_bp.get("/api/platform/services/<service_name>")
def platform_single_service_status(service_name):
    """Contract-normalized service status endpoint with stable error codes."""
    canonical_service_name = normalize_service_key(service_name)
    if canonical_service_name not in EVBUDDY_DEV_SERVICES:
        return error_response(
            code="SERVICE_NOT_FOUND",
            message=f"Unknown service: {service_name}",
            status_code=404,
            details={"availableServices": list(EVBUDDY_DEV_SERVICES.keys())},
        )

    return success_response(_probe_service(canonical_service_name, timeout=5))
