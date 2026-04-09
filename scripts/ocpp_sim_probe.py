import argparse
import json
import time
import uuid

from websocket import create_connection


def ocpp_call(unique_id, action, payload):
    return [2, unique_id, action, payload]


def run_probe(base_ws_url, cpid, timeout):
    candidates = []
    clean = base_ws_url.rstrip("/")
    candidates.append(f"{clean}/{cpid}")
    candidates.append(clean)

    results = []

    for url in candidates:
        item = {"url": url}
        ws = None
        try:
            ws = create_connection(url, subprotocols=["ocpp1.6"], timeout=timeout)
            item["connected"] = True

            boot_id = str(uuid.uuid4())
            boot = ocpp_call(
                boot_id,
                "BootNotification",
                {
                    "chargePointVendor": "EVBuddy-Sim-Probe",
                    "chargePointModel": "ProbeClient",
                    "chargePointSerialNumber": cpid,
                    "firmwareVersion": "0.1-test",
                },
            )
            ws.send(json.dumps(boot))
            boot_reply = ws.recv()
            item["boot_reply"] = json.loads(boot_reply)

            hb_id = str(uuid.uuid4())
            heartbeat = ocpp_call(hb_id, "Heartbeat", {})
            ws.send(json.dumps(heartbeat))
            hb_reply = ws.recv()
            item["heartbeat_reply"] = json.loads(hb_reply)

            st_id = str(uuid.uuid4())
            status = ocpp_call(
                st_id,
                "StatusNotification",
                {
                    "connectorId": 1,
                    "errorCode": "NoError",
                    "status": "Available",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
            )
            ws.send(json.dumps(status))
            st_reply = ws.recv()
            item["status_reply"] = json.loads(st_reply)
            item["ok"] = True
        except Exception as exc:
            item["connected"] = False
            item["ok"] = False
            item["error"] = str(exc)
        finally:
            if ws is not None:
                try:
                    ws.close()
                except Exception:
                    pass

        results.append(item)

    return {
        "cpid": cpid,
        "base_ws_url": base_ws_url,
        "results": results,
    }


def main():
    parser = argparse.ArgumentParser(description="Probe OCPP 1.6 simulator over WebSocket")
    parser.add_argument("--ws-url", default="ws://20.119.73.31:9022/ocpp/")
    parser.add_argument("--cpid", default="MF001")
    parser.add_argument("--timeout", type=int, default=12)
    args = parser.parse_args()

    report = run_probe(args.ws_url, args.cpid, args.timeout)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
