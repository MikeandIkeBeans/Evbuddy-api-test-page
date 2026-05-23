# EVBuddy Platform — Architecture Guide

> **Last updated:** 2026-05-02

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend Architecture](#3-backend-architecture)
   - [Application Factory](#31-application-factory)
   - [Middleware Pipeline](#32-middleware-pipeline)
   - [Blueprint System](#33-blueprint-system)
   - [Service Registry](#34-service-registry)
   - [Proxy Pattern](#35-proxy-pattern)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Data Flow](#5-data-flow)
6. [Persistence Layer](#6-persistence-layer)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Upstream Microservice Topology](#8-upstream-microservice-topology)
9. [Deployment Modes](#9-deployment-modes)

---

## 1. System Overview

EVBuddy Homepage is a **Flask + React** platform dashboard that acts as a unified API gateway and observability layer for the EVBuddy microservice ecosystem. It provides:

- **Proxy layer** — Transparent HTTP passthrough to 34 upstream Spring Boot microservices running on `dev.evbuddy.net`
- **Dashboard UI** — React-based operations console showing real-time service health, charger status, and OCPP session data
- **EV Charging Flow** — Full guest/card authentication and charging session lifecycle management via OCPP
- **CPMS Operations** — Charge Point Management commands with local transaction ledger persistence
- **Messaging Hub** — Complete CRUD proxy to the Central Messaging Service (threads, messages, participants, attachments, templates)
- **Service Discovery** — Concurrent health probing across all registered upstream services

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Browser / Mobile Client                    │
│                  (React Dashboard on :5173 dev / :5000 prod)     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Flask Proxy Gateway (:5000)                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Middleware Pipeline                                        │ │
│  │  Request-ID → Security Headers → Rate Limiter → API Auth   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │  pages   │ │  users   │ │ charging │ │ services │  ...      │ │
│  │    bp    │ │    bp    │ │    bp    │ │    bp    │          │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │ │
│                          helpers.py                             │ │
│                          config.py (Service Registry)           │ │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Upstream Spring Boot Microservices                   │
│              dev.evbuddy.net:9000–9036                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │:9000 │ │:9004 │ │:9011 │ │:9017 │ │:9029 │ │:9024 │  ...  │
│  │Users │ │Sites │ │Msgs  │ │Chrgrs│ │OCPP  │ │Dspch │       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Architecture

### 3.1 Application Factory

The app is constructed in `app.py` using a factory function pattern:

```python
def create_app():
    app = Flask(__name__, static_folder="client/dist", static_url_path="")
    CORS(app)
    # Register middleware pipeline
    register_request_id_middleware(app)
    register_security_headers(app)
    register_rate_limit_middleware(app)
    register_auth_middleware(app)
    register_error_handlers(app)
    # Register all blueprints
    for blueprint in ALL_BLUEPRINTS:
        app.register_blueprint(blueprint)
    return app
```

**Key design decisions:**
- Static files served from `client/dist` — supports both dev proxy mode and production build serving
- CORS enabled globally for cross-origin dev workflow (Vite on `:5173` → Flask on `:5000`)
- Middleware registered in specific order: ID assignment → headers → rate limiting → auth → error handling

### 3.2 Middleware Pipeline

All middleware is defined in `src/api/middleware/` and registered as Flask `before_request` hooks:

| Order | Middleware | File | Purpose |
|-------|-----------|------|---------|
| 1 | Request ID | `request_id.py` | Assigns `X-Request-ID` header to every request for tracing |
| 2 | Security Headers | `security_headers.py` | Adds standard security headers (CSP, X-Frame-Options, etc.) |
| 3 | Rate Limiter | `rate_limit.py` | Sliding-window in-memory rate limiter per identity (IP/forwarded) |
| 4 | API Key Auth | `auth.py` | Optional `X-API-Key` enforcement (gated by `API_REQUIRE_KEY` env) |
| 5 | Error Handlers | `error_handler.py` | Catches unhandled exceptions and returns structured JSON errors |

**Rate Limiter specifics:**
- Uses a `_WindowRateLimiter` class with thread-safe sliding window
- Defaults: 240 requests per 60-second window
- Health endpoints (`/health`, `/api/platform/health`) are exempt
- Identity derived from `X-Forwarded-For` header or `request.remote_addr`

### 3.3 Blueprint System

The app registers **11 blueprints** organized by domain:

| Blueprint | File | Prefix | Domain |
|-----------|------|--------|--------|
| `pages_bp` | `routes/pages.py` | `/`, `/guest` | Page serving, SPA fallback |
| `ev_charging_bp` | `routes/ev_charging.py` | `/v1/*` | EV charging flow |
| `sites_bp` | `routes/sites.py` | `/api/sites/*` | Host site CRUD |
| `users_bp` | `routes/users.py` | `/api/users/*` | User CRUD |
| `vehicles_bp` | `routes/vehicles.py` | `/api/vehicles/*` | Vehicle CRUD |
| `services_bp` | `routes/services.py` | `/api/services/*` | Service discovery & health |
| `cpms_bp` | `routes/cpms.py` | `/api/assets/*` | CPMS commands & transactions |
| `messaging_bp` | `routes/messaging.py` | `/api/messaging/*` | Messaging proxy |
| `v2v_bp` | `routes/v2v.py` | `/v1/v2v/*` | V2V charging demo |
| `experience_bp` | `routes/experience.py` | `/api/experience/*` | Platform snapshot |
| `dispatch_bp` | `routes/dispatch.py` | `/api/v1/*` | Dispatch/responder proxy |

### 3.4 Service Registry

The service registry in `config.py` maps **34 service keys** to their upstream ports, base paths, and categories:

```python
EVBUDDY_DEV_SERVICES = {
    "users":           {"port": 9000, "base": "/user",                "category": "core"},
    "user_vehicles":   {"port": 9001, "base": "/user-vehicle/vehicles", "category": "core"},
    "host_sites":      {"port": 9004, "base": "/host-sites",          "category": "host_ops"},
    "chargers":        {"port": 9017, "base": "/chargers",            "category": "charging"},
    "ocpp":            {"port": 9029, "base": "",                     "category": "charging"},
    "messaging":       {"port": 9011, "base": "",                     "category": "messaging"},
    # ... 28 more services
}
```

**Categories:** `core`, `host_ops`, `charging`, `messaging`, `dispatch`, `community`

Each service also has a corresponding health-check path in `EVBUDDY_DEV_SERVICE_STATUS_PATHS`, and legacy key aliases are maintained via `EVBUDDY_DEV_SERVICE_ALIASES` for backward compatibility.

### 3.5 Proxy Pattern

The proxy layer uses a consistent pattern built around helper functions in `helpers.py`:

1. **`ms_url(service_key, suffix)`** — Builds a URL from the service registry
2. **`proxy_json_request(method, url, ...)`** — Executes the upstream call with:
   - Consistent error handling (503 on connection failure)
   - 404 custom messages
   - 204 → 200 with message conversion
   - Automatic JSON/text response normalization
3. **`ev_http(method, url, ...)`** — Low-level HTTP via `BaseHttpClient` with retry support

---

## 4. Frontend Architecture

The React frontend is a Vite-powered TypeScript SPA in `client/`:

```
client/src/
├── main.tsx              # Entry point — renders <App />
├── App.tsx               # App shell with service matrix + API tester
├── theme.css             # Design system tokens and base styles
├── styles.ts             # CSS-in-JS style constants
├── components/
│   ├── APITesterTab.tsx       # Interactive API testing UI
│   ├── ServicesTab.tsx        # Service health matrix
│   ├── HostSitesTab.tsx       # Host site management
│   ├── LiveChargersTab.tsx    # Real-time charger status
│   ├── MessagingTab.tsx       # Messaging thread viewer
│   ├── CatalogTab.tsx         # Service catalog browser
│   ├── ActiveSessionsTab.tsx  # Active charging sessions
│   ├── V2VTab.tsx             # V2V charging control panel
│   ├── ResponseDisplay.tsx    # JSON response renderer
│   └── primitives/            # Reusable UI primitives
├── utils/
│   └── api.ts            # API client (fetch wrapper)
└── types/
    ├── index.ts           # Type barrel
    ├── api.ts             # API response types
    ├── services.ts        # Service model types
    ├── chargers.ts        # Charger model types
    ├── messaging.ts       # Messaging model types
    └── operating-hours.ts # Operating hours types
```

**Key patterns:**
- `EVBUDDY_API` resolves to `http://127.0.0.1:5000` in dev, `window.location.origin` in production
- `apiCall()` wraps `fetch()` with duration timing, error normalization, and JSON parsing
- Auto-refresh: service matrix polls every 20 seconds
- Deferred search: uses `useDeferredValue` for non-blocking filter UI

---

## 5. Data Flow

### Typical Proxy Request Flow

```
Browser → Flask Middleware Pipeline → Blueprint Route Handler
         → helpers.proxy_json_request()
         → helpers.ev_http() → BaseHttpClient.request()
         → requests.Session() → Upstream Microservice
         ← JSON Response
         ← Flask jsonify() → Browser
```

### EV Charging Session Lifecycle

```
1. POST /v1/qr/resolve          → Parse QR → Return site/charger/pricing info
2. POST /v1/auth/hotel           → Validate reservation → Issue JWT
   OR POST /v1/auth/card/init    → Look up user → Issue JWT + payment ref
3. POST /v1/sessions             → Auth check → OCPP remote-start → Create session
4. GET  /v1/sessions/:id         → Recompute state → Poll OCPP status → Return session
5. POST /v1/sessions/:id/stop    → OCPP remote-stop → Mark stop requested
6. GET  /v1/sessions/:id/receipt → Generate receipt after completion
```

---

## 6. Persistence Layer

| Store | Location | Engine | Purpose |
|-------|----------|--------|---------|
| EV Sessions (runtime) | `config.EV_SESSIONS` | In-memory dict | Active charging session state |
| EV Sessions (durable) | `SessionRepository` | In-memory (with persistence interface) | Session data across requests |
| CPMS Ledger | `data/cpms_tx_ledger.db` | SQLite | Command transaction records |
| CPMS In-Memory | `CPMS_TX_LEDGER` dict | In-memory dict | Hot cache for recent transactions |

**CPMS Ledger schema:**
```sql
CREATE TABLE cpms_tx_ledger (
    txid TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    action TEXT NOT NULL,
    command_code TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    payload_json TEXT NOT NULL
);
CREATE INDEX idx_cpms_asset_time ON cpms_tx_ledger(asset_id, timestamp DESC);
```

---

## 7. Authentication & Authorization

Two distinct auth mechanisms exist:

### Platform-Level API Key Auth
- Enforced by `src/api/middleware/auth.py`
- Optional — gated by `API_REQUIRE_KEY=true`
- Requires `X-API-Key` header matching `API_KEY` env var
- Health endpoints are always exempt

### EV Charging Token Auth
- Enforced by `helpers.ev_require_auth` decorator
- JWT-based (HS256) signed with `JWT_SECRET`
- Token payload: `{siteId, chargerId, mode}`
- Special bypass: `Bearer demo-token` grants access with default site/charger
- Used on session creation (`POST /v1/sessions`) and stop (`POST /v1/sessions/:id/stop`)

---

## 8. Upstream Microservice Topology

All upstream services run on `dev.evbuddy.net` across ports 9000–9036:

### Core Services (Ports 9000–9003)
| Port | Service | Base Path |
|------|---------|-----------|
| 9000 | Users | `/user` |
| 9001 | User Vehicles | `/user-vehicle/vehicles` |
| 9002 | User Payments | `/payments` |
| 9003 | User Subscriptions | `/user-subscriptions` |

### Host Ops Services (Ports 9004–9027)
| Port | Service | Base Path |
|------|---------|-----------|
| 9004 | Host Sites | `/host-sites` |
| 9005 | Access Control | `/access-control` |
| 9008 | Operating Hours | `/operating-hours` |
| 9027 | Host Rooms | `/hostrooms` |

### Charging Services (Ports 9017–9034)
| Port | Service | Base Path |
|------|---------|-----------|
| 9017 | Chargers | `/chargers` |
| 9018 | Charge Box | `/chargeboxes` |
| 9026 | Service Pricing / Catalog / Provider | `/service-pricing`, `/services`, `/provider-services` |
| 9028 | EV Chargers (Nearby) | `/api/ev-chargers` |
| 9029 | OCPP Central System | (root) |
| 9030 | Pricing | `/pricing` |
| 9031 | Booking | `/bookings` |
| 9032 | Session Billing / Transactions / Admin | `/sessions`, `/transactions`, `/admin` |
| 9033 | Stripe / Payouts / Webhooks | `/stripe`, `/payouts`, `/webhooks` |
| 9034 | Promo Credit / Credits | `/promos`, `/credits` |

### Messaging & Dispatch (Ports 9011, 9024, 9036)
| Port | Service | Base Path |
|------|---------|-----------|
| 9011 | Messaging | (root) |
| 9024 | Dispatch | (root, not yet deployed) |
| 9036 | Notifications | `/notifications` |

### Community Services (Ports 9012–9035)
| Port | Service | Base Path |
|------|---------|-----------|
| 9012 | Community Comments | `/communitycomments` |
| 9013 | Community Posts | `/communityposts` |
| 9014 | News Posts | `/newsposts` |
| 9015 | Service Reviews | `/service-reviews` |
| 9035 | Ratings & Reviews | `/reviews` |

---

## 9. Deployment Modes

### Development Mode (Dual Process)
```
Flask  →  :5000  (API backend, static fallback)
Vite   →  :5173  (HMR dev server, proxies API calls to :5000)
```

### Production Mode (Single Process)
```
1. Build frontend:  cd client && npm run build
2. Start Flask:     python app.py
3. Flask serves client/dist/index.html for all non-API routes
4. API routes handled by blueprints as normal
```

Flask detects the presence of `client/dist/index.html` at startup and automatically switches between SPA serving and server-rendered template fallback.
