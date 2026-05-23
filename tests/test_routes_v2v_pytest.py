import pytest
from flask import jsonify

class MockResponse:
    def __init__(self, json_data, status_code=200, text=""):
        self._json_data = json_data
        self.status_code = status_code
        self.text = text

    @property
    def ok(self):
        return 200 <= self.status_code < 300

    def json(self):
        return self._json_data


def test_v2v_status_success(client, monkeypatch):
    calls = []

    def mock_ev_http(method, url, **kwargs):
        calls.append((method, url, kwargs))
        if "charge-points" in url:
            return MockResponse({"data": [{"charge_point_id": "EVB-V2V-001-JP", "status": "Available"}]})
        elif "connectors" in url:
            return MockResponse([{"connector_id": 1, "status": "Available"}])
        return MockResponse({})

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.get("/v1/v2v/status")
    assert response.status_code == 200
    data = response.json
    assert data["success"] is True
    assert data["charger"] == {"charge_point_id": "EVB-V2V-001-JP", "status": "Available"}
    assert data["connectors"] == [{"connector_id": 1, "status": "Available"}]
    assert len(calls) == 2


def test_v2v_status_failure_not_ok(client, monkeypatch):
    def mock_ev_http(method, url, **kwargs):
        return MockResponse({}, status_code=500, text="Internal Server Error")

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.get("/v1/v2v/status")
    assert response.status_code == 200  # The endpoint itself catches errors internally, but returns success=True/False
    # Wait, let's check routes/v2v.py status code on error.
    # In routes/v2v.py, if cp_resp.ok is False, charge_points = {}
    # and conn_resp.ok is False, conn_data = []
    # charger = None (since cp_list is empty), connectors = [] (since conn_data is empty)
    # And then it returns: return jsonify({"success": True, "charger": charger, "connectors": connectors})
    # Wait, does it?
    # Yes! Let's check lines 21-30 in routes/v2v.py:
    # try:
    #     cp_resp = ev_http("GET", ...)
    #     charge_points = cp_resp.json() if cp_resp.ok else {}
    #     ...
    #     return jsonify({"success": True, "charger": charger, "connectors": connectors})
    # So if OCPP fails, it still returns success: True with empty charger/connectors!
    # Let's verify that behavior in our assertion.
    data = response.json
    assert data["success"] is True
    assert data["charger"] is None
    assert data["connectors"] == []


def test_v2v_status_exception(client, monkeypatch):
    def mock_ev_http(method, url, **kwargs):
        raise Exception("Connection timeout")

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.get("/v1/v2v/status")
    assert response.status_code == 502
    data = response.json
    assert data["success"] is False
    assert data["error"] == "Connection timeout"


