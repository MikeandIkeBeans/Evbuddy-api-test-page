# EVBuddy API Reference

> **Last updated:** 2026-05-02  
> **Base URL:** `http://127.0.0.1:5000` (local dev)

---

## Table of Contents

1. [Platform Health & Service Discovery](#1-platform-health--service-discovery)
2. [Users](#2-users)
3. [Vehicles](#3-vehicles)
4. [Host Sites](#4-host-sites)
5. [Messaging](#5-messaging)
6. [EV Charging Flow](#6-ev-charging-flow)
7. [CPMS Operations](#7-cpms-operations)
8. [V2V Charging](#8-v2v-charging)
9. [Dispatch & Responder](#9-dispatch--responder)
10. [Experience Snapshot](#10-experience-snapshot)
11. [Pages & Static](#11-pages--static)
12. [Error Format](#12-error-format)

---

## 1. Platform Health & Service Discovery

### `GET /health`
Local health check.

**Response:**
```json
{ "status": "ok" }
```

---

### `GET /api/platform/health`
Contract-normalized health endpoint with stable envelope.

**Response:**
```json
{
  "ok": true,
  "data": { "status": "ok" }
}
```

---

### `GET /api/services`
Query all registered upstream microservices concurrently and return their availability status.

**Response:**
```json
{
  "ok": true,
  "data": {
    "services": {
      "users": {
        "service": "users",
        "port": 9000,
        "base_url": "http://dev.evbuddy.net:9000/user",
        "status_url": "http://dev.evbuddy.net:9000/user/status",
        "available": true,
        "status_code": 200,
        "response": { ... }
      }
    },
    "summary": {
      "total": 34,
      "available": 30,
      "unavailable": 4
    },
    "evbuddy_dev_host": "http://dev.evbuddy.net"
  }
}
```

---

### `GET /api/services/<service_name>`
Check status of a single service by name.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `service_name` | string | Service key (e.g., `users`, `chargers`, `ocpp`) |

**Response:** Same structure as individual service entry from `/api/services`.

**Error (404):**
```json
{
  "error": "Unknown service: foo",
  "available_services": ["users", "chargers", ...]
}
```

---

### `GET /api/platform/services/<service_name>`
Contract-normalized service status endpoint with stable error codes.

**Error (404):**
```json
{
  "ok": false,
  "error": {
    "code": "SERVICE_NOT_FOUND",
    "message": "Unknown service: foo",
    "details": { "availableServices": [...] }
  }
}
```

---

## 2. Users

All routes proxy to the Spring Boot Users microservice on `dev.evbuddy.net:9000`.

### `GET /api/users/status`
Check Users service health.

---

### `GET /api/users`
List all users.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 100 | Max results (1–500) |
| `page` | int | 1 | Page number |

---

### `GET /api/users/<user_id>`
Get a single user by ID.

| Param | Type | Description |
|-------|------|-------------|
| `user_id` | int | User ID |

---

### `POST /api/users`
Create a new user.

**Required Fields:** `email`

**Body:**
```json
{
  "email": "user@example.com",
  "name": "Jane Doe",
  "phone": "+14155551234"
}
```

---

### `PUT /api/users/<user_id>`
Full replacement update of a user.

**Required Fields:** `email`

---

### `PATCH /api/users/<user_id>`
Partial update of a user. Fetches the current user, merges the provided fields, and sends a full PUT to upstream.

**Body:** Any subset of user fields.

---

### `DELETE /api/users/<user_id>`
Delete a user by ID.

**Success (204):**
```json
{ "ok": true, "message": "User deleted" }
```

---

## 3. Vehicles

All routes proxy to the User Vehicles microservice on `dev.evbuddy.net:9001`.

### `GET /api/vehicles`
List all vehicles.

---

### `GET /api/vehicles/<vehicle_id>`
Get a single vehicle by ID.

---

### `GET /api/users/<user_id>/vehicles`
Get all vehicles belonging to a specific user.

---

### `POST /api/vehicles`
Create a new vehicle.

**Body:**
```json
{
  "make": "Tesla",
  "model": "Model 3",
  "year": 2024,
  "vin": "5YJ3E1EA8PF123456",
  "userId": 42
}
```

---

### `PUT /api/vehicles/<vehicle_id>`
Full replacement update. Returns 405 if the upstream doesn't support PUT.

---

### `PATCH /api/vehicles/<vehicle_id>`
Partial update of a vehicle.

---

### `DELETE /api/vehicles/<vehicle_id>`
Delete a vehicle.

---

## 4. Host Sites

### `GET /api/sites`
List all sites from the host-sites service.

---

### `GET /api/sites/<site_id>`
Get a single site by ID (filters from the full collection).

---

### `GET /api/businesses/<business_id>/sites`
List sites for a specific host/business.

---

### `POST /api/businesses/<business_id>/sites`
Create a new site under a business.

**Body:**
```json
{
  "name": "Downtown Garage",
  "address": "123 Main St",
  "latitude": 33.749,
  "longitude": -84.388
}
```

---

### `PUT /api/sites/<site_id>`
Update a site.

---

### `DELETE /api/sites/<site_id>`
Delete a site.

---

### `GET /api/sites/<site_id>/members`
List all members of a host site.

---

### `POST /api/sites/<site_id>/members/invite`
Invite a user to manage a host site.

**Body:**
```json
{
  "email": "manager@example.com",
  "role": "ADMIN"
}
```

---

### `POST /api/sites/<site_id>/members/<user_id>`
Directly add a user as a site member.

---

### `DELETE /api/sites/<site_id>/members/<user_id>`
Remove a user from site membership.

---

### `GET /api/data`
Return landing page content for the SPA (meta, features, steps, stats).

---

### `POST /api/preorder`
Submit a pre-order to the business backend.

---

### `POST /api/subscribe`
Subscribe to newsletter updates.

---

## 5. Messaging

All routes proxy to the Central Messaging Service on `dev.evbuddy.net:9011`.

### Threads

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messaging/threads` | List threads (filter by type, status, priority, assignee, entity) |
| `POST` | `/api/messaging/threads` | Create a new thread |
| `GET` | `/api/messaging/threads/<thread_id>` | Get a single thread |
| `PATCH` | `/api/messaging/threads/<thread_id>` | Update thread (subject, priority, status, assignee) |
| `DELETE` | `/api/messaging/threads/<thread_id>` | Delete a thread |

**Thread list query parameters:**
| Param | Description |
|-------|-------------|
| `threadType` | Filter by thread type |
| `status` | Filter by status |
| `priority` | Filter by priority |
| `assignedToAccountId` | Filter by assigned account |
| `relatedEntityType` | Filter by related entity type |
| `relatedEntityId` | Filter by related entity ID |
| `page` | Page number |
| `pageSize` | Results per page |
| `sort` | Sort field |
| `order` | Sort order (`asc`/`desc`) |

### Messages

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messaging/threads/<thread_id>/messages` | List messages (filter by type, since) |
| `POST` | `/api/messaging/threads/<thread_id>/messages` | Post a message |
| `GET` | `/api/messaging/threads/<thread_id>/messages/<message_id>` | Get a message |
| `PATCH` | `/api/messaging/threads/<thread_id>/messages/<message_id>` | Update message body |
| `DELETE` | `/api/messaging/threads/<thread_id>/messages/<message_id>` | Delete a message |

### Participants

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messaging/threads/<thread_id>/participants` | List participants |
| `POST` | `/api/messaging/threads/<thread_id>/participants` | Add participant |
| `GET` | `/api/messaging/threads/<thread_id>/participants/<account_id>` | Get participant |
| `PATCH` | `/api/messaging/threads/<thread_id>/participants/<account_id>` | Update participant (role, mute, canPost, lastRead) |
| `DELETE` | `/api/messaging/threads/<thread_id>/participants/<account_id>` | Remove participant |

### Attachments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `.../messages/<message_id>/attachments` | List attachments |
| `POST` | `.../messages/<message_id>/attachments` | Create attachment record |
| `GET` | `.../messages/<message_id>/attachments/<attachment_id>` | Get attachment metadata |
| `DELETE` | `.../messages/<message_id>/attachments/<attachment_id>` | Delete attachment |

### Status Events

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messaging/threads/<thread_id>/status-events` | List status transitions |
| `POST` | `/api/messaging/threads/<thread_id>/status-events` | Record status transition |
| `GET` | `/api/messaging/threads/<thread_id>/status-events/<event_id>` | Get event |

### Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messaging/templates` | List templates (filter by category, isActive) |
| `POST` | `/api/messaging/templates` | Create template |
| `GET` | `/api/messaging/templates/key/<key>` | Look up template by unique key |
| `GET` | `/api/messaging/templates/<template_id>` | Get template by ID |
| `PATCH` | `/api/messaging/templates/<template_id>` | Update template |
| `DELETE` | `/api/messaging/templates/<template_id>` | Delete template |

---

## 6. EV Charging Flow

The EV charging flow manages the full lifecycle from QR scan to receipt generation.

### QR & Authentication

#### `POST /v1/qr/resolve`
Parse a QR code and return site/charger/pricing info.

**Body:**
```json
{ "qr": "https://evbuddy.net/charge?chargerId=atl001&connectorId=1&siteId=HTL-DEMO-001" }
```

**Response:**
```json
{
  "siteId": "HTL-DEMO-001",
  "chargerId": "atl001",
  "connectorId": 1,
  "displayName": "Demo Garage Level 1 - Spot 12",
  "pricing": { "currency": "USD", "perKwh": 0.38, "sessionFee": 1.0 },
  "authModes": ["HOTEL_GUEST", "CARD"]
}
```

---

#### `POST /v1/auth/hotel`
Authenticate via hotel guest reservation.

**Body:**
```json
{
  "siteId": "HTL-DEMO-001",
  "chargerId": "atl001",
  "roomNumber": "204",
  "lastName": "Smith",
  "hostId": 1030
}
```

**Response:**
```json
{
  "accessToken": "<JWT>",
  "expiresInSec": 900,
  "guest": {
    "displayName": "Room 204",
    "reservationId": 42,
    "checkInDate": "2026-05-01",
    "checkOutDate": "2026-05-05"
  }
}
```

---

#### `POST /v1/auth/card/init`
Initialize card payment authentication.

**Body:**
```json
{
  "siteId": "HTL-DEMO-001",
  "chargerId": "atl001",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "paymentProvider": "demo",
  "clientSecret": "pi_demo_..._secret_demo",
  "paymentRef": "PAY-2026-000042",
  "accessToken": "<JWT>",
  "expiresInSec": 900
}
```

---

### Chargers

#### `GET /v1/chargers`
List chargers. Optionally filter by `siteId` or `status`.

| Param | Description |
|-------|-------------|
| `siteId` | Filter chargers by site |
| `status` | Filter by status (e.g., `available`) |

---

#### `GET /v1/chargers/<charger_id>`
Get charger info with connector status.

---

#### `GET /v1/chargers/<charger_id>/status`
Get real-time OCPP connector status.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `connector` | int | 1 | Connector ID to query |

---

### Sessions

#### `POST /v1/sessions` 🔐
Create a new charging session. **Requires `Authorization: Bearer <token>`.**

**Body:**
```json
{
  "chargerId": "atl001",
  "connectorId": 1,
  "limit": { "type": "TIME_MIN", "value": 30 },
  "paymentRef": "PAY-2026-000042"
}
```

**Response (201):**
```json
{
  "sessionId": "SES-1714672000000-a1b2c3",
  "status": "STARTING",
  "pollAfterMs": 2000,
  "transactionId": 12345
}
```

---

#### `GET /v1/sessions`
List all sessions (both in-memory and persisted).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 100 | Max results (1–1000) |

---

#### `GET /v1/sessions/<session_id>`
Get current session state. Recomputes virtual elapsed time, polls OCPP for real charger status.

**Response:**
```json
{
  "sessionId": "SES-...",
  "status": "CHARGING",
  "elapsedSec": 450,
  "energyKwh": 1.4,
  "energyDeliveredKwh": 1.4,
  "powerKw": 11.2,
  "cost": 1.53,
  "costDetail": { "currency": "USD", "amount": 1.53 },
  "socPercent": null,
  "message": null,
  "startedAt": "2026-05-02T19:00:00Z",
  "realCharger": {
    "status": "Charging",
    "transactionId": 12345,
    "errorCode": "NoError"
  }
}
```

**Session status values:** `STARTING` → `CHARGING` → `STOPPING` → `COMPLETE` | `PAUSED` | `FAILED`

---

#### `POST /v1/sessions/<session_id>/stop` 🔐
Stop a charging session. **Requires `Authorization: Bearer <token>`.**

---

#### `GET /v1/sessions/<session_id>/receipt`
Get receipt for a completed session. Returns 409 if session is not `COMPLETE`.

---

### Debug

#### `GET /v1/debug/sessions/<session_id>/correlation`
Correlate local session state with CPMS transaction records.

---

### Health & Dev Proxy

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/health` | Charging flow health check (tests upstream connectivity) |
| `POST` | `/v1/dev/user/getByEmail` | Look up user by email on dev API |
| `GET` | `/v1/dev/users` | List all dev API users |
| `POST` | `/v1/dev/proxy` | Generic proxy to dev API (pass `endpoint` + `body`) |

### Host Sites (v1 paths)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/host-sites` | List host sites |
| `GET` | `/v1/host-sites/<site_id>` | Get host site |
| `POST` | `/v1/host-sites` | Create host site |
| `PUT` | `/v1/host-sites/<site_id>` | Update host site |
| `DELETE` | `/v1/host-sites/<site_id>` | Delete host site |
| `GET` | `/v1/chargers/site/<site_id>` | Chargers by site |
| `GET` | `/v1/chargers/<charger_id>/details` | Charger details |

### OCPP Direct

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/chargers/ocpp/<charge_point_id>/status` | Full OCPP status with connectors |
| `GET` | `/v1/charge-points` | List all OCPP charge points |
| `GET` | `/v1/ocpp/sessions` | Aggregate live OCPP sessions across all charge points |

---

## 7. CPMS Operations

Charge Point Management System operations with local transaction ledger.

### `POST /api/assets/<asset_id>/remote-start`
Start a charging session remotely.

**Body:**
```json
{
  "connector_id": 1,
  "id_tag": "HOTEL-GUEST"
}
```

---

### `POST /api/assets/<asset_id>/remote-stop`
Stop a charging session remotely. **Requires `transaction_id` or `txid`.**

---

### `GET /api/transactions/<txid>`
Inspect a recorded CPMS/OCPP command by transaction ID.

---

### `GET /api/assets/<asset_id>/commands`
List recent command transactions for an asset.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 50 | Max results (1–500) |

---

### `POST /api/assets/<asset_id>/maintenance-mode`
Toggle maintenance mode.

**Body:**
```json
{ "enabled": true, "reason": "Scheduled maintenance" }
```

---

### `GET /api/assets/<asset_id>/diagnostics`
Get charger diagnostics (status, connectors, firmware, heartbeat).

---

### `POST /api/assets/<asset_id>/reset`
Reset the charger.

**Body:**
```json
{ "type": "Soft" }
```

---

### `POST /api/assets/<asset_id>/firmware-update`
Trigger firmware update. **Requires `firmware_url`.**

---

### `POST /api/assets/<asset_id>/change-configuration`
Change charger configuration. **Requires `key`.**

**Body:**
```json
{ "key": "HeartbeatInterval", "value": "300" }
```

---

### `POST /api/sessions/<session_id>/refund`
Issue a refund for a charging session. **Requires `operator_id` and `amount`.**

---

### `PUT /api/assets/<asset_id>/tariff`
Update charging tariff for an asset.

---

## 8. V2V Charging

V2V (Vehicle-to-Vehicle) charging demo routes targeting the `EVB-V2V-001-JP` charge point.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/v2v/status` | Get V2V charge point metadata and connector statuses |
| `POST` | `/v1/v2v/reset` | Send reset command (body: `{ "type": "Soft" }`) |
| `GET` | `/v1/v2v/sessions` | Get recent V2V sessions (max 15) |
| `POST` | `/v1/v2v/start` | Remote start a connector (body: `{ "connector_id": 1, "id_tag": "RFID001" }`) |
| `POST` | `/v1/v2v/stop` | Remote stop (requires `transaction_id`) |

---

## 9. Dispatch & Responder

All routes under `/api/v1/*` are proxied to the Dispatch Service on `dev.evbuddy.net:9024`.

**Path mapping rules:**
- `responders/me/*` (excluding session) → prepends `responderdashboards/`
- `responders/*/location` → prepends `responderdashboards/`
- `service-requests` (GET) → prepends `servicerequests/`

Supports all HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

---

## 10. Experience Snapshot

### `GET /api/experience/snapshot`
Returns a comprehensive platform snapshot including registered routes, settings, and guard rail configuration. Used by the dashboard command center UI.

---

## 11. Pages & Static

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serve React SPA (if built) or server-rendered fallback |
| `GET` | `/guest` | Guest charging flow test page |
| `GET` | `/test-page.html` | (Alias for `/guest`) |
| `GET` | `/guest/qr` | QR code page linking to the guest flow |
| `GET` | `/<path>` | Static file fallback / SPA catch-all |

---

## 12. Error Format

### Standard Error Envelope
```json
{
  "error": "Human-readable error message"
}
```

### Standard Error with Details
```json
{
  "error": "Service unavailable",
  "details": "Connection refused"
}
```

### Platform Contract Error
```json
{
  "ok": false,
  "error": {
    "code": "SERVICE_NOT_FOUND",
    "message": "Unknown service: foo",
    "details": { ... }
  }
}
```

### Validation Error
```json
{
  "error": "Missing required fields",
  "missing": ["email", "name"]
}
```

### Rate Limit Error (429)
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "too many requests"
  }
}
```

### Auth Error (401)
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "invalid api key"
  }
}
```

---

> 🔐 = Requires `Authorization: Bearer <token>` header
