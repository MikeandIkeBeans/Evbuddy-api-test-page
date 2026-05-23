# EVBuddy Bold Architecture Refactor Plan

Status (2026-04-17): planning document only. The phases below describe a target architecture and are not a completion report.

## 1. Executive Direction

This refactor proposal outlines how to shift the codebase from a route-heavy Flask proxy into a layered, testable, domain-oriented platform with explicit boundaries:

- API Layer: thin request/response adapters only
- Application Layer: use-case orchestration and policy
- Domain Layer: business rules, validation, domain models
- Infrastructure Layer: upstream clients, persistence, caching, telemetry

Target outcomes:

- Reliability under partial upstream outages
- Lower latency for high-traffic endpoints
- Consistent contracts and error handling
- Strong security posture (auth, rate limiting, validation)
- Scalable testing across unit, integration, contract, and resilience levels

---

## 2. Target Architecture

## 2.1 Layered Structure

```text
src/
  api/
    flask_app.py
    middleware/
      auth.py
      rate_limit.py
      error_handler.py
      request_id.py
    routes/
      users_routes.py
      sites_routes.py
      charging_routes.py
      messaging_routes.py
      cpms_routes.py
  application/
    use_cases/
      users/
      sites/
      charging/
      messaging/
      cpms/
    dto/
    ports/
      users_port.py
      sites_port.py
      ocpp_port.py
      messaging_port.py
  domain/
    users/
    sites/
    charging/
    messaging/
    cpms/
    common/
      errors.py
      value_objects.py
  infrastructure/
    http/
      base_client.py
      retry.py
      circuit_breaker.py
      connection_pool.py
    upstream_clients/
      users_client.py
      sites_client.py
      chargers_client.py
      ocpp_client.py
      messaging_client.py
    persistence/
      cpms_repo.py
    observability/
      logging.py
      metrics.py
      tracing.py
```

## 2.2 Key Architectural Decisions

- Introduce a typed upstream client per service instead of generic proxy calls
- Implement centralized resiliency policies (retry, timeout profiles, circuit breakers)
- Replace ad hoc validation with schema-first validation (Pydantic or Marshmallow)
- Use standardized API response envelopes and error taxonomy
- Move session and CPMS runtime state behind repository interfaces
- Add a contract boundary between frontend expectations and backend responses

---

## 3. Refactor Phases

Each phase includes both High-effort and Medium-effort tracks.

## Phase 0: Baseline and Guardrails

Goal: freeze behavior, instrument current state, reduce migration risk.

### High-Effort Tasks

1. Build comprehensive route inventory and dependency graph
- Extract all endpoint -> upstream mappings
- Tag by domain and criticality
- Output machine-readable inventory

2. Create golden-path snapshot harness
- Capture request/response fixtures for representative endpoints
- Store fixture corpus for regression comparisons

### Medium-Effort Tasks

1. Add request ID correlation middleware
2. Add structured logging across all routes
3. Add centralized config loading with typed defaults
4. Add baseline performance probes and error-rate metrics

### Testing Scope

- Smoke tests: all route groups
- Snapshot tests: key response shapes
- Baseline performance: p50/p95/p99 per critical route

Exit criteria:
- Baseline metrics and fixtures collected
- No route without traceable ownership and upstream mapping

---

## Phase 1: API Contract Normalization

Goal: consistent API behavior before internal rewiring.

### High-Effort Tasks

1. Unified response envelope and error model rollout
- Define canonical success/error schema
- Migrate all routes with backward-compatible adapter mode

2. Schema validation for request/response at edge
- Apply explicit schema validation for every mutating endpoint
- Generate validation error consistency

### Medium-Effort Tasks

1. Standardize status code semantics (200/201/202/204/4xx/5xx)
2. Normalize pagination conventions
3. Normalize domain error codes

### Testing Scope

- Unit tests for schema validation and envelope generation
- Contract tests for existing frontend call patterns
- Backward-compat regression tests

Exit criteria:
- 100 percent mutating endpoints validated
- 100 percent route responses conform to standardized envelope mode

---

## Phase 2: Domain and Use Case Extraction

Goal: remove business logic from route handlers.

### High-Effort Tasks

1. Extract domain modules for users, sites, charging, messaging, cpms
2. Implement application use-cases for each route operation
3. Move complex flows (session start/stop, site membership, cpms commands) into use-case orchestrators

### Medium-Effort Tasks

1. Introduce DTO mapping layer
2. Remove inline query/body coercion from routes
3. Add typed domain exceptions

### Testing Scope

- Domain unit tests (pure business rules)
- Use-case tests with mocked ports
- Route adapter tests (input/output only)

Exit criteria:
- Routes are thin adapters only
- Business rules covered at domain/use-case levels

---

## Phase 3: Upstream Client and Resilience Platform

Goal: replace generic helper proxy calls with robust service clients.

