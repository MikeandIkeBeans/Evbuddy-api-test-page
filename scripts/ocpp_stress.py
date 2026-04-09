import argparse
import concurrent.futures
import json
import random
import time

import requests


def one_cycle(base_url, asset_id, connector_id, id_tag):
    session = requests.Session()

    start = session.post(
        f"{base_url}/api/assets/{asset_id}/remote-start",
        json={"connector_id": connector_id, "id_tag": id_tag},
        timeout=10,
    )
    start_payload = {}
    try:
        start_payload = start.json()
    except Exception:
        pass

    txid = start_payload.get("txid")

    stop = None
    stop_payload = {}
    if txid:
        stop = session.post(
            f"{base_url}/api/assets/{asset_id}/remote-stop",
            json={"txid": txid},
            timeout=10,
        )
        try:
            stop_payload = stop.json()
        except Exception:
            pass

    return {
        "start_status": start.status_code,
        "stop_status": stop.status_code if stop is not None else None,
        "txid": txid,
        "start_command_code": start_payload.get("command_code"),
        "stop_command_code": stop_payload.get("command_code"),
        "ok": start.status_code == 200 and (stop is not None and stop.status_code == 200),
    }


def main():
    parser = argparse.ArgumentParser(description="Stress CPMS remote-start/stop endpoints")
    parser.add_argument("--base-url", default="http://127.0.0.1:5000")
    parser.add_argument("--asset-id", default="atl001")
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--cycles", type=int, default=50)
    args = parser.parse_args()

    start_time = time.time()
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = []
        for idx in range(args.cycles):
            futures.append(
                ex.submit(
                    one_cycle,
                    args.base_url,
                    args.asset_id,
                    random.choice([1, 2]),
                    f"LOAD-{idx}",
                )
            )

        for fut in concurrent.futures.as_completed(futures):
            results.append(fut.result())

    elapsed = time.time() - start_time
    ok_count = sum(1 for r in results if r["ok"])
    txids = [r["txid"] for r in results if r.get("txid")]

    summary = {
        "base_url": args.base_url,
        "asset_id": args.asset_id,
        "cycles": args.cycles,
        "workers": args.workers,
        "elapsed_sec": round(elapsed, 3),
        "successful_cycles": ok_count,
        "failed_cycles": args.cycles - ok_count,
        "txid_count": len(txids),
        "unique_txids": len(set(txids)),
        "sample_failures": [r for r in results if not r["ok"]][:5],
    }

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
