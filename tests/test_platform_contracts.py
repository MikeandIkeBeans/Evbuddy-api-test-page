import unittest
from unittest.mock import patch

from app import create_app


class _FakeResponse:
    def __init__(self, *, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        if self._payload is None:
            raise ValueError("invalid json")
        return self._payload


class PlatformContractTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_platform_health_uses_envelope(self):
        resp = self.client.get("/api/platform/health")
        self.assertEqual(resp.status_code, 200)

        payload = resp.get_json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["data"]["status"], "ok")

    def test_platform_service_not_found_uses_stable_error_code(self):
        resp = self.client.get("/api/platform/services/does-not-exist")
        self.assertEqual(resp.status_code, 404)

        payload = resp.get_json()
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["error"]["code"], "SERVICE_NOT_FOUND")
        self.assertIn("availableServices", payload["error"]["details"])

    @patch("routes.services.http_requests.get")
    def test_platform_service_success_uses_envelope(self, mock_get):
        mock_get.return_value = _FakeResponse(status_code=200, payload={"status": "ok"})

        resp = self.client.get("/api/platform/services/users")
        self.assertEqual(resp.status_code, 200)

        payload = resp.get_json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["data"]["service"], "users")
        self.assertTrue(payload["data"]["available"])

    @patch("routes.services.http_requests.get")
    def test_platform_legacy_service_alias_maps_to_canonical_name(self, mock_get):
        mock_get.return_value = _FakeResponse(status_code=200, payload={"status": "ok"})

        resp = self.client.get("/api/platform/services/evbuddy_homepage")
        self.assertEqual(resp.status_code, 200)

        payload = resp.get_json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["data"]["service"], "businesses")


if __name__ == "__main__":
    unittest.main()
