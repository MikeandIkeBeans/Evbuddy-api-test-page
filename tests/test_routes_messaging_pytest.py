import pytest
from flask import jsonify
from unittest.mock import MagicMock
import routes.messaging
from config import EVBUDDY_DEV_MESSAGING_BASE


def mock_json_response(data, status_code=200):
    return lambda *args, **kwargs: (jsonify(data), status_code)


def test_list_threads(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response([{"id": 1, "subject": "Test Thread"}], 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.get("/api/messaging/threads?status=OPEN&priority=HIGH")
    assert response.status_code == 200
    assert response.get_json() == [{"id": 1, "subject": "Test Thread"}]
    mock_proxy.assert_called_once()
    called_url = mock_proxy.call_args[0][1]
    assert "status=OPEN" in called_url
    assert "priority=HIGH" in called_url


def test_create_thread_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 1, "subject": "New Thread"}, 201))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.post("/api/messaging/threads", json={"subject": "New Thread"})
    assert response.status_code == 201
    assert response.get_json() == {"id": 1, "subject": "New Thread"}
    mock_proxy.assert_called_once_with(
        "POST", f"{EVBUDDY_DEV_MESSAGING_BASE}/threads", body={"subject": "New Thread"},
        error_message="Failed to create thread"
    )


def test_create_thread_missing_body(client):
    response = client.post("/api/messaging/threads", json={})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body required"}


def test_get_thread_by_id(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 12, "subject": "Thread 12"}, 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.get("/api/messaging/threads/12")
    assert response.status_code == 200
    assert response.get_json() == {"id": 12, "subject": "Thread 12"}
    mock_proxy.assert_called_once_with(
        "GET", f"{EVBUDDY_DEV_MESSAGING_BASE}/threads/12",
        error_message="Failed to fetch thread",
        not_found="Thread not found"
    )


def test_update_thread(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 12, "subject": "Thread Updated"}, 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.patch("/api/messaging/threads/12", json={"subject": "Thread Updated"})
    assert response.status_code == 200
    assert response.get_json() == {"id": 12, "subject": "Thread Updated"}
    mock_proxy.assert_called_once_with(
        "PATCH", f"{EVBUDDY_DEV_MESSAGING_BASE}/threads/12", body={"subject": "Thread Updated"},
        error_message="Failed to update thread",
        not_found="Thread not found"
    )


def test_delete_thread(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True, "message": "Thread deleted"}, 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.delete("/api/messaging/threads/12")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True, "message": "Thread deleted"}
    mock_proxy.assert_called_once_with(
        "DELETE", f"{EVBUDDY_DEV_MESSAGING_BASE}/threads/12",
        error_message="Failed to delete thread",
        not_found="Thread not found",
        empty_message="Thread deleted"
    )


def test_list_messages(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response([{"id": 101, "body": "Hello"}], 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.get("/api/messaging/threads/12/messages?messageType=SMS")
    assert response.status_code == 200
    assert response.get_json() == [{"id": 101, "body": "Hello"}]
    mock_proxy.assert_called_once()
    called_url = mock_proxy.call_args[0][1]
    assert "messageType=SMS" in called_url


def test_post_message_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 102, "body": "New Message"}, 201))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.post("/api/messaging/threads/12/messages", json={"body": "New Message"})
    assert response.status_code == 201
    assert response.get_json() == {"id": 102, "body": "New Message"}
    mock_proxy.assert_called_once_with(
        "POST", f"{EVBUDDY_DEV_MESSAGING_BASE}/threads/12/messages", body={"body": "New Message"},
        error_message="Failed to create message"
    )


def test_list_participants(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response([{"accountId": 5}], 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.get("/api/messaging/threads/12/participants")
    assert response.status_code == 200
    assert response.get_json() == [{"accountId": 5}]
    mock_proxy.assert_called_once_with(
        "GET", f"{EVBUDDY_DEV_MESSAGING_BASE}/threads/12/participants",
        error_message="Failed to fetch participants"
    )


def test_add_participant(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True}, 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.post("/api/messaging/threads/12/participants", json={"accountId": 5})
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}
    mock_proxy.assert_called_once_with(
        "POST", f"{EVBUDDY_DEV_MESSAGING_BASE}/threads/12/participants", body={"accountId": 5},
        error_message="Failed to add participant"
    )


def test_list_templates(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response([{"key": "welcome"}], 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.get("/api/messaging/templates?category=ONBOARDING")
    assert response.status_code == 200
    assert response.get_json() == [{"key": "welcome"}]
    mock_proxy.assert_called_once()
    called_url = mock_proxy.call_args[0][1]
    assert "category=ONBOARDING" in called_url


def test_get_template_by_key(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"key": "welcome"}, 200))
    monkeypatch.setattr(routes.messaging, "proxy_json_request", mock_proxy)

    response = client.get("/api/messaging/templates/key/welcome")
    assert response.status_code == 200
    assert response.get_json() == {"key": "welcome"}
    mock_proxy.assert_called_once_with(
        "GET", f"{EVBUDDY_DEV_MESSAGING_BASE}/templates/key/welcome",
        error_message="Failed to fetch template",
        not_found="Template not found"
    )