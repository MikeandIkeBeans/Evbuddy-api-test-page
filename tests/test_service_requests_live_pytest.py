from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("SERVICE_REQUESTS_BASE_URL", "http://appdev.evbuddy.net:9034").rstrip("/")
CORE_KEYS = {"id", "status", "createdAt", "updatedAt"}
COMMON_KEYS = {
    "currency",
    "notes",
    "request_source",
    "request_type",
    "service_code",
    "service_name",
    "priority_code",
}


def _live_enabled() -> bool:
    return os.environ.get("RUN_LIVE_APPDEV", "0").strip().lower() in {"1", "true", "yes", "on"}


def _timeout_sec() -> float:
    raw = os.environ.get("LIVE_HTTP_TIMEOUT_SEC", "15")
    try:
        value = float(raw)
    except ValueError:
        value = 15.0
    return value if value > 0 else 15.0


def _assert_service_request_shape(payload: dict):
    assert isinstance(payload, dict)
    missing = [key for key in CORE_KEYS if key not in payload]
    assert not missing, f"missing core keys: {missing}"

    # The upstream object currently contains many fields; enforce a reasonable floor.
    assert len(payload.keys()) >= 10


def _build_default_update_payload() -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "status": "requested",
        "notes": f"live-contract-update-{now}",
    }


@pytest.mark.backend
@pytest.mark.integration
@pytest.mark.live
def test_service_requests_live_read_contract():
    if not _live_enabled():
        pytest.skip("Live appdev tests are disabled. Set RUN_LIVE_APPDEV=1 to execute.")

    timeout = _timeout_sec()

    list_response = requests.get(f"{BASE_URL}/servicerequests", timeout=timeout)
    assert list_response.status_code == 200

    collection = list_response.json()
    assert isinstance(collection, list)
    assert len(collection) >= 1

    first = collection[0]
    _assert_service_request_shape(first)

    request_id = first["id"]
    item_response = requests.get(f"{BASE_URL}/servicerequests/{request_id}", timeout=timeout)
    assert item_response.status_code == 200

    item = item_response.json()
    _assert_service_request_shape(item)
    assert item["id"] == request_id

    observed_common_key_count = sum(1 for key in COMMON_KEYS if key in item)
    assert observed_common_key_count >= 3


@pytest.mark.backend
@pytest.mark.integration
@pytest.mark.live
def test_service_requests_live_crud_contract_with_env_payload():
    if not _live_enabled():
        pytest.skip("Live appdev tests are disabled. Set RUN_LIVE_APPDEV=1 to execute.")

    create_payload_raw = os.environ.get("SERVICE_REQUESTS_CREATE_PAYLOAD_JSON", "").strip()
    if not create_payload_raw:
        pytest.skip(
            "Mutation flow needs SERVICE_REQUESTS_CREATE_PAYLOAD_JSON to avoid invalid write payload assumptions."
        )

    timeout = _timeout_sec()
    create_payload = json.loads(create_payload_raw)

    created_id = None

    try:
        create_response = requests.post(f"{BASE_URL}/servicerequests", json=create_payload, timeout=timeout)
        assert create_response.status_code == 201
        created = create_response.json()
        _assert_service_request_shape(created)

        created_id = created["id"]

        get_response = requests.get(f"{BASE_URL}/servicerequests/{created_id}", timeout=timeout)
        assert get_response.status_code == 200

        update_payload = _build_default_update_payload()
        update_response = requests.put(
            f"{BASE_URL}/servicerequests/{created_id}",
            json=update_payload,
            timeout=timeout,
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        _assert_service_request_shape(updated)
        assert updated.get("status") == update_payload["status"]
        assert updated.get("notes") == update_payload["notes"]

        delete_response = requests.delete(f"{BASE_URL}/servicerequests/{created_id}", timeout=timeout)
        assert delete_response.status_code == 204
        assert delete_response.text == ""

        created_id = None
    finally:
        if created_id is not None:
            requests.delete(f"{BASE_URL}/servicerequests/{created_id}", timeout=timeout)
