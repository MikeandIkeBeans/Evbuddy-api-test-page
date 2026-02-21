# EVBuddy Homepage

Flask proxy + React dashboard for EVBuddy service integration and demo charging flows.

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
- `MICROSERVICE_HOST` (default: `http://dev.evbuddy.net`)
- `USE_REAL_API` (default: `true`, only exact `false` disables)
- `USE_REAL_CHARGER` (default: `false`)
- `JWT_SECRET` (default: `dev-secret-change-me`)
- `DEMO_TIME_SCALE` (default: `30`)

## Project Layout
```text
app.py                 Flask entrypoint and app factory
config.py              Shared settings and service registry
helpers.py             Shared HTTP/session/auth helpers
security.py            RBAC and scope enforcement
routes/                Flask blueprints grouped by domain
templates/index.html   Server-rendered fallback page
test-page.html         Guest flow test page
client/                React dashboard
```

## API Groups
- `/api/*`: business, users, vehicles, payments, security, services
- `/v1/*`: EV charging flow and charger/session endpoints
- `/health`: local health check

## Notes
- This repo currently includes some local backup files (`*.bak`) from previous edits; they are now ignored by git.
- Most routes proxy upstream services and intentionally return upstream status codes/payloads.
