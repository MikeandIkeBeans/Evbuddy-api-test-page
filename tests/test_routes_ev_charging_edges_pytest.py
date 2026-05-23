from __future__ import annotations

from config import EV_SESSIONS


def test_qr_resolve_returns_contract(client):
    response = client.post("/v1/qr/resolve", json={"qr": "evbuddy://charger/ATL-001/1"})
    assert response.status_code == 200
    payload = response.get_json()
    assert "siteId" in payload
    assert "chargerId" in payload
    assert payload["authModes"] == ["HOTEL_GUEST", "CARD"]


def test_auth_hotel_requires_fields(client):
    response = client.post("/v1/auth/hotel", json={"siteId": 1})
    assert response.status_code == 400
    assert "Missing fields" in response.get_data(as_text=True)


def test_create_session_requires_auth_header(client):
    response = client.post(
        "/v1/sessions",
        json={"chargerId": "atl001", "connectorId": 1, "limit": {"type": "TIME_MIN", "value": 5}},
    )
    assert response.status_code == 401


def test_create_session_rejects_invalid_connector_status(client, monkeypatch):
    monkeypatch.setattr(
        "routes.ev_charging.ev_ocpp_get_connector_status",
        lambda charger_id, connector_id: {"success": True, "connector": {"status": "Faulted"}},
    )

    response = client.post(
        "/v1/sessions",
        headers={"Authorization": "Bearer demo-token"},
        json={"chargerId": "atl001", "connectorId": 1, "limit": {"type": "TIME_MIN", "value": 5}},
    )
    assert response.status_code == 409
    assert "Connector is faulted" in response.get_data(as_text=True)


def test_create_session_handles_ocpp_start_failure(client, monkeypatch):
    monkeypatch.setattr(
        "routes.ev_charging.ev_ocpp_get_connector_status",
        lambda charger_id, connector_id: {"success": True, "connector": {"status": "Available"}},
    )
    monkeypatch.setattr(
        "routes.ev_charging.ev_ocpp_remote_start",
        lambda charger_id, connector_id, id_tag=None: {"success": False, "error": "Denied by charger"},
    )

    response = client.post(
        "/v1/sessions",
        headers={"Authorization": "Bearer demo-token"},
        json={"chargerId": "atl001", "connectorId": 1, "limit": {"type": "TIME_MIN", "value": 5}},
    )
    assert response.status_code == 502
    assert "Denied by charger" in response.get_data(as_text=True)


def test_stop_session_unknown_id(client):
    response = client.post("/v1/sessions/NOPE/stop", headers={"Authorization": "Bearer demo-token"}, json={})
    assert response.status_code == 404


def test_receipt_requires_complete_session(client):
    session_id = "SES-RECEIPT-1"
    EV_SESSIONS[session_id] = {
        "sessionId": session_id,
        "status": "CHARGING",
        "chargerId": "atl001",
        "connectorId": 1,
        "elapsedSec": 30,
        "energyKwh": 0.5,
        "energyDeliveredKwh": 0.5,
        "powerKw": 11.2,
        "cost": 0.2,
        "costDetail": None,
        "socPercent": None,
        "message": None,
        "stopRequested": False,
        "_createdAtMs": 0,
        "startedAt": "2026-01-01T00:00:00Z",
        "endedAt": None,
    }

    response = client.get(f"/v1/sessions/{session_id}/receipt")
    assert response.status_code == 409


def test_dev_proxy_requires_endpoint(client):
    response = client.post("/v1/dev/proxy", json={})
    assert response.status_code == 400
    assert "Missing endpoint" in response.get_data(as_text=True)


def test_host_site_create_requires_body(client):
    no_json_content_type = client.post("/v1/host-sites")
    assert no_json_content_type.status_code == 415

    explicit_null_json = client.post("/v1/host-sites", json=None)
    assert explicit_null_json.status_code == 415
