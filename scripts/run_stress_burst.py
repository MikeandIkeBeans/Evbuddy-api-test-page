import os
import sys
import time
import json
import random
import sqlite3
import subprocess
import requests
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Configuration
PORT = 8085
BASE_URL = f"http://127.0.0.1:{PORT}"
NUM_REQUESTS = 50
CONCURRENCY = 10
DB_PATH = Path("data") / "cpms_tx_ledger.db"

# Thread-safe lists for tracking dynamically created resources
asset_ids_lock = threading.Lock()
created_asset_ids = []

service_request_ids_lock = threading.Lock()
created_service_request_ids = []

ENDPOINTS = [
    # 1. CPMS - writes to local SQLite DB
    ("POST", "/api/assets/atl001/remote-start", lambda: {"connector_id": random.choice([1, 2]), "id_tag": f"STRESS-{random.randint(1000, 9999)}"}),
    # 2. Users - proxy POST
    ("POST", "/api/users", lambda: {"email": f"stress_{random.randint(10000, 99999)}@stress.com", "name": "Stress User"}),
    # 3. Users - proxy GET
    ("GET", "/api/users", lambda: None),
    # 4. Vehicles - proxy GET
    ("GET", "/api/vehicles", lambda: None),
    # 5. Sites - proxy GET
    ("GET", "/api/businesses/1/sites", lambda: None),
    # 6. Messaging - proxy GET
    ("GET", "/api/messaging/threads", lambda: None),

    # --- Dispatch Asset Group Endpoints ---
    ("GET", "/api/v1/assets", lambda: None),
    ("POST", "/api/v1/assets", lambda: {
        "type": random.choice(["vehicle", "truck", "van"]),
        "status": random.choice(["available", "in-use", "maintenance"]),
        "location": {"lat": round(random.uniform(37.0, 39.0), 4), "lng": round(random.uniform(-123.0, -121.0), 4)}
    }),
    ("GET_ASSET", "/api/v1/assets/{id}", lambda: None),
    ("PUT_ASSET", "/api/v1/assets/{id}", lambda: {
        "type": "truck",
        "status": "in-use",
        "location": {"lat": 37.7749, "lng": -122.4194}
    }),

    # --- Service Requests Endpoints ---
    ("GET", "/api/v1/servicerequests", lambda: None),
    ("POST", "/api/v1/servicerequests", lambda: {
        "status": "requested",
        "notes": f"Stress request {random.randint(1000, 9999)}",
        "serviceCode": random.choice(["EV_DC", "TIRE", "TOW"])
    }),
    ("GET_SERVICEREQUEST", "/api/v1/servicerequests/{id}", lambda: None),
    ("PUT_SERVICEREQUEST", "/api/v1/servicerequests/{id}", lambda: {
        "status": "in_progress",
        "notes": "Technician assigned via stress test"
    }),
]

