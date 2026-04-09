import argparse
import json
import os
import shutil
import tempfile
import time
from datetime import datetime, timezone

import requests


DEFAULT_HOST = "http://appdev.evbuddy.net"
DEFAULT_TARGETS = [
    ("users_status", 9000, "/user/status"),
    ("host_sites_status", 9004, "/host-sites/status"),
    ("operating_health", 9008, "/actuator/health"),
    ("messaging_health", 9011, "/actuator/health"),
    ("chargers_status", 9017, "/chargers/status"),
    ("ocpp_charge_points", 9029, "/api/charge-points"),
]


def probe_once(host, timeout, max_retries):
    ts = datetime.now(timezone.utc).isoformat()
    checks = []

    for name, port, path in DEFAULT_TARGETS:
        url = f"{host}:{port}{path}"
        result = {
            "name": name,
            "url": url,
            "timestamp": ts,
        }
        last_error = None
        delay = 0.25
        for attempt in range(1, max_retries + 1):
            try:
                resp = requests.get(url, timeout=timeout)
                result["status"] = resp.status_code
                result["ok"] = resp.ok
                result["attempts"] = attempt
                if resp.content:
                    try:
                        body = resp.json()
                        if isinstance(body, list):
                            result["count"] = len(body)
                        elif isinstance(body, dict) and isinstance(body.get("data"), list):
                            result["count"] = len(body["data"])
                    except ValueError:
                        result["preview"] = " ".join(resp.text[:140].split())
                last_error = None
                break
            except Exception as exc:
                last_error = str(exc)
                if attempt < max_retries:
                    time.sleep(delay)
                    delay *= 2

        if last_error is not None:
            result["ok"] = False
            result["error"] = last_error
            result["attempts"] = max_retries
        checks.append(result)

    return {"timestamp": ts, "checks": checks}


def summarize(runs):
    total = 0
    ok = 0
    by_name = {}

    for run in runs:
        for check in run.get("checks", []):
            total += 1
            if check.get("ok"):
                ok += 1
            name = check.get("name")
            by_name.setdefault(name, {"ok": 0, "total": 0})
            by_name[name]["total"] += 1
            if check.get("ok"):
                by_name[name]["ok"] += 1

    return {
        "total_checks": total,
        "ok_checks": ok,
        "ok_ratio": (ok / total) if total else 0,
        "per_target": by_name,
    }


def atomic_write_json(path, payload):
    fd, tmp_path = tempfile.mkstemp(suffix=".json", text=True)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    shutil.move(tmp_path, path)


def load_checkpoint(path):
    if not path or not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = json.load(f)
        return content.get("runs", []) if isinstance(content, dict) else []
    except Exception:
        return []


def main():
    parser = argparse.ArgumentParser(description="Continuously probe appdev endpoints and store run history")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--interval", type=int, default=60, help="Seconds between probe rounds")
    parser.add_argument("--rounds", type=int, default=30, help="Number of rounds to execute")
    parser.add_argument("--timeout", type=int, default=8)
    parser.add_argument("--out", default="appdev_continuous_probe.json")
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--resume", action="store_true", help="Resume from existing output file if present")
    args = parser.parse_args()

    if args.interval < 0:
        raise ValueError("--interval must be >= 0")
    if args.rounds < 1:
        raise ValueError("--rounds must be >= 1")
    if args.timeout <= 0:
        raise ValueError("--timeout must be > 0")
    if args.max_retries < 1:
        raise ValueError("--max-retries must be >= 1")

    all_runs = load_checkpoint(args.out) if args.resume else []
    start_index = len(all_runs)
    target_total = start_index + args.rounds

    print(f"starting rounds={args.rounds} existing_runs={start_index} target_total={target_total}")

    for i in range(args.rounds):
        all_runs.append(probe_once(args.host, args.timeout, args.max_retries))

        report = {
            "host": args.host,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "interval_seconds": args.interval,
            "rounds": args.rounds,
            "existing_runs": start_index,
            "summary": summarize(all_runs),
            "runs": all_runs,
        }
        atomic_write_json(args.out, report)
        print(f"round {i + 1}/{args.rounds} complete; accumulated_runs={len(all_runs)}")

        if i < args.rounds - 1:
            time.sleep(args.interval)

    print(json.dumps(summarize(all_runs), indent=2))


if __name__ == "__main__":
    main()
