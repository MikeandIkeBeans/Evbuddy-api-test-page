import pytest
from flask import jsonify

def test_get_all_vehicles_success(client, monkeypatch):
    calls = []

    def mock_proxy_json_request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return jsonify([{"id": 1, "make": "Tesla", "model": "Model 3"}]), 200

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.get("/api/vehicles")
    assert response.status_code == 200
    assert response.json == [{"id": 1, "make": "Tesla", "model": "Model 3"}]
    assert len(calls) == 1
    assert calls[0][0] == "GET"
    assert "user-vehicle" in calls[0][1]


def test_get_all_vehicles_error(client, monkeypatch):
    def mock_proxy_json_request(method, url, **kwargs):
        return jsonify({"error": "Failed to fetch vehicles"}), 503

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.get("/api/vehicles")
    assert response.status_code == 503
    assert response.json == {"error": "Failed to fetch vehicles"}


def test_get_vehicle_by_id_success(client, monkeypatch):
    calls = []

    def mock_proxy_json_request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return jsonify({"id": 42, "make": "Nissan", "model": "Leaf"}), 200

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.get("/api/vehicles/42")
    assert response.status_code == 200
    assert response.json == {"id": 42, "make": "Nissan", "model": "Leaf"}
    assert len(calls) == 1
    assert calls[0][0] == "GET"
    assert "/42" in calls[0][1]
    assert kwargs_has_not_found(calls[0][2], "Vehicle not found")


def test_get_vehicle_by_id_not_found(client, monkeypatch):
    def mock_proxy_json_request(method, url, **kwargs):
        return jsonify({"error": "Vehicle not found"}), 404

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.get("/api/vehicles/999")
    assert response.status_code == 404
    assert response.json == {"error": "Vehicle not found"}


def test_get_user_vehicles_success(client, monkeypatch):
    calls = []

    def mock_proxy_json_request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return jsonify([{"id": 1, "userId": 100, "make": "Tesla"}]), 200

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.get("/api/users/100/vehicles")
    assert response.status_code == 200
    assert response.json == [{"id": 1, "userId": 100, "make": "Tesla"}]
    assert len(calls) == 1
    assert calls[0][0] == "GET"
    assert "user_id=100" in calls[0][1]


def test_create_vehicle_success(client, monkeypatch):
    calls = []
    payload = {"make": "Tesla", "model": "Model S", "userId": 100}

    def mock_proxy_json_request(method, url, body=None, **kwargs):
        calls.append((method, url, body, kwargs))
        return jsonify({"id": 5, **payload}), 201

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.post("/api/vehicles", json=payload)
    assert response.status_code == 201
    assert response.json == {"id": 5, "make": "Tesla", "model": "Model S", "userId": 100}
    assert len(calls) == 1
    assert calls[0][0] == "POST"
    assert calls[0][2] == payload


def test_create_vehicle_missing_body(client, monkeypatch):
    response = client.post("/api/vehicles", json={})
    assert response.status_code == 400
    assert "error" in response.json


def test_update_vehicle_success(client, monkeypatch):
    calls = []
    payload = {"make": "Tesla", "model": "Model X", "userId": 100}

    def mock_proxy_json_request(method, url, body=None, **kwargs):
        calls.append((method, url, body, kwargs))
        return jsonify({"id": 5, **payload}), 200

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.put("/api/vehicles/5", json=payload)
    assert response.status_code == 200
    assert response.json == {"id": 5, "make": "Tesla", "model": "Model X", "userId": 100}
    assert len(calls) == 1
    assert calls[0][0] == "PUT"
    assert calls[0][2] == payload
    assert "/5" in calls[0][1]


def test_update_vehicle_not_supported_by_backend(client, monkeypatch):
    payload = {"make": "Tesla", "model": "Model X", "userId": 100}

    def mock_proxy_json_request(method, url, body=None, **kwargs):
        return jsonify({"error": "Method not allowed"}), 405

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.put("/api/vehicles/5", json=payload)
    assert response.status_code == 405
    assert response.json == {"error": "PUT not supported by backend, use PATCH instead"}


def test_update_vehicle_missing_body(client, monkeypatch):
    response = client.put("/api/vehicles/5", json={})
    assert response.status_code == 400
    assert "error" in response.json


def test_patch_vehicle_success(client, monkeypatch):
    calls = []
    payload = {"model": "Model Y"}

    def mock_proxy_json_request(method, url, body=None, **kwargs):
        calls.append((method, url, body, kwargs))
        return jsonify({"id": 5, "make": "Tesla", "model": "Model Y"}), 200

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.patch("/api/vehicles/5", json=payload)
    assert response.status_code == 200
    assert response.json == {"id": 5, "make": "Tesla", "model": "Model Y"}
    assert len(calls) == 1
    assert calls[0][0] == "PATCH"
    assert calls[0][2] == payload
    assert "/5" in calls[0][1]


def test_patch_vehicle_missing_body(client, monkeypatch):
    response = client.patch("/api/vehicles/5", json={})
    assert response.status_code == 400
    assert "error" in response.json


def test_delete_vehicle_success(client, monkeypatch):
    calls = []

    def mock_proxy_json_request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return jsonify({"ok": True, "message": "Vehicle deleted"}), 200

    monkeypatch.setattr("routes.vehicles.proxy_json_request", mock_proxy_json_request)

    response = client.delete("/api/vehicles/5")
    assert response.status_code == 200
    assert response.json == {"ok": True, "message": "Vehicle deleted"}
    assert len(calls) == 1
    assert calls[0][0] == "DELETE"
    assert "/5" in calls[0][1]


def kwargs_has_not_found(kwargs, expected_not_found):
    return kwargs.get("not_found") == expected_not_found