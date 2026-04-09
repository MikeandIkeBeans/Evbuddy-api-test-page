import unittest

from app import create_app


class PlatformMiddlewareTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True

        def raise_error():
            raise RuntimeError("boom")

        self.app.add_url_rule("/test-error", "test_error", raise_error)
        self.client = self.app.test_client()

    def test_request_id_is_attached_when_missing(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Request-ID", response.headers)
        self.assertTrue(response.headers["X-Request-ID"])

    def test_request_id_preserves_incoming_header(self):
        response = self.client.get("/health", headers={"X-Request-ID": "req-123"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Request-ID"), "req-123")

    def test_unhandled_exception_returns_standard_error(self):
        response = self.client.get("/test-error")
        self.assertEqual(response.status_code, 500)
        payload = response.get_json()
        self.assertIsInstance(payload, dict)
        self.assertFalse(payload.get("ok", True))
        self.assertEqual(payload.get("error", {}).get("code"), "INTERNAL_ERROR")
        self.assertIn("X-Request-ID", response.headers)

    def test_missing_route_keeps_not_found_status(self):
        response = self.client.get("/definitely-not-a-route")
        self.assertEqual(response.status_code, 404)
        payload = response.get_json()
        self.assertIsInstance(payload, dict)
        self.assertFalse(payload.get("ok", True))
        self.assertEqual(payload.get("error", {}).get("code"), "NOT_FOUND")


if __name__ == "__main__":
    unittest.main()
