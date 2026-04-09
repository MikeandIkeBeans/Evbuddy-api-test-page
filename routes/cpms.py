"""
CPMS (Charge Point Management System) operations.
"""

import json
import os
import secrets
import sqlite3
import threading
import time
from contextlib import closing

from flask import Blueprint, jsonify, request

from config import EV_BASE_DIR
from helpers import ev_now_iso, ok_response

cpms_bp = Blueprint("cpms", __name__)


# In-memory command/transaction ledger for local debugging and API exercises.
CPMS_TX_LEDGER = {}
CPMS_ASSET_COMMANDS = {}
_CPMS_DB_LOCK = threading.Lock()
CPMS_DB_PATH = os.environ.get("CPMS_TX_DB", str(EV_BASE_DIR / "data" / "cpms_tx_ledger.db"))


def _cpms_ensure_db():
    os.makedirs(os.path.dirname(CPMS_DB_PATH), exist_ok=True)
    with closing(sqlite3.connect(CPMS_DB_PATH)) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cpms_tx_ledger (
                txid TEXT PRIMARY KEY,
                asset_id TEXT NOT NULL,
                action TEXT NOT NULL,
                command_code TEXT NOT NULL,
                status TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cpms_asset_time ON cpms_tx_ledger(asset_id, timestamp DESC)")
        conn.commit()


def _cpms_save_entry(entry):
    with _CPMS_DB_LOCK:
        _cpms_ensure_db()
        with closing(sqlite3.connect(CPMS_DB_PATH)) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO cpms_tx_ledger
                    (txid, asset_id, action, command_code, status, timestamp, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry["txid"],
                    entry["asset_id"],
                    entry["action"],
                    entry["command_code"],
                    entry["status"],
                    entry["timestamp"],
                    json.dumps(entry["payload"], separators=(",", ":")),
                ),
            )
            conn.commit()


def _cpms_row_to_entry(row):
    return {
        "txid": row[0],
        "asset_id": row[1],
        "action": row[2],
        "command_code": row[3],
        "status": row[4],
        "timestamp": row[5],
        "payload": json.loads(row[6]) if row[6] else {},
    }


def _cpms_get_entry(txid):
    in_memory = CPMS_TX_LEDGER.get(txid)
    if in_memory:
        return in_memory

    with _CPMS_DB_LOCK:
        _cpms_ensure_db()
        with closing(sqlite3.connect(CPMS_DB_PATH)) as conn:
            row = conn.execute(
                """
                SELECT txid, asset_id, action, command_code, status, timestamp, payload_json
                FROM cpms_tx_ledger
                WHERE txid = ?
                """,
                (txid,),
            ).fetchone()

    if not row:
        return None

    entry = _cpms_row_to_entry(row)
    CPMS_TX_LEDGER[txid] = entry
    CPMS_ASSET_COMMANDS.setdefault(entry["asset_id"], []).append(txid)
    return entry


