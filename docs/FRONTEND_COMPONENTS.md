# EVBuddy — Frontend Components Reference

> **Last updated:** 2026-05-02

---

## Table of Contents

1. [Overview](#1-overview)
2. [App Shell](#2-app-shell)
3. [Feature Tabs](#3-feature-tabs)
4. [Shared Components](#4-shared-components)
5. [Design System](#5-design-system)
6. [API Client](#6-api-client)
7. [Type System](#7-type-system)
8. [Test Coverage](#8-test-coverage)

---

## 1. Overview

The EVBuddy frontend is a Vite-powered React + TypeScript single-page application. It serves as an operations dashboard for monitoring and interacting with the EVBuddy microservice ecosystem.

**Tech stack:**
- React 18 with hooks
- TypeScript 5.4+
- Vite 5 (build + dev server)
- Vitest (testing)
- framer-motion (animations)
- lucide-react (icons)
- Testing Library (component testing)

---

## 2. App Shell

### `App.tsx`

The root component that manages the overall application state:

**Responsibilities:**
- Fetches and polls `/api/services` and `/api/platform/health` every 20 seconds
- Parses the service response envelope into typed `ServiceRow[]`
- Provides a search/filter bar with `useDeferredValue` for non-blocking UI
- Renders the service health matrix grid
- Mounts the `APITesterTab` component

**State:**
| State | Type | Description |
|-------|------|-------------|
| `rows` | `ServiceRow[]` | Parsed service health data |
| `summary` | `{total, available, unavailable}` | Aggregate health stats |
| `platformStatus` | `string` | Platform health status string |
| `error` | `string | null` | Error message if data fetch fails |
| `refreshing` | `boolean` | Loading indicator |
| `query` | `string` | Search filter text |

**Design elements:**
- Ambient gradient orbs for visual depth
- Topbar with EVBuddy branding and live stats
- Service cards in a responsive grid layout

---

## 3. Feature Tabs

### `APITesterTab.tsx`
Interactive API testing interface for manually sending requests to backend endpoints.

**Features:**
- Method selector (GET, POST, PUT, PATCH, DELETE)
- Endpoint URL input
- JSON body editor
- Response viewer with timing
- Pre-configured endpoint shortcuts

---

### `ServicesTab.tsx`
Service health matrix showing all 34 registered upstream microservices.

**Features:**
- Real-time status polling
- Filterable service list
- Status indicators (UP/DOWN)
- Port and base URL display

---

### `HostSitesTab.tsx`
Host site management interface.

**Features:**
- List all host sites with details
- Create, update, delete sites
- Site member management
- Integration with the Sites API

---

### `LiveChargersTab.tsx`
Real-time charger monitoring dashboard.

**Features:**
- Live charger status from OCPP
- Connector state visualization
- Auto-refresh with polling
- Charger-level detail drill-down

---

### `MessagingTab.tsx`
Full-featured messaging thread viewer and manager.

**Features:**
- Thread list with filtering (type, status, priority)
- Message timeline view
- Participant management
- Attachment handling
- Template browser
- Status event history
- Real-time message creation

This is the largest component (~57KB) and implements a comprehensive messaging UI.

---

### `CatalogTab.tsx`
Service catalog browser for exploring available platform services.

**Features:**
- Browseable service catalog
- Service detail views
- Category filtering
- Provider service listings

---

### `ActiveSessionsTab.tsx`
Active charging session monitor.

**Features:**
- List of all active sessions (local + OCPP)
- Session state display (STARTING, CHARGING, STOPPING, COMPLETE)
- Energy, cost, and elapsed time metrics
- Session stop controls

---

### `V2VTab.tsx`
Vehicle-to-Vehicle charging control panel.

**Features:**
- V2V charge point status (EVB-V2V-001-JP)
- Connector status display
- Remote start/stop controls
- Session history viewer
- Reset command interface

---

### `ResponseDisplay.tsx`
Reusable JSON response renderer.

**Features:**
- Pretty-printed JSON display
- Syntax highlighting
- Collapsible sections
- Copy-to-clipboard support

---

## 4. Shared Components

### `primitives/`

Reusable UI primitives located in `client/src/components/primitives/`:

These provide the building blocks used across feature tabs — buttons, inputs, cards, badges, etc.

---

## 5. Design System

### `theme.css`

The design system is defined in `client/src/theme.css` (~10KB) and provides:

- **CSS custom properties** for colors, spacing, typography, and animation
- **Dark mode** as the default theme
- **Component styles** for panels, cards, grids, buttons, inputs, badges
- **Ambient effects** (gradient orbs, glassmorphism)
- **Responsive breakpoints** for mobile/tablet/desktop
- **Animation keyframes** for reveal sequences and transitions

### `styles.ts`

CSS-in-JS style constants in `client/src/styles.ts` (~9KB) used by components.

### `feature-layout.css`

Additional layout styles for feature tab components in `client/src/components/feature-layout.css` (~16KB).

---

## 6. API Client

### `utils/api.ts`

The API client provides a typed `fetch` wrapper:

```typescript
// Constants
export const API_BASE = "http://127.0.0.1:5000";
export const EVBUDDY_API: string; // Resolved at runtime

// Main API function
export async function apiCall(
  method: HttpMethod,
  endpoint: string,
  body?: unknown,
  userId?: string | number | null,
): Promise<ApiResponse>;
```

**`ApiResponse` shape:**
```typescript
{
  ok: boolean;       // HTTP response.ok
  status: number;    // HTTP status code (0 on network error)
  data: unknown;     // Parsed JSON or { raw: text } or { error: message }
  duration: number;  // Request duration in milliseconds
}
```

**Features:**
- Automatic JSON serialization/deserialization
- Duration timing for performance monitoring
- Content-type aware response parsing
- Network error normalization
- Optional `X-User-ID` header injection

---

## 7. Type System

Type definitions are organized in `client/src/types/`:

### `types/index.ts` — Barrel export

### `types/api.ts`
```typescript
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ApiResponse = { ok: boolean; status: number; data: unknown; duration: number; };
```

### `types/services.ts`
Service health and status types.

### `types/chargers.ts`
Charger, connector, and charging session types.

### `types/messaging.ts`
Thread, message, participant, attachment, and template types.

### `types/operating-hours.ts`
Operating hours schedule types.

---

## 8. Test Coverage

Each feature component has a co-located test file:

| Component | Test File | Status |
|-----------|-----------|--------|
| `App.tsx` | `App.test.tsx` | ✅ Active |
| `APITesterTab.tsx` | `APITesterTab.test.tsx` | ✅ Active |
| `ServicesTab.tsx` | `ServicesTab.test.tsx` | ✅ Active |
| `HostSitesTab.tsx` | `HostSitesTab.test.tsx` | ✅ Active |
| `LiveChargersTab.tsx` | `LiveChargersTab.test.tsx` | ✅ Active |
| `MessagingTab.tsx` | `MessagingTab.test.tsx` | ✅ Active |
| `CatalogTab.tsx` | `CatalogTab.test.tsx` | ✅ Active |
| `ActiveSessionsTab.tsx` | `ActiveSessionsTab.test.tsx` | ✅ Active |
| `V2VTab.tsx` | `V2VTab.test.tsx` | ✅ Active |
| `ResponseDisplay.tsx` | `ResponseDisplay.test.tsx` | ✅ Active |

Additional test files:
- `client/src/utils/api.test.ts` — API client tests
- `client/src/utils/hello-world.test.ts` — Smoke test
- `client/src/test/` — Test setup and configuration

**Run all frontend tests:**
```powershell
cd client
npm run test
npm run test:coverage
```
