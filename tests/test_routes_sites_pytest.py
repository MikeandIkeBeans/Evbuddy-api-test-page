import pytest
from flask import jsonify
from unittest.mock import MagicMock
import routes.sites
import requests as http_requests
from config import EVBUDDY_DEV_HOST_SITES_BASE


class FakeResponse:
    def __init__(self, ok, status_code, json_data=None, raises_json=False):
        self.ok = ok
        self.status_code = status_code
        self._json_data = json_data
        self._raises_json = raises_json

    def json(self):
        if self._raises_json:
            raise ValueError("invalid json")
        return self._json_data


def mock_json_response(data, status_code=200):
    return lambda *args, **kwargs: (jsonify(data), status_code)


def test_get_all_sites(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response([{"id": 1, "name": "Site A"}], 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.get("/api/sites")
    assert response.status_code == 200
    assert response.get_json() == [{"id": 1, "name": "Site A"}]
    mock_proxy.assert_called_once_with(
        "GET",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/host-sites",
        error_message="Failed to fetch sites"
    )


def test_get_site_by_id_success(client, monkeypatch):
    mock_get = MagicMock(return_value=FakeResponse(
        ok=True,
        status_code=200,
        json_data=[{"id": 10, "name": "Site A"}, {"id": 11, "name": "Site B"}]
    ))
    monkeypatch.setattr(routes.sites.http_requests, "get", mock_get)

    response = client.get("/api/sites/11")
    assert response.status_code == 200
    assert response.get_json() == {"id": 11, "name": "Site B"}
    mock_get.assert_called_once_with(f"{EVBUDDY_DEV_HOST_SITES_BASE}/host-sites", timeout=10)


def test_get_site_by_id_not_found(client, monkeypatch):
    mock_get = MagicMock(return_value=FakeResponse(
        ok=True,
        status_code=200,
        json_data=[{"id": 10, "name": "Site A"}]
    ))
    monkeypatch.setattr(routes.sites.http_requests, "get", mock_get)

    response = client.get("/api/sites/11")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Site not found"}


def test_get_site_by_id_http_error(client, monkeypatch):
    mock_get = MagicMock(side_effect=http_requests.RequestException("Connection error"))
    monkeypatch.setattr(routes.sites.http_requests, "get", mock_get)

    response = client.get("/api/sites/11")
    assert response.status_code == 503
    assert response.get_json() == {
        "error": "Failed to fetch site",
        "details": "Connection error"
    }


def test_get_site_by_id_not_ok(client, monkeypatch):
    mock_get = MagicMock(return_value=FakeResponse(ok=False, status_code=500))
    monkeypatch.setattr(routes.sites.http_requests, "get", mock_get)

    response = client.get("/api/sites/11")
    assert response.status_code == 500
    assert response.get_json() == {"error": "Failed to fetch site"}


def test_get_site_by_id_invalid_json(client, monkeypatch):
    mock_get = MagicMock(return_value=FakeResponse(ok=True, status_code=200, raises_json=True))
    monkeypatch.setattr(routes.sites.http_requests, "get", mock_get)

    response = client.get("/api/sites/11")
    assert response.status_code == 502
    assert response.get_json() == {"error": "Failed to parse site response"}


def test_get_site_by_id_unexpected_format(client, monkeypatch):
    mock_get = MagicMock(return_value=FakeResponse(ok=True, status_code=200, json_data={"id": 11}))
    monkeypatch.setattr(routes.sites.http_requests, "get", mock_get)

    response = client.get("/api/sites/11")
    assert response.status_code == 502
    assert response.get_json() == {"error": "Unexpected site response format"}


def test_get_business_sites(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response([{"id": 1, "name": "Business Site A"}], 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.get("/api/businesses/5/sites")
    assert response.status_code == 200
    assert response.get_json() == [{"id": 1, "name": "Business Site A"}]
    mock_proxy.assert_called_once_with(
        "GET",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/host-sites?host_id=5",
        error_message="Failed to fetch business sites"
    )


def test_create_site_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 1, "name": "New Site"}, 201))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.post("/api/businesses/5/sites", json={"name": "New Site"})
    assert response.status_code == 201
    assert response.get_json() == {"id": 1, "name": "New Site"}
    mock_proxy.assert_called_once_with(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites",
        body={"name": "New Site", "business_id": 5},
        error_message="Failed to create site"
    )


def test_create_site_missing_body(client):
    response = client.post("/api/businesses/5/sites", json={})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body required"}


def test_update_site_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"id": 1, "name": "Updated Site"}, 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.put("/api/sites/1", json={"name": "Updated Site"})
    assert response.status_code == 200
    assert response.get_json() == {"id": 1, "name": "Updated Site"}
    mock_proxy.assert_called_once_with(
        "PUT",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/1",
        body={"name": "Updated Site"},
        error_message="Failed to update site",
        not_found="Site not found"
    )


