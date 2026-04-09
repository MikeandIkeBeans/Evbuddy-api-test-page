import argparse
import json
import os
import tempfile
import time
import shutil
from datetime import datetime, timezone

import requests


DEFAULT_HOST = "http://appdev.evbuddy.net"

ENDPOINTS = [
    {"service": "users", "method": "GET", "port": 9000, "path": "/user/status"},
    {"service": "users", "method": "GET", "port": 9000, "path": "/user"},
    {"service": "user_vehicles", "method": "GET", "port": 9001, "path": "/user-vehicle/vehicles"},
    {"service": "host_sites", "method": "GET", "port": 9004, "path": "/host-sites/status"},
    {"service": "host_sites", "method": "GET", "port": 9004, "path": "/host-sites"},
    {"service": "host_sites", "method": "GET", "port": 9004, "path": "/host-sites?host_id=1"},
    {"service": "operating_hours", "method": "GET", "port": 9008, "path": "/actuator/health"},
    {"service": "operating_hours", "method": "GET", "port": 9008, "path": "/operating-hours"},
    {"service": "messaging", "method": "GET", "port": 9011, "path": "/actuator/health"},
    {"service": "messaging", "method": "GET", "port": 9011, "path": "/threads"},
    {"service": "messaging", "method": "GET", "port": 9011, "path": "/templates"},
    {"service": "chargers", "method": "GET", "port": 9017, "path": "/chargers/status"},
    {"service": "services_catalog", "method": "GET", "port": 9026, "path": "/services"},
    {"service": "ocpp", "method": "GET", "port": 9029, "path": "/api/charge-points"},
    {"service": "ocpp", "method": "GET", "port": 9029, "path": "/api/connectors"},
]


def sample_shape(payload):
    if isinstance(payload, list):
        return {
            "payload_type": "list",
            "count": len(payload),
            "sample_keys": sorted(list(payload[0].keys()))[:12] if payload else [],
        }

    if isinstance(payload, dict):
        result = {
            "payload_type": "dict",
            "keys": sorted(list(payload.keys()))[:12],
        }
        if isinstance(payload.get("data"), list):
            result["count"] = len(payload["data"])
            result["sample_keys"] = sorted(list(payload["data"][0].keys()))[:12] if payload["data"] else []
        return result

    return {"payload_type": type(payload).__name__}


def probe(host, endpoint, timeout, max_retries):
    url = f"{host}:{endpoint['port']}{endpoint['path']}"
    result = {
        "service": endpoint["service"],
        "method": endpoint["method"],
        "url": url,
    }

    delay = 0.25
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.request(endpoint["method"], url, timeout=timeout)
            result["status"] = resp.status_code
            result["ok"] = resp.ok
            result["content_type"] = resp.headers.get("content-type", "")
            result["attempts"] = attempt

            if resp.content:
                try:
                    payload = resp.json()
                    result.update(sample_shape(payload))
                except ValueError:
                    result["preview"] = " ".join(resp.text[:220].split())
            else:
                result["preview"] = ""
            return result
        except Exception as exc:
            last_error = str(exc)
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2

    result["ok"] = False
    result["error"] = last_error or "request failed"
    result["attempts"] = max_retries

    return result


def to_markdown(host, results):
    lines = [
        "# AppDev API Endpoint Matrix",
        "",
        f"- Host: {host}",
        f"- Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "| Service | Method | URL | Status | OK | Shape | Count |",
        "|---|---|---|---:|---|---|---:|",
    ]

    for row in results:
        shape = row.get("payload_type", "text")
        count = row.get("count", "")
        lines.append(
            f"| {row.get('service','')} | {row.get('method','')} | {row.get('url','')} | "
            f"{row.get('status','')} | {row.get('ok','')} | {shape} | {count} |"
        )

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description="Generate a live endpoint matrix for appdev.evbuddy.net")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Base host without port")
    parser.add_argument("--timeout", type=int, default=10, help="Request timeout seconds")
    parser.add_argument("--json-out", default="appdev_endpoint_matrix.json", help="JSON output path")
    parser.add_argument("--md-out", default="API_ENDPOINT_MATRIX.md", help="Markdown output path")
    parser.add_argument("--max-retries", type=int, default=2, help="Max retries per endpoint")
    args = parser.parse_args()

    if args.timeout <= 0:
        raise ValueError("--timeout must be > 0")
    if args.max_retries < 1:
        raise ValueError("--max-retries must be >= 1")
    if not args.host.startswith(("http://", "https://")):
        raise ValueError("--host must start with http:// or https://")

    results = []
    for index, endpoint in enumerate(ENDPOINTS, start=1):
        results.append(probe(args.host, endpoint, args.timeout, args.max_retries))
        print(f"[{index}/{len(ENDPOINTS)}] {endpoint['service']} {endpoint['method']} {endpoint['path']}")

    output = {
        "host": args.host,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }

    fd_json, tmp_json = tempfile.mkstemp(suffix=".json", text=True)
    with os.fdopen(fd_json, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    shutil.move(tmp_json, args.json_out)

    fd_md, tmp_md = tempfile.mkstemp(suffix=".md", text=True)
    with os.fdopen(fd_md, "w", encoding="utf-8") as f:
        f.write(to_markdown(args.host, results))
    shutil.move(tmp_md, args.md_out)

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
