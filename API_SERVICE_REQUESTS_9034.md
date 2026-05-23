# Service Requests API (9034)

Live validation snapshot for Service Requests microservice on appdev.

- Validation date: 2026-04-25
- Base URL: http://appdev.evbuddy.net:9034
- Collection reference: Service Requests (9034)

## Confirmed 2xx Results

| # | Endpoint | Method | Status | Observed Result |
|---|---|---|---|---|
| 1 | /servicerequests | GET | 200 OK | JSON array of 26 service request objects |
| 2 | /servicerequests | POST | 201 Created | Full created object returned; id incremented; status="requested"; createdAt set |
| 3 | /servicerequests/:id | GET | 200 OK | Single service request object by id |
| 4 | /servicerequests/:id | PUT | 200 OK | Updated object returned; updatedAt refreshed |
| 5 | /servicerequests/:id | DELETE | 204 No Content | Empty response body |

## Contract Notes

- All 5 CRUD endpoints returned success responses (2xx) without auth failures.
- A service request response object currently exposes approximately 43 fields.
- Core fields observed across responses:
  - id
  - status
  - currency
  - notes
  - request_source
  - request_type
  - service_code
  - service_name
  - priority_code
  - createdAt
  - updatedAt
- POST returns the full persisted resource, including server-generated id.
- PUT behaves as a partial update in practice for status and notes.
- DELETE returns 204 with no body.

## Example Payloads

These are compact examples for documentation and collection examples. They are intentionally minimal and do not enumerate all 43 response fields.

### GET /servicerequests (200)

```json
[
  {
    "id": 1,
    "status": "requested",
    "currency": "USD",
    "request_source": "driver_app",
    "request_type": "onsite",
    "service_code": "TIRE",
    "service_name": "Tire Change",
    "priority_code": "normal",
    "notes": "Customer waiting near charger A2",
    "createdAt": "2026-04-25T15:20:01Z",
    "updatedAt": "2026-04-25T15:20:01Z"
  }
]
```

### POST /servicerequests request (example)

```json
{
  "status": "requested",
  "notes": "Created by API validation run"
}
```

### POST /servicerequests response (201)

```json
{
  "id": 32,
  "status": "requested",
  "notes": "Created by API validation run",
  "createdAt": "2026-04-25T16:08:10Z",
  "updatedAt": "2026-04-25T16:08:10Z"
}
```

### PUT /servicerequests/:id request (example)

```json
{
  "status": "in_progress",
  "notes": "Technician assigned"
}
```

## Postman Test Scripts

Use these in the Tests tab for each request to keep 2xx and shape checks embedded in the collection.

### GET /servicerequests

```javascript
pm.test("GET /servicerequests returns 200", function () {
  pm.response.to.have.status(200);
});

const body = pm.response.json();
pm.test("GET list response is an array", function () {
  pm.expect(Array.isArray(body)).to.eql(true);
});

pm.test("List rows include core keys", function () {
  if (body.length === 0) {
    return;
  }
  const row = body[0];
  ["id", "status", "createdAt", "updatedAt"].forEach((key) => {
    pm.expect(row).to.have.property(key);
  });
});
```

### POST /servicerequests

```javascript
pm.test("POST /servicerequests returns 201", function () {
  pm.response.to.have.status(201);
});

const created = pm.response.json();
pm.test("Created resource includes server id", function () {
  pm.expect(created).to.have.property("id");
  pm.expect(created.id).to.be.a("number");
});

pm.environment.set("service_request_id", created.id);
```

### GET /servicerequests/:id

```javascript
pm.test("GET /servicerequests/:id returns 200", function () {
  pm.response.to.have.status(200);
});

const single = pm.response.json();
pm.test("Single resource shape", function () {
  ["id", "status", "createdAt", "updatedAt"].forEach((key) => {
    pm.expect(single).to.have.property(key);
  });
});
```

### PUT /servicerequests/:id

```javascript
pm.test("PUT /servicerequests/:id returns 200", function () {
  pm.response.to.have.status(200);
});

const updated = pm.response.json();
pm.test("PUT reflects updates", function () {
  pm.expect(updated).to.have.property("status");
  pm.expect(updated).to.have.property("updatedAt");
});
```

### DELETE /servicerequests/:id

```javascript
pm.test("DELETE /servicerequests/:id returns 204", function () {
  pm.response.to.have.status(204);
});

pm.test("DELETE body is empty", function () {
  pm.expect(pm.response.text()).to.eql("");
});
```

## Monitoring

Service Requests can be monitored using the existing monitor scripts in this repo after adding the endpoint target.

Example run:

```powershell
python scripts/appdev_live_monitor.py --targets-file scripts/targets_high_freq.json --rounds 120 --interval 60 --out appdev_live_monitor_highfreq.json --log appdev_live_monitor_highfreq.log
```

## OpenAPI Contract

See API_SERVICE_REQUESTS_OPENAPI_9034.yaml for an OpenAPI 3.0 contract generated from the observed behavior above.
