import os
import unittest
from unittest.mock import patch

from app import create_app
from src.application.use_cases import ValidationError, build_create_user_payload, build_update_user_payload


class _FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {"status": "ok"}
        self.text = ""

    def json(self):
        return self._payload


class SecurityMiddlewareTests(unittest.TestCase):
    def setUp(self):
        self._env = dict(os.environ)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)

    def test_security_headers_present(self):
        app = create_app()
        client = app.test_client()

        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")

    @patch("routes.services.http_requests.get")
    def test_api_key_protection_when_enabled(self, mock_get):
        mock_get.return_value = _FakeResponse(status_code=200)
        os.environ["API_REQUIRE_KEY"] = "true"
        os.environ["API_KEY"] = "secret"
        app = create_app()
        client = app.test_client()

        blocked = client.get("/api/services")
        self.assertEqual(blocked.status_code, 401)

        allowed = client.get("/api/services", headers={"X-API-Key": "secret"})
        self.assertNotEqual(allowed.status_code, 401)

    @patch("routes.services.http_requests.get")
    def test_rate_limit_enforced(self, mock_get):
        mock_get.return_value = _FakeResponse(status_code=200)
        os.environ["RATE_LIMIT_ENABLED"] = "true"
        os.environ["RATE_LIMIT_REQUESTS"] = "1"
        os.environ["RATE_LIMIT_WINDOW_SECONDS"] = "60"
        app = create_app()
        client = app.test_client()

        first = client.get("/api/services")
        self.assertNotEqual(first.status_code, 429)
        second = client.get("/api/services")
        self.assertEqual(second.status_code, 429)


class UsersUseCaseTests(unittest.TestCase):
    def test_create_payload_requires_email(self):
        with self.assertRaises(ValidationError):
            build_create_user_payload({"name": "No Email"})

    def test_patch_merge_requires_email_after_merge(self):
        merged = build_update_user_payload({"email": "a@b.com", "name": "A"}, {"name": "B"})
        self.assertEqual(merged["name"], "B")
        self.assertEqual(merged["email"], "a@b.com")


if __name__ == "__main__":
    unittest.main()
