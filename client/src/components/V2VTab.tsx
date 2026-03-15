import React, { useState, useEffect, useCallback } from "react";
import styles from "../styles";
import { EVBUDDY_API } from "../utils/api";

interface Charger {
  online?: boolean;
  charge_point_model?: string;
  charge_point_vendor?: string;
  charge_point_serial_number?: string;
  firmware_version?: string;
  last_heartbeat?: string;
  [key: string]: unknown;
}

interface Connector {
  connector_id: number;
  status?: string;
  error_code?: string;
}

interface V2VSession {
  transaction_id: number;
  connector_id: number;
  status?: string;
  is_active?: boolean;
  start_timestamp?: string;
  duration_seconds?: number;
  energy_delivered?: number;
  stop_reason?: string;
}

interface ActionResult {
  type: string;
  msg: string;
}

const CHARGE_POINT_ID = "EVB-V2V-001-JP";

const STATUS_COLORS = {
  Available: "#59a3ff",
  Preparing: "#ffb967",
  Charging: "#46d6b5",
  SuspendedEV: "#ffb967",
  SuspendedEVSE: "#ffb967",
  Finishing: "#c4b5fd",
  Faulted: "#ff7f88",
  Unavailable: "#666",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "#888";
}

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - new Date(ts + "Z").getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds && seconds !== 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

const btnBase = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  flex: 1,
  textAlign: "center" as const,
};

const btnStart = {
  ...btnBase,
  background: "linear-gradient(135deg, #34d399, #10b981)",
  color: "#fff",
  boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
};

const btnStop = {
  ...btnBase,
  background: "linear-gradient(135deg, #f87171, #ef4444)",
  color: "#fff",
  boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
};

const btnRefresh = {
  ...btnBase,
  background: "rgba(30,40,60,0.7)",
  color: "var(--text-secondary)",
  border: "1px solid var(--line-soft)",
  flex: "none",
  padding: "10px 14px",
};

const btnSoftReset = {
  ...btnBase,
  flex: "none",
  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
  color: "#1a1a1a",
  padding: "8px 14px",
  fontSize: 13,
};

const btnHardReset = {
  ...btnBase,
  flex: "none",
  background: "linear-gradient(135deg, #fb923c, #ef4444)",
  color: "#fff",
  padding: "8px 14px",
  fontSize: 13,
};

