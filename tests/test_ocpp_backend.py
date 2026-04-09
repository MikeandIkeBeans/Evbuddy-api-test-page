import unittest
from unittest.mock import patch
import tempfile
import os

from app import create_app
import routes.cpms as cpms_module
from routes.cpms import CPMS_ASSET_COMMANDS, CPMS_TX_LEDGER
from config import EV_SESSIONS


class OcppBackendTests(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        cpms_module.CPMS_DB_PATH = os.path.join(self.tmp_dir.name, "cpms_test.db")
        self.app = create_app()
        self.client = self.app.test_client()
        CPMS_TX_LEDGER.clear()
        CPMS_ASSET_COMMANDS.clear()
        EV_SESSIONS.clear()

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_cpms_remote_start_generates_txid_and_code(self):
        resp = self.client.post(
            "/api/assets/atl001/remote-start",
            json={"connector_id": 1, "id_tag": "HOTEL-GUEST"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()

        self.assertIn("txid", data)
        self.assertTrue(str(data["txid"]).startswith("TX-"))
        self.assertIn("command_code", data)
        self.assertEqual(data.get("action"), "RemoteStartTransaction")

    def test_cpms_remote_stop_accepts_txid_and_persists_lookup(self):
        start = self.client.post(
            "/api/assets/atl001/remote-start",
            json={"connector_id": 1, "id_tag": "HOTEL-GUEST"},
        )
        txid = start.get_json()["txid"]

        stop = self.client.post(
            "/api/assets/atl001/remote-stop",
            json={"txid": txid},
        )
        self.assertEqual(stop.status_code, 200)

        lookup = self.client.get(f"/api/transactions/{txid}")
        self.assertEqual(lookup.status_code, 200)
        payload = lookup.get_json()
        self.assertEqual(payload.get("action"), "RemoteStopTransaction")

    def test_cpms_remote_stop_requires_transaction_id_or_txid(self):
        resp = self.client.post("/api/assets/atl001/remote-stop", json={})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("transaction_id or txid required", resp.get_data(as_text=True))

    def test_cpms_asset_command_feed(self):
        self.client.post(
            "/api/assets/atl001/remote-start",
            json={"connector_id": 1, "id_tag": "A"},
        )
        self.client.post(
            "/api/assets/atl001/remote-start",
            json={"connector_id": 2, "id_tag": "B"},
        )
        feed = self.client.get("/api/assets/atl001/commands")
        self.assertEqual(feed.status_code, 200)
        data = feed.get_json()
        self.assertEqual(data.get("count"), 2)

    def test_cpms_asset_command_feed_limit_validation(self):
        resp = self.client.get("/api/assets/atl001/commands?limit=0")
        self.assertEqual(resp.status_code, 400)

    @patch("routes.ev_charging.ev_ocpp_remote_start")
    @patch("routes.ev_charging.ev_ocpp_get_connector_status")
    def test_v1_session_start_captures_transaction_id(self, mock_status, mock_start):
        mock_status.return_value = {"success": True, "connector": {"status": "Available"}}
        mock_start.return_value = {"success": True, "transaction_id": 4242}

        with self.app.app_context():
            self.app.config["TESTING"] = True

            resp = self.client.post(
                "/v1/sessions",
                headers={"Authorization": "Bearer demo-token"},
                json={
                    "chargerId": "atl001",
                    "connectorId": 1,
                    "limit": {"type": "TIME_MIN", "value": 5},
                },
            )

        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertEqual(data.get("transactionId"), 4242)

        session_id = data["sessionId"]
        session_details = self.client.get(f"/v1/sessions/{session_id}")
        self.assertEqual(session_details.status_code, 200)

    @patch("routes.ev_charging.ev_ocpp_remote_start")
    @patch("routes.ev_charging.ev_ocpp_get_connector_status")
    def test_session_correlation_endpoint_returns_cpms_match(self, mock_status, mock_start):
        mock_status.return_value = {"success": True, "connector": {"status": "Available"}}
        mock_start.return_value = {"success": True, "transaction_id": 7777}

        create_resp = self.client.post(
            "/v1/sessions",
            headers={"Authorization": "Bearer demo-token"},
            json={
                "chargerId": "atl001",
                "connectorId": 1,
                "limit": {"type": "TIME_MIN", "value": 5},
            },
        )

        self.assertEqual(create_resp.status_code, 201)
        session_id = create_resp.get_json()["sessionId"]

        self.client.post(
            "/api/assets/atl001/remote-stop",
            json={"txid": "7777"},
        )

        corr_resp = self.client.get(f"/v1/debug/sessions/{session_id}/correlation")
        self.assertEqual(corr_resp.status_code, 200)
        corr_data = corr_resp.get_json()
        self.assertEqual(corr_data["session"]["sessionId"], session_id)
        self.assertEqual(corr_data["session"]["transactionId"], 7777)
        self.assertIsNotNone(corr_data["cpms"]["transactionMatch"])


if __name__ == "__main__":
    unittest.main()
