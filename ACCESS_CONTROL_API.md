# EVBuddy Access Control API

This document describes the RBAC (Role-Based Access Control) API endpoints for managing:
- **Global roles** (platform_admin, ops, host_owner, driver)
- **Host site membership** (who can manage sites)
- **Driver access** to private sites (approve/block/revoke)
- **Invitations** (invite by email)
- **Audit logging** (track all actions)

---

## Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Roles** |
| GET | `/api/roles` | List all available roles |
| GET | `/api/users/{id}/roles` | Get user's roles |
| POST | `/api/users/{id}/roles` | Assign role to user |
| **Site Members** |
| GET | `/api/sites/{id}/members` | List site members |
| POST | `/api/sites/{id}/members/invite` | Invite member by email |
| POST | `/api/sites/{id}/members/{userId}` | Add user as member |
| DELETE | `/api/sites/{id}/members/{userId}` | Remove member |
| **Driver Access** |
| GET | `/api/sites/{id}/drivers` | List drivers with access |
| POST | `/api/sites/{id}/drivers/invite` | Invite driver by email |
| POST | `/api/sites/{id}/access-request` | Driver requests access |
| POST | `/api/sites/{id}/drivers/{driverId}/approve` | Approve driver |
| POST | `/api/sites/{id}/drivers/{driverId}/block` | Block driver |
| POST | `/api/sites/{id}/drivers/{driverId}/revoke` | Revoke access |
| POST | `/api/sites/{id}/drivers/{driverId}/unblock` | Unblock driver |
| **Driver Self-Service** |
| GET | `/api/me/site-access` | Get my approved sites |
| GET | `/api/me/site-access/all` | Get all my access records |
| **Invitations** |
| GET | `/api/invitations/{token}` | Get invitation details |
| POST | `/api/invitations/{token}/accept` | Accept invitation |
| **Authorization Checks** |
| GET | `/api/auth/can-manage-site/{id}` | Check if user can manage site |
| GET | `/api/auth/can-use-site/{id}` | Check if driver can use site |
| **Audit** |
| GET | `/api/audit-log` | View audit log |

---

## Authorization Rules

### Who can manage a host site?
A user can manage a host site if:
- They have `platform_admin` or `ops` role, **OR**
- They are in `host_site_members` with `site_role` = `owner` or `manager` and `status` = `active`

### Who can use a private host site as a driver?
A driver can charge if:
- Site is **public**, **OR**
- Driver has `access_status` = `approved`
- AND `access_end` is null OR `now < access_end`
- AND not `blocked`

### Who can block/approve drivers?
Only:
- Site owner/manager, **OR**
- `platform_admin` / `ops`

---

## Endpoints

### 1. Roles

#### List All Roles
```bash
GET /api/roles
```

Response:
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

#### Get User's Roles
```bash
GET /api/users/1/roles
```

Response:
```json
{
  "user_id": 1,
  "roles": ["platform_admin"]
}
```

#### Assign Role to User
```bash
POST /api/users/1/roles
Content-Type: application/json

{
  "role": "platform_admin",
  "actor_user_id": 1
}
```

---

### 2. Site Members

#### List Site Members
```bash
GET /api/sites/1/members
```

Response:
```json
{
  "site_id": 1,
  "members": [
    {
      "user_id": 5,
      "site_role": "owner",
      "status": "active",
      "created_at": "2026-02-02T...",
      "updated_at": "2026-02-02T..."
    }
  ]
}
```

#### Invite Site Member by Email
```bash
POST /api/sites/1/members/invite
Content-Type: application/json

{
  "email": "manager@example.com",
  "site_role": "manager",
  "actor_user_id": 5
}
```

Response:
```json
{
  "ok": true,
  "message": "Invitation sent to manager@example.com",
  "token": "abc123...",
  "expires_at": "2026-02-09T..."
}
```

#### Add User as Site Member (Direct)
```bash
POST /api/sites/1/members/5
Content-Type: application/json

{
  "site_role": "owner",
  "actor_user_id": 1
}
```

#### Remove Site Member
```bash
DELETE /api/sites/1/members/5?actor_user_id=1
```

---

### 3. Driver Access

#### List Drivers with Access
```bash
GET /api/sites/1/drivers?actor_user_id=5
```

