import argparse
import json
import logging
import signal
import time
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler

import requests

TARGETS = [
    ("users_status", "http://appdev.evbuddy.net:9000/user/status"),
    ("host_sites_status", "http://appdev.evbuddy.net:9004/host-sites/status"),
    ("operating_health", "http://appdev.evbuddy.net:9008/actuator/health"),
    ("messaging_health", "http://appdev.evbuddy.net:9011/actuator/health"),
    ("chargers_status", "http://appdev.evbuddy.net:9017/chargers/status"),
    ("ocpp_charge_points", "http://appdev.evbuddy.net:9029/api/charge-points"),
    ("ocpp_connectors", "http://appdev.evbuddy.net:9029/api/connectors"),
]

_STOP = False


def _on_signal(signum, _frame):
    global _STOP
    _STOP = True
    logging.getLogger("appdev-live-monitor").warning("received signal %s, stopping after current round", signum)


def build_logger(log_path):
    logger = logging.getLogger("appdev-live-monitor")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    logger.addHandler(console)

    file_handler = RotatingFileHandler(log_path, maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


def load_targets(file_path):
    if not file_path:
        return TARGETS

    with open(file_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    loaded = []
    for row in raw:
        name = row.get("name")
        url = row.get("url")
        if not name or not url:
            continue
        loaded.append((name, url))

    return loaded or TARGETS


def request_with_retry(url, timeout, retries=3):
    delay = 0.25
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(url, timeout=timeout)
            return response, attempt
        except Exception as exc:
            last_error = str(exc)
            if attempt < retries:
                time.sleep(delay)
                delay *= 2
    return None, retries if last_error else 1


def run_once(targets, timeout):
    now = datetime.now(timezone.utc).isoformat()
    checks = []
    for name, url in targets:
        item = {"name": name, "url": url}
        response, attempts = request_with_retry(url, timeout)
        item["attempts"] = attempts

        if response is not None:
            item["status"] = response.status_code
            item["ok"] = response.ok
            if response.content:
                try:
                    payload = response.json()
                    if isinstance(payload, list):
                        item["count"] = len(payload)
                    elif isinstance(payload, dict) and isinstance(payload.get("data"), list):
                        item["count"] = len(payload["data"])
                except ValueError:
                    item["preview"] = " ".join(response.text[:140].split())
        else:
            item["ok"] = False
            item["error"] = "request failed after retries"
        checks.append(item)
    return {"timestamp": now, "checks": checks}


def summarize_round(round_result):
    checks = round_result.get("checks", [])
    ok = sum(1 for c in checks if c.get("ok"))
    total = len(checks)
    return ok, total


def collect_transitions(previous_state, checks):
    transitions = []
    for check in checks:
        name = check.get("name")
        state = "up" if check.get("ok") else "down"
        previous = previous_state.get(name)
        if previous is not None and previous != state:
            transitions.append({"name": name, "from": previous, "to": state})
        previous_state[name] = state
    return transitions


def main():
    parser = argparse.ArgumentParser(description="Live appdev monitor with per-round console output")
    parser.add_argument("--rounds", type=int, default=360)
    parser.add_argument("--interval", type=int, default=60)
    parser.add_argument("--timeout", type=int, default=8)
    parser.add_argument("--out", default="appdev_live_monitor.json")
    parser.add_argument("--log", default="appdev_live_monitor.log")
    parser.add_argument("--targets-file", help="Optional JSON file with [{\"name\":...,\"url\":...}] entries")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, _on_signal)
    signal.signal(signal.SIGTERM, _on_signal)

    logger = build_logger(args.log)
    targets = load_targets(args.targets_file)

    history = []
    state = {}
    logger.info("monitor start rounds=%s interval=%ss targets=%s", args.rounds, args.interval, len(targets))

    for idx in range(args.rounds):
        if _STOP:
            logger.warning("stop requested before round %s", idx + 1)
            break

        result = run_once(targets, args.timeout)
        history.append(result)
        ok, total = summarize_round(result)
        transitions = collect_transitions(state, result.get("checks", []))
        logger.info("round %s/%s at %s ok=%s/%s transitions=%s",
                    idx + 1, args.rounds, result["timestamp"], ok, total, len(transitions))
        for transition in transitions:
            logger.warning("transition %s: %s -> %s", transition["name"], transition["from"], transition["to"])

        with open(args.out, "w", encoding="utf-8") as f:
            json.dump({
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "rounds": args.rounds,
                "interval": args.interval,
                "targets": [{"name": name, "url": url} for name, url in targets],
                "history": history,
            }, f, indent=2)

        if idx < args.rounds - 1 and not _STOP:
            time.sleep(args.interval)

    logger.info("monitor complete collected_rounds=%s", len(history))


if __name__ == "__main__":
    main()
