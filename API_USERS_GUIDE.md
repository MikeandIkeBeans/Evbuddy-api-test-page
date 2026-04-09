## EVBuddy API User Guide

This guide explains how to use the local Flask proxy while integrating with appdev-backed services.

### Base URL

- Local proxy: `http://127.0.0.1:5000`

### Authentication

- Most `/api/*` routes are proxy pass-through and follow upstream auth behavior.
- Charging session endpoints under `/v1/*` accept bearer tokens.
- For local testing, `Bearer demo-token` is accepted by the charging auth helper.

### Common Flows

1. Check health: `GET /health`
2. Check service availability: `GET /api/services`
3. List users: `GET /api/users`
4. Start charging session: `POST /v1/sessions`
5. Poll session: `GET /v1/sessions/{sessionId}`
6. Stop session: `POST /v1/sessions/{sessionId}/stop`

### Error Handling

- `4xx` typically indicates request validation or upstream not-found.
- `5xx/503` usually indicates an upstream appdev service is unavailable.
- Proxy endpoints generally preserve upstream status codes and payloads.

### Related Docs

- `API_DOCUMENTATION.md` for route inventory
- `API_OCPP_PLAYGROUND.md` for charging/OCPP verification
- `API_MESSAGING.md` for messaging resource details

