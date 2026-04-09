# appdev.evbuddy.net Recon Report

> Snapshot note: this report is point-in-time probe output from 2026-04-06 and may become stale. Re-run `python .\\scripts\\explore_appdev_domain.py > appdev_discovery.json` to refresh.

Generated from live probes on 2026-04-06.

## High-Value Findings

- OCPP central API is active on port `9029`.
- Simulator CPID `MF001` is live, online, and visible in OCPP APIs.
- Port `9030` is reachable but currently returns structured `404` responses for tested paths.
- CPMS command flow in this repo now supports durable txid tracking in local SQLite.

## Active Service Signals by Port

Probed baseline paths: `/actuator/health`, `/health`, `/status`, domain status paths, and OCPP paths.

- `9000`: `/user/status` responded `200`.
- `9004`: `/host-sites/status` responded `200`.
- `9008`: `/actuator/health` responded `200`.
- `9011`: `/actuator/health` responded `200` (includes DB component details).
- `9017`: `/chargers/status` responded `200`.
- `9029`: `/api/charge-points` and `/api/connectors` responded `200`.
- `9030`: no tested route returned `200`.

See full probe artifact in `appdev_discovery.json`.

## Endpoint Sampling Results

- `http://appdev.evbuddy.net:9004/host-sites`
  - `200`, count ~= `394`
  - key fields include: `id`, `name`, `city`, `region`, `country`, `latitude`, `longitude`, `timezone`, `postal_code`, `host_id`, `user_id`, `created_at`, `updated_at`

- `http://appdev.evbuddy.net:9017/chargers/chargers/status/available`
  - `200`, count ~= `878`
  - key fields include: `id`, `name`, `status`, `ocpp_identity`, `serial_number`, `charger_model_id`, `firmware_version`, `max_power_kw`, `host_site_id`, `is_mobile`, `createdAt`, `updatedAt`

- `http://appdev.evbuddy.net:9029/api/charge-points`
  - `200`, count ~= `19`
  - key fields include: `id`, `charge_point_id`, `charge_point_model`, `charge_point_serial_number`, `charge_point_vendor`, `firmware_version`, `online`, `registration_status`, `last_heartbeat`, `created_at`, `updated_at`

- `http://appdev.evbuddy.net:9029/api/connectors`
  - `200`, count ~= `47`
  - key fields include: `id`, `charge_point_id`, `connector_id`, `status`, `error_code`, `id_tag`, `is_charging`, `start_timestamp`, `timestamp`, `info`

## MF001 Simulator Validation

Simulator info provided:
- CPID: `MF001`
- Connectors: `4`
- WSURL: `ws://20.119.73.31:9022/ocpp/`

Validation performed:
- Direct OCPP WS probe succeeded for both:
  - `ws://20.119.73.31:9022/ocpp/MF001`
  - `ws://20.119.73.31:9022/ocpp`
- Successful CALL/CALLRESULT cycles:
  - `BootNotification` -> `status: Accepted`, `interval: 60`
  - `Heartbeat` -> valid `currentTime`
  - `StatusNotification` -> empty `{}` payload CALLRESULT (success)
- Post-probe REST confirmation on `9029`:
  - `MF001` remained online
  - charge point metadata changed to probe values (`charge_point_model=ProbeClient`, `charge_point_vendor=EVBuddy-Sim-Probe`, `firmware_version=0.1-test`)
  - connector 1 timestamp advanced to probe time

## Inferred Database Model (API-Level)

This is an inference from response payloads, not direct schema access.

### likely table/entity: `host_sites`
- Primary key candidate: `id`
- Relationship hints:
  - `host_id` -> host/business/user owner
  - `user_id` -> optional direct owner/user link
- Geospatial/address fields present (`latitude`, `longitude`, address lines, city/region/country/postal)

### likely table/entity: `chargers`
- Primary key candidate: `id`
- Foreign key candidate: `host_site_id` -> `host_sites.id`
- OCPP linking field: `ocpp_identity` (likely joins to charge point identity)
- Operational fields: `status`, `firmware_version`, `max_power_kw`, `is_mobile`

### likely table/entity: `ocpp_charge_points`
- Primary key candidate: `id`
- Natural key candidate: `charge_point_id`
- Registration/status fields: `registration_status`, `online`, `last_heartbeat`
- Device metadata fields: model, serial, vendor, firmware

### likely table/entity: `ocpp_connectors`
- Primary key candidate: `id`
- Composite identity likely: (`charge_point_id`, `connector_id`)
- Runtime state fields: `status`, `error_code`, `timestamp`
- Session hints: `id_tag`, `is_charging`, `start_timestamp`

### relationship hypothesis
- `host_sites (1) -> (many) chargers`
- `chargers.ocpp_identity` maps to `ocpp_charge_points.charge_point_id`
- `ocpp_charge_points (1) -> (many) ocpp_connectors`

## Limitations

- No direct DB credentials were available, so findings are API-observed and inferred.
- Some ports may expose additional routes not covered by current probes.
- `9030` may require specific routes, auth headers, or non-HTTP protocol behavior not exercised here.

## Local Tooling Added in This Repo

- `scripts/explore_appdev_domain.py`:
  - scans multi-port appdev surface
  - supports `--out` for UTF-8 JSON artifact output
- `scripts/ocpp_sim_probe.py`:
  - opens OCPP 1.6 WebSocket session
  - sends `BootNotification`, `Heartbeat`, `StatusNotification`
- `scripts/ocpp_stress.py`:
  - concurrent local stress for CPMS start/stop txid workflow
- `routes/cpms.py`:
  - durable tx ledger via SQLite (`data/cpms_tx_ledger.db`)

