from __future__ import annotations


def test_cpms_remote_start_records_transaction(client):
    response = client.post(
        "/api/assets/ATL-01/remote-start",
        json={"connector_id": 2, "id_tag": "ROOM-100"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["message"] == "Remote start command sent"
    assert payload["asset_id"] == "ATL-01"
    assert payload["action"] == "RemoteStartTransaction"
    assert payload["payload"]["connector_id"] == 2
    assert payload["payload"]["id_tag"] == "ROOM-100"


def test_cpms_remote_stop_requires_transaction_id(client):
    response = client.post("/api/assets/ATL-01/remote-stop", json={})
    assert response.status_code == 400
    assert response.get_json()["error"] == "transaction_id or txid required"


def test_cpms_remote_stop_supports_txid_alias(client):
    response = client.post("/api/assets/ATL-01/remote-stop", json={"txid": "TX-999"})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["txid"] == "TX-999"
    assert payload["action"] == "RemoteStopTransaction"
    assert payload["payload"]["transaction_id"] == "TX-999"


def test_cpms_transaction_lookup_not_found(client):
    response = client.get("/api/transactions/not-real")
    assert response.status_code == 404
    payload = response.get_json()
    assert payload["error"] == "transaction not found"
    assert payload["txid"] == "not-real"


def test_cpms_list_commands_validates_limit(client):
    response = client.get("/api/assets/ATL-01/commands?limit=0")
    assert response.status_code == 400
    assert response.get_json()["error"] == "limit must be >= 1"


def test_cpms_diagnostics_returns_expected_shape(client):
    response = client.get("/api/assets/ATL-01/diagnostics")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["asset_id"] == "ATL-01"
    assert isinstance(payload["connector_status"], list)
    assert len(payload["connector_status"]) >= 1


def test_cpms_firmware_update_requires_url(client):
    response = client.post("/api/assets/ATL-01/firmware-update", json={})
    assert response.status_code == 400
    assert response.get_json()["error"] == "firmware_url required"


def test_cpms_change_configuration_requires_key(client):
    response = client.post("/api/assets/ATL-01/change-configuration", json={"value": "true"})
    assert response.status_code == 400
    assert response.get_json()["error"] == "key required"


def test_cpms_refund_requires_operator_id_and_amount(client):
    missing_operator = client.post("/api/sessions/SES-1/refund", json={"amount": 1.5})
    assert missing_operator.status_code == 400
    assert missing_operator.get_json()["error"] == "operator_id required"

    missing_amount = client.post("/api/sessions/SES-1/refund", json={"operator_id": "ops-1"})
    assert missing_amount.status_code == 400
    assert missing_amount.get_json()["error"] == "amount required"


def test_cpms_tariff_update_passthrough(client):
    response = client.put("/api/assets/ATL-01/tariff", json={"tariff": {"type": "flat", "value": 0.35}})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["asset_id"] == "ATL-01"
    assert payload["tariff"]["type"] == "flat"
