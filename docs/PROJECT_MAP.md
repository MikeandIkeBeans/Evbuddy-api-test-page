# PROJECT_MAP

Generated: 2026-04-26

This document maps the current Flask + React dashboard codebase based on source inspection.

## 1. Backend Entry Point

- Primary app entry: `app.py`
  - Creates Flask app with static serving from `client/dist`
  - Registers middleware from `src/api/middleware`
  - Registers all blueprints from `routes.ALL_BLUEPRINTS`
  - Starts with settings loaded from `AppSettings.from_env()`

## 2. Flask Route/Blueprint Structure

### 2.1 Registry

- Blueprint registry file: `routes/__init__.py`
- Route inventory artifact: `ROUTE_INVENTORY.md` (108 discovered routes)

### 2.2 Blueprint modules present in `routes/`

- `routes/pages.py`
  - `/`, `/guest`, `/guest/qr`, SPA/static fallback route
- `routes/experience.py`
  - `/api/experience/snapshot`
- `routes/services.py`
  - `/health`, `/api/services`, `/api/platform/health`, service probes
- `routes/users.py`
  - `/api/users` CRUD and `/api/users/status`
- `routes/vehicles.py`
  - `/api/vehicles` CRUD and `/api/users/:id/vehicles`
- `routes/sites.py`
  - `/api/sites` CRUD, site membership, `/api/data`, preorder/subscribe
- `routes/messaging.py`
  - thread/message/participant/attachment/template/status-event routes under `/api/messaging/*`
- `routes/ev_charging.py`
  - `/v1/*` charging flow routes (QR/auth/chargers/sessions/health/debug)
- `routes/cpms.py`
  - `/api/assets/*` command/diagnostics/tariff routes, `/api/transactions/:txid`, refunds
- `routes/v2v.py`
  - `/v1/v2v/*` status/sessions/start/stop/reset
- `routes/dispatch.py`
  - `/api/v1/*` proxy to dispatch service on port 9024

## 3. Data Models and Persistence Layer

- In-memory runtime session state
  - `config.py`: `EV_SESSIONS` dictionary
- Session repository abstraction
  - `src/infrastructure/persistence/session_repository.py`
  - Used by `routes/ev_charging.py` as `SESSION_REPOSITORY`
- CPMS transaction persistence
  - `routes/cpms.py`
  - SQLite ledger at `data/cpms_tx_ledger.db` (configurable via env)
- Application/use-case logic
  - `src/application/use_cases/users_use_cases.py` (validation/payload building)
  - `src/application/use_cases/experience_snapshot.py` (snapshot assembly)
- Upstream access layer
  - `src/infrastructure/http/base_client.py` and `retry.py`
  - `src/infrastructure/upstream_clients/users_client.py`

## 4. Config and Environment Variables

### 4.1 Backend runtime configuration

Core app/middleware settings:

- `FLASK_HOST` (default `127.0.0.1`)
- `FLASK_PORT` (default `5000`)
- `FLASK_DEBUG` (default `true`)
- `API_REQUIRE_KEY` (default `false`)
- `API_KEY` (no default key)
- `RATE_LIMIT_ENABLED` (default `true`)
- `RATE_LIMIT_REQUESTS` (default `240`)
- `RATE_LIMIT_WINDOW_SECONDS` (default `60`)

Service host/base settings:

- `EVBUDDY_DEV_HOST` (default `http://dev.evbuddy.net`)
- `EVBUDDY_DEV_USERS_BASE`
- `EVBUDDY_DEV_HOST_SITES_BASE`
- `EVBUDDY_DEV_CHARGERS_BASE`
- `EVBUDDY_DEV_OCPP_BASE`
- `EVBUDDY_DEV_HOST_ROOMS_BASE`
- `EVBUDDY_DEV_MESSAGING_BASE`

Legacy aliases still supported in `config.py`:

- `MICROSERVICE_HOST`
- `REAL_API_BASE`
- `REAL_HOSTSITES_API_BASE`
- `REAL_CHARGERS_API_BASE`
- `REAL_OCPP_API_BASE`
- `REAL_HOSTROOM_API_BASE`
- `REAL_MESSAGING_API_BASE`

