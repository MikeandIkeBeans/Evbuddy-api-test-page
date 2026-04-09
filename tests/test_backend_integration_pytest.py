from __future__ import annotations

import pytest


class _FakeResponse:
    def __init__(self, *, status_code: int = 200, payload=None):
        self.status_code = status_code
        self.ok = status_code == 200
        self._payload = payload if payload is not None else {}
        self.text = ""

    def json(self):
        return self._payload


@pytest.mark.backend
@pytest.mark.integration
def test_v2v_status_contract_success(client, monkeypatch):
    from routes.v2v import CHARGE_POINT_ID

    def fake_http(method, url, timeout=8, body=None):
        assert method == "GET"
        if "charge-points" in url:
            return _FakeResponse(
                status_code=200,
                payload={
                    "data": [
                        {
                            "charge_point_id": CHARGE_POINT_ID,
                            "online": False,
                            "last_heartbeat": None,
                            "firmware_version": "2.1.0",
                        }
                    ]
                },
            )
        if "connectors" in url:
            return _FakeResponse(
                status_code=200,
                payload={
                    "data": [
                        {"connector_id": 1, "status": "Charging"},
                        {"connector_id": 2, "status": "Available"},
                    ]
                },
            )
        return _FakeResponse(status_code=404, payload={})

    monkeypatch.setattr("routes.v2v.ev_http", fake_http)

    response = client.get("/v1/v2v/status")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["charger"]["online"] is False
    assert len(payload["connectors"]) == 2


@pytest.mark.backend
@pytest.mark.integration
def test_v2v_status_handles_upstream_failure(client, monkeypatch):
    def fake_http(method, url, timeout=8, body=None):
        raise RuntimeError("upstream failure")

    monkeypatch.setattr("routes.v2v.ev_http", fake_http)

    response = client.get("/v1/v2v/status")
    assert response.status_code == 502
    payload = response.get_json()
    assert payload["success"] is False
    assert "upstream failure" in payload["error"]


@pytest.mark.backend
@pytest.mark.integration
def test_v1_session_start_stop_flow(client, monkeypatch):
    monkeypatch.setattr(
        "routes.ev_charging.ev_ocpp_get_connector_status",
        lambda charger_id, connector_id: {"success": True, "connector": {"status": "Available"}},
    )
    monkeypatch.setattr(
        "routes.ev_charging.ev_ocpp_remote_start",
        lambda charger_id, connector_id, id_tag=None: {"success": True, "transaction_id": 5150},
    )
    monkeypatch.setattr(
        "routes.ev_charging.ev_ocpp_remote_stop",
        lambda charge_point_id, connector_id, transaction_id, id_tag=None: {"success": True},
    )

    create_response = client.post(
        "/v1/sessions",
        headers={"Authorization": "Bearer demo-token"},
        json={
            "chargerId": "atl001",
            "connectorId": 1,
            "limit": {"type": "TIME_MIN", "value": 5},
        },
    )

    assert create_response.status_code == 201
    create_payload = create_response.get_json()
    assert create_payload["transactionId"] == 5150
    session_id = create_payload["sessionId"]

    status_response = client.get(f"/v1/sessions/{session_id}")
    assert status_response.status_code == 200
    status_payload = status_response.get_json()
    assert status_payload["sessionId"] == session_id

    stop_response = client.post(
        f"/v1/sessions/{session_id}/stop",
        headers={"Authorization": "Bearer demo-token"},
        json={},
    )
    assert stop_response.status_code == 200
    stop_payload = stop_response.get_json()
    assert stop_payload["status"] == "STOPPING"


@pytest.mark.backend
@pytest.mark.integration
def test_api_services_aggregate_summary(client, monkeypatch):
    def fake_get(url, timeout=2):
        return _FakeResponse(status_code=200, payload={"status": "ok"})

    monkeypatch.setattr("routes.services.http_requests.get", fake_get)

    response = client.get("/api/services")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["summary"]["total"] >= 1
    assert payload["summary"]["available"] == payload["summary"]["total"]