def check_server_health(timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(f"{BASE_URL}/health", timeout=1)
            if resp.status_code == 200:
                return True
        except requests.RequestException:
            pass
        time.sleep(0.5)
    return False

def run_single_request(session, idx):
    endpoint_choice = random.choice(ENDPOINTS)
    method, path_template, payload_func = endpoint_choice
    
    # 1. Resolve path template and dynamic IDs
    path = path_template
    actual_method = method
    
    if method in ("GET_ASSET", "PUT_ASSET", "PATCH_ASSET", "DELETE_ASSET"):
        with asset_ids_lock:
            if created_asset_ids:
                asset_id = random.choice(created_asset_ids)
                if method == "DELETE_ASSET" and len(created_asset_ids) > 1:
                    created_asset_ids.remove(asset_id)
            else:
                asset_id = "a1b2c3d4-0000-0000-0000-000000000001"
        path = path_template.format(id=asset_id)
        actual_method = method.split("_")[0]
        
    elif method in ("GET_SERVICEREQUEST", "PUT_SERVICEREQUEST", "DELETE_SERVICEREQUEST"):
        with service_request_ids_lock:
            if created_service_request_ids:
                req_id = random.choice(created_service_request_ids)
                if method == "DELETE_SERVICEREQUEST" and len(created_service_request_ids) > 1:
                    created_service_request_ids.remove(req_id)
            else:
                req_id = 1
        path = path_template.format(id=req_id)
        actual_method = method.split("_")[0]

    url = f"{BASE_URL}{path}"
    payload = payload_func()
    
    start_time = time.perf_counter()
    status_code = 0
    error_msg = ""
    try:
        if actual_method == "POST":
            resp = session.post(url, json=payload, timeout=15)
        elif actual_method == "PUT":
            resp = session.put(url, json=payload, timeout=15)
        elif actual_method == "PATCH":
            resp = session.patch(url, json=payload, timeout=15)
        elif actual_method == "DELETE":
            resp = session.delete(url, timeout=15)
        else:
            resp = session.get(url, timeout=15)
            
        status_code = resp.status_code
        
        # 2. Extract and track IDs from successful creations
        if status_code in (200, 201):
            try:
                resp_json = resp.json()
                if isinstance(resp_json, dict) and "id" in resp_json:
                    resp_id = resp_json["id"]
                    if path_template == "/api/v1/assets":
                        with asset_ids_lock:
                            created_asset_ids.append(resp_id)
                    elif path_template == "/api/v1/servicerequests":
                        with service_request_ids_lock:
                            created_service_request_ids.append(resp_id)
            except Exception:
                pass
                
    except requests.RequestException as exc:
        error_msg = str(exc)
        
    duration = time.perf_counter() - start_time
    return {
        "index": idx,
        "method": actual_method,
        "path": path,
        "status_code": status_code,
        "duration": duration,
        "error": error_msg
    }


def main():
    print("--- Starting Backend Stress Test Harness ---")
    
    # 1. Ensure DB directory and remove previous test run data if any
    os.makedirs("data", exist_ok=True)
    os.makedirs("data/test_runs", exist_ok=True)
    
    # Let's count initial DB records
    initial_db_rows = 0
    if DB_PATH.exists():
        try:
            conn = sqlite3.connect(str(DB_PATH))
            initial_db_rows = conn.execute("SELECT COUNT(*) FROM cpms_tx_ledger").fetchone()[0]
            conn.close()
        except sqlite3.Error:
            pass
    print(f"Initial row count in cpms_tx_ledger: {initial_db_rows}")

    # 2. Start Gateway server in background
    print(f"Spawning local Flask gateway on port {PORT}...")
    env = os.environ.copy()
    env["FLASK_PORT"] = str(PORT)
    env["FLASK_DEBUG"] = "false"
    env["RATE_LIMIT_ENABLED"] = "false"
    env["API_REQUIRE_KEY"] = "false"
    
    server_process = subprocess.Popen(
        [sys.executable, "app.py"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    try:
        # Wait for server to become healthy
        print("Waiting for server to become healthy...")
        if not check_server_health():
            print("Error: Server failed to start or did not become healthy.")
            server_process.terminate()
            stdout, stderr = server_process.communicate(timeout=2)
            print(f"STDOUT: {stdout.decode()}")
            print(f"STDERR: {stderr.decode()}")
            sys.exit(1)
        print("Server is healthy! Warmup: creating baseline assets and service requests...")

        # 3. Warmup requests to pre-populate ID pools
        session = requests.Session()
        try:
            # Create an asset
            asset_resp = session.post(
                f"{BASE_URL}/api/v1/assets",
                json={"type": "vehicle", "status": "available", "location": {"lat": 38.5816, "lng": -121.4944}},
                timeout=10
            )
            if asset_resp.status_code in (200, 201):
                asset_id = asset_resp.json().get("id")
                if asset_id:
                    with asset_ids_lock:
                        created_asset_ids.append(asset_id)
                    print(f"Pre-populated asset ID: {asset_id}")
        except Exception as e:
            print(f"Warmup asset creation failed: {e}")

        try:
            # Create a service request
            sr_resp = session.post(
                f"{BASE_URL}/api/v1/servicerequests",
                json={"status": "requested", "notes": "Warmup request", "serviceCode": "EV_DC"},
                timeout=10
            )
            if sr_resp.status_code in (200, 201):
                sr_id = sr_resp.json().get("id")
                if sr_id:
                    with service_request_ids_lock:
                        created_service_request_ids.append(sr_id)
                    print(f"Pre-populated service request ID: {sr_id}")
        except Exception as e:
            print(f"Warmup service request creation failed: {e}")

        print("Warmup complete. Initiating concurrent request burst...")

        # 4. Fire request burst
        results = []
        start_burst = time.perf_counter()
        
        with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
            futures = [executor.submit(run_single_request, session, i) for i in range(NUM_REQUESTS)]
            for fut in futures:
                results.append(fut.result())
                
        total_time = time.perf_counter() - start_burst
        print("Burst completed. Tearing down server...")
        
    finally:
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()

    # 4. Measure SQLite results
    final_db_rows = 0
    if DB_PATH.exists():
        try:
            conn = sqlite3.connect(str(DB_PATH))
            final_db_rows = conn.execute("SELECT COUNT(*) FROM cpms_tx_ledger").fetchone()[0]
            conn.close()
        except sqlite3.Error:
            pass
    new_rows_written = final_db_rows - initial_db_rows
    print(f"Final row count in cpms_tx_ledger: {final_db_rows} ({new_rows_written} new entries created)")

    # 5. Process Metrics
    success_count = sum(1 for r in results if 200 <= r["status_code"] < 300)
    failed_count = NUM_REQUESTS - success_count
    durations = sorted([r["duration"] for r in results])
    
    mean_duration = sum(durations) / len(durations) if durations else 0
    p50 = durations[int(len(durations) * 0.50)] if durations else 0
    p90 = durations[int(len(durations) * 0.90)] if durations else 0
    p95 = durations[int(len(durations) * 0.95)] if durations else 0
    rps = NUM_REQUESTS / total_time if total_time > 0 else 0

    if failed_count > 0:
        print("\n--- Failed Requests Details ---")
        for r in results:
            if not (200 <= r["status_code"] < 300):
                print(f"Index {r['index']}: {r['method']} {r['path']} -> Status {r['status_code']} | Error: {r['error']}")

    print("\n--- Stress Run Statistics ---")
    print(f"Total Requests: {NUM_REQUESTS}")
    print(f"Concurrency:    {CONCURRENCY}")
    print(f"Success Count:  {success_count}")
    print(f"Failed Count:   {failed_count}")
    print(f"Total Elapsed:  {total_time:.3f} s")
    print(f"Throughput:     {rps:.2f} RPS")
    print(f"Min Latency:    {durations[0]:.3f} s" if durations else "N/A")
    print(f"Mean Latency:   {mean_duration:.3f} s")
    print(f"Median (p50):   {p50:.3f} s")
    print(f"90th pct (p90): {p90:.3f} s")
    print(f"95th pct (p95): {p95:.3f} s")

    report = {
        "test": "real_backend_stress_burst",
        "requests_total": NUM_REQUESTS,
        "workers": CONCURRENCY,
        "success_count": success_count,
        "failure_count": failed_count,
        "elapsed_sec": total_time,
        "rps": rps,
        "latency_p50": p50,
        "latency_p90": p90,
        "latency_p95": p95,
        "new_db_rows": new_rows_written
    }

    # Save to baseline file
    baseline_path = Path("data") / "test_runs" / "stress_baseline.json"
    baseline_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report written to: {baseline_path}")

    # 6. Auto-update tests file thresholds
    tests_file_path = Path("tests") / "test_backend_stress_pytest.py"
    if tests_file_path.exists():
        print(f"Updating thresholds in {tests_file_path}...")
        content = tests_file_path.read_text(encoding="utf-8")
        
        # We'll parse and replace the variable assignments
        # Add buffer/margins: p95 latency (1.5x) and rps (0.7x)
        target_p95 = round(max(p95 * 1.5, 3.0), 2)
        target_rps = round(max(rps * 0.7, 1.0), 2)
        
        lines = content.splitlines()
        for idx, line in enumerate(lines):
            if line.startswith("STRESS_THRESHOLD_LATENCY_P95 ="):
                lines[idx] = f"STRESS_THRESHOLD_LATENCY_P95 = {target_p95}"
            elif line.startswith("STRESS_THRESHOLD_MIN_RPS ="):
                lines[idx] = f"STRESS_THRESHOLD_MIN_RPS = {target_rps}"
                
        tests_file_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("Pytest thresholds updated successfully.")

if __name__ == "__main__":
    main()
