# EVBuddy API Overview

This repository is a Flask proxy dashboard for EVBuddy services.
Most `/api/*` routes forward requests to upstream Spring Boot services on
`appdev.evbuddy.net`, while `/v1/*` routes cover charging and V2V flows.

## Base URLs

- Local Flask app: `http://127.0.0.1:5000`
- Frontend dev server: `http://127.0.0.1:5173`

## Route Groups

### Core App

- `GET /health`
- `GET /api/services`
- `GET /api/data`

### Businesses

- `GET /api/businesses`
- `GET /api/businesses/:business_id`
- `POST /api/businesses`
- `PUT /api/businesses/:business_id`
- `DELETE /api/businesses/:business_id`

### Sites

- `GET /api/sites`
- `GET /api/sites/:site_id`
- `GET /api/businesses/:business_id/sites`
- `POST /api/businesses/:business_id/sites`
- `PUT /api/sites/:site_id`
- `DELETE /api/sites/:site_id`
- `GET /api/sites/:site_id/members`
- `POST /api/sites/:site_id/members/invite`
- `POST /api/sites/:site_id/members/:user_id`
- `DELETE /api/sites/:site_id/members/:user_id`
- `POST /api/preorder`
- `POST /api/subscribe`

### Users, Vehicles, and Payments

- `GET /api/users`
- `GET /api/users/:user_id`
- `POST /api/users`
- `PUT /api/users/:user_id`
- `DELETE /api/users/:user_id`
- `GET /api/vehicles`
- `GET /api/vehicles/:vehicle_id`
- `POST /api/vehicles`
- `PUT /api/vehicles/:vehicle_id`
- `DELETE /api/vehicles/:vehicle_id`
- `GET /api/payments`
- `GET /api/payments/:payment_id`
- `POST /api/payments`
- `DELETE /api/payments/:payment_id`

### Employees and Drivers

- `GET /api/businesses/:business_id/employees`
- `GET /api/employees/:employee_id`
- `POST /api/businesses/:business_id/employees`
- `PUT /api/employees/:employee_id`
- `DELETE /api/employees/:employee_id`
- `GET /api/employees/:employee_id/sites`
- `POST /api/employees/:employee_id/sites`
- `PUT /api/employees/:employee_id/sites/:site_id`
- `DELETE /api/employees/:employee_id/sites/:site_id`
- `GET /api/employees/:employee_id/permissions`
- `POST /api/employees/:employee_id/permissions`
- `DELETE /api/employees/:employee_id/permissions/:permission_id`
- `GET /api/sites/:site_id/drivers`
- `POST /api/sites/:site_id/drivers/invite`
- `POST /api/sites/:site_id/access-request`
- `POST /api/sites/:site_id/drivers/:driver_id/approve`
- `POST /api/sites/:site_id/drivers/:driver_id/block`
- `POST /api/sites/:site_id/drivers/:driver_id/revoke`
- `POST /api/sites/:site_id/drivers/:driver_id/unblock`
- `GET /api/me/site-access`
- `GET /api/me/site-access/all`
- `GET /api/invitations/:token`
- `POST /api/invitations/:token/accept`
- `GET /api/audit-log`

### Messaging and Hours

- `GET /api/operating-hours`
- `PUT /api/operating-hours`
- `GET /api/operating-hours-exceptions`
- `POST /api/operating-hours-exceptions`
- `GET /api/messaging/threads`
- `POST /api/messaging/threads`
- `POST /api/messaging/threads/:thread_id/messages`

### Dispatch Service Requests (9034)

- `GET /api/v1/service-requests`
- `GET /api/v1/service-requests/:id`
- Upstream direct endpoints on `http://appdev.evbuddy.net:9034`:
	- `GET /servicerequests`
	- `POST /servicerequests`
	- `GET /servicerequests/:id`
	- `PUT /servicerequests/:id`
	- `DELETE /servicerequests/:id`
- Detailed behavior snapshot: `API_SERVICE_REQUESTS_9034.md`
- OpenAPI contract: `API_SERVICE_REQUESTS_OPENAPI_9034.yaml`

### Charging and V2V

- `POST /v1/qr/resolve`
- `POST /v1/auth/hotel`
- `POST /v1/auth/card/init`
- `GET /v1/chargers`
- `GET /v1/chargers/:charger_id`
- `GET /v1/chargers/:charger_id/status`
- `GET /v1/sessions`
- `POST /v1/sessions`
- `POST /v1/sessions/:session_id/stop`
- `GET /v1/v2v/status`
- `GET /v1/v2v/sessions`
- `POST /v1/v2v/start`
- `POST /v1/v2v/stop`
- `POST /v1/v2v/reset`

## Notes

- Upstream failures are usually passed through as-is.
- The Flask app serves `client/dist` from `/` when a production build exists.
- Use `client/package.json` for frontend scripts; the root package manifest is not the app entry point.
