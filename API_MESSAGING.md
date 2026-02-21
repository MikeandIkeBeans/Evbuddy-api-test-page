# Messaging Service API (Port 9011)

Central Messaging Service for threads, messages, participants, attachments, status events, and templates.

**Base URL:** `http://{host}:9011`

All requests and responses use `Content-Type: application/json`.

---

## Table of Contents

- [Threads](#threads)
- [Messages](#messages)
- [Participants](#participants)
- [Attachments](#attachments)
- [Status Events](#status-events)
- [Templates](#templates)
- [Enums & Constants](#enums--constants)
- [Pagination](#pagination)
- [Error Responses](#error-responses)

---

## Threads

### List Threads

```
GET /threads
```

**Query Parameters** (all optional):

| Param                 | Type    | Description                          |
|-----------------------|---------|--------------------------------------|
| `threadType`          | string  | Filter by type (see enums)           |
| `status`              | string  | Filter by status                     |
| `priority`            | string  | Filter by priority                   |
| `assignedToAccountId` | integer | Filter by assigned account            |
| `relatedEntityType`   | string  | Filter by related entity type        |
| `relatedEntityId`     | integer | Filter by related entity ID          |
| `page`                | integer | Page number (0-based)                |
| `pageSize`            | integer | Results per page (default 20)        |
| `sort`                | string  | Sort field                           |
| `order`               | string  | `asc` or `desc`                      |

**Response** `200 OK`:

```json
{
  "data": [
    {
      "id": 16,
      "subject": "Hi",
      "threadType": "SUPPORT",
      "status": "OPEN",
      "priority": "NORMAL",
      "createdByAccountId": 1096,
      "assignedToAccountId": null,
      "relatedEntityType": null,
      "relatedEntityId": null,
      "lastMessageAt": "2026-02-21T20:51:13",
      "createdAt": "2026-02-21T01:36:02",
      "updatedAt": "2026-02-21T20:51:13"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 5,
    "totalPages": 1
  }
}
```

---

### Create Thread

```
POST /threads
```

**Request Body:**

```json
{
  "subject": "Charger issue at HTL-DEMO-001",
  "threadType": "SUPPORT",
  "priority": "HIGH",
  "createdByAccountId": 1096,
  "assignedToAccountId": null,
  "relatedEntityType": "CHARGER",
  "relatedEntityId": 42
}
```

**Response** `201 Created`:

```json
{
  "id": 17,
  "subject": "Charger issue at HTL-DEMO-001",
  "threadType": "SUPPORT",
  "status": "OPEN",
  "priority": "HIGH",
  "createdByAccountId": 1096,
  "assignedToAccountId": null,
  "relatedEntityType": "CHARGER",
  "relatedEntityId": 42,
  "lastMessageAt": null,
  "createdAt": "2026-02-21T21:00:00",
  "updatedAt": "2026-02-21T21:00:00"
}
```

---

### Get Thread

```
GET /threads/{threadId}
```

**Response** `200 OK`: Single thread object (same shape as list item).

**Response** `404 Not Found`:

```json
{
  "error": "NOT_FOUND",
  "message": "Thread not found with id: 999",
  "status": 404
}
```

---

### Update Thread

```
PATCH /threads/{threadId}
```

**Request Body** (all fields optional):

```json
{
  "subject": "Updated subject",
  "priority": "URGENT",
  "status": "PENDING",
  "assignedToAccountId": 1030
}
```

**Response** `200 OK`: Updated thread object.

---

### Delete Thread

```
DELETE /threads/{threadId}
```

**Response** `204 No Content`

---

## Messages

### List Messages

```
GET /threads/{threadId}/messages
```

**Query Parameters** (all optional):

| Param         | Type    | Description                                |
|---------------|---------|--------------------------------------------|
| `messageType` | string  | Filter by type (`TEXT`, `SYSTEM`, etc.)     |
| `since`       | string  | ISO timestamp — only messages after this    |
| `page`        | integer | Page number                                |
| `pageSize`    | integer | Results per page                           |

**Response** `200 OK`:

```json
{
  "data": [
    {
      "id": 18,
      "threadId": 16,
      "senderAccountId": 1096,
      "messageType": "TEXT",
      "body": "hey",
      "payloadJson": null,
      "createdAt": "2026-02-21T20:51:13"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

### Create Message

```
POST /threads/{threadId}/messages
```

**Request Body:**

```json
{
  "senderAccountId": 1096,
  "messageType": "TEXT",
  "body": "Hello, I need help with my charger.",
  "payloadJson": null
}
```

**Response** `201 Created`: Created message object.

---

### Get Message

```
GET /threads/{threadId}/messages/{messageId}
```

**Response** `200 OK`: Single message object.

---

### Update Message

```
PATCH /threads/{threadId}/messages/{messageId}
```

**Request Body** (all fields optional):

```json
{
  "body": "Updated message text",
  "payloadJson": "{\"key\": \"value\"}"
}
```

**Response** `200 OK`: Updated message object.

---

### Delete Message

```
DELETE /threads/{threadId}/messages/{messageId}
```

**Response** `204 No Content`

---

## Participants

### List Participants

```
GET /threads/{threadId}/participants
```

**Response** `200 OK`:

```json
{
  "data": [
    {
      "accountId": 1096,
      "threadId": 16,
      "role": "OWNER",
      "muted": false,
      "canPost": true,
      "lastReadAt": "2026-02-21T20:51:13",
      "joinedAt": "2026-02-21T01:36:02"
    }
  ]
}
```

---

### Add Participant

```
POST /threads/{threadId}/participants
```

**Request Body:**

```json
{
  "accountId": 1030,
  "role": "MEMBER",
  "canPost": true
}
```

**Response** `201 Created`: Created participant object.

---

### Get Participant

```
GET /threads/{threadId}/participants/{accountId}
```

**Response** `200 OK`: Single participant object.

---

### Update Participant

```
PATCH /threads/{threadId}/participants/{accountId}
```

**Request Body** (all fields optional):

```json
{
  "role": "ADMIN",
  "muted": true,
  "canPost": false,
  "lastReadAt": "2026-02-21T21:00:00"
}
```

**Response** `200 OK`: Updated participant object.

---

### Remove Participant

```
DELETE /threads/{threadId}/participants/{accountId}
```

**Response** `204 No Content`

---

## Attachments

### List Attachments

```
GET /threads/{threadId}/messages/{messageId}/attachments
```

**Response** `200 OK`:

```json
{
  "data": [
    {
      "id": 3,
      "messageId": 4,
      "fileName": "test.txt",
      "contentType": "text/plain",
      "fileSizeBytes": 100,
      "storageProvider": "AZURE",
      "storageUrl": "https://evbuddy.blob.core.windows.net/attachments/uploads/test.txt",
      "createdAt": "2026-02-21T20:47:47"
    }
  ]
}
```

---

### Create Attachment

```
POST /threads/{threadId}/messages/{messageId}/attachments
```

**Request Body:**

| Field            | Type    | Required | Description                                   |
|------------------|---------|----------|-----------------------------------------------|
| `fileName`       | string  | **yes**  | Original file name                            |
| `contentType`    | string  | **yes**  | MIME type (e.g. `application/pdf`)            |
| `fileSizeBytes`  | integer | **yes**  | File size in bytes                            |
| `storageKey`     | string  | **yes**  | Key/path in the storage provider              |

> **Important:** The field is `fileSizeBytes`, **not** `sizeBytes`. The field is `storageKey`, **not** `blobUrl` or `url`.

```json
{
  "fileName": "report.pdf",
  "contentType": "application/pdf",
  "fileSizeBytes": 2048,
  "storageKey": "uploads/report.pdf"
}
```

**Response** `201 Created`:

```json
{
  "id": 4,
  "messageId": 4,
  "fileName": "report.pdf",
  "contentType": "application/pdf",
  "fileSizeBytes": 2048,
  "storageProvider": "AZURE",
  "storageUrl": "https://evbuddy.blob.core.windows.net/attachments/uploads/report.pdf",
  "createdAt": "2026-02-21T20:48:25"
}
```

**Common mistakes that cause `500 Internal Server Error`:**

- Sending `sizeBytes` instead of `fileSizeBytes`
- Sending `blobUrl` or `url` instead of `storageKey`
- The server cannot map unknown fields and throws an internal deserialization error rather than a 400.

---

### Get Attachment

```
GET /threads/{threadId}/messages/{messageId}/attachments/{attachmentId}
```

**Response** `200 OK`: Single attachment object (includes resolved `storageUrl`).

---

### Delete Attachment

```
DELETE /threads/{threadId}/messages/{messageId}/attachments/{attachmentId}
```

**Response** `204 No Content`

---

## Status Events

Status events record thread state transitions and enforce a state machine.

### List Status Events

```
GET /threads/{threadId}/status-events
```

**Query Parameters:**

| Param      | Type    | Description    |
|------------|---------|----------------|
| `page`     | integer | Page number    |
| `pageSize` | integer | Page size      |

**Response** `200 OK`:

```json
{
  "data": [
    {
      "id": 1,
      "threadId": 16,
      "fromStatus": "OPEN",
      "toStatus": "PENDING",
      "changedByAccountId": 1096,
      "reason": "Awaiting manager approval",
      "createdAt": "2026-02-21T21:10:00"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

### Create Status Event

```
POST /threads/{threadId}/status-events
```

Creates a status transition. Validates the state machine and updates `thread.status` automatically.

**Request Body:**

```json
{
  "toStatus": "PENDING",
  "changedByAccountId": 1096,
  "reason": "Awaiting manager approval"
}
```

**Response** `201 Created`: Created status event object.

---

### Get Status Event

```
GET /threads/{threadId}/status-events/{eventId}
```

**Response** `200 OK`: Single status event object.

---

## Templates

Reusable message templates (e.g. canned support responses, approval workflows).

### List Templates

```
GET /templates
```

**Query Parameters** (all optional):

| Param      | Type    | Description                               |
|------------|---------|-------------------------------------------|
| `category` | string  | Filter by category                        |
| `isActive` | boolean | Filter by active/inactive                 |
| `page`     | integer | Page number                               |
| `pageSize` | integer | Page size                                 |

**Response** `200 OK`:

```json
{
  "data": [
    {
      "id": 1,
      "key": "support-welcome",
      "category": "SUPPORT",
      "name": "Welcome Message",
      "bodyTemplate": "Hello {{name}}, how can we help?",
      "isActive": true,
      "createdAt": "2026-02-21T00:00:00",
      "updatedAt": "2026-02-21T00:00:00"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
}
```

---

### Create Template

```
POST /templates
```

**Request Body:**

```json
{
  "key": "support-welcome",
  "category": "SUPPORT",
  "name": "Welcome Message",
  "bodyTemplate": "Hello {{name}}, how can we help?",
  "isActive": true
}
```

**Response** `201 Created`: Created template object.

---

### Get Template by ID

```
GET /templates/{templateId}
```

**Response** `200 OK`: Single template object.

---

### Get Template by Key

```
GET /templates/key/{key}
```

**Response** `200 OK`: Single template object matching the unique key.

---

### Update Template

```
PATCH /templates/{templateId}
```

**Request Body** (all fields optional):

```json
{
  "name": "Updated Name",
  "bodyTemplate": "New template text: {{name}}",
  "isActive": false
}
```

**Response** `200 OK`: Updated template object.

---

### Delete Template

```
DELETE /templates/{templateId}
```

**Response** `204 No Content`

---

## Enums & Constants

### Thread Types

`REQUEST` · `APPROVAL` · `SUPPORT` · `GENERAL`

### Statuses

`OPEN` · `PENDING` · `APPROVED` · `REJECTED` · `CLOSED`

### Priorities

`LOW` · `NORMAL` · `HIGH` · `URGENT`

### Related Entity Types

`HOST_SITE` · `CHARGER` · `BOOKING` · `DRIVER` · `OTHER`

### Message Types

`TEXT` · `SYSTEM` · `ACTION` · `TEMPLATE`

### Template Categories

`SUPPORT` · `APPROVAL` · `REQUEST` · `GENERAL`

---

## Pagination

Paginated endpoints return a `pagination` object alongside `data`:

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

Pages are **1-based** in responses. Some query parameters accept `0` for the first page — the service normalizes internally.

---

## Error Responses

### Validation Error (`400`)

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "fieldErrors": [
    { "field": "contentType", "message": "content_type is required", "rejectedValue": null },
    { "field": "storageKey", "message": "storage_key is required", "rejectedValue": null }
  ],
  "status": 400
}
```

### Not Found (`404`)

```json
{
  "error": "NOT_FOUND",
  "message": "Thread not found with id: 999",
  "status": 404
}
```

### Internal Server Error (`500`)

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "status": 500
}
```

> A 500 often indicates the request body contains unknown/misnamed fields that the backend cannot deserialize. Double-check field names against this document.