def _cpms_list_entries_by_asset(asset_id, limit=50):
    with _CPMS_DB_LOCK:
        _cpms_ensure_db()
        with closing(sqlite3.connect(CPMS_DB_PATH)) as conn:
            rows = conn.execute(
                """
                SELECT txid, asset_id, action, command_code, status, timestamp, payload_json
                FROM cpms_tx_ledger
                WHERE asset_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (asset_id, int(limit)),
            ).fetchall()

    entries = [_cpms_row_to_entry(row) for row in rows]
    for entry in entries:
        CPMS_TX_LEDGER[entry["txid"]] = entry
        CPMS_ASSET_COMMANDS.setdefault(asset_id, []).append(entry["txid"])
    return entries


def _cpms_make_command_code(prefix):
    return f"{prefix}-{secrets.token_hex(3).upper()}"


def _cpms_make_txid():
    return f"TX-{int(time.time() * 1000)}-{secrets.token_hex(2).upper()}"


def _cpms_record_command(asset_id, action, payload, txid=None):
    command_code = _cpms_make_command_code("CMD")
    effective_txid = txid or _cpms_make_txid()

    entry = {
        "txid": effective_txid,
        "command_code": command_code,
        "action": action,
        "asset_id": asset_id,
        "status": "ACCEPTED",
        "timestamp": ev_now_iso(),
        "payload": payload,
    }

    CPMS_TX_LEDGER[effective_txid] = entry
    CPMS_ASSET_COMMANDS.setdefault(asset_id, []).append(effective_txid)
    _cpms_save_entry(entry)
    return entry


@cpms_bp.post("/api/assets/<asset_id>/remote-start")
def cpms_remote_start(asset_id):
    """Start a charging session remotely."""
    data = request.get_json() or {}
    connector_id = data.get("connector_id", 1)
    id_tag = data.get("id_tag", "HOTEL-GUEST")
    entry = _cpms_record_command(
        asset_id=asset_id,
        action="RemoteStartTransaction",
        payload={"connector_id": connector_id, "id_tag": id_tag},
    )
    return ok_response("Remote start command sent", **entry)


@cpms_bp.post("/api/assets/<asset_id>/remote-stop")
def cpms_remote_stop(asset_id):
    """Stop a charging session remotely."""
    data = request.get_json() or {}
    transaction_id = data.get("transaction_id") or data.get("txid")
    if not transaction_id:
        return jsonify({"error": "transaction_id or txid required"}), 400

    entry = _cpms_record_command(
        asset_id=asset_id,
        action="RemoteStopTransaction",
        payload={"transaction_id": transaction_id},
        txid=str(transaction_id),
    )
    return ok_response("Remote stop command sent", **entry)


@cpms_bp.get("/api/transactions/<txid>")
def cpms_get_transaction(txid):
    """Inspect a recorded CPMS/OCPP command by transaction id."""
    entry = _cpms_get_entry(txid)
    if not entry:
        return jsonify({"error": "transaction not found", "txid": txid}), 404
    return jsonify(entry)


@cpms_bp.get("/api/assets/<asset_id>/commands")
def cpms_list_asset_commands(asset_id):
    """List recent command transactions for an asset."""
    limit = request.args.get("limit", 50, type=int)
    if limit < 1:
        return jsonify({"error": "limit must be >= 1"}), 400
    limit = min(limit, 500)

    commands = _cpms_list_entries_by_asset(asset_id, limit=limit)
    return jsonify({"asset_id": asset_id, "count": len(commands), "commands": commands})


@cpms_bp.post("/api/assets/<asset_id>/maintenance-mode")
def cpms_maintenance_mode(asset_id):
    """Set charger to maintenance mode."""
    data = request.get_json() or {}
    enabled = data.get("enabled", True)
    reason = data.get("reason", "")
    return ok_response(
        f"Maintenance mode {'enabled' if enabled else 'disabled'}",
        asset_id=asset_id,
        enabled=enabled,
        reason=reason,
    )


@cpms_bp.get("/api/assets/<asset_id>/diagnostics")
def cpms_get_diagnostics(asset_id):
    """Get charger diagnostics."""
    return jsonify(
        {
            "asset_id": asset_id,
            "status": "Available",
            "error_code": "NoError",
            "connector_status": [
                {"connector_id": 1, "status": "Available"},
                {"connector_id": 2, "status": "Available"},
            ],
            "last_heartbeat": ev_now_iso(),
            "firmware_version": "1.2.3",
        }
    )


@cpms_bp.post("/api/assets/<asset_id>/reset")
def cpms_reset(asset_id):
    """Reset the charger (soft or hard)."""
    data = request.get_json() or {}
    reset_type = data.get("type", "Soft")
    return ok_response(f"{reset_type} reset command sent", asset_id=asset_id, reset_type=reset_type)


@cpms_bp.post("/api/assets/<asset_id>/firmware-update")
def cpms_firmware_update(asset_id):
    """Trigger a firmware update."""
    data = request.get_json() or {}
    firmware_url = data.get("firmware_url")
    if not firmware_url:
        return jsonify({"error": "firmware_url required"}), 400

    return ok_response("Firmware update scheduled", asset_id=asset_id, firmware_url=firmware_url)


@cpms_bp.post("/api/assets/<asset_id>/change-configuration")
def cpms_change_configuration(asset_id):
    """Change charger configuration."""
    data = request.get_json() or {}
    key = data.get("key")
    value = data.get("value")
    if not key:
        return jsonify({"error": "key required"}), 400

    return ok_response("Configuration change sent", asset_id=asset_id, key=key, value=value)


@cpms_bp.post("/api/sessions/<session_id>/refund")
def cpms_refund_session(session_id):
    """Issue a refund for a charging session."""
    data = request.get_json() or {}
    operator_id = data.get("operator_id")
    amount = data.get("amount")
    reason = data.get("reason", "")

    if not operator_id:
        return jsonify({"error": "operator_id required"}), 400
    if not amount:
        return jsonify({"error": "amount required"}), 400

    return ok_response("Refund processed", session_id=session_id, amount=amount, reason=reason)


@cpms_bp.put("/api/assets/<asset_id>/tariff")
def cpms_update_tariff(asset_id):
    """Update charging tariff for an asset."""
    data = request.get_json() or {}
    return ok_response("Tariff updated", asset_id=asset_id, tariff=data.get("tariff"))
