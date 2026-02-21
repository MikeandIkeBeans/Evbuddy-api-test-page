"""
Service discovery and health check routes (/api/services/..., /health).
"""

from concurrent.futures import ThreadPoolExecutor, as_completed

import requests as http_requests
from flask import Blueprint, jsonify

from config import SERVICES, MICROSERVICE_HOST
from helpers import ms_url, service_status_url

services_bp = Blueprint("services", __name__)


@services_bp.get("/api/services")
def get_services_status():
    """Query all microservices and return their availability status."""

    def check_service(name):
        url = service_status_url(name)
        result = {
            "port": SERVICES[name]["port"],
            "base_url": ms_url(name),
            "status_url": url,
        }
        try:
            resp = http_requests.get(url, timeout=2)
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
        return name, result

    services_status = {}
    with ThreadPoolExecutor(max_workers=len(SERVICES)) as executor:
        futures = {executor.submit(check_service, name): name for name in SERVICES}
        for future in as_completed(futures):
            name, result = future.result()
            services_status[name] = result

    available_count = sum(1 for s in services_status.values() if s.get("available"))

    return jsonify({
        "services": services_status,
        "summary": {
            "total": len(SERVICES),
            "available": available_count,
            "unavailable": len(SERVICES) - available_count,
        },
        "microservice_host": MICROSERVICE_HOST,
    })


@services_bp.get("/api/services/<service_name>")
def get_single_service_status(service_name):
    """Check status of a single service by name."""
    if service_name not in SERVICES:
        return jsonify({
            "error": f"Unknown service: {service_name}",
            "available_services": list(SERVICES.keys()),
        }), 404

    svc = SERVICES[service_name]
    url = service_status_url(service_name)
    result = {
        "service": service_name,
        "port": svc["port"],
        "base_url": ms_url(service_name),
        "status_url": url,
    }
    try:
        resp = http_requests.get(url, timeout=5)
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

    return jsonify(result)


@services_bp.get("/health")
def health():
    return jsonify(status="ok")
