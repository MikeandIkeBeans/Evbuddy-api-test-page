import pytest
from flask import jsonify
from unittest.mock import MagicMock
import routes.users
from helpers import service_status_url, ms_url
from src.application.use_cases import ValidationError


class MockResponse:
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self._json_data = json_data

    def json(self):
        return self._json_data


def mock_json_response(data, status_code=200):
    return lambda *args, **kwargs: (jsonify(data), status_code)


def test_users_service_status(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"status": "UP"}, 200))
    monkeypatch.setattr(routes.users, "proxy_json_request", mock_proxy)

    response = client.get("/api/users/status")
    assert response.status_code == 200
    assert response.get_json() == {"status": "UP"}
    mock_proxy.assert_called_once_with(
        "GET",
        service_status_url("users"),
        timeout=5,
        error_message="Users service unavailable"
    )


def test_get_all_users_default(client, monkeypatch):
    mock_list = MagicMock(side_effect=mock_json_response([{"id": 1, "email": "test@test.com"}], 200))
    monkeypatch.setattr(routes.users.USERS_CLIENT, "list_users", mock_list)

    response = client.get("/api/users")
    assert response.status_code == 200
    assert response.get_json() == [{"id": 1, "email": "test@test.com"}]
    mock_list.assert_called_once_with(limit=100, offset=0)


def test_get_all_users_custom_pagination(client, monkeypatch):
    mock_list = MagicMock(side_effect=mock_json_response([{"id": 1, "email": "test@test.com"}], 200))
    monkeypatch.setattr(routes.users.USERS_CLIENT, "list_users", mock_list)

    response = client.get("/api/users?page=3&limit=25")
    assert response.status_code == 200
    mock_list.assert_called_once_with(limit=25, offset=50)


def test_get_user_by_id(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 42, "email": "user@test.com"}, 200))
    monkeypatch.setattr(routes.users, "proxy_json_request", mock_proxy)

    response = client.get("/api/users/42")
    assert response.status_code == 200
    assert response.get_json() == {"id": 42, "email": "user@test.com"}
    mock_proxy.assert_called_once_with(
        "GET",
        ms_url("users", "/42"),
        error_message="Failed to fetch user",
        not_found="User not found"
    )


def test_create_user_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 1, "email": "new@test.com"}, 201))
    monkeypatch.setattr(routes.users, "proxy_json_request", mock_proxy)

    response = client.post("/api/users", json={"email": "new@test.com"})
    assert response.status_code == 201
    assert response.get_json() == {"id": 1, "email": "new@test.com"}
    mock_proxy.assert_called_once_with(
        "POST",
        ms_url("users"),
        body={"email": "new@test.com"},
        error_message="Failed to create user"
    )


def test_create_user_missing_email(client):
    response = client.post("/api/users", json={})
    assert response.status_code == 400
    assert response.get_json()["error"]["message"] == "missing required fields"


def test_delete_user_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True, "message": "User deleted"}, 200))
    monkeypatch.setattr(routes.users, "proxy_json_request", mock_proxy)

    response = client.delete("/api/users/42")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True, "message": "User deleted"}
    mock_proxy.assert_called_once_with(
        "DELETE",
        ms_url("users", "/42"),
        error_message="Failed to delete user",
        not_found="User not found",
        empty_message="User deleted"
    )


def test_update_user_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 42, "email": "updated@test.com"}, 200))
    monkeypatch.setattr(routes.users, "proxy_json_request", mock_proxy)

    response = client.put("/api/users/42", json={"email": "updated@test.com"})
    assert response.status_code == 200
    assert response.get_json() == {"id": 42, "email": "updated@test.com"}
    mock_proxy.assert_called_once_with(
        "PUT",
        ms_url("users", "/42"),
        body={"email": "updated@test.com"},
        error_message="Failed to update user",
        not_found="User not found"
    )


def test_update_user_missing_email(client):
    response = client.put("/api/users/42", json={})
    assert response.status_code == 400


def test_patch_user_success(client, monkeypatch):
    mock_get = MagicMock(return_value=MockResponse(200, {"id": 42, "email": "old@test.com", "name": "Old Name"}))
    mock_update = MagicMock(side_effect=mock_json_response({"id": 42, "email": "old@test.com", "name": "New Name"}, 200))
    monkeypatch.setattr(routes.users.USERS_CLIENT, "get_user_raw", mock_get)
    monkeypatch.setattr(routes.users.USERS_CLIENT, "update_user", mock_update)

    response = client.patch("/api/users/42", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.get_json() == {"id": 42, "email": "old@test.com", "name": "New Name"}
    mock_get.assert_called_once_with(42)
    mock_update.assert_called_once_with(42, {"id": 42, "email": "old@test.com", "name": "New Name"})


def test_patch_user_not_found(client, monkeypatch):
    mock_get = MagicMock(return_value=MockResponse(404, {}))
    monkeypatch.setattr(routes.users.USERS_CLIENT, "get_user_raw", mock_get)

    response = client.patch("/api/users/42", json={"name": "New Name"})
    assert response.status_code == 404
    assert response.get_json() == {"error": "User not found"}


def test_patch_user_fetch_failed(client, monkeypatch):
    mock_get = MagicMock(return_value=MockResponse(500, {}))
    monkeypatch.setattr(routes.users.USERS_CLIENT, "get_user_raw", mock_get)

    response = client.patch("/api/users/42", json={"name": "New Name"})
    assert response.status_code == 500
    assert response.get_json() == {"error": "Failed to fetch user for update"}


def test_patch_user_validation_error(client, monkeypatch):
    mock_get = MagicMock(return_value=MockResponse(200, {"id": 42, "email": "old@test.com"}))
    monkeypatch.setattr(routes.users.USERS_CLIENT, "get_user_raw", mock_get)

    response = client.patch("/api/users/42", json={"email": ""})
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_patch_user_empty_body(client):
    response = client.patch("/api/users/42", json={})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body required"}


def test_patch_user_exception_handling(client, monkeypatch):
    mock_get = MagicMock(side_effect=Exception("Database error"))
    monkeypatch.setattr(routes.users.USERS_CLIENT, "get_user_raw", mock_get)

    response = client.patch("/api/users/42", json={"name": "New Name"})
    assert response.status_code == 503
    assert response.get_json() == {
        "error": "Failed to patch user",
        "details": "Database error"
    }