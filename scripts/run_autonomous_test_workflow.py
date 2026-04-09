from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLIENT_DIR = ROOT / "client"
REPORT_DIR = ROOT / "data" / "test_runs"
NPM_CMD = "npm.cmd" if os.name == "nt" else "npm"


def run_command(label: str, command: list[str], cwd: Path, env_updates: dict[str, str] | None = None) -> dict:
    env = os.environ.copy()
    if env_updates:
        env.update(env_updates)

    started = time.perf_counter()
    process = subprocess.run(command, cwd=str(cwd), env=env)
    elapsed = round(time.perf_counter() - started, 3)

    return {
        "label": label,
        "command": command,
        "cwd": str(cwd),
        "returncode": process.returncode,
        "elapsedSec": elapsed,
        "ok": process.returncode == 0,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run autonomous backend+frontend validation and stress workflows")
    parser.add_argument("--include-stress", action="store_true", help="Run pytest stress-marked tests")
    parser.add_argument("--skip-backend", action="store_true", help="Skip backend pytest suites")
    parser.add_argument("--skip-frontend", action="store_true", help="Skip frontend vitest/build suites")
    parser.add_argument("--install-client-deps", action="store_true", help="Run npm install before frontend tests")
    parser.add_argument("--iterations", type=int, default=1, help="Repeat workflow N times")
    parser.add_argument(
        "--continue-on-failure",
        action="store_true",
        help="Continue remaining iterations even if a step fails",
    )
    args = parser.parse_args()

    if args.iterations < 1:
        raise SystemExit("--iterations must be >= 1")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"autonomous_workflow_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"

    iteration_results: list[dict] = []
    aborted = False

    for iteration in range(1, args.iterations + 1):
        results: list[dict] = []

        if not args.skip_backend:
            results.append(
                run_command(
                    label="backend-pytest-default",
                    command=[sys.executable, "-m", "pytest", "-m", "not stress", "-ra"],
                    cwd=ROOT,
                )
            )

            if args.include_stress:
                results.append(
                    run_command(
                        label="backend-pytest-stress",
                        command=[sys.executable, "-m", "pytest", "-m", "stress", "-ra"],
                        cwd=ROOT,
                        env_updates={"RUN_STRESS": "1"},
                    )
                )

        if not args.skip_frontend:
            if args.install_client_deps and iteration == 1:
                results.append(run_command("frontend-npm-install", [NPM_CMD, "install"], CLIENT_DIR))

            results.append(run_command("frontend-vitest", [NPM_CMD, "run", "test"], CLIENT_DIR))
            results.append(run_command("frontend-build", [NPM_CMD, "run", "build"], CLIENT_DIR))

        passed = all(item["ok"] for item in results) if results else True
        iteration_results.append({"iteration": iteration, "passed": passed, "results": results})

        if not passed and not args.continue_on_failure:
            aborted = iteration < args.iterations
            break

    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "root": str(ROOT),
        "includeStress": args.include_stress,
        "iterationsRequested": args.iterations,
        "aborted": aborted,
        "iterations": iteration_results,
        "allPassed": all(item["passed"] for item in iteration_results) if iteration_results else True,
    }
    report_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(json.dumps(summary, indent=2))
    print(f"report: {report_path}")

    return 0 if summary["allPassed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