def test_v2v_reset_success(client, monkeypatch):
    calls = []

    def mock_ev_http(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return MockResponse({"status": "Accepted"})

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.post("/v1/v2v/reset", json={"type": "Hard"})
    assert response.status_code == 200
    assert response.json == {"status": "Accepted"}
    assert len(calls) == 1
    assert calls[0][0] == "POST"
    assert calls[0][2].get("body") == {"charge_point_id": "EVB-V2V-001-JP", "type": "Hard"}


def test_v2v_reset_failure(client, monkeypatch):
    def mock_ev_http(method, url, **kwargs):
        return MockResponse({}, status_code=500, text="Reset failed")

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.post("/v1/v2v/reset", json={})
    assert response.status_code == 502
    assert response.json == {"success": False, "error": "Reset failed"}


def test_v2v_reset_exception(client, monkeypatch):
    def mock_ev_http(method, url, **kwargs):
        raise Exception("Failed to send reset")

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.post("/v1/v2v/reset", json={})
    assert response.status_code == 502
    assert response.json == {"success": False, "error": "Failed to send reset"}


def test_v2v_sessions_success(client, monkeypatch):
    # Mocking 20 sessions for different charge point ids
    mock_sessions_data = []
    # 18 sessions for our charge point
    for i in range(18):
        mock_sessions_data.append({"charge_point_id": "EVB-V2V-001-JP", "session_id": f"session-{i}"})
    # 2 sessions for a different charge point
    for i in range(2):
        mock_sessions_data.append({"charge_point_id": "EVB-OTHER-002", "session_id": f"other-{i}"})

    def mock_ev_http(method, url, **kwargs):
        return MockResponse({"sessions": mock_sessions_data})

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.get("/v1/v2v/sessions")
    assert response.status_code == 200
    data = response.json
    assert data["success"] is True
    # Verify we get exactly 15 sessions (due to the limit of 15 slice)
    assert len(data["sessions"]) == 15
    for s in data["sessions"]:
        assert s["charge_point_id"] == "EVB-V2V-001-JP"


def test_v2v_sessions_failure(client, monkeypatch):
    def mock_ev_http(method, url, **kwargs):
        return MockResponse({}, status_code=500)

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.get("/v1/v2v/sessions")
    assert response.status_code == 502
    assert response.json == {"success": False, "error": "OCPP returned 500"}


def test_v2v_sessions_exception(client, monkeypatch):
    def mock_ev_http(method, url, **kwargs):
        raise Exception("Database error")

    monkeypatch.setattr("routes.v2v.ev_http", mock_ev_http)

    response = client.get("/v1/v2v/sessions")
    assert response.status_code == 502
    assert response.json == {"success": False, "error": "Database error"}


def test_v2v_start_success(client, monkeypatch):
    calls = []

    def mock_ev_ocpp_remote_start(charge_point_id, connector_id, id_tag):
        calls.append((charge_point_id, connector_id, id_tag))
        return {"success": True, "status": "Accepted"}

    monkeypatch.setattr("routes.v2v.ev_ocpp_remote_start", mock_ev_ocpp_remote_start)

    response = client.post("/v1/v2v/start", json={"connector_id": 2, "id_tag": "RFID999"})
    assert response.status_code == 200
    assert response.json == {"success": True, "status": "Accepted"}
    assert len(calls) == 1
    assert calls[0] == ("EVB-V2V-001-JP", 2, "RFID999")


def test_v2v_start_failure(client, monkeypatch):
    def mock_ev_ocpp_remote_start(charge_point_id, connector_id, id_tag):
        return {"success": False, "status": "Rejected", "error": "Connector not available"}

    monkeypatch.setattr("routes.v2v.ev_ocpp_remote_start", mock_ev_ocpp_remote_start)

    response = client.post("/v1/v2v/start", json={})
    assert response.status_code == 502
    assert response.json == {"success": False, "status": "Rejected", "error": "Connector not available"}


def test_v2v_stop_missing_transaction_id(client):
    response = client.post("/v1/v2v/stop", json={"connector_id": 1})
    assert response.status_code == 400
    assert response.json == {"success": False, "error": "transaction_id required"}


def test_v2v_stop_success(client, monkeypatch):
    calls = []

    def mock_ev_ocpp_remote_stop(charge_point_id, connector_id, transaction_id, id_tag):
        calls.append((charge_point_id, connector_id, transaction_id, id_tag))
        return {"success": True, "status": "Accepted"}

    monkeypatch.setattr("routes.v2v.ev_ocpp_remote_stop", mock_ev_ocpp_remote_stop)

    response = client.post("/v1/v2v/stop", json={"transaction_id": 12345, "connector_id": 1, "id_tag": "RFID001"})
    assert response.status_code == 200
    assert response.json == {"success": True, "status": "Accepted"}
    assert len(calls) == 1
    assert calls[0] == ("EVB-V2V-001-JP", 1, 12345, "RFID001")


def test_v2v_stop_failure(client, monkeypatch):
    def mock_ev_ocpp_remote_stop(charge_point_id, connector_id, transaction_id, id_tag):
        return {"success": False, "status": "Rejected", "error": "Transaction not found"}

    monkeypatch.setattr("routes.v2v.ev_ocpp_remote_stop", mock_ev_ocpp_remote_stop)

    response = client.post("/v1/v2v/stop", json={"transaction_id": 12345})
    assert response.status_code == 502
    assert response.json == {"success": False, "status": "Rejected", "error": "Transaction not found"}