Response:
```json
{
  "site_id": 1,
  "drivers": [
    {
      "driver_user_id": 10,
      "access_status": "approved",
      "access_start": "2026-02-02T...",
      "access_end": null,
      "approved_by_user_id": 5,
      "reason": "Need to charge at work"
    }
  ]
}
```

#### Invite Driver by Email
```bash
POST /api/sites/1/drivers/invite
Content-Type: application/json

{
  "email": "driver@example.com",
  "actor_user_id": 5
}
```

#### Driver Requests Access
```bash
POST /api/sites/1/access-request
Content-Type: application/json

{
  "driver_user_id": 10,
  "reason": "Need to charge at work"
}
```

Response:
```json
{
  "ok": true,
  "message": "Access request submitted",
  "status": "pending"
}
```

#### Approve Driver
```bash
POST /api/sites/1/drivers/10/approve
Content-Type: application/json

{
  "actor_user_id": 5,
  "access_end": "2026-02-10T00:00:00"  // optional, for time-limited access
}
```

#### Block Driver
```bash
POST /api/sites/1/drivers/10/block
Content-Type: application/json

{
  "actor_user_id": 5,
  "reason": "Policy violation"
}
```

#### Revoke Driver Access
```bash
POST /api/sites/1/drivers/10/revoke
Content-Type: application/json

{
  "actor_user_id": 5,
  "reason": "Access period ended"
}
```

#### Unblock Driver
```bash
POST /api/sites/1/drivers/10/unblock
Content-Type: application/json

{
  "actor_user_id": 5
}
```

---

### 4. Driver Self-Service

#### Get My Approved Sites
```bash
GET /api/me/site-access?driver_user_id=10
```

Response:
```json
{
  "driver_user_id": 10,
  "approved_sites": [
    {
      "site_id": 1,
      "access_status": "approved",
      "access_start": "2026-02-02T...",
      "access_end": null
    }
  ]
}
```

#### Get All My Access Records
```bash
GET /api/me/site-access/all?driver_user_id=10
```

---

### 5. Invitations

#### Get Invitation Details
```bash
GET /api/invitations/abc123...
```

#### Accept Invitation
```bash
POST /api/invitations/abc123.../accept
Content-Type: application/json

{
  "user_id": 10
}
```

---

### 6. Authorization Checks

#### Check If User Can Manage Site
```bash
GET /api/auth/can-manage-site/1?user_id=5
```

Response:
```json
{
  "user_id": 5,
  "site_id": 1,
  "can_manage": true,
  "roles": [],
  "membership": {
    "user_id": 5,
    "site_role": "owner",
    "status": "active"
  }
}
```

#### Check If Driver Can Use Site
```bash
GET /api/auth/can-use-site/1?driver_user_id=10&visibility=private
```

Response:
```json
{
  "driver_user_id": 10,
  "site_id": 1,
  "visibility": "private",
  "can_use": true,
  "access_record": {
    "access_status": "approved",
    "access_start": "2026-02-02T...",
    "access_end": null
  }
}
```

---

### 7. Audit Log

#### View Audit Log
```bash
GET /api/audit-log?limit=50
GET /api/audit-log?entity_type=host_site&entity_id=1
```

Response:
```json
{
  "logs": [
    {
      "id": 1,
      "actor_user_id": 5,
      "action": "DRIVER_APPROVED",
      "entity_type": "driver_access",
      "entity_id": 10,
      "details": {"site_id": 1},
      "timestamp": "2026-02-02T..."
    }
  ],
  "count": 1
}
```

---

## Access Status Values

| Status | Description |
|--------|-------------|
| `pending` | Driver requested access, awaiting approval |
| `approved` | Driver has active access |
| `revoked` | Access was removed (can be re-approved) |
| `blocked` | Driver is blocked (policy violation, must unblock first) |

---

## Site Role Values

| Role | Permissions |
|------|-------------|
| `owner` | Full control, can manage members and drivers |
| `manager` | Can manage drivers and site settings |
| `staff` | Limited access (view only for now) |
| `viewer` | Read-only access |

---

## Notes

- **Time-limited access**: Set `access_end` when approving for temporary access (e.g., "weekend only")
- **Block vs Revoke**: 
  - `revoked` = "not currently allowed" (can be re-approved)
  - `blocked` = "do not allow / suspicious / policy violation" (must unblock first)
- **In-memory storage**: Currently uses in-memory storage for demo purposes. Replace with database calls when DB access is available.
