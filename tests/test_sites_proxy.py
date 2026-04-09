import unittest
from unittest.mock import patch

import requests as http_requests

from app import create_app


class _FakeResponse:
    def __init__(self, *, ok=True, status_code=200, payload=None, raises_json=False):
        self.ok = ok
        self.status_code = status_code
        self._payload = payload
        self._raises_json = raises_json

    def json(self):
        if self._raises_json:
            raise ValueError("invalid json")
        return self._payload


class SitesProxyTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    @patch("routes.sites.http_requests.get")
    def test_get_site_returns_matching_site(self, mock_get):
        mock_get.return_value = _FakeResponse(
            ok=True,
            status_code=200,
            payload=[{"id": 10, "name": "A"}, {"id": 11, "name": "B"}],
        )

        resp = self.client.get("/api/sites/11")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json().get("id"), 11)

    @patch("routes.sites.http_requests.get")
    def test_get_site_not_found(self, mock_get):
        mock_get.return_value = _FakeResponse(
            ok=True,
            status_code=200,
            payload=[{"id": 10, "name": "A"}],
        )

        resp = self.client.get("/api/sites/99")
        self.assertEqual(resp.status_code, 404)

    @patch("routes.sites.http_requests.get")
    def test_get_site_invalid_json(self, mock_get):
        mock_get.return_value = _FakeResponse(ok=True, status_code=200, raises_json=True)

        resp = self.client.get("/api/sites/10")
        self.assertEqual(resp.status_code, 502)

    @patch("routes.sites.http_requests.get")
    def test_get_site_upstream_connection_error(self, mock_get):
        mock_get.side_effect = http_requests.RequestException("timeout")

        resp = self.client.get("/api/sites/10")
        self.assertEqual(resp.status_code, 503)


if __name__ == "__main__":
    unittest.main()