export default function V2VTab() {
  const [charger, setCharger] = useState<Charger | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [sessions, setSessions] = useState<V2VSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${EVBUDDY_API}/v1/v2v/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCharger(data.charger);
          setConnectors(Array.isArray(data.connectors) ? data.connectors : []);
          setError(null);
        }
      } else {
        setError(`Status fetch failed: ${res.status}`);
      }
    } catch (err: unknown) {
      setError(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${EVBUDDY_API}/v1/v2v/sessions`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setSessions(data.sessions || []);
      }
    } catch {
      // sessions are secondary
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchSessions()]);
    setLoading(false);
  }, [fetchStatus, fetchSessions]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAll]);

  const postAction = async (url: string, body: Record<string, unknown>, label: string) => {
    setActionLoading(label);
    setActionResult(null);
    try {
      const res = await fetch(`${EVBUDDY_API}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const ok = data.success && (data.status === "Accepted" || !data.status || data.status === "Rejected");
      setActionResult({
        type: ok ? "success" : "warn",
        msg: data.message || data.error || data.status || "Command sent",
      });
      setTimeout(fetchAll, 1500);
    } catch (err: unknown) {
      setActionResult({ type: "error", msg: err instanceof Error ? err.message : String(err) });
    }
    setActionLoading(null);
  };

  const handleStart = (connectorId: number) =>
    postAction("/v1/v2v/start", { connector_id: connectorId }, `start-${connectorId}`);

  const handleStop = (connectorId: number, transactionId: number | undefined) =>
    postAction("/v1/v2v/stop", { connector_id: connectorId, transaction_id: transactionId }, `stop-${connectorId}`);

  const handleReset = (type: string) =>
    postAction("/v1/v2v/reset", { type }, `reset-${type}`);

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardTitle}>V2V Charging</div>
        <div style={{ color: "var(--text-muted)" }}>Loading charge point data...</div>
      </div>
    );
  }

  const online = charger?.online ?? false;

  return (
    <div>
      {/* Charger Card */}
      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{CHARGE_POINT_ID}</span>
            <span style={{
              ...styles.badge,
              marginLeft: 0,
              ...(online ? styles.badgeSuccess : styles.badgeError),
            }}>
              {online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ ...btnSoftReset, opacity: actionLoading ? 0.5 : 1 }}
              disabled={!!actionLoading}
              onClick={() => handleReset("Soft")}
            >
              {actionLoading === "reset-Soft" ? "..." : "Soft Reset"}
            </button>
            <button
              style={{ ...btnHardReset, opacity: actionLoading ? 0.5 : 1 }}
              disabled={!!actionLoading}
              onClick={() => handleReset("Hard")}
            >
              {actionLoading === "reset-Hard" ? "..." : "Hard Reset"}
            </button>
          </div>
        </div>

        {charger && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-muted)", marginTop: 12 }}>
            <span>{charger.charge_point_model}</span>
            <span>{charger.charge_point_vendor}</span>
            <span>SN: {charger.charge_point_serial_number}</span>
            <span>FW {charger.firmware_version}</span>
            <span>Heartbeat {timeAgo(charger.last_heartbeat)}</span>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,127,136,0.12)", color: "var(--accent-danger)", fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>

      {/* Action Result */}
      {actionResult && (
        <div style={{
          ...styles.card,
          padding: "10px 16px",
          background: actionResult.type === "success" ? "rgba(70,214,181,0.12)" : actionResult.type === "warn" ? "rgba(255,185,103,0.12)" : "rgba(255,127,136,0.12)",
          border: `1px solid ${actionResult.type === "success" ? "rgba(91,230,199,0.3)" : actionResult.type === "warn" ? "rgba(255,202,140,0.3)" : "rgba(255,156,163,0.3)"}`,
          fontSize: 13,
          color: actionResult.type === "success" ? "var(--accent-success)" : actionResult.type === "warn" ? "var(--accent-warn)" : "var(--accent-danger)",
        }}>
          {actionResult.msg}
        </div>
      )}

      {/* Connector Cards */}
      <div style={styles.grid}>
        {connectors.map((conn) => {
          const st = conn.status || "Unknown";
          const isCharging = ["Charging", "SuspendedEV", "SuspendedEVSE", "Preparing"].includes(st);
          // Connector data doesn't include txn ID — look it up from active sessions
          const activeSession = sessions.find(
            (s) => s.connector_id === conn.connector_id && (s.is_active || s.status === "InProgress")
          );
          const txnId = activeSession?.transaction_id;

          return (
            <div key={conn.connector_id} style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  Connector {conn.connector_id}
                </span>
                <span style={{
                  ...styles.badge,
                  marginLeft: 0,
                  background: `${statusColor(st)}22`,
                  color: statusColor(st),
                  borderColor: `${statusColor(st)}44`,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {st}
                </span>
              </div>

              {conn.error_code && conn.error_code !== "NoError" && (
                <div style={{ color: "var(--accent-danger)", fontSize: 13, marginBottom: 8 }}>Error: {conn.error_code}</div>
              )}
              {txnId && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                  Transaction: <strong>{txnId}</strong>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ ...btnStart, opacity: isCharging || actionLoading ? 0.5 : 1 }}
                  disabled={isCharging || !!actionLoading}
                  onClick={() => handleStart(conn.connector_id)}
                >
                  {actionLoading === `start-${conn.connector_id}` ? "Starting..." : "Start"}
                </button>
                <button
                  style={{ ...btnStop, opacity: !txnId || actionLoading ? 0.5 : 1 }}
                  disabled={!txnId || !!actionLoading}
                  onClick={() => handleStop(conn.connector_id, txnId)}
                >
                  {actionLoading === `stop-${conn.connector_id}` ? "Stopping..." : "Stop"}
                </button>
                <button
                  style={btnRefresh}
                  onClick={fetchAll}
                >
                  Refresh
                </button>
              </div>
            </div>
          );
        })}

        {connectors.length === 0 && !error && (
          <div style={{ ...styles.card, color: "var(--text-muted)" }}>
            No connector data available
          </div>
        )}
      </div>

      {/* Session History */}
      {sessions.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Recent Sessions</div>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Txn</th>
                  <th style={styles.th}>Conn</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Started</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Energy</th>
                  <th style={styles.th}>Stop Reason</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const isActive = s.status === "InProgress" || s.is_active;
                  return (
                    <tr key={s.transaction_id}>
                      <td style={styles.td}>{s.transaction_id}</td>
                      <td style={styles.td}>{s.connector_id}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, marginLeft: 0, ...(isActive ? styles.badgePending : styles.badgeSuccess) }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={styles.td}>{timeAgo(s.start_timestamp)}</td>
                      <td style={styles.td}>{formatDuration(s.duration_seconds)}</td>
                      <td style={styles.td}>{s.energy_delivered != null ? `${s.energy_delivered} kWh` : "—"}</td>
                      <td style={{ ...styles.td, color: "var(--text-muted)" }}>{s.stop_reason || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
