# Test Expansion Plan (No-Overlap)

Status: focused expansion completed; this file now tracks the current maintained test posture.

## Goal
Increase confidence across UI and API without duplicating assertions already present in existing suites.

## Current Testing Status (2026-04-17)
- Focused backend suites verified green:
   - `python -m pytest tests/test_routes_cpms_pytest.py tests/test_routes_pages_pytest.py tests/test_routes_experience_pytest.py tests/test_routes_ev_charging_edges_pytest.py -q`
   - Result: `23 passed`
- Focused frontend suites verified green:
   - `npm --prefix client run test -- src/components/App.test.tsx src/utils/api.test.ts`
   - Result: `2 files, 6 tests passed`
- Broader backend suite:
   - `python -m pytest -q -ra`
   - Result: `57 passed, 35 skipped, 1 xfailed`
   - Most skips are intentionally quarantined low-fidelity placeholder tests plus stress-only tests gated behind `RUN_STRESS=1`.
- Broader frontend suite:
   - `npm --prefix client run test`
   - Result: `12 files, 17 tests passed`

## Existing Coverage Snapshot
- Backend already has baseline tests for:
   - focused route and contract suites (`tests/test_routes_*`, `tests/test_platform_contracts.py`)
   - middleware/infrastructure files, with several legacy placeholders explicitly skipped to avoid false-negative noise
  - selected route flows (`tests/test_routes_*`)
  - infrastructure adapters (`tests/test_infra_*`)
- Frontend already has component-level tests in `client/src/components/*.test.tsx` and utility tests in `client/src/utils/*.test.ts`.

## Expansion Strategy
1. Add focused route tests for un/under-tested modules:
- `routes/cpms.py`: command ledger behavior, validation, filtering limits.
- `routes/pages.py`: static fallback behavior and guest QR route.
- `routes/experience.py`: normalized envelope and snapshot passthrough.
- `routes/ev_charging.py`: edge/error paths for auth/session/receipt/proxy flows.

2. Upgrade weak/legacy frontend tests:
- Replace outdated `client/src/components/App.test.tsx` with tests aligned to current UI and fetch behavior.
- Replace outdated `client/src/utils/api.test.ts` (mocha/chai-style) with Vitest-native tests for request/response/error parsing logic.

3. Avoid stepping on existing tests:
- Reuse existing fixtures (`tests/conftest.py`) and avoid duplicating middleware/unit assertions already in dedicated files.
- Focus new assertions on endpoint contracts, edge responses, and cross-route behavior.

## New Test Files
- `tests/test_routes_cpms_pytest.py`
- `tests/test_routes_pages_pytest.py`
- `tests/test_routes_experience_pytest.py`
- `tests/test_routes_ev_charging_edges_pytest.py`

## Modernized Existing Frontend Tests
- `client/src/components/App.test.tsx`
- `client/src/utils/api.test.ts`

## Verification Sequence
1. Run backend targeted suite first:
   - `python -m pytest tests/test_routes_cpms_pytest.py tests/test_routes_pages_pytest.py tests/test_routes_experience_pytest.py tests/test_routes_ev_charging_edges_pytest.py -q`
2. Run frontend targeted suite:
   - `npm --prefix client run test -- src/components/App.test.tsx src/utils/api.test.ts`
3. Run broader full suites once targeted tests pass.
