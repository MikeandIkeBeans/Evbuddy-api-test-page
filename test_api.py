"""
Lightweight smoke test script for the EVBuddy Flask proxy.

Starts Flask in a background thread and exercises a small set of current
endpoints without any access-control setup.
"""

import json
import threading
import time

import requests


BASE_URL = "http://127.0.0.1:5000"


def run_flask():
    from app import app

    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)


def print_json_preview(prefix, response):
    try:
        payload = response.json()
        preview = json.dumps(payload, indent=2)[:400]
    except Exception:
        preview = response.text[:400]
    print(f"{prefix}{preview}")


def test_get(label, path, timeout=10):
    print(f"\n{label}")
    try:
        resp = requests.get(f"{BASE_URL}{path}", timeout=timeout)
        print(f"   Status: {resp.status_code}")
        print_json_preview("   Response: ", resp)
    except Exception as exc:
        print(f"   Error: {exc}")


def test_post(label, path, body, timeout=10):
    print(f"\n{label}")
    try:
        resp = requests.post(f"{BASE_URL}{path}", json=body, timeout=timeout)
        print(f"   Status: {resp.status_code}")
        print_json_preview("   Response: ", resp)
    except Exception as exc:
        print(f"   Error: {exc}")


if __name__ == "__main__":
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    time.sleep(2)

    print("=" * 60)
    print("EVBuddy Smoke Tests")
    print("=" * 60)

    test_get("1. Testing /health...", "/health")
    test_get("2. Testing /api/services...", "/api/services", timeout=30)
    test_get("3. Testing /api/users...", "/api/users")
    test_get("4. Testing /api/sites...", "/api/sites", timeout=15)
    test_get("5. Testing /v1/chargers...", "/v1/chargers")
    test_get("6. Testing /v1/v2v/status...", "/v1/v2v/status")

    test_post(
        "7. Testing POST /api/businesses...",
        "/api/businesses",
        {
            "name": "Smoke Test Business",
            "email": "smoke@example.com",
        },
    )
    test_post(
        "8. Testing POST /api/preorder...",
        "/api/preorder",
        {
            "name": "Smoke Test",
            "email": "smoke@example.com",
        },
    )

    print("\n" + "=" * 60)
    print("Smoke tests complete.")
    print("=" * 60)
    print("\nNote: 5xx and 503 responses are expected when upstream Spring Boot services are unavailable.")
