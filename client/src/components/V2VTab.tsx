import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./feature-layout.css";
import { EVBUDDY_API } from "../utils/api";
import { Button, Panel, SectionHeader, StatusPill } from "./primitives";

interface Charger {
  online?: boolean;
  charge_point_model?: string;
  charge_point_vendor?: string;
  charge_point_serial_number?: string;
  firmware_version?: string;
  last_heartbeat?: string;
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

interface V2VStatusPayload {
  success?: boolean;
  charger?: Charger;
  connectors?: Connector[];
}

interface V2VSessionsPayload {
  success?: boolean;
  sessions?: V2VSession[];
}

interface ActionResult {
  tone: "success" | "warning" | "error";
  message: string;
  detail?: string;
}

const CHARGE_POINT_ID = "EVB-V2V-001-JP";
const TAB_NAV_EVENT = "evbuddy:navigate-tab";

type ConsoleTabId = "chargers" | "sessions";

function statusTone(status: string | undefined): "success" | "neutral" | "error" {
  const normalized = (status || "").toLowerCase();
  if (normalized === "charging") return "success";
  if (normalized === "offline" || normalized === "faulted" || normalized === "unavailable") return "error";
  return "neutral";
}

function statusLabel(status: string | undefined): string {
  if (!status) return "Unknown";
  return status;
}

function isActiveConnector(status: string | undefined): boolean {
  const normalized = (status || "").toLowerCase();
  return normalized === "charging" || normalized === "preparing" || normalized === "suspendedev" || normalized === "suspendedevse";
}

function connectorSortRank(status: string | undefined): number {
  const normalized = (status || "").toLowerCase();
  if (normalized === "charging") return 0;
  if (normalized === "preparing") return 1;
  if (normalized === "available") return 2;
  if (normalized === "suspendedev" || normalized === "suspendedevse") return 3;
  if (normalized === "faulted" || normalized === "unavailable" || normalized === "offline") return 5;
  return 4;
}

function ago(value: string | undefined): string {
  if (!value) return "—";
  const timestamp = new Date(value.endsWith("Z") ? value : `${value}Z`).getTime();
  if (Number.isNaN(timestamp)) return "—";
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function heartbeatAgeLabel(value: string | undefined): string {
  const valueLabel = ago(value);
  return valueLabel === "—" ? "Not detected" : valueLabel;
}

function formatLastSeen(value: string | undefined): string {
  if (!value) return "No heartbeat received";
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function heartbeatState(value: string | undefined): "live" | "degraded" | "stale" | "unknown" {
  if (!value) return "unknown";
  const timestamp = new Date(value.endsWith("Z") ? value : `${value}Z`).getTime();
  if (Number.isNaN(timestamp)) return "unknown";
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diff <= 20) return "live";
  if (diff <= 120) return "degraded";
  return "stale";
}

function heartbeatSignalLabel(state: "live" | "degraded" | "stale" | "unknown"): string {
  if (state === "live") return "Active";
  if (state === "degraded") return "Delayed";
  if (state === "stale") return "Stale";
  return "Missing";
}

function navigateToTab(tabId: ConsoleTabId): void {
  window.dispatchEvent(new CustomEvent(TAB_NAV_EVENT, { detail: { tabId } }));
}

function normalizeCommandMessage(payload: { success?: boolean; message?: string; error?: string; status?: string }): ActionResult {
  const raw = `${payload.message || payload.error || payload.status || ""}`.trim();
  const lower = raw.toLowerCase();

  if (payload.success) {
    return {
      tone: "success",
      message: raw || "Command accepted",
    };
  }

  if (lower.includes("not connected") || lower.includes("offline") || lower.includes("disconnected")) {
    return {
      tone: "error",
      message: "Reset request could not be delivered",
      detail: "Charger offline. No OCPP heartbeat detected.",
    };
  }

  const warning = payload.status === "Rejected";
  return {
    tone: warning ? "warning" : "error",
    message: raw || "Command failed",
  };
}

function duration(value: number | undefined): string {
  if (typeof value !== "number") return "—";
  if (value < 60) return `${value}s`;
  const m = Math.floor(value / 60);
  const s = value % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function V2VTab() {
  const [charger, setCharger] = useState<Charger | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [sessions, setSessions] = useState<V2VSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [commandBusy, setCommandBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [liveRecovered, setLiveRecovered] = useState(false);
  const previousOfflineRef = useRef<boolean | null>(null);

  const fetchStatus = useCallback(async () => {
    const response = await fetch(`${EVBUDDY_API}/v1/v2v/status`);
    if (!response.ok) throw new Error(`Status fetch failed (${response.status})`);
    const payload = (await response.json()) as V2VStatusPayload;
    if (!payload.success) throw new Error("V2V status was not successful");
    setCharger(payload.charger ?? null);
    setConnectors(Array.isArray(payload.connectors) ? payload.connectors : []);
  }, []);

  const fetchSessions = useCallback(async () => {
    const response = await fetch(`${EVBUDDY_API}/v1/v2v/sessions`);
    if (!response.ok) return;
    const payload = (await response.json()) as V2VSessionsPayload;
    setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await Promise.all([fetchStatus(), fetchSessions()]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh V2V data");
    } finally {
      setLoading(false);
    }
  }, [fetchSessions, fetchStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const runCommand = async (path: string, body: Record<string, unknown>, token: string) => {
    setCommandBusy(token);
    setResult(null);
    try {
      const response = await fetch(`${EVBUDDY_API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { success?: boolean; message?: string; error?: string; status?: string };
      setResult(normalizeCommandMessage(payload));
      setTimeout(() => {
        refresh();
      }, 1200);
    } catch (err) {
      setResult({ tone: "error", message: err instanceof Error ? err.message : "Command failed" });
    } finally {
      setCommandBusy(null);
    }
  };

  const connectorToSession = useMemo(() => {
    const map = new Map<number, V2VSession>();
    sessions.forEach((session) => {
      if (session.is_active || session.status === "InProgress") {
        map.set(session.connector_id, session);
      }
    });
    return map;
  }, [sessions]);

  const offline = !charger?.online;
  const heartbeatTone = heartbeatState(charger?.last_heartbeat);
  const heartbeatLabel = heartbeatSignalLabel(heartbeatTone);
  const snapshotHeartbeat = heartbeatAgeLabel(charger?.last_heartbeat);
  const snapshotHeartbeatCopy = snapshotHeartbeat === "Not detected" ? "not detected" : snapshotHeartbeat;

  const connectorSummary = useMemo(() => {
    let active = 0;
    let available = 0;
    let faulted = 0;

    connectors.forEach((connector) => {
      const normalized = (connector.status || "").toLowerCase();
      if (isActiveConnector(connector.status)) active += 1;
      if (normalized === "available") available += 1;
      if (normalized === "faulted" || normalized === "unavailable" || normalized === "offline") faulted += 1;
    });

    return {
      active,
      available,
      faulted,
      total: connectors.length,
    };
  }, [connectors]);

  const connectorsForDisplay = [...connectors].sort((left, right) => {
    if (offline) {
      return left.connector_id - right.connector_id;
    }
    const rank = connectorSortRank(left.status) - connectorSortRank(right.status);
    return rank !== 0 ? rank : left.connector_id - right.connector_id;
  });

  useEffect(() => {
    if (loading) return;

    const previousOffline = previousOfflineRef.current;
    if (previousOffline === true && !offline) {
      setLiveRecovered(true);
    }
    if (previousOffline === false && offline) {
      setLiveRecovered(false);
    }

    previousOfflineRef.current = offline;
  }, [offline, loading]);

  useEffect(() => {
    if (!liveRecovered) return;
    const timeoutId = window.setTimeout(() => {
      setLiveRecovered(false);
    }, 6000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [liveRecovered]);

  const inlineOfflineResult = Boolean(
    offline &&
      result?.tone === "error" &&
      ((result.message || "").toLowerCase().includes("could not be delivered") ||
        (result.detail || "").toLowerCase().includes("charger offline"))
  );
  const heartbeatSummary = heartbeatAgeLabel(charger?.last_heartbeat);
  const transport = "OCPP";
  const modemState = offline ? "Offline / unknown" : "Online";

  if (loading) {
    return (
      <Panel>
        <SectionHeader title="V2V Control" icon="🚗" />
        <div className="feature-empty">Loading connector controls…</div>
      </Panel>
    );
  }

  return (
    <div className="feature-shell">
      <Panel style={{ padding: 16 }}>
        <SectionHeader
          title="V2V Mission Control"
          icon="⚙️"
          action={
            <div className="feature-actions">
              <label className="v2v-inline-toggle">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                />
                Auto-refresh (5s)
              </label>
              <Button variant="outline" onClick={refresh}>Refresh Status</Button>
            </div>
          }
        />

        <div className={`v2v-device-shell${offline ? " critical" : ""}${liveRecovered && !offline ? " recovered" : ""}`}>
          <div className="v2v-control-row">
            <div className="v2v-title-wrap">
              <h3 className="v2v-device-name">{CHARGE_POINT_ID}</h3>
              <StatusPill
                tone={offline ? "error" : "success"}
                label={offline ? "OFFLINE" : "ONLINE"}
                style={{ letterSpacing: "0.05em" }}
              />
              <StatusPill
                tone={connectorSummary.faulted > 0 ? "error" : "neutral"}
                label={`FAULTS ${connectorSummary.faulted}`}
                style={{ letterSpacing: "0.04em", opacity: offline ? 0.86 : 0.92 }}
              />
            </div>

            {!offline && (
              <div className="feature-actions v2v-control-actions">
                <Button
                  variant="outline"
                  disabled={Boolean(commandBusy)}
                  onClick={() => runCommand("/v1/v2v/reset", { type: "Soft" }, "reset-soft")}
                  style={{
                    color: "var(--text-muted)",
                    borderColor: "var(--line-soft)",
                    background: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  {commandBusy === "reset-soft" ? "Working…" : "Soft Reset"}
                </Button>
                <Button
                  variant="destructive"
                  disabled={Boolean(commandBusy)}
                  onClick={() => runCommand("/v1/v2v/reset", { type: "Hard" }, "reset-hard")}
                >
                  {commandBusy === "reset-hard" ? "Working…" : "Hard Reset"}
                </Button>
              </div>
            )}
          </div>

          <div className="v2v-ops-facts">
            <div className="v2v-ops-fact">
              <span className="k">Last seen</span>
              <span className={`v ${heartbeatTone}`} title={formatLastSeen(charger?.last_heartbeat)}>
                {heartbeatSummary}
              </span>
            </div>
            <div className="v2v-ops-fact">
              <span className="k">Transport</span>
              <span className="v">{transport}</span>
            </div>
            <div className="v2v-ops-fact">
              <span className="k">Heartbeat</span>
              <span className={`v ${heartbeatTone}`}>{heartbeatLabel}</span>
            </div>
            <div className="v2v-ops-fact">
              <span className="k">Network / modem</span>
              <span className="v">{modemState}</span>
            </div>
          </div>

          {liveRecovered && !offline && (
            <div className="v2v-recovery-cue" role="status" aria-live="polite">
              <span className="pulse" aria-hidden="true" />
              <span>Connection restored. Live telemetry resumed.</span>
            </div>
          )}

          {offline && (
            <div className="v2v-offline-panel" role="status" aria-live="polite">
              <div className="v2v-offline-copy">
                <p className="overline">Recovery</p>
                <p className="status">Charger offline</p>
                <p className="cause">No OCPP heartbeat detected.</p>
                <p className="impact">
                  {inlineOfflineResult
                    ? "Last reset request could not be delivered because no heartbeat is active."
                    : "Reset requests cannot be delivered because no heartbeat is active."}
                </p>
                <p className="hint">Check power, uplink, and modem status.</p>
              </div>

              <div className="v2v-recovery-actions">
                <Button
                  variant="primary"
                  style={{ textTransform: "none", letterSpacing: "0.02em" }}
                  onClick={refresh}
                >
                  Poll Now
                </Button>
                <Button variant="secondary" onClick={() => navigateToTab("chargers")}>Connection Diagnostics</Button>
                <Button
                  variant="outline"
                  style={{
                    color: "var(--text-muted)",
                    borderColor: "var(--line-soft)",
                  }}
                  onClick={() => navigateToTab("sessions")}
                >
                  Live Logs
                </Button>
              </div>
            </div>
          )}

          {!offline && (
            <div className="v2v-heartbeat-meta">
              <div className="v2v-heartbeat-fact">
                <span className="k">Model</span>
                <span className="v">{charger?.charge_point_model || "Unknown"}</span>
              </div>
              <div className="v2v-heartbeat-fact">
                <span className="k">Serial</span>
                <span className="v">{charger?.charge_point_serial_number || "—"}</span>
              </div>
              <div className="v2v-heartbeat-fact">
                <span className="k">Heartbeat</span>
                <span className="v">{heartbeatLabel}</span>
              </div>
            </div>
          )}

          {!offline && (
            <div className="v2v-heartbeat">
              <span className="k">Last heartbeat seen</span>
              <span className={`v ${heartbeatTone}`}>{formatLastSeen(charger?.last_heartbeat)}</span>
            </div>
          )}
        </div>

        {error && <div className="feature-error">{error}</div>}
        {result && !inlineOfflineResult && (
          <div className={result.tone === "success" ? "feature-success" : "feature-error"}>
            <div>{result.message}</div>
            {result.detail && <div className="feature-feedback-detail">{result.detail}</div>}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader
          title="Connector Operations"
          icon="🔌"
          subtitle={
            offline
              ? `${connectorSummary.total} connectors · read-only snapshot`
              : `${connectorSummary.active} active · ${connectorSummary.available} available${
                  connectorSummary.faulted ? ` · ${connectorSummary.faulted} faulted` : ""
                }`
          }
        />
        {offline && (
          <div className="v2v-connector-stale-note">
            Connector status may be stale until heartbeat returns.
            <span className="v2v-connector-stale-meta">Last telemetry update: {snapshotHeartbeatCopy}.</span>
          </div>
        )}
        {connectors.length === 0 ? (
          <div className="feature-empty">No connector telemetry returned.</div>
        ) : (
          <div className="v2v-connector-grid">
            {connectorsForDisplay.map((connector) => {
              const status = statusLabel(connector.status);
              const tone = statusTone(connector.status);
              const active = isActiveConnector(connector.status);
              const session = connectorToSession.get(connector.connector_id);
              const statusForDisplay = offline ? `${status} (last known)` : status;
              const toneForDisplay = offline ? "neutral" : tone;
              const activityCopy = offline ? "Read-only telemetry snapshot." : active ? "Actively engaged" : "Idle / waiting";

              return (
                <div key={connector.connector_id} className={`v2v-connector-card${offline ? " snapshot" : ""}`}>
                  <div className="v2v-connector-head">
                    <h4 className="feature-title">Connector {connector.connector_id}</h4>
                    <StatusPill
                      tone={toneForDisplay}
                      label={statusForDisplay}
                      style={offline ? { opacity: 0.72, filter: "saturate(0.58)" } : undefined}
                    />
                  </div>

                  <div className="feature-stack">
                    <div className="v2v-status-row">
                      <span className={`v2v-live-dot ${toneForDisplay}`} />
                      <span>{activityCopy}</span>
                    </div>

                    {offline && (
                      <p className="v2v-connector-snapshot-note">Last telemetry update: {snapshotHeartbeatCopy}.</p>
                    )}

                    {session && (
                      <p className="v2v-connector-session-brief">
                        Transaction {session.transaction_id} · Duration {duration(session.duration_seconds)}
                      </p>
                    )}

                    {connector.error_code && connector.error_code !== "NoError" && (
                      <div className="feature-error">Error: {connector.error_code}</div>
                    )}
                  </div>

                  <div className={`v2v-connector-actions${offline ? " offline" : ""}`}>
                    {offline ? (
                      <p className="v2v-connector-offline-note">Controls unavailable while charger is offline.</p>
                    ) : (
                      <>
                        <Button
                          variant="primary"
                          disabled={active || Boolean(commandBusy)}
                          onClick={() => runCommand("/v1/v2v/start", { connector_id: connector.connector_id }, `start-${connector.connector_id}`)}
                        >
                          {commandBusy === `start-${connector.connector_id}` ? "Starting…" : "Start"}
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={!session?.transaction_id || Boolean(commandBusy)}
                          onClick={() =>
                            runCommand(
                              "/v1/v2v/stop",
                              { connector_id: connector.connector_id, transaction_id: session?.transaction_id },
                              `stop-${connector.connector_id}`
                            )
                          }
                        >
                          {commandBusy === `stop-${connector.connector_id}` ? "Stopping…" : "Stop"}
                        </Button>
                      </>
                    )}
                    <Button variant="outline" onClick={refresh}>Refresh Status</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader title="Session Feed" icon="🧾" subtitle="Recent and active transactions" />
        {sessions.length === 0 ? (
          <div className="feature-empty">No recorded sessions yet.</div>
        ) : (
          <div className="v2v-session-shell">
            <table className="feature-table">
              <thead>
                <tr>
                  <th>Txn</th>
                  <th>Connector</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Energy</th>
                  <th>Stop Reason</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const active = session.is_active || session.status === "InProgress";
                  return (
                    <tr key={session.transaction_id}>
                      <td className="feature-mono">{session.transaction_id}</td>
                      <td>{session.connector_id}</td>
                      <td>
                        <StatusPill tone={active ? "success" : "neutral"} label={session.status || "Unknown"} />
                      </td>
                      <td>{ago(session.start_timestamp)}</td>
                      <td>{duration(session.duration_seconds)}</td>
                      <td>{typeof session.energy_delivered === "number" ? `${session.energy_delivered} kWh` : "—"}</td>
                      <td className="feature-muted">{session.stop_reason || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