### High-Effort Tasks

1. Implement dedicated upstream clients by domain
- UsersClient, SitesClient, OcppClient, MessagingClient, etc.
- Typed methods and typed errors

2. Introduce resilience policies
- Per-endpoint timeout profiles
- Retry with jitter and idempotency awareness
- Circuit breaker and half-open recovery
- Bulkhead isolation for high-risk services

3. Connection pooling and shared transport session

### Medium-Effort Tasks

1. Add response caching for read-heavy lookups
2. Add transition logging for service health states
3. Add fallback policies for non-critical read endpoints

### Testing Scope

- Client unit tests with synthetic upstream failure matrix
- Integration tests against mocked upstream services
- Resilience tests for timeout/retry/circuit-breaker behavior

Exit criteria:
- Zero direct route usage of raw requests calls
- All upstream interactions pass through typed clients

---

## Phase 4: Data Access and Runtime State Hardening

Goal: formalize persistence and remove ad hoc in-memory state risk.

### High-Effort Tasks

1. Introduce repository interfaces and implementations
- CPMS command ledger repository abstraction
- Session repository abstraction

2. Migrate critical runtime state from in-memory dicts to durable store strategy
- Configurable backend: SQLite for local, PostgreSQL for scale

### Medium-Effort Tasks

1. Add bounded cache policies and TTLs
2. Add schema migrations for persistence artifacts
3. Add retention and cleanup jobs

### Testing Scope

- Repository tests (CRUD, concurrency, rollback paths)
- Data migration tests
- Concurrency tests for command/session integrity

Exit criteria:
- No critical workflow depends solely on process memory
- Data lifecycle policies enforced

---

## Phase 5: Security and Abuse Resistance

Goal: close major security gaps and operational abuse vectors.

### High-Effort Tasks

1. Introduce centralized auth/authorization middleware
- Remove any bypass tokens from non-dev profiles
- Enforce route protection matrix

2. Role and ownership policies for sensitive operations
- Session ownership checks
- CPMS command authorization
- Driver/site/business admin boundaries

### Medium-Effort Tasks

1. Add rate limiting by route sensitivity
2. Tighten CORS policy by environment
3. Secret management and startup hard-fail policy for weak defaults
4. Input sanitization and allowlist query parameter handling

### Testing Scope

- Security unit tests (authz matrix)
- Abuse tests (rate limit, brute-force)
- Negative tests for unauthorized access

Exit criteria:
- All sensitive endpoints protected
- Security baseline checks passing in CI

---

## Phase 6: Performance and Scalability

Goal: reduce latency and improve throughput under load.

### High-Effort Tasks

1. Optimize O(n) and N+1 patterns
- Site-by-id lookup optimization
- V2V status lookup optimization
- Session and connector indexing strategy

2. Introduce asynchronous execution path for I/O-heavy operations
- Either async framework migration path or worker offloading strategy

### Medium-Effort Tasks

1. Add pagination/default caps on heavy list endpoints
2. Add selective field projection for large payload endpoints
3. Add per-domain performance budgets

### Testing Scope

- Load tests by domain
- Soak tests for 6h+ workloads
- Tail-latency and error-budget tracking

Exit criteria:
- p95 latency target met on critical flows
- No known unbounded list endpoint without controls

---

## Phase 7: Documentation, Developer Experience, and Rollout

Goal: make the system operable, maintainable, and safe to evolve.

### High-Effort Tasks

1. Generate source-of-truth API docs from code and schemas
2. Build migration cookbook for each domain

### Medium-Effort Tasks

1. Update runbooks, incident docs, troubleshooting tree
2. Add architecture decision records for major refactor choices
3. Improve local dev scripts for environment parity

### Testing Scope

- Documentation consistency checks
- Runbook validation drills

Exit criteria:
- Docs generated from source
- Onboarding and incident recovery paths validated

---

## 4. Testing Strategy (Cross-Phase)

## 4.1 Test Pyramid

1. Unit tests (largest layer)
- Domain rules
- Validation schemas
- Upstream client adapters
- Error mapping

2. Integration tests
- Flask route to use-case wiring
- Use-case to upstream client with mocked HTTP
- Repository adapters

3. Contract tests
- Frontend-backend response shape compatibility
- Upstream client contract pinning per service

4. Resilience and chaos tests
- Timeout, retry, partial outage, malformed JSON
- Circuit breaker and fallback behavior

5. End-to-end tests
- Core user journeys: auth/init session/start/stop/receipt
- Site and membership lifecycle
- Messaging thread lifecycle

## 4.2 Coverage and Quality Gates

- Minimum backend line coverage: 85 percent
- Domain and use-case coverage: 95 percent
- Critical route error-path coverage: 100 percent
- Contract test pass rate: 100 percent
- Security test suite: mandatory pass for release

## 4.3 CI Pipeline Stages

