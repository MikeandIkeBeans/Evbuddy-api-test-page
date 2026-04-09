import React, { useState, useEffect } from "react";
import styles from "../styles";
import { EVBUDDY_API } from "../utils/api";
import { ChargingSession } from "../types";
import { Button, Panel, SectionHeader, StatusPill } from "./primitives";

export default function ActiveSessionsTab() {
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${EVBUDDY_API}/v1/sessions`);
      if (res.ok) {
        const data = await res.json();
        const localSessions = data.sessions || data || [];
        if (localSessions.length > 0) {
          setSessions(localSessions);
        } else {
          const ocppRes = await fetch(`${EVBUDDY_API}/v1/ocpp/sessions`);
          if (ocppRes.ok) {
            const ocppData = await ocppRes.json();
            if (ocppData.error) {
              setError(ocppData.error);
            }
            setSessions(ocppData.sessions || []);
          } else {
            setSessions([]);
          }
        }
      } else if (res.status === 404) {
        setSessions([]);
      } else {
        setError(`Failed to fetch: ${res.status}`);
      }
    } catch (err) {
      setError(`Connection failed: ${(err as Error).message}`);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "CHARGING": return { bg: "var(--semantic-success-soft)", color: "var(--accent-primary)", icon: "⚡" };
      case "STARTING":
      case "PREPARING": return { bg: "var(--semantic-warning-soft)", color: "var(--semantic-warning)", icon: "🔌" };
      case "STOPPING": return { bg: "var(--semantic-warning-soft)", color: "var(--semantic-warning)", icon: "⏹" };
      case "COMPLETE":
      case "COMPLETED": return { bg: "var(--semantic-info-soft)", color: "var(--semantic-info)", icon: "✓" };
      case "FAILED": return { bg: "var(--semantic-error-soft)", color: "var(--semantic-error)", icon: "✗" };
      case "PAUSED": return { bg: "var(--semantic-neutral-soft)", color: "var(--text-muted)", icon: "⏸" };
      default: return { bg: "var(--semantic-neutral-soft)", color: "var(--text-muted)", icon: "?" };
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const stopSession = async (sessionId: string) => {
    try {
      await fetch(`${EVBUDDY_API}/v1/sessions/${sessionId}/stop`, {
        method: "POST",
        headers: { "Authorization": "Bearer demo-token" }
      });
      fetchSessions();
    } catch (err) {
      console.error("Failed to stop session:", err);
    }
  };

  return (
    <Panel>
      <SectionHeader
        icon="⚡"
        title="Active Charging Sessions"
        action={<div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (3s)
          </label>
          <Button variant="secondary" onClick={fetchSessions}>
            Refresh
          </Button>
        </div>}
      />

      {error && (
        <div style={{ background: "var(--semantic-error-soft)", color: "var(--semantic-error)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && sessions.length === 0 && <p style={{ color: "var(--text-muted)" }}>Loading sessions...</p>}

      {sessions.length === 0 && !loading && !error && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔋</div>
          <div>No active sessions</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>No live sessions from the OCPP API</div>
        </div>
      )}

      {sessions.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {sessions.map(session => {
            const statusStyle = getStatusStyle(session.status ?? "");
            return (
              <div
                key={session.sessionId}
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 12,
                  padding: 16,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{
                      ...styles.badge,
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      fontSize: 13
                    }}>
                      {statusStyle.icon} {session.status}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{session.sessionId}</span>
                    {session.source === "ocpp" && (
                      <StatusPill tone="info" label="OCPP" />
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Charger</div>
                      <div style={{ fontWeight: 600 }}>{session.chargerId}:{session.connectorId}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Energy</div>
                      <div style={{ fontWeight: 600, color: "var(--accent-primary)" }}>
                        {session.energyKwh != null ? `${session.energyKwh.toFixed(2)} kWh` : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Power</div>
                      <div style={{ fontWeight: 600 }}>{session.powerKw != null ? `${session.powerKw.toFixed(1)} kW` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Duration</div>
                      <div style={{ fontWeight: 600 }}>{session.elapsedSec != null ? formatDuration(session.elapsedSec) : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cost</div>
                      <div style={{ fontWeight: 600, color: "var(--semantic-warning)" }}>
                        {session.cost != null ? `$${session.cost.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    {session.transactionId && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Transaction</div>
                        <div style={{ fontWeight: 600 }}>{session.transactionId}</div>
                      </div>
                    )}
                  </div>
                </div>

                {["CHARGING", "STARTING", "PREPARING"].includes(session.status?.toUpperCase() ?? "") && (
                  <Button variant="destructive" style={{ padding: "8px 16px" }} onClick={() => stopSession(session.sessionId)}>
                    Stop
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}



