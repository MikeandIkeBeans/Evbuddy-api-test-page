from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest


def _write_stress_report(report_name: str, payload: dict) -> Path:
    report_dir = Path("data") / "test_runs"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / report_name
    report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return report_path


@pytest.mark.backend
@pytest.mark.stress
def test_cpms_remote_start_flood_fills_backend(app, client, stress_enabled):
    if not stress_enabled:
        pytest.skip("Stress tests are disabled. Set RUN_STRESS=1 to execute.")

    requests_total = 600
    workers = 24

    def issue_start(index: int) -> int:
        with app.test_client() as local_client:
            response = local_client.post(
                "/api/assets/atl001/remote-start",
                json={"connector_id": (index % 2) + 1, "id_tag": f"STRESS-{index:05d}"},
            )
            return response.status_code

    started_at = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as executor:
        statuses = list(executor.map(issue_start, range(requests_total)))
    elapsed_sec = round(time.perf_counter() - started_at, 3)

    success_count = sum(1 for status in statuses if status == 200)
    failure_count = requests_total - success_count

    commands_response = client.get(f"/api/assets/atl001/commands?limit={requests_total}")
    assert commands_response.status_code == 200
    commands_payload = commands_response.get_json()

    report = {
        "test": "cpms_remote_start_flood",
        "requests_total": requests_total,
        "workers": workers,
        "success_count": success_count,
        "failure_count": failure_count,
        "elapsed_sec": elapsed_sec,
        "commands_count": commands_payload.get("count"),
    }
    report_path = _write_stress_report("pytest_stress_cpms_flood.json", report)

    assert failure_count == 0, f"Stress flood had failures: {report_path}"
    expected_visible_commands = min(requests_total, 500)
    assert commands_payload.get("count", 0) == expected_visible_commands


@pytest.mark.backend
@pytest.mark.stress
def test_cpms_start_stop_cycles_under_load(client, stress_enabled):
    if not stress_enabled:
        pytest.skip("Stress tests are disabled. Set RUN_STRESS=1 to execute.")

    cycles = 180
    failures = []
    started_at = time.perf_counter()

    for idx in range(cycles):
        start_response = client.post(
            "/api/assets/atl001/remote-start",
            json={"connector_id": (idx % 2) + 1, "id_tag": f"CYCLE-{idx:04d}"},
        )
        if start_response.status_code != 200:
            failures.append({"phase": "start", "index": idx, "status": start_response.status_code})
            continue

        start_payload = start_response.get_json()
        txid = start_payload.get("txid")
        stop_response = client.post("/api/assets/atl001/remote-stop", json={"txid": txid})
        if stop_response.status_code != 200:
            failures.append({"phase": "stop", "index": idx, "status": stop_response.status_code})

    elapsed_sec = round(time.perf_counter() - started_at, 3)
    report = {
        "test": "cpms_start_stop_cycles",
        "cycles": cycles,
        "failures": failures,
        "elapsed_sec": elapsed_sec,
    }
    report_path = _write_stress_report("pytest_stress_cpms_cycles.json", report)

    assert not failures, f"Start/stop cycles had failures: {report_path}"
