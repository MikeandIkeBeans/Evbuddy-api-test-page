# EVBuddy Homepage

Flask proxy + React dashboard for EVBuddy service integration backed by dev APIs.

## Stack
- Backend: Flask, Flask-CORS, requests, PyJWT
- Frontend: React, Vite
- Integration target: Spring Boot microservices on `dev.evbuddy.net`

## Quick Start

### 1. Backend
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

By default, backend runs on `http://127.0.0.1:5000`.

### 2. Frontend (dev)
```powershell
cd client
npm install
npm run dev
```

Vite runs on `http://127.0.0.1:5173` and calls the Flask backend at `http://127.0.0.1:5000`.

### 3. Frontend (production build served by Flask)
```powershell
cd client
npm run build
cd ..
python app.py
```

If `client/dist/index.html` exists, Flask serves the built app from `/`.

## Environment Variables
- `FLASK_HOST` (default: `127.0.0.1`)
- `FLASK_PORT` (default: `5000`)
- `FLASK_DEBUG` (default: `true`)
- `EVBUDDY_DEV_HOST` (default: `http://dev.evbuddy.net`)
- `EVBUDDY_DEV_USERS_BASE` (default: `${EVBUDDY_DEV_HOST}:9000`)
- `EVBUDDY_DEV_HOST_SITES_BASE` (default: `${EVBUDDY_DEV_HOST}:9004`)
- `EVBUDDY_DEV_BUSINESS_BASE` (default: `${EVBUDDY_DEV_HOST}:9005`)
- `EVBUDDY_DEV_CHARGERS_BASE` (default: `${EVBUDDY_DEV_HOST}:9017`)
- `EVBUDDY_DEV_OCPP_BASE` (default: `${EVBUDDY_DEV_HOST}:9029`)
- `EVBUDDY_DEV_MESSAGING_BASE` (default: `${EVBUDDY_DEV_HOST}:9011`)
- Legacy compatibility: `MICROSERVICE_HOST` and `REAL_*_API_BASE` env names are still supported.
- `JWT_SECRET` (default: `dev-secret-change-me`)
- `DEMO_TIME_SCALE` (default: `30`, controls virtual session-time scaling)

## Project Layout
```text
app.py                 Flask entrypoint and app factory
config.py              Shared settings and service registry
helpers.py             Shared HTTP/session/auth helpers
routes/                Flask blueprints grouped by domain
templates/index.html   Server-rendered fallback page
test-page.html         Guest flow test page
client/                React dashboard
```

## API Groups
- `/api/*`: business, users, vehicles, payments, security, services
- `/v1/*`: EV charging flow and charger/session endpoints
- `/health`: local health check

## Testing Workflows

### Install test dependencies
```powershell
pip install -r requirements.txt
pip install -r requirements-dev.txt

cd client
npm install
cd ..
```

### Backend test suites (pytest)
```powershell
# Unit/integration/e2e excluding stress
python -m pytest -m "not stress" -ra

# Stress tests only (high load)
$env:RUN_STRESS = "1"
python -m pytest -m stress -ra
```

### Frontend test suites (vitest)
```powershell
cd client
npm run test
npm run test:coverage
```

### Autonomous full-suite runner
```powershell
# Single pass: backend + frontend
python .\scripts\run_autonomous_test_workflow.py

# Include stress phase
python .\scripts\run_autonomous_test_workflow.py --include-stress

# Break-testing loop (5 iterations, continues after failures)
python .\scripts\run_autonomous_test_workflow.py --include-stress --iterations 5 --continue-on-failure
```

PowerShell wrapper:
```powershell
.\scripts\run_autonomous_test_workflow.ps1 -IncludeStress -Iterations 5 -ContinueOnFailure
```

Reports are written to `data/test_runs/` for each autonomous execution and stress report.

## Notes
- Most routes proxy upstream services and intentionally return upstream status codes/payloads.

## Diagnostics Artifacts
- `APPDEV_RECON_REPORT.md` and `appdev_discovery.json` are probe snapshots, not source-of-truth API contracts.
- Refresh discovery data with `python .\\scripts\\explore_appdev_domain.py > appdev_discovery.json`.
- Generate a live endpoint matrix with `python .\\scripts\\appdev_api_matrix.py --json-out appdev_endpoint_matrix.json --md-out API_ENDPOINT_MATRIX.md`.
- Matrix outputs: `API_ENDPOINT_MATRIX.md` (human-readable) and `appdev_endpoint_matrix.json` (machine-readable).
- Run continuous health/data probing with `python .\\scripts\\appdev_continuous_probe.py --rounds 60 --interval 60 --out appdev_continuous_probe.json`.
- Validate site proxy behavior with `python -m unittest tests.test_sites_proxy -v`.
- Runtime CPMS ledger data is stored in `data/cpms_tx_ledger.db` and treated as local runtime state.
