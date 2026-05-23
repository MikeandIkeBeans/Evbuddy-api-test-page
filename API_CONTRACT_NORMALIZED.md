# API Contract Normalization Report

Status note (2026-04-17): this file contains a legacy inventory snapshot from before route consolidation.

- Current route source of truth is `ROUTE_INVENTORY.md` (`Total routes: 108`).
- Route families such as businesses, employees, drivers, invites, operating-hours, and payments still appear below as historical entries but are no longer present in the current route modules.
- Only platform health endpoints are currently documented here as normalized.

This report tracks contract-normalized routes that should return the canonical envelope:

```json
{"ok": true, "data": {...}}
```

Error envelope:

```json
{"ok": false, "error": {"code": "...", "message": "..."}}
```

## Legacy Route Inventory (Historical Snapshot)

Total discovered route handlers at snapshot time: 153

| Method | Path | Normalized Ready |
|---|---|---|
| GET | / | no |
| GET | /<path:path> | no |
| GET | /api/accessgrants/charger_access/grants | no |
| GET | /api/accessgrants/charger_access/grantsbyuser/<int:user_id> | no |
| POST | /api/assets/<asset_id>/change-configuration | no |
| GET | /api/assets/<asset_id>/commands | no |
| GET | /api/assets/<asset_id>/diagnostics | no |
| POST | /api/assets/<asset_id>/firmware-update | no |
| POST | /api/assets/<asset_id>/maintenance-mode | no |
| POST | /api/assets/<asset_id>/remote-start | no |
| POST | /api/assets/<asset_id>/remote-stop | no |
| POST | /api/assets/<asset_id>/reset | no |
| PUT | /api/assets/<asset_id>/tariff | no |
| GET | /api/audit-log | no |
| GET | /api/auth/can-manage-site/<int:site_id> | no |
| GET | /api/auth/can-use-site/<int:site_id> | no |
| GET | /api/businesses | no |
| POST | /api/businesses | no |
| DELETE | /api/businesses/<int:business_id> | no |
| GET | /api/businesses/<int:business_id> | no |
| PUT | /api/businesses/<int:business_id> | no |
| GET | /api/businesses/<int:business_id>/employees | no |
| POST | /api/businesses/<int:business_id>/employees | no |
| GET | /api/businesses/<int:business_id>/sites | no |
| POST | /api/businesses/<int:business_id>/sites | no |
| GET | /api/data | no |
| DELETE | /api/employees/<int:employee_id> | no |
| GET | /api/employees/<int:employee_id> | no |
| PUT | /api/employees/<int:employee_id> | no |
| GET | /api/employees/<int:employee_id>/permissions | no |
| POST | /api/employees/<int:employee_id>/permissions | no |
| DELETE | /api/employees/<int:employee_id>/permissions/<int:permission_id> | no |
| GET | /api/employees/<int:employee_id>/sites | no |
| POST | /api/employees/<int:employee_id>/sites | no |
| DELETE | /api/employees/<int:employee_id>/sites/<int:site_id> | no |
| PUT | /api/employees/<int:employee_id>/sites/<int:site_id> | no |
| GET | /api/invitations/<token> | no |
| POST | /api/invitations/<token>/accept | no |
| GET | /api/invites | no |
| GET | /api/invites/invited-by/<int:user_id> | no |
| GET | /api/me/site-access | no |
| GET | /api/me/site-access/all | no |
| GET | /api/messaging/templates | no |
| POST | /api/messaging/templates | no |
| DELETE | /api/messaging/templates/<int:template_id> | no |
| GET | /api/messaging/templates/<int:template_id> | no |
| PATCH | /api/messaging/templates/<int:template_id> | no |
| GET | /api/messaging/templates/key/<key> | no |
| GET | /api/messaging/threads | no |
| POST | /api/messaging/threads | no |
| DELETE | /api/messaging/threads/<int:thread_id> | no |
| GET | /api/messaging/threads/<int:thread_id> | no |
| PATCH | /api/messaging/threads/<int:thread_id> | no |
| GET | /api/messaging/threads/<int:thread_id>/messages | no |
| POST | /api/messaging/threads/<int:thread_id>/messages | no |
| DELETE | /api/messaging/threads/<int:thread_id>/messages/<int:message_id> | no |
| GET | /api/messaging/threads/<int:thread_id>/messages/<int:message_id> | no |
| PATCH | /api/messaging/threads/<int:thread_id>/messages/<int:message_id> | no |
| GET | /api/messaging/threads/<int:thread_id>/messages/<int:message_id>/attachments | no |
| POST | /api/messaging/threads/<int:thread_id>/messages/<int:message_id>/attachments | no |
| DELETE | /api/messaging/threads/<int:thread_id>/messages/<int:message_id>/attachments/<int:attachment_id> | no |
| GET | /api/messaging/threads/<int:thread_id>/messages/<int:message_id>/attachments/<int:attachment_id> | no |
| GET | /api/messaging/threads/<int:thread_id>/participants | no |
| POST | /api/messaging/threads/<int:thread_id>/participants | no |
| DELETE | /api/messaging/threads/<int:thread_id>/participants/<int:account_id> | no |
| GET | /api/messaging/threads/<int:thread_id>/participants/<int:account_id> | no |
| PATCH | /api/messaging/threads/<int:thread_id>/participants/<int:account_id> | no |
| GET | /api/messaging/threads/<int:thread_id>/status-events | no |
| POST | /api/messaging/threads/<int:thread_id>/status-events | no |
| GET | /api/messaging/threads/<int:thread_id>/status-events/<int:event_id> | no |
| GET | /api/operating-hours | no |
| PUT | /api/operating-hours | no |
| GET | /api/operating-hours-exceptions | no |
| POST | /api/operating-hours-exceptions | no |
| GET | /api/payments | no |
| POST | /api/payments | no |
| DELETE | /api/payments/<int:payment_id> | no |
| GET | /api/payments/<int:payment_id> | no |
| GET | /api/platform/health | yes |
| GET | /api/platform/services/<service_name> | yes |
| POST | /api/preorder | no |
| GET | /api/services | no |
| GET | /api/services/<service_name> | no |
| POST | /api/sessions/<session_id>/refund | no |
| GET | /api/sites | no |
| DELETE | /api/sites/<int:site_id> | no |
| GET | /api/sites/<int:site_id> | no |
| PUT | /api/sites/<int:site_id> | no |
| POST | /api/sites/<int:site_id>/access-request | no |
| GET | /api/sites/<int:site_id>/drivers | no |
| POST | /api/sites/<int:site_id>/drivers/<int:driver_id>/approve | no |
| POST | /api/sites/<int:site_id>/drivers/<int:driver_id>/block | no |
| POST | /api/sites/<int:site_id>/drivers/<int:driver_id>/revoke | no |
| POST | /api/sites/<int:site_id>/drivers/<int:driver_id>/unblock | no |
| POST | /api/sites/<int:site_id>/drivers/invite | no |
| GET | /api/sites/<int:site_id>/employees | no |
| POST | /api/sites/<int:site_id>/employees | no |
| GET | /api/sites/<int:site_id>/members | no |
| DELETE | /api/sites/<int:site_id>/members/<int:user_id> | no |
| POST | /api/sites/<int:site_id>/members/<int:user_id> | no |
| POST | /api/sites/<int:site_id>/members/invite | no |
| POST | /api/subscribe | no |
| GET | /api/transactions/<txid> | no |
| GET | /api/users | no |
| POST | /api/users | no |
| DELETE | /api/users/<int:user_id> | no |
| GET | /api/users/<int:user_id> | no |
| PATCH | /api/users/<int:user_id> | no |
| PUT | /api/users/<int:user_id> | no |
| GET | /api/users/<int:user_id>/payments | no |
| GET | /api/users/<int:user_id>/vehicles | no |
| GET | /api/users/status | no |
| GET | /api/vehicles | no |
| POST | /api/vehicles | no |
| DELETE | /api/vehicles/<int:vehicle_id> | no |
| GET | /api/vehicles/<int:vehicle_id> | no |
| PATCH | /api/vehicles/<int:vehicle_id> | no |
| PUT | /api/vehicles/<int:vehicle_id> | no |
| GET | /guest | no |
| GET | /guest/qr | no |
| GET | /health | no |
| GET | /test-page.html | no |
| ROUTE | /v1/auth/card/init | no |
| ROUTE | /v1/auth/hotel | no |
| ROUTE | /v1/charge-points | no |
| ROUTE | /v1/chargers | no |
| ROUTE | /v1/chargers/<charger_id> | no |
| ROUTE | /v1/chargers/<charger_id>/status | no |
| ROUTE | /v1/chargers/<int:charger_id>/details | no |
| ROUTE | /v1/chargers/ocpp/<charge_point_id>/status | no |
| ROUTE | /v1/chargers/site/<int:site_id> | no |
| ROUTE | /v1/debug/sessions/<session_id>/correlation | no |
| ROUTE | /v1/health | no |
| ROUTE | /v1/host-sites | no |
| ROUTE | /v1/host-sites | no |
| ROUTE | /v1/host-sites/<int:site_id> | no |
| ROUTE | /v1/host-sites/<int:site_id> | no |
| ROUTE | /v1/host-sites/<int:site_id> | no |
| ROUTE | /v1/ocpp/sessions | no |
| ROUTE | /v1/qr/resolve | no |
| ROUTE | /v1/real/proxy | no |
| ROUTE | /v1/real/user/getByEmail | no |
| ROUTE | /v1/real/users | no |
| ROUTE | /v1/sessions | no |
| ROUTE | /v1/sessions | no |
| ROUTE | /v1/sessions/<session_id> | no |
| ROUTE | /v1/sessions/<session_id>/receipt | no |
| ROUTE | /v1/sessions/<session_id>/stop | no |
| POST | /v1/v2v/reset | no |
| GET | /v1/v2v/sessions | no |
| POST | /v1/v2v/start | no |
| GET | /v1/v2v/status | no |
| POST | /v1/v2v/stop | no |
