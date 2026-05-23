# EVBuddy — Development Guide

> **Last updated:** 2026-05-02

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup](#2-project-setup)
3. [Running Locally](#3-running-locally)
4. [Project Structure](#4-project-structure)
5. [Development Workflow](#5-development-workflow)
6. [Adding a New Route Blueprint](#6-adding-a-new-route-blueprint)
7. [Adding a New Frontend Component](#7-adding-a-new-frontend-component)
8. [Working with the Service Registry](#8-working-with-the-service-registry)
9. [Helper Function Reference](#9-helper-function-reference)
10. [Testing](#10-testing)
11. [Diagnostic Scripts](#11-diagnostic-scripts)
12. [Build & Production](#12-build--production)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | ≥ 3.10 | Backend runtime |
| Node.js | ≥ 18 | Frontend build/dev |
| npm | ≥ 9 | Package management |
| Git | Latest | Version control |

---

## 2. Project Setup

### Backend

```powershell
# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Install test dependencies
pip install -r requirements-dev.txt
```

### Frontend

```powershell
cd client
npm install
cd ..
```

### Environment

```powershell
# Copy the environment template
copy .env.example .env

# Edit with your local values (optional — defaults work for standard dev setup)
notepad .env
```

---

## 3. Running Locally

### Development Mode (Two Processes)

**Terminal 1 — Flask backend:**
```powershell
.\.venv\Scripts\Activate.ps1
python app.py
# → Listening on http://127.0.0.1:5000
```

**Terminal 2 — Vite dev server:**
```powershell
cd client
npm run dev
# → Listening on http://127.0.0.1:5173
```

Open `http://127.0.0.1:5173` in your browser. The Vite dev server provides HMR (Hot Module Replacement) and automatically proxies API calls to the Flask backend on `:5000`.

### Production Mode (Single Process)

```powershell
cd client
npm run build
cd ..
python app.py
# → Serves React SPA + API from http://127.0.0.1:5000
```

---

## 4. Project Structure

```
evbuddy homepage/
├── app.py                     # Flask app factory & entry point
├── config.py                  # Service registry, env vars, constants
├── helpers.py                 # Shared HTTP/auth/session helpers
├── requirements.txt           # Python production dependencies
├── requirements-dev.txt       # Python test dependencies (pytest)
├── pytest.ini                 # Pytest configuration & markers
├── package.json               # Root-level npm scripts
├── .env.example               # Environment template
│
├── routes/                    # Flask blueprints (one per domain)
│   ├── __init__.py            # Blueprint registry (ALL_BLUEPRINTS)
│   ├── pages.py               # Page serving & SPA fallback
│   ├── users.py               # User CRUD proxy
│   ├── vehicles.py            # Vehicle CRUD proxy
│   ├── sites.py               # Host site management proxy
│   ├── messaging.py           # Messaging service proxy
│   ├── ev_charging.py         # EV charging flow (QR, auth, sessions)
│   ├── cpms.py                # CPMS operations & transaction ledger
│   ├── v2v.py                 # V2V charging demo
│   ├── services.py            # Service discovery & health checks
│   ├── experience.py          # Platform snapshot endpoint
│   └── dispatch.py            # Dispatch/responder proxy
│
├── src/                       # Layered application code
│   ├── api/
│   │   ├── middleware/        # Request pipeline (auth, rate limit, etc.)
│   │   ├── response.py        # Standardized response helpers
│   │   └── validation.py      # Request validation decorators
│   ├── application/
│   │   ├── dto/               # Data transfer objects
│   │   ├── ports/             # Interface definitions
│   │   └── use_cases/         # Business logic (user payload, snapshots)
│   ├── config/
│   │   └── settings.py        # AppSettings dataclass
│   └── infrastructure/
│       ├── http/              # BaseHttpClient with retry logic
│       ├── persistence/       # SessionRepository
│       └── upstream_clients/  # Typed upstream service clients
│
├── client/                    # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx            # App shell
│   │   ├── main.tsx           # Entry point
│   │   ├── theme.css          # Design system tokens
│   │   ├── components/        # Feature tab components
│   │   ├── utils/             # API client helpers
│   │   └── types/             # TypeScript type definitions
│   ├── package.json           # Frontend dependencies & scripts
│   ├── vite.config.ts         # Vite configuration
│   └── tsconfig.json          # TypeScript configuration
│
├── tests/                     # Pytest test suites
├── scripts/                   # Diagnostic & automation scripts
├── data/                      # Runtime data (SQLite DBs, test runs)
├── docs/                      # Documentation
└── templates/                 # Server-rendered fallback template
```

---

## 5. Development Workflow

### Making Backend Changes

1. Edit the relevant file in `routes/`, `helpers.py`, `config.py`, or `src/`
2. Flask auto-reloads on file changes (when `FLASK_DEBUG=true`)
3. Test your changes:
   ```powershell
   python -m pytest tests/test_routes_<module>_pytest.py -v
   ```

### Making Frontend Changes

1. Edit files in `client/src/`
2. Vite HMR auto-refreshes the browser
3. Test your changes:
   ```powershell
   cd client
   npm run test
   ```

### Type Checking (Frontend)

```powershell
cd client
npm run type-check
```

---

## 6. Adding a New Route Blueprint

### Step 1: Create the blueprint module

Create `routes/my_feature.py`:

```python
"""
My Feature routes (/api/my-feature/...).
Proxies to the upstream service on port XXXX.
"""

from flask import Blueprint, jsonify
from helpers import proxy_json_request, ms_url, get_json_body

my_feature_bp = Blueprint("my_feature", __name__)


@my_feature_bp.get("/api/my-feature")
def list_items():
    """List all items."""
    return proxy_json_request(
        "GET",
        ms_url("my_service_key"),
        error_message="Failed to fetch items",
    )


@my_feature_bp.post("/api/my-feature")
def create_item():
    """Create a new item."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "POST",
        ms_url("my_service_key"),
        body=data,
        error_message="Failed to create item",
    )
```

### Step 2: Register the service in config.py

Add to `EVBUDDY_DEV_SERVICES`:
```python
"my_service_key": {"port": 9099, "base": "/my-feature", "category": "core"},
```

Add to `EVBUDDY_DEV_SERVICE_STATUS_PATHS`:
```python
"my_service_key": "/my-feature/status",
```

### Step 3: Register the blueprint

Edit `routes/__init__.py`:
```python
from .my_feature import my_feature_bp

ALL_BLUEPRINTS = [
    # ... existing blueprints
    my_feature_bp,
]
```

### Step 4: Add tests

Create `tests/test_routes_my_feature_pytest.py`:
```python
import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_list_items(client):
    resp = client.get("/api/my-feature")
    assert resp.status_code in (200, 503)  # 503 if upstream is down
```

---

## 7. Adding a New Frontend Component

### Step 1: Create the component

Create `client/src/components/MyFeatureTab.tsx`:

```tsx
import { useState, useEffect } from "react";
import { apiCall } from "../utils/api";
import ResponseDisplay from "./ResponseDisplay";

export default function MyFeatureTab() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const result = await apiCall("GET", "/api/my-feature");
    setData(result.data);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <section className="panel">
      <h2>My Feature</h2>
      <button onClick={() => void loadData()} disabled={loading}>
        {loading ? "Loading..." : "Refresh"}
      </button>
      {data && <ResponseDisplay data={data} />}
    </section>
  );
}
```

### Step 2: Add to the app shell

Edit `client/src/App.tsx` to import and render your component.

### Step 3: Add tests

Create `client/src/components/MyFeatureTab.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import MyFeatureTab from "./MyFeatureTab";

test("renders heading", () => {
  render(<MyFeatureTab />);
  expect(screen.getByText("My Feature")).toBeInTheDocument();
});
```

---

## 8. Working with the Service Registry

### URL Construction

```python
from helpers import ms_url

# Build a URL for the "chargers" service
url = ms_url("chargers")
# → "http://dev.evbuddy.net:9017/chargers"

# With a path suffix
url = ms_url("chargers", "/chargers/site/42")
# → "http://dev.evbuddy.net:9017/chargers/chargers/site/42"

# Legacy aliases are resolved automatically
url = ms_url("payments")
# → Resolves to "user_payments" → "http://dev.evbuddy.net:9002/payments"
```

### Health Check URLs

```python
from helpers import service_status_url

url = service_status_url("users")
# → "http://dev.evbuddy.net:9000/user/status"
```

### Adding Service Aliases

Add to `EVBUDDY_DEV_SERVICE_ALIASES` in `config.py`:
```python
"my_alias": "canonical_service_key",
```

---

## 9. Helper Function Reference

### HTTP Helpers (`helpers.py`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `ev_http` | `(method, url, *, params, body, timeout)` | Low-level HTTP request via `BaseHttpClient` |
| `ev_simple_get` | `(url, *, params, timeout, error_label)` | GET with auto JSON/error handling |
| `proxy_json_request` | `(method, url, *, body, params, timeout, error_message, not_found, empty_message)` | Full proxy with consistent error handling |
| `get_json_body` | `(error, required_fields)` | Extract and validate JSON request body |
| `with_query_params` | `(url, **params)` | Append query parameters to a URL |
| `normalized_limit` | `(default, minimum, maximum)` | Extract and bound `limit` query param |
| `ok_response` | `(message, **payload)` | Return `{"ok": true, ...}` response |

### Service Helpers

| Function | Description |
|----------|-------------|
| `ms_url(service_key, suffix)` | Build URL from service registry |
| `service_status_url(service_key)` | Build health check URL |

### Auth Helpers

| Function | Description |
|----------|-------------|
| `ev_issue_token(site_id, charger_id, mode)` | Generate JWT for charging flow |
| `ev_require_auth` | Decorator that validates `Authorization: Bearer` header |

### OCPP Helpers

| Function | Description |
|----------|-------------|
| `ev_ocpp_get_connector_status(cp_id, conn_id)` | Get connector status with caching (10s TTL) |
| `ev_ocpp_remote_start(cp_id, conn_id, id_tag)` | Send OCPP RemoteStartTransaction |
| `ev_ocpp_remote_stop(cp_id, conn_id, tx_id, id_tag)` | Send OCPP RemoteStopTransaction |

### Session Helpers

| Function | Description |
|----------|-------------|
| `ev_recompute_session(session)` | Recompute session state (elapsed time, energy, cost) |
| `ev_get_charger_connectors(charger_id)` | Get connector availability from active sessions |
| `ev_parse_qr(qr)` | Parse QR code string to charger/connector/site IDs |

---

## 10. Testing

### Test Architecture

| Layer | Tool | Location | Trigger |
|-------|------|----------|---------|
| Backend unit/integration | pytest | `tests/` | `python -m pytest` |
| Backend stress | pytest | `tests/test_backend_stress_pytest.py` | `RUN_STRESS=1 python -m pytest -m stress` |
| Frontend unit | vitest | `client/src/**/*.test.{ts,tsx}` | `npm --prefix client run test` |
| Autonomous | Python script | `scripts/run_autonomous_test_workflow.py` | `npm run test:autonomous` |

### pytest Markers

| Marker | Description |
|--------|-------------|
| `integration` | Cross-module backend integration tests |
| `e2e` | End-to-end workflow tests across multiple endpoints |
| `stress` | High-load and failure-oriented stress tests |
| `backend` | Backend-only tests |
| `live` | Opt-in live network tests against AppDev endpoints |

### Running Tests

```powershell
# Backend — all tests except stress
python -m pytest -m "not stress" -ra

# Backend — specific route module
python -m pytest tests/test_routes_users_pytest.py -v

# Backend — stress tests only
$env:RUN_STRESS = "1"
python -m pytest -m stress -ra

# Frontend — all tests
cd client
npm run test

# Frontend — with coverage
npm run test:coverage

# Autonomous full suite
python scripts\run_autonomous_test_workflow.py

# Autonomous with stress + multiple iterations
python scripts\run_autonomous_test_workflow.py --include-stress --iterations 5 --continue-on-failure
```

### Root npm Script Shortcuts

| Script | Command |
|--------|---------|
| `npm run test:backend` | pytest (non-stress) |
| `npm run test:backend:stress` | pytest (stress only) |
| `npm run test:frontend` | vitest |
| `npm run test:autonomous` | Full autonomous workflow |
| `npm run test:autonomous:stress` | Autonomous with stress |
| `npm run test:break` | Autonomous with stress × 5 iterations |

---

## 11. Diagnostic Scripts

Located in `scripts/`:

| Script | Purpose | Usage |
|--------|---------|-------|
| `explore_appdev_domain.py` | Probe AppDev domain for API discovery | `python scripts\explore_appdev_domain.py > appdev_discovery.json` |
| `appdev_api_matrix.py` | Generate endpoint availability matrix | `python scripts\appdev_api_matrix.py --json-out matrix.json --md-out matrix.md` |
| `appdev_continuous_probe.py` | Continuous health monitoring | `python scripts\appdev_continuous_probe.py --rounds 60 --interval 60 --out probe.json` |
| `appdev_live_monitor.py` | High-frequency live monitoring | See script for frequency options |
| `ocpp_sim_probe.py` | OCPP charge point simulator probe | `python scripts\ocpp_sim_probe.py` |
| `ocpp_stress.py` | OCPP stress testing | `python scripts\ocpp_stress.py` |
| `route_inventory.py` | Generate route inventory from Flask app | `python scripts\route_inventory.py` |
| `generate_api_contract.py` | Generate API contract document | `python scripts\generate_api_contract.py` |
| `run_autonomous_test_workflow.py` | Automated test runner | See [Testing](#10-testing) section |

---

## 12. Build & Production

### Frontend Build

```powershell
cd client
npm run build
# Output: client/dist/
```

The build generates static assets in `client/dist/`. Flask serves these when the directory exists.

### Type Checking

```powershell
cd client
npm run type-check
```

### Preview Production Build

```powershell
cd client
npm run preview
# → Serves built assets on http://127.0.0.1:5173
```

---

## 13. Troubleshooting

### Common Issues

**"Connection refused" on upstream service calls**
- The upstream microservices on `dev.evbuddy.net` may be down or unreachable
- Check service health: `GET /api/services`
- Verify `EVBUDDY_DEV_HOST` is correct in your `.env`

**"Invalid/expired token" on session operations**
- JWT tokens expire; re-authenticate via `/v1/auth/hotel` or `/v1/auth/card/init`
- Use `Bearer demo-token` for quick testing

**Frontend shows "failed loading verified endpoints"**
- Ensure the Flask backend is running on port 5000
- Check browser console for CORS errors
- Verify the Vite dev server can reach `http://127.0.0.1:5000`

**Rate limit (429) during testing**
- Increase limits: `RATE_LIMIT_REQUESTS=1000`
- Or disable: `RATE_LIMIT_ENABLED=false`

**SQLite "database is locked" errors**
- The CPMS ledger uses thread-safe locking but can conflict under high concurrency
- Restart the Flask app to clear in-memory caches

**Tests skipped**
- Many tests are gated by markers (`stress`, `live`) or env vars (`RUN_STRESS`, `RUN_LIVE_APPDEV`)
- Set the appropriate env var to opt in: `$env:RUN_STRESS = "1"`
