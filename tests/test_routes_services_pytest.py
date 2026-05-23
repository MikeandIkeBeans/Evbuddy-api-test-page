import pytest
from unittest.mock import MagicMock

class _FakeResponse:
    def __init__(self, *, status_code=200, payload=None):
        self.status_code = status_code
        self.ok = status_code == 200
        self._payload = payload if payload is not None else {}
        self.text = ""

    def json(self):
        return self._payload

def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json == {"status": "ok"}

def test_platform_health(client):
    response = client.get('/api/platform/health')
    assert response.status_code == 200
    assert response.json["ok"] is True
    assert response.json["data"] == {"status": "ok"}

def test_get_services_status(client, monkeypatch):
    def fake_get(url, timeout=2):
        return _FakeResponse(status_code=200, payload={"status": "UP"})
    monkeypatch.setattr("routes.services.http_requests.get", fake_get)

    response = client.get('/api/services')
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["ok"] is True
    assert "services" in json_data
    assert "summary" in json_data
    assert json_data["summary"]["total"] > 0

def test_get_single_service_status_success(client, monkeypatch):
    def fake_get(url, timeout=5):
        return _FakeResponse(status_code=200, payload={"status": "UP"})
    monkeypatch.setattr("routes.services.http_requests.get", fake_get)

    response = client.get('/api/services/users')
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["available"] is True
    assert json_data["service"] == "users"

def test_get_single_service_status_not_found(client):
    response = client.get('/api/services/nonexistent_service')
    assert response.status_code == 404
    json_data = response.get_json()
    assert "error" in json_data

def test_platform_single_service_status_success(client, monkeypatch):
    def fake_get(url, timeout=5):
        return _FakeResponse(status_code=200, payload={"status": "UP"})
    monkeypatch.setattr("routes.services.http_requests.get", fake_get)

    response = client.get('/api/platform/services/users')
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["ok"] is True
    assert json_data["data"]["available"] is True
    assert json_data["data"]["service"] == "users"

def test_platform_single_service_status_not_found(client):
    response = client.get('/api/platform/services/nonexistent_service')
    assert response.status_code == 404
    json_data = response.get_json()
    assert json_data["ok"] is False
    assert json_data["error"]["code"] == "SERVICE_NOT_FOUND"