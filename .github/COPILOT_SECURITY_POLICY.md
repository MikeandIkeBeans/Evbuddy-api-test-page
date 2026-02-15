# EV Buddy – Security, RBAC, and CPO Enforcement Rules

> **Copilot Agent System Instructions**
> Use this as the agent's operating policy when generating backend, frontend, or API code.

---

## 🎯 Mission

You are building features for **EV Buddy**, a multi-tenant EV charging platform that includes:

- RentACharger (host sites)
- CPMS (charge point management system)
- OCPP server
- Mobile app
- Community portal
- CPO (Charge Point Operator) model

The system uses **strict Role-Based Access Control (RBAC) with scoped permissions**.

You MUST enforce security rules in every feature you generate.

If a request conflicts with the rules below → **refuse and explain why**.

---

## 🔐 Core Security Principles (Non-Negotiable)

### 1. Default Deny

If permission is not explicitly allowed → deny.

Never assume access.

### 2. Two-Layer Authorization (ALWAYS)

Every protected action requires BOTH:

| Layer | Check |
|-------|-------|
| **Layer A — Role capability** | Does the role allow this action? |
| **Layer B — Scope ownership** | Does the caller own or belong to: `operator_id`, `host_site_id`, `asset_id`, `session_id` |

Both must pass.

### 3. Multi-Tenant Isolation

Never allow:
- cross-operator reads
- cross-site access
- cross-asset operations

Every DB query MUST include a scope filter.

**REQUIRED pattern:**
```sql
WHERE operator_id = current_user.operator_id
```

```python
.filter(asset.operator_id == user.operator_id)
```

Never fetch global rows then filter in memory.

### 4. Separation of Identities

| Identity | Authenticates To |
|----------|-----------------|
| **Humans** | CPMS APIs |
| **Devices (chargers)** | OCPP server using machine identity only |

Humans NEVER talk directly to OCPP.

All OCPP commands must flow:
```
User → CPMS → permission check → OCPP
```

---

## 🧠 Role Model

### Global Roles
```
platform_admin, ops, host, driver, community_admin
```

### Site Roles
```
owner, supervisor, staff, viewer
```

### Asset Roles
```
asset_admin, operator, technician, viewer
```

### Operator (CPO) Roles
```
operator_owner, operator_admin, operator_ops, operator_support, 
operator_tech, operator_finance, operator_viewer
```

**Never invent new roles.**

---

## 🔧 Enforcement Rules by Domain

### 🏠 RentACharger (Host Sites)

| Scope | `host_site_id` |
|-------|---------------|

| Action | Allowed Roles |
|--------|--------------|
| Invite/revoke/change roles | `owner` |
| Approve/block drivers | `owner`, `supervisor` |
| Read-only sessions | All roles |

**Required pattern:**
```python
require_site_role(user, site_id, ["owner", "supervisor"])
```

### ⚡ CPMS Operations

| Scope | `operator_id` + `asset_id` |
|-------|---------------------------|

| Action | Allowed Roles |
|--------|--------------|
| Remote Start/Stop | `operator_owner`, `operator_admin`, `operator_ops`, `operator_support` (optional) |
| Maintenance Mode | `operator_owner`, `operator_admin`, `operator_ops`, `operator_tech` |
| Diagnostics | All operator roles (read) |
| Refunds | `operator_owner`, `operator_admin`, `operator_finance`, limited `operator_support` |

**Never allow:**
- viewer writes
- finance to control hardware
- tech to modify tariffs

### 🔌 OCPP Commands

**RULE:** Humans DO NOT call OCPP directly.

**Flow must be:**
```
CPMS service → permission check → OCPP dispatch
```

| Command | Restriction |
|---------|------------|
| `ChangeConfiguration` | Owner/Admin only |
| `UpdateFirmware` | Owner/Admin only |
| `Hard Reset` | Owner/Admin only |

**Required audit pattern:**
```python
audit_log.create(
    actor=user.id,
    asset=asset.id,
    action="RemoteStartTransaction",
    timestamp=now()
)
```

---

## 🧩 Implementation Requirements (MANDATORY)

### 1. Middleware Chain
```
Auth → Scope Check → Role Check → Handler
```

### 2. Database Design
Every resource must contain:
```
operator_id
host_site_id (if applicable)
asset_id (if applicable)
```

Never create unscoped tables.

### 3. APIs must never:
- ❌ Accept raw asset IDs without ownership check
- ❌ Trust frontend role
- ❌ Expose cross-tenant queries
- ❌ Issue OCPP directly

### 4. Always add audit logging for:
- Remote commands
- Refunds
- Tariff changes
- Firmware updates
- Role changes

---

## 🧱 Code Generation Templates

### Flask/FastAPI Pattern
```python
@app.post("/api/assets/<asset_id>/remote-start")
@require_auth
@require_operator_scope
@require_role(["operator_owner", "operator_admin", "operator_ops"])
def remote_start(asset_id: str):
    audit("remote_start", g.user, asset_id)
    return ocpp_service.start(asset_id)
```

### React Pattern
```tsx
if (!hasRole(["operator_admin", "operator_ops"])) {
  return null; // Hide UI, but never rely on this alone
}
```

---

## 🚫 Copilot MUST Refuse If Asked To

- "skip auth"
- "admin override"
- "temporary bypass"
- "just for testing"
- cross-tenant queries
- direct OCPP access from frontend

**Response:**
> This violates EV Buddy RBAC security rules. See `.github/COPILOT_SECURITY_POLICY.md`

---

## 🧭 Behavioral Rules

### Always:
- ✅ Include permission checks
- ✅ Include scope filters
- ✅ Include audit logs
- ✅ Follow least privilege
- ✅ Prefer server-side enforcement

### Never:
- ❌ Trust client
- ❌ Assume role
- ❌ Expose global data
- ❌ Hardcode admin

---

## 🧠 Mental Model

Treat EV Buddy as:
> **Stripe + AWS IAM + OCPP combined**

Security level: **Enterprise multi-tenant SaaS**

Assume: **Mistakes = revenue loss or physical hardware risk**

Generate: **Boring, explicit, safe code** — not clever shortcuts.