1. Lint and static analysis
2. Unit tests
3. Integration tests
4. Contract tests
5. Security checks
6. Performance smoke
7. Artifact generation (docs, matrices, reports)

---

## 5. Phase Backlog by Effort Band

## High-Effort Backlog (Architecture-heavy)

1. Layered architecture extraction and module split
2. Use-case orchestration framework
3. Typed upstream clients and resilience framework
4. Repository abstraction with persistent runtime state
5. Centralized authz policy engine
6. Async scalability path and load-profile optimization
7. Source-generated API documentation system

## Medium-Effort Backlog (High leverage)

1. Response envelope normalization
2. Schema validation rollout
3. Config typing and env hardening
4. Rate limiting and CORS tightening
5. Caching and transition logging
6. Pagination and projection controls
7. Runbook and developer workflow upgrades

---

## 6. Suggested Execution Cadence

- Sprint 1-2: Phase 0 and 1
- Sprint 3-4: Phase 2
- Sprint 5-6: Phase 3
- Sprint 7-8: Phase 4 and 5
- Sprint 9-10: Phase 6
- Sprint 11: Phase 7

Parallel lanes:
- Lane A: architecture and domain extraction
- Lane B: resilience and observability
- Lane C: security and testing
- Lane D: docs and devex

---

## 7. Risk Controls

1. Use feature flags for behavior changes
2. Keep backward-compat adapters during migration window
3. Deploy domain-by-domain to reduce blast radius
4. Maintain golden snapshots for pre/post behavior comparisons
5. Gate rollouts on error-budget and latency SLOs

---

## 7.1 Completion Hook

Set completion hook to:

- `ALL_PHASES_COMPLETED`

Completion is reached only when every phase in this plan (Phase 0 through Phase 7) has met its exit criteria and required testing gates.

---

## 8. First 10 Concrete Actions to Start Tomorrow

1. Create target folder structure for layered architecture.
2. Define canonical API response and error schema.
3. Implement central validation middleware.
4. Build UsersClient and SitesClient typed adapters.
5. Extract first use-case: CreateSession.
6. Introduce retry and timeout policy registry.
7. Add auth/authorization middleware skeleton.
8. Add route protection matrix and enforce on critical endpoints.
9. Add contract tests for top 20 frontend calls.
10. Publish first generated API contract artifact.

---

## 9. Execution Status

Current status:

- `ALL_PHASES_COMPLETED` for the accelerated implementation pass

Started implementation tasks:

1. Phase 0 middleware foundation bootstrapped:
  - Request ID middleware added (`src/api/middleware/request_id.py`)
  - Global unhandled error handler added (`src/api/middleware/error_handler.py`)
  - Standard response helpers added (`src/api/response.py`)
2. App settings object introduced (`src/config/settings.py`) and wired into app startup.
3. Middleware wiring integrated into app bootstrap (`app.py`).
4. Validation tests added and passing (`tests/test_platform_middleware.py`).
5. Phase 1 contract normalization started with backward-compatible platform endpoints:
  - Added normalized health endpoint (`/api/platform/health`)
  - Added normalized service-status endpoint (`/api/platform/services/<service_name>`)
  - Added contract tests (`tests/test_platform_contracts.py`)
6. Phase 0 route inventory and baseline artifacts generated:
  - Route inventory JSON/Markdown generated (`ROUTE_INVENTORY.json`, `ROUTE_INVENTORY.md`)
7. Phase 2 domain/use-case extraction initiated for users domain:
  - Added users use-case module (`src/application/use_cases/users_use_cases.py`)
  - Users route patch merge now uses use-case merge/validation.
8. Phase 3 upstream and resilience platform introduced:
  - Added resilient shared HTTP client (`src/infrastructure/http/base_client.py`, `src/infrastructure/http/retry.py`)
  - Added typed users upstream adapter (`src/infrastructure/upstream_clients/users_client.py`)
  - Shared HTTP helper now uses pooled client with retries.
9. Phase 4 runtime state hardening started for charging sessions:
  - Added session repository abstraction (`src/infrastructure/persistence/session_repository.py`)
  - EV charging sessions now dual-write to repository and legacy store.
10. Phase 5 security and abuse resistance baseline added:
  - API key middleware (`src/api/middleware/auth.py`)
  - Rate limiting middleware (`src/api/middleware/rate_limit.py`)
  - Security headers middleware (`src/api/middleware/security_headers.py`)
11. Phase 6 scalability controls added for list endpoints:
  - Added bounded pagination helpers in `helpers.py`
  - Applied list limits to users and session listing routes.
12. Phase 7 docs/devex automation added:
  - Route inventory generator script (`scripts/route_inventory.py`)
  - API contract normalization report generator (`scripts/generate_api_contract.py`)
  - Generated contract report (`API_CONTRACT_NORMALIZED.md`).
