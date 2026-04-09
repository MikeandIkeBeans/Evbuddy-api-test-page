import json
import os
import argparse
from datetime import datetime, timezone

import requests

HOST = os.environ.get("APPDEV_HOST", "http://appdev.evbuddy.net")
PORTS = [
    9000,
    9001,
    9002,
    9003,
    9004,
    9005,
    9007,
    9008,
    9011,
    9012,
    9013,
    9014,
    9016,
    9017,
    9018,
    9026,
    9027,
    9029,
    9030,
]
PATHS = [
    "/actuator/health",
    "/health",
    "/status",
    "/user/status",
    "/host-sites/status",
    "/chargers/status",
    "/operating-hours/status",
    "/api/charge-points",
    "/api/connectors",
]


def probe(base, path):
    url = f"{base}{path}"
    try:
        resp = requests.get(url, timeout=6)
        body = resp.text[:260]
        body = " ".join(body.split())
        return {
            "url": url,
            "status": resp.status_code,
            "ok": resp.ok,
            "preview": body,
        }
    except Exception as exc:
        return {
            "url": url,
            "status": None,
            "ok": False,
            "error": str(exc),
        }


def infer_entities_from_json(value, entities):
    if isinstance(value, dict):
        keys = set(value.keys())
        marker_sets = {
            "users": {"email", "first_name", "last_name"},
            "host_sites": {"site_name", "postal_code", "state"},
            "chargers": {"ocpp_identity", "serial_number", "firmware_version"},
            "charge_points": {"charge_point_id", "online", "registration_status"},
            "connectors": {"connector_id", "status"},
            "transactions": {"transaction_id", "meter_start", "id_tag"},
        }
        for entity, markers in marker_sets.items():
            if keys & markers:
                entities[entity] = sorted(set(entities.get(entity, [])) | keys)
        for child in value.values():
            infer_entities_from_json(child, entities)
    elif isinstance(value, list):
        for item in value:
            infer_entities_from_json(item, entities)


def main():
    parser = argparse.ArgumentParser(description="Probe appdev.evbuddy.net service ports and infer entity shapes")
    parser.add_argument("--out", help="Optional output JSON path (UTF-8)")
    args = parser.parse_args()

    report = {
        "host": HOST,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "probes": [],
        "entity_inference": {},
    }

    for port in PORTS:
        base = f"{HOST}:{port}"
        for path in PATHS:
            result = probe(base, path)
            report["probes"].append(result)

            if result.get("ok"):
                try:
                    resp = requests.get(result["url"], timeout=6)
                    payload = resp.json()
                    infer_entities_from_json(payload, report["entity_inference"])
                except Exception:
                    continue

    payload = json.dumps(report, indent=2)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(payload)

    print(payload)


if __name__ == "__main__":
    main()
