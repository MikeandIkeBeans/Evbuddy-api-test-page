# OCPP Backend Playground

This guide focuses on command/transaction behavior for CPMS and charging session APIs.

## Start Backend

```powershell
.\.venv\Scripts\Activate.ps1
python app.py
```

## 1) Send Remote Start Command (creates txid + command_code)

```powershell
curl.exe -s -X POST "http://127.0.0.1:5000/api/assets/atl001/remote-start" ^
  -H "Content-Type: application/json" ^
  -d "{\"connector_id\":1,\"id_tag\":\"HOTEL-GUEST\"}"
```

Expected fields in response:
- txid
- command_code
- action = RemoteStartTransaction
- status = ACCEPTED

## 2) Fetch Asset Command Feed

```powershell
curl.exe -s "http://127.0.0.1:5000/api/assets/atl001/commands"
```

`atl001` is the default local charger id used by the sample flow.

## 3) Send Remote Stop Command Using txid

Use the txid returned from step 1.

```powershell
curl.exe -s -X POST "http://127.0.0.1:5000/api/assets/atl001/remote-stop" ^
  -H "Content-Type: application/json" ^
  -d "{\"txid\":\"TX-REPLACE-ME\"}"
```

Expected fields in response:
- txid (same as input)
- command_code
- action = RemoteStopTransaction

## 4) Inspect a Transaction Directly

```powershell
curl.exe -s "http://127.0.0.1:5000/api/transactions/TX-REPLACE-ME"
```

## 5) Create a Charging Session (Bearer demo-token)

```powershell
curl.exe -s -X POST "http://127.0.0.1:5000/v1/sessions" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer demo-token" ^
  -d "{\"chargerId\":\"atl001\",\"connectorId\":1,\"limit\":{\"type\":\"TIME_MIN\",\"value\":3}}"
```

`demo-token` is accepted by the local auth helper for test workflows.

Expected fields:
- sessionId
- status = STARTING
- transactionId (from upstream OCPP start response)

## 6) Poll Session State

```powershell
curl.exe -s "http://127.0.0.1:5000/v1/sessions/SES-REPLACE-ME"
```

## 7) Stop Session

```powershell
curl.exe -s -X POST "http://127.0.0.1:5000/v1/sessions/SES-REPLACE-ME/stop" ^
  -H "Authorization: Bearer demo-token"
```

## 8) OCPP Aggregated Sessions

```powershell
curl.exe -s "http://127.0.0.1:5000/v1/ocpp/sessions"
```

This endpoint reads from the OCPP service and returns active/preparing connectors with transaction IDs when available.

## Automated Test Run

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

## 9) Session Correlation Debug Endpoint

This joins local EV session state with CPMS transaction history.

```powershell
curl.exe -s "http://127.0.0.1:5000/v1/debug/sessions/SES-REPLACE-ME/correlation"
```

## 10) Stress Test CPMS Commands

```powershell
python .\scripts\ocpp_stress.py --base-url "http://127.0.0.1:5000" --asset-id atl001 --workers 12 --cycles 80
```

## 11) Explore appdev.evbuddy.net Ports and Services

```powershell
python .\scripts\explore_appdev_domain.py > appdev_discovery.json
```

Default scan includes known EVBuddy ports and OCPP ports (`9026`, `9029`, `9030`).

## 12) Probe External OCPP Simulator Directly (WebSocket)

```powershell
python .\scripts\ocpp_sim_probe.py --ws-url "ws://20.119.73.31:9022/ocpp/" --cpid MF001
```

Expected:
- successful connection
- `BootNotification` accepted
- `Heartbeat` returns `currentTime`
- `StatusNotification` gets CALLRESULT payload
