# EVBuddy API Documentation

**Base URL:** `http://localhost:5000`  
**Content-Type:** `application/json`

> **Single-server setup**: The guest charging flow UI is served by the same Flask app at `/guest`, and the guest charging APIs live under `/v1/*`.

## Guest Charging Flow (UI)

- **Guest UI:** `/guest`
- **QR Page:** `/guest/qr`

---

## Table of Contents

1. [Health & Status](#health--status)
2. [Users](#users)
3. [User Vehicles](#user-vehicles)
4. [User Payments](#user-payments)
5. [Roles & Permissions](#roles--permissions)
6. [Host Site Members](#host-site-members)
7. [Driver Access Control](#driver-access-control)
8. [Invitations](#invitations)
9. [Authorization Checks](#authorization-checks)
10. [Audit Log](#audit-log)
11. [CPMS Operations (Charger Control)](#cpms-operations-charger-control)
12. [Session Management](#session-management)
13. [Security Administration](#security-administration)
14. [Service Discovery](#service-discovery)

---

## Health & Status

### GET /health
Check if the API server is running.

**Response:**
```json
{
  "status": "ok"
}
```

---

## Users

### GET /api/users
Get all users from the backend microservice.

**Response:** Array of user objects
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "display_name": "JohnD",
    "is_host": false,
    "is_driver": true,
    "createdAt": "2025-11-01T18:53:14"
  }
]
```

### GET /api/users/:user_id
Get a single user by ID.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| user_id | integer | User ID |

**Response:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

**Errors:**
- `404` - User not found

### POST /api/users
Create a new user.

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone_number": "+1234567890",
  "is_host": false,
  "is_driver": true,
  "is_admin": false
}
```

**Response:** `200` - Created user object

### PUT /api/users/:user_id
Full update of a user (replace all fields).

**Request Body:** Complete user object

### PATCH /api/users/:user_id
Partial update of a user.

**Request Body:** Fields to update
```json
{
  "display_name": "NewDisplayName"
}
```

**Response:**
```json
{
  "id": 1095,
  "display_name": "NewDisplayName",
  "updated_at": "2026-02-03T01:43:31"
}
```

### DELETE /api/users/:user_id
Delete a user by ID.

**Response:** `200` on success, `404` if not found

---

## User Vehicles

### GET /api/vehicles
Get all registered vehicles.

**Response:**
```json
[
  {
    "id": 2,
    "vin": "1HGBH41JXMN109186",
    "nickname": "My Tesla",
    "color": "White",
    "user_id": 9,
    "vehicle_model_id": 5,
    "vehicle_year": 2023,
    "license_plate": "ABC123",
    "is_primary": false,
    "created_at": "2025-11-01T22:15:48",
    "updated_at": "2025-11-01T22:15:48"
  }
]
```

### GET /api/vehicles/:vehicle_id
Get a specific vehicle by ID.

**Response:** Single vehicle object

### GET /api/users/:user_id/vehicles
Get all vehicles belonging to a specific user.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| user_id | integer | User ID |

**Response:** Array of vehicle objects

### POST /api/vehicles
Create a new vehicle.

**Request Body:**
```json
{
  "user_id": 9,
  "vin": "5YJ3E1EA1PF123456",
  "nickname": "My EV",
  "color": "Blue",
  "vehicle_model_id": 5,
  "vehicle_year": 2024,
  "license_plate": "EV2024",
  "is_primary": true
}
```

**Response:** `200` - Created vehicle object with assigned `id`

### PATCH /api/vehicles/:vehicle_id
Partially update a vehicle.

**Request Body:** Fields to update
```json
{
  "color": "Midnight Silver",
  "nickname": "Updated Name"
}
```

**Response:** Updated vehicle object

### DELETE /api/vehicles/:vehicle_id
Delete a vehicle.

**Response:**
```json
{
  "ok": true,
  "message": "Vehicle deleted"
}
```

> **Note:** PUT is not supported by the backend. Use PATCH for updates.

---

## User Payments

Manage user payment methods (credit/debit cards).

### GET /api/payments
Get all payment methods.

**Response:**
```json
[
  {
    "id": 1003,
    "user_id": 1001,
    "cardtype": 2,
    "nickname": "My Visa",
    "primary_number": "4089123455678709",
    "cardholder_name": "John Doe",
    "expiration": "2030-11-01",
    "cvc": "888",
    "billing_street": "123 Main St",
    "billing_city": "Detroit",
    "billing_state": "MI",
    "billing_country": "US",
    "billing_phone": "3132221212",
    "createdAt": "2025-11-24T14:36:49",
    "updatedAt": "2025-11-29T00:12:45"
  }
]
```

### GET /api/payments/:payment_id
Get a specific payment method by ID.

**Response:** Single payment object

### GET /api/users/:user_id/payments
Get all payment methods belonging to a specific user.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| user_id | integer | User ID |

**Response:** Array of payment method objects

### POST /api/payments
Create a new payment method.

**Request Body:**
```json
{
  "user_id": 123,
  "cardtype": 1,
  "nickname": "My Visa",
  "primary_number": "4111111111111111",
  "cardholder_name": "John Doe",
  "expiration": "2028-12-01",
  "cvc": "123",
  "billing_street": "123 Main St",
  "billing_city": "New York",
  "billing_state": "NY",
  "billing_country": "US",
  "billing_phone": "5551234567"
}
```

**Card Types:**
| Value | Type |
|-------|------|
| 1 | Visa |
| 2 | Mastercard |
| 3 | Amex |
| 4 | Discover |

**Response:** `201` - Created payment object with assigned `id`

### DELETE /api/payments/:payment_id
Delete a payment method.

**Response:**
```json
{
  "ok": true,
  "message": "Payment method deleted"
}
```

> **Note:** PATCH/PUT updates are not supported by this backend service.

---

## Roles & Permissions

### GET /api/roles
Get all available roles.

**Response:**
```json
{
  "roles": [
    {"id": 1, "name": "platform_admin"},
    {"id": 2, "name": "ops"},
    {"id": 3, "name": "host_owner"},
    {"id": 4, "name": "driver"}
  ]
}
```

### GET /api/users/:user_id/roles
Get roles assigned to a specific user.

**Response:**
```json
{
  "user_id": 1,
  "roles": ["platform_admin", "driver"]
}
```

### POST /api/users/:user_id/roles
Assign a role to a user.

**Request Body:**
```json
{
  "role": "driver",
  "actor_user_id": 1
}
```

**Response:**
```json
{
  "ok": true,
  "user_id": 10,
  "roles": ["driver"]
}
```

---

## Host Site Members

### GET /api/sites/:site_id/members
Get all members of a host site.

**Response:**
```json
{
  "site_id": 1,
  "members": [
    {
      "user_id": 5,
      "site_role": "owner",
      "status": "active",
      "created_at": "2026-02-03T01:43:31",
      "updated_at": "2026-02-03T01:43:31"
    }
  ]
}
```

### POST /api/sites/:site_id/members/:user_id
Add a user as a site member.

**Request Body:**
```json
{
  "site_role": "manager",
  "actor_user_id": 1
}
```

**Site Roles:** `owner`, `manager`, `staff`, `viewer`

**Response:**
```json
{
  "ok": true,
  "site_id": 1,
  "user_id": 5,
  "site_role": "owner"
}
```

### POST /api/sites/:site_id/members/invite
Invite a user to manage a host site via email.

**Request Body:**
```json
{
  "email": "manager@example.com",
  "site_role": "manager",
  "actor_user_id": 1
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Invitation sent to manager@example.com",
  "token": "uuid-token",
  "expires_at": "2026-02-10T01:43:31"
}
```

### DELETE /api/sites/:site_id/members/:user_id
Remove a user from site membership.

---

## Driver Access Control

### GET /api/sites/:site_id/drivers
List all drivers with access to a private site.

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| actor_user_id | integer | User requesting the list (for auth) |

**Response:**
```json
{
  "site_id": 1,
  "drivers": [
    {
      "driver_user_id": 10,
      "access_status": "approved",
      "access_start": "2026-02-03T01:43:31",
      "access_end": null,
      "approved_by_user_id": 5,
      "reason": null
    }
  ]
}
```

**Access Statuses:** `pending`, `approved`, `blocked`, `revoked`

### POST /api/sites/:site_id/access-request
Driver requests access to a private site.

**Request Body:**
```json
{
  "driver_user_id": 10,
  "reason": "Need to charge at work"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Access request submitted",
  "status": "pending"
}
```

### POST /api/sites/:site_id/drivers/:driver_id/approve
Approve a driver's access request.

**Request Body:**
```json
{
  "actor_user_id": 5,
  "access_end": "2026-02-10T00:00:00"
}
```

The `access_end` field is optional for time-limited access.

**Response:**
```json
{
  "ok": true,
  "message": "Driver approved",
  "access_end": "2026-02-10T00:00:00"
}
```

### POST /api/sites/:site_id/drivers/:driver_id/block
Block a driver from the site.

**Request Body:**
```json
{
  "actor_user_id": 5,
  "reason": "Policy violation"
}
```

### POST /api/sites/:site_id/drivers/:driver_id/revoke
Revoke a driver's access (different from block - can re-request).

### POST /api/sites/:site_id/drivers/:driver_id/unblock
Unblock a previously blocked driver.

### POST /api/sites/:site_id/drivers/invite
Invite a driver to a private site via email.

**Request Body:**
```json
{
  "email": "driver@example.com",
  "access_end": "2026-03-01T00:00:00",
  "actor_user_id": 5
}
```

---

## Driver Self-Service

### GET /api/me/site-access
Get the current driver's approved sites.

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| driver_user_id | integer | Driver's user ID |

**Response:**
```json
{
  "driver_user_id": 10,
  "approved_sites": [
    {
      "site_id": 1,
      "access_status": "approved",
      "access_start": "2026-02-03T01:43:31",
      "access_end": null
    }
  ]
}
```

### GET /api/me/site-access/all
Get all site access records for a driver (including pending, revoked).

---

## Invitations

### GET /api/invitations/:token
Get invitation details by token.

**Response:**
```json
{
  "invitation_type": "site_member",
  "site_id": 1,
  "email": "user@example.com",
  "site_role": "manager",
  "expires_at": "2026-02-10T01:43:31",
  "status": "pending"
}
```

### POST /api/invitations/:token/accept
Accept an invitation.

**Request Body:**
```json
{
  "user_id": 15
}
```

---

## Authorization Checks

### GET /api/auth/can-manage-site/:site_id
Check if a user can manage a site.

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| user_id | integer | User to check |

**Response:**
```json
{
  "site_id": 1,
  "user_id": 5,
  "can_manage": true,
  "membership": {
    "site_role": "owner",
    "status": "active"
  },
  "roles": ["platform_admin"]
}
```

### GET /api/auth/can-use-site/:site_id
Check if a driver can use a site's chargers.

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| driver_user_id | integer | Driver to check |
| visibility | string | `public` or `private` |

**Response:**
```json
{
  "site_id": 1,
  "driver_user_id": 10,
  "visibility": "private",
  "can_use": true,
  "access_record": {
    "access_status": "approved",
    "access_start": "2026-02-03T01:43:31",
    "access_end": null
  }
}
```

---

## Audit Log

### GET /api/audit-log
Get recent audit log entries.

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| limit | integer | Max entries (default: 50) |

**Response:**
```json
{
  "entries": [
    {
      "timestamp": "2026-02-03T01:43:31",
      "actor_user_id": 5,
      "action": "DRIVER_APPROVED",
      "target_type": "driver_access",
      "target_id": 10,
      "details": {"site_id": 1}
    }
  ]
}
```

---

## CPMS Operations (Charger Control)

These endpoints require authentication and operator role authorization.

### POST /api/assets/:asset_id/remote-start
Start a charging session remotely.

**Required Roles:** `operator_owner`, `operator_admin`, `operator_ops`, `operator_support`

**Headers:**
```
X-User-ID: 50
```

**Request Body:**
```json
{
  "connector_id": 1,
  "id_tag": "RFID123"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Remote start command sent",
  "asset_id": "CHARGER-001",
  "connector_id": 1
}
```

### POST /api/assets/:asset_id/remote-stop
Stop a charging session.

**Request Body:**
```json
{
  "transaction_id": "TXN-12345"
}
```

### POST /api/assets/:asset_id/maintenance-mode
Set charger to maintenance mode.

**Required Roles:** `operator_owner`, `operator_admin`, `operator_ops`, `operator_tech`

**Request Body:**
```json
{
  "enabled": true,
  "reason": "Scheduled maintenance"
}
```

### GET /api/assets/:asset_id/diagnostics
Get charger diagnostics.

**Required Roles:** Any operator role (read access)

**Response:**
```json
{
  "asset_id": "CHARGER-001",
  "status": "Available",
  "firmware_version": "1.2.3",
  "last_heartbeat": "2026-02-03T01:40:00",
  "error_codes": []
}
```

### POST /api/assets/:asset_id/reset
Reset a charger (soft or hard).

**Request Body:**
```json
{
  "reset_type": "Soft"
}
```

### POST /api/assets/:asset_id/firmware-update
Trigger firmware update (admin only).

**Required Roles:** `operator_owner`, `operator_admin`

**Request Body:**
```json
{
  "firmware_url": "https://updates.example.com/v2.0.0.bin"
}
```

### POST /api/assets/:asset_id/change-configuration
Change charger configuration (admin only).

**Request Body:**
```json
{
  "key": "HeartbeatInterval",
  "value": "60"
}
```

### PUT /api/assets/:asset_id/tariff
Update pricing tariff (admin/finance only).

**Required Roles:** `operator_owner`, `operator_admin`, `operator_finance`

**Request Body:**
```json
{
  "price_per_kwh": 0.35,
  "currency": "USD"
}
```

---

## Session Management

### POST /api/sessions/:session_id/refund
Issue a refund for a charging session.

**Required Roles:** `operator_owner`, `operator_admin`, `operator_finance`

**Request Body:**
```json
{
  "amount": 25.00,
  "reason": "Charging issue"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Refund processed",
  "session_id": "123",
  "amount": 25.00,
  "reason": "Charging issue"
}
```

---

## Security Administration

### GET /api/security/roles
Get all role definitions (global, site, and operator roles).

**Response:**
```json
{
  "global_roles": ["platform_admin", "ops", "driver", "host", "community_admin"],
  "site_roles": ["owner", "manager", "staff", "viewer"],
  "operator_roles": ["operator_owner", "operator_admin", "operator_ops", "operator_tech", "operator_finance", "operator_viewer", "operator_support"]
}
```

### GET /api/security/audit-log
Get security audit log (platform_admin only).

**Headers:**
```
X-User-ID: 100
```

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| limit | integer | Max entries (default: 50) |

### POST /api/security/setup/operator
Assign an operator role to a user (for testing/setup).

**Request Body:**
```json
{
  "user_id": 50,
  "operator_id": 1,
  "role": "operator_admin"
}
```

### POST /api/security/setup/asset
Register an asset to an operator (for testing/setup).

**Request Body:**
```json
{
  "asset_id": "CHARGER-001",
  "operator_id": 1
}
```

---

## Service Discovery

### GET /api/services
Discover all backend microservices and their status.

**Response:**
```json
{
  "host": "http://20.119.73.31",
  "services": {
    "users": {"port": 9000, "status": "up"},
    "user_vehicles": {"port": 9001, "status": "up"},
    "host_sites": {"port": 9004, "status": "up"},
    "chargers": {"port": 9017, "status": "up"}
  },
  "summary": {
    "total": 11,
    "available": 9,
    "unavailable": 2
  }
}
```

### GET /api/services/:service_name
Get details for a specific service.

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)",
  "code": "ERROR_CODE (optional)"
}
```

**Common HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (missing/invalid parameters) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (backend down) |

---

## Running the API

```bash
# Activate virtual environment
.venv/Scripts/Activate.ps1

# Set Flask app
$env:FLASK_APP = "app.py"

# Run server
python -m flask run
```

The server runs on `http://localhost:5000` by default.

---

## Running Tests

```bash
python test_api.py
```

This runs automated tests against all API endpoints.
