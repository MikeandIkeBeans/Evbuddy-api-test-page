# EVBuddy — Environment & Configuration Reference

> **Last updated:** 2026-05-02

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Environment File Templates](#2-environment-file-templates)
3. [Backend Environment Variables](#3-backend-environment-variables)
   - [Flask Runtime](#31-flask-runtime)
   - [API Guard Rails](#32-api-guard-rails)
   - [Upstream Service Configuration](#33-upstream-service-configuration)
   - [Local App Behavior](#34-local-app-behavior)
   - [Test & Probe Toggles](#35-test--probe-toggles)
4. [Frontend Configuration](#4-frontend-configuration)
5. [Legacy Aliases](#5-legacy-aliases)
6. [Configuration Precedence](#6-configuration-precedence)

---

## 1. Quick Start

```powershell
# Copy the environment template
copy .env.example .env

# Edit with your local values
notepad .env
```

The application reads environment variables directly via `os.environ.get()`. If you use a `.env` file, you'll need to source it manually or use a tool like `python-dotenv` (not currently a dependency — Flask reads from the shell environment).

---

## 2. Environment File Templates

| File | Purpose |
|------|---------|
| `.env.example` | Root/backend template — copy to `.env` |
| `client/.env.example` | Frontend template (informational only — no `import.meta.env` usage) |

---

## 3. Backend Environment Variables

### 3.1 Flask Runtime

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FLASK_HOST` | string | `127.0.0.1` | Bind address for the Flask dev server |
| `FLASK_PORT` | int | `5000` | Port for the Flask dev server |
| `FLASK_DEBUG` | bool | `true` | Enable Flask debug mode and auto-reloading |

**Boolean parsing:** Values `1`, `true`, `yes`, `on` (case-insensitive) are truthy.

### 3.2 API Guard Rails

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `API_REQUIRE_KEY` | bool | `false` | When `true`, all requests (except health endpoints) must include `X-API-Key` header |
| `API_KEY` | string | (empty) | The API key to validate against when `API_REQUIRE_KEY=true` |
| `RATE_LIMIT_ENABLED` | bool | `true` | Enable in-memory per-identity rate limiting |
| `RATE_LIMIT_REQUESTS` | int | `240` | Max requests per window per identity |
| `RATE_LIMIT_WINDOW_SECONDS` | int | `60` | Sliding window duration in seconds |

**Exempt paths:** `/health` and `/api/platform/health` are always exempt from both API key auth and rate limiting.

**Identity resolution for rate limiting:** Uses `X-Forwarded-For` header if present, otherwise falls back to `request.remote_addr`.

### 3.3 Upstream Service Configuration

#### Primary Host

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EVBUDDY_DEV_HOST` | string | `http://dev.evbuddy.net` | Base hostname for all upstream microservices |

#### Per-Service Base URL Overrides

These are derived from `EVBUDDY_DEV_HOST` by default but can be individually overridden:

| Variable | Default Port | Default Value |
|----------|-------------|---------------|
| `EVBUDDY_DEV_USERS_BASE` | 9000 | `http://dev.evbuddy.net:9000` |
| `EVBUDDY_DEV_HOST_SITES_BASE` | 9004 | `http://dev.evbuddy.net:9004` |
| `EVBUDDY_DEV_CHARGERS_BASE` | 9017 | `http://dev.evbuddy.net:9017` |
| `EVBUDDY_DEV_OCPP_BASE` | 9029 | `http://dev.evbuddy.net:9029` |
| `EVBUDDY_DEV_HOST_ROOMS_BASE` | 9027 | `http://dev.evbuddy.net:9027` |
| `EVBUDDY_DEV_MESSAGING_BASE` | 9011 | `http://dev.evbuddy.net:9011` |

### 3.4 Local App Behavior

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `JWT_SECRET` | string | `dev-secret-change-me` | HMAC key for signing/verifying JWT tokens in the charging flow |
| `DEMO_TIME_SCALE` | int | `30` | Time multiplier for virtual charging sessions (30× real time) |
| `CPMS_TX_DB` | string | `data/cpms_tx_ledger.db` | SQLite database path for CPMS transaction ledger |

### 3.5 Test & Probe Toggles

These variables are used only by test suites and diagnostic scripts:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RUN_STRESS` | bool | `0` | Enable stress test execution in pytest |
| `APPDEV_HOST` | string | `http://appdev.evbuddy.net` | Target host for AppDev probe scripts |
| `SERVICE_REQUESTS_BASE_URL` | string | `http://appdev.evbuddy.net:9034` | Base URL for service request tests |
| `RUN_LIVE_APPDEV` | bool | `0` | Enable live network tests against AppDev |
| `LIVE_HTTP_TIMEOUT_SEC` | int | `15` | Timeout for live HTTP tests |
| `SERVICE_REQUESTS_CREATE_PAYLOAD_JSON` | string | (empty) | JSON payload for live service-request mutation tests |

---

## 4. Frontend Configuration

The frontend does **not** currently use `import.meta.env` or `VITE_*` prefixed variables.

The API base URL is hardcoded in `client/src/utils/api.ts`:

```typescript
export const API_BASE = "http://127.0.0.1:5000";

export const EVBUDDY_API = (() => {
  if (typeof window === "undefined") return API_BASE;
  // In dev, Vite runs on any port — always point to Flask
  if (window.location.port !== "5000" && window.location.port !== "") {
    return API_BASE;
  }
  return window.location.origin;
})();
```

**Resolution logic:**
- **SSR / Node:** Always `http://127.0.0.1:5000`
- **Browser (port ≠ 5000):** Always `http://127.0.0.1:5000` (Vite dev mode)
- **Browser (port = 5000):** Uses `window.location.origin` (production/Flask-served)

---

## 5. Legacy Aliases

For backward compatibility, `config.py` reads the following legacy variable names and maps them to their canonical equivalents:

| Legacy Variable | Canonical Variable |
|----------------|-------------------|
| `MICROSERVICE_HOST` | `EVBUDDY_DEV_HOST` |
| `REAL_API_BASE` | `EVBUDDY_DEV_USERS_BASE` |
| `REAL_HOSTSITES_API_BASE` | `EVBUDDY_DEV_HOST_SITES_BASE` |
| `REAL_CHARGERS_API_BASE` | `EVBUDDY_DEV_CHARGERS_BASE` |
| `REAL_OCPP_API_BASE` | `EVBUDDY_DEV_OCPP_BASE` |
| `REAL_HOSTROOM_API_BASE` | `EVBUDDY_DEV_HOST_ROOMS_BASE` |
| `REAL_MESSAGING_API_BASE` | `EVBUDDY_DEV_MESSAGING_BASE` |

**Resolution order:** Canonical name → Legacy name → Derived default

Example for `EVBUDDY_DEV_USERS_BASE`:
```
1. Check EVBUDDY_DEV_USERS_BASE
2. If not set, check REAL_API_BASE
3. If not set, use f"{EVBUDDY_DEV_HOST}:9000"
```

---

## 6. Configuration Precedence

The configuration is loaded in the following modules:

| Module | Responsibility |
|--------|---------------|
| `config.py` | Service registry, upstream URLs, JWT/session settings, legacy aliases |
| `src/config/settings.py` | `AppSettings` dataclass — Flask runtime + guard rail settings |
| `src/api/middleware/*.py` | Each middleware reads its own env vars at registration time |

**Important:** Middleware reads env vars at import/registration time (app startup), not per-request. Changing env vars after the Flask app starts requires a restart.
