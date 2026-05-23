# AppDev API Endpoint Matrix (Historical Probe Snapshot)

Status note (2026-04-17): this matrix is a point-in-time upstream probe from 2026-04-07, not the current Flask route truth.

- Current in-repo route source of truth: `ROUTE_INVENTORY.md` (`Total routes: 108`).
- Entries here may include services/endpoints no longer represented in current route modules.

- Host: http://appdev.evbuddy.net
- Generated: 2026-04-07T07:05:08.516335+00:00

| Service | Method | URL | Status | OK | Shape | Count |
|---|---|---|---:|---|---|---:|
| users | GET | http://appdev.evbuddy.net:9000/user/status | 200 | True | text |  |
| users | GET | http://appdev.evbuddy.net:9000/user | 200 | True | list | 125 |
| user_vehicles | GET | http://appdev.evbuddy.net:9001/user-vehicle/vehicles | 200 | True | list | 22 |
| host_sites | GET | http://appdev.evbuddy.net:9004/host-sites/status | 200 | True | text |  |
| host_sites | GET | http://appdev.evbuddy.net:9004/host-sites | 200 | True | list | 394 |
| host_sites | GET | http://appdev.evbuddy.net:9004/host-sites?host_id=1 | 200 | True | list | 7 |
| operating_hours | GET | http://appdev.evbuddy.net:9008/actuator/health | 200 | True | dict |  |
| operating_hours | GET | http://appdev.evbuddy.net:9008/operating-hours | 500 | False | dict |  |
| messaging | GET | http://appdev.evbuddy.net:9011/actuator/health | 200 | True | dict |  |
| messaging | GET | http://appdev.evbuddy.net:9011/threads | 200 | True | dict | 20 |
| messaging | GET | http://appdev.evbuddy.net:9011/templates | 200 | True | dict | 14 |
| chargers | GET | http://appdev.evbuddy.net:9017/chargers/status | 200 | True | text |  |
| services_catalog | GET | http://appdev.evbuddy.net:9026/services | 200 | True | list | 7 |
| ocpp | GET | http://appdev.evbuddy.net:9029/api/charge-points | 200 | True | dict | 19 |
| ocpp | GET | http://appdev.evbuddy.net:9029/api/connectors | 200 | True | dict | 47 |