Other runtime variables:

- `JWT_SECRET`
- `DEMO_TIME_SCALE`
- `CPMS_TX_DB`

### 4.2 Test/probe variables discovered

- `RUN_STRESS`
- `APPDEV_HOST`
- `SERVICE_REQUESTS_BASE_URL`
- `RUN_LIVE_APPDEV`
- `LIVE_HTTP_TIMEOUT_SEC`
- `SERVICE_REQUESTS_CREATE_PAYLOAD_JSON`

### 4.3 Frontend env usage

- No `import.meta.env`, `process.env`, or `VITE_*` references found in `client/src`.
- Frontend API target is currently hardcoded in `client/src/utils/api.ts`:
  - `API_BASE = "http://127.0.0.1:5000"`

## 5. Frontend Entry Point and Structure

### 5.1 Entry points

- Frontend root: `client/src/main.tsx`
  - Renders `App` from `client/src/App.tsx`
- App shell: `client/src/App.tsx`
  - Fetches `/api/services` and `/api/platform/health`
  - Displays service matrix/search/refresh UI
  - Renders `APITesterTab`

### 5.2 API/fetch layer

- `client/src/utils/api.ts`
  - `EVBUDDY_API` resolution helper
  - `apiCall(method, endpoint, body, userId)` wrapper
  - response parsing and error normalization

### 5.3 Major dashboard screens/components

Component modules in `client/src/components/`:

- `APITesterTab.tsx`
- `ServicesTab.tsx`
- `HostSitesTab.tsx`
- `LiveChargersTab.tsx`
- `MessagingTab.tsx`
- `CatalogTab.tsx`
- `ActiveSessionsTab.tsx`
- `V2VTab.tsx`
- `ResponseDisplay.tsx`
- `primitives/*` reusable UI components

Current composition note:

- `App.tsx` directly imports and renders `APITesterTab`.
- Other tab components exist (and have tests), but are not currently mounted by `App.tsx`.

### 5.4 Type/model layer

- Type barrel: `client/src/types/index.ts`
- Type modules:
  - `client/src/types/api.ts`
  - `client/src/types/services.ts`
  - `client/src/types/chargers.ts`
  - `client/src/types/messaging.ts`
  - `client/src/types/operating-hours.ts`

## 6. Build/Test/Lint Commands

## 6.1 Root `package.json` scripts

- `npm run test:backend`
- `npm run test:backend:stress`
- `npm run test:frontend`
- `npm run build:frontend`
- `npm run test:autonomous`
- `npm run test:autonomous:stress`
- `npm run test:break`

## 6.2 Frontend `client/package.json` scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run type-check`
- `npm run test`
- `npm run test:watch`
- `npm run test:coverage`

## 6.3 Python/pytest configuration

- `pytest.ini`:
  - `testpaths = tests`
  - markers: `integration`, `e2e`, `stress`, `backend`, `live`
- Typical backend test command:
  - `python -m pytest -m "not stress" -ra`

## 6.4 Lint commands

- No explicit lint script found in root or frontend package scripts.

## 7. Known Risks and TODO Candidates (Inferred)

1. Blueprint registry mismatch risk
- `routes/__init__.py` imports blueprints from modules not present in the current `routes/` folder (`businesses`, `employees`, `drivers`, `payments`, `invites`, `operating_hours`).
- `routes/dispatch.py` exists but `dispatch_bp` is not included in `ALL_BLUEPRINTS`.

2. API contract mismatch risk in frontend service matrix
- `client/src/App.tsx` expects `/api/services` payload under `data.services` and `data.summary`.
- `routes/services.py` currently returns `services` and `summary` at top level (not wrapped in `data`).

3. Potential UI drift
- Multiple feature tabs/components exist but are not mounted by the current root app shell.

4. Tooling drift risk
- Root and frontend package manifests define different React major versions (`root`: 19.x, `client`: 18.x), which can cause confusion in maintenance workflows.

5. Route inventory drift risk
- Generated artifacts (`ROUTE_INVENTORY.*`, API docs/report files) can become stale unless regeneration scripts are run.
