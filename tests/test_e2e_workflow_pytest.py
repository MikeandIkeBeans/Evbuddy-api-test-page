from __future__ import annotations

import pytest


@pytest.mark.backend
@pytest.mark.e2e
def test_end_to_end_session_correlation_workflow(client, monkeypatch):
    monkeypatch.setattr(
        "routes.ev_charging.ev_ocpp_get_connector_status",
        lambda charger_id, connector_id: {"success": True, "connector": {"status": "Available"}},
    )
    monkeypatch.setattr(
        "routes.ev_charging.ev_ocpp_remote_start",
        lambda charger_id, connector_id, id_tag=None: {"success": True, "transaction_id": 90909},
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
            "limit": {"type": "TIME_MIN", "value": 15},
        },
    )
    assert create_response.status_code == 201
    create_payload = create_response.get_json()
    session_id = create_payload["sessionId"]
    transaction_id = str(create_payload["transactionId"])

    read_response = client.get(f"/v1/sessions/{session_id}")
    assert read_response.status_code == 200
    assert read_response.get_json()["sessionId"] == session_id

    cpms_response = client.post(
        "/api/assets/atl001/remote-stop",
        json={"txid": transaction_id},
    )
    assert cpms_response.status_code == 200

    correlation_response = client.get(f"/v1/debug/sessions/{session_id}/correlation")
    assert correlation_response.status_code == 200
    correlation_payload = correlation_response.get_json()

    assert correlation_payload["session"]["sessionId"] == session_id
    assert str(correlation_payload["session"]["transactionId"]) == transaction_id
    assert correlation_payload["cpms"]["transactionMatch"] is not None
    assert correlation_payload["cpms"]["transactionMatch"]["txid"] == transaction_id

    stop_response = client.post(
        f"/v1/sessions/{session_id}/stop",
        headers={"Authorization": "Bearer demo-token"},
        json={},
    )
    assert stop_response.status_code == 200
    stop_payload = stop_response.get_json()
    assert stop_payload["status"] == "STOPPING"
