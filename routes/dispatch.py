"""
Proxy routes for the Responder & Dispatch Service.
Exposes endpoints under /api/v1 prefix, mapping to dev.evbuddy.net:9024.
"""

from flask import Blueprint, request

from config import EVBUDDY_DEV_SERVICES, get_host_for_port
from helpers import proxy_json_request

# Port 9024
dispatch_bp = Blueprint("dispatch", __name__)

DISPATCH_BASE = f"{get_host_for_port(9024)}:9024"

@dispatch_bp.route("/api/v1/<path:subpath>", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def proxy_dispatch(subpath):
    """
    Proxy all /api/v1 requests to the Dispatch Service running on port 9024
    or the Service Requests microservice on port 9034.
    """
    # Service requests endpoints - map to port 9034
    if subpath.startswith("service-requests") or subpath.startswith("servicerequests"):
        if subpath.startswith("service-requests"):
            suffix = subpath[len("service-requests"):]
        else:
            suffix = subpath[len("servicerequests"):]
        url = f"{get_host_for_port(9034)}:9034/servicerequests{suffix}"
    else:
        url = f"{DISPATCH_BASE}/{subpath}"
    
    if request.method in ["POST", "PUT", "PATCH"]:
        body = request.get_json(silent=True) or {}
        return proxy_json_request(request.method, url, body=body, error_message="Dispatch backend proxy error")
    
    return proxy_json_request(request.method, url, error_message="Dispatch backend proxy error")