def test_update_site_missing_body(client):
    response = client.put("/api/sites/1", json={})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body required"}


def test_delete_site_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True, "message": "Site deleted"}, 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.delete("/api/sites/1")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True, "message": "Site deleted"}
    mock_proxy.assert_called_once_with(
        "DELETE",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/1",
        error_message="Failed to delete site",
        not_found="Site not found",
        empty_message="Site deleted"
    )


def test_get_site_members(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response([{"id": 100, "role": "admin"}], 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.get("/api/sites/1/members")
    assert response.status_code == 200
    assert response.get_json() == [{"id": 100, "role": "admin"}]
    mock_proxy.assert_called_once_with(
        "GET",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/1/members",
        error_message="Failed to fetch site members"
    )


def test_invite_site_member_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True}, 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.post("/api/sites/1/members/invite", json={"email": "member@test.com"})
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}
    mock_proxy.assert_called_once_with(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/1/members/invite",
        body={"email": "member@test.com"},
        error_message="Failed to invite member"
    )


def test_invite_site_member_missing_body(client):
    response = client.post("/api/sites/1/members/invite", json={})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body required"}


def test_add_site_member_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True}, 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.post("/api/sites/1/members/100", json={"role": "editor"})
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}
    mock_proxy.assert_called_once_with(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/1/members/100",
        body={"role": "editor"},
        error_message="Failed to add member"
    )


def test_add_site_member_missing_body(client):
    response = client.post("/api/sites/1/members/100", json={})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body required"}


def test_remove_site_member_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True, "message": "Member removed"}, 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.delete("/api/sites/1/members/100")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True, "message": "Member removed"}
    mock_proxy.assert_called_once_with(
        "DELETE",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/sites/1/members/100",
        error_message="Failed to remove member",
        empty_message="Member removed"
    )


def test_api_data(client):
    response = client.get("/api/data")
    assert response.status_code == 200
    data = response.get_json()
    assert data["meta"] == routes.sites.LANDING_META
    assert data["features"] == routes.sites.LANDING_FEATURES
    assert data["steps"] == routes.sites.LANDING_STEPS
    assert data["stats"] == routes.sites.LANDING_STATS


def test_api_preorder_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True}, 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.post("/api/preorder", json={"quantity": 1})
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}
    mock_proxy.assert_called_once_with(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/preorders",
        body={"quantity": 1},
        error_message="Failed to submit pre-order"
    )


def test_api_preorder_missing_body(client):
    response = client.post("/api/preorder", json={})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body required"}


def test_api_subscribe_success(client, monkeypatch):
    mock_proxy = MagicMock(side_effect=mock_json_response({"ok": True}, 200))
    monkeypatch.setattr(routes.sites, "proxy_json_request", mock_proxy)

    response = client.post("/api/subscribe", json={"email": "subscribe@test.com"})
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}
    mock_proxy.assert_called_once_with(
        "POST",
        f"{EVBUDDY_DEV_HOST_SITES_BASE}/subscribers",
        body={"email": "subscribe@test.com"},
        error_message="Failed to subscribe"
    )


def test_api_subscribe_missing_body(client):
    response = client.post("/api/subscribe", json={})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body required"}