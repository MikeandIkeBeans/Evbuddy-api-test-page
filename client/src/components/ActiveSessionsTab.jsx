import React, { useState, useEffect } from "react";
import styles from "../styles";
import { EVBUDDY_API } from "../utils/api";

export default function ActiveSessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
      setError(`Connection failed: ${err.message}`);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case "CHARGING": return { bg: "#00d4aa22", color: "#00d4aa", icon: "⚡" };
      case "STARTING":
      case "PREPARING": return { bg: "#ffa50022", color: "#ffa500", icon: "🔌" };
      case "STOPPING": return { bg: "#ff8c0022", color: "#ff8c00", icon: "⏹" };
      case "COMPLETE":
      case "COMPLETED": return { bg: "#00a8e822", color: "#00a8e8", icon: "✓" };
      case "FAILED": return { bg: "#ff475722", color: "#ff4757", icon: "✗" };
      case "PAUSED": return { bg: "#88888822", color: "#888", icon: "⏸" };
      default: return { bg: "#33333322", color: "#888", icon: "?" };
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const stopSession = async (sessionId) => {
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
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        ⚡ Active Charging Sessions
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (3s)
          </label>
          <button style={styles.buttonSecondary} onClick={fetchSessions}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#ff475722", color: "#ff4757", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && sessions.length === 0 && <p style={{ color: "#888" }}>Loading sessions...</p>}

      {sessions.length === 0 && !loading && !error && (
        <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔋</div>
          <div>No active sessions</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>No live sessions from the OCPP API</div>
        </div>
      )}

      {sessions.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {sessions.map(session => {
            const statusStyle = getStatusStyle(session.status);
            return (
              <div
                key={session.sessionId}
                style={{
                  background: "#0a0a0a",
                  border: "1px solid #333",
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
                    <span style={{ fontSize: 12, color: "#666" }}>{session.sessionId}</span>
                    {session.source === "ocpp" && (
                      <span style={{ ...styles.badge, background: "#00a8e822", color: "#00a8e8" }}>
                        OCPP
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#888" }}>Charger</div>
                      <div style={{ fontWeight: 600 }}>{session.chargerId}:{session.connectorId}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#888" }}>Energy</div>
                      <div style={{ fontWeight: 600, color: "#00d4aa" }}>
                        {session.energyKwh != null ? `${session.energyKwh.toFixed(2)} kWh` : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#888" }}>Power</div>
                      <div style={{ fontWeight: 600 }}>{session.powerKw != null ? `${session.powerKw.toFixed(1)} kW` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#888" }}>Duration</div>
                      <div style={{ fontWeight: 600 }}>{session.elapsedSec != null ? formatDuration(session.elapsedSec) : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#888" }}>Cost</div>
                      <div style={{ fontWeight: 600, color: "#ffa500" }}>
                        {session.cost != null ? `$${session.cost.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    {session.transactionId && (
                      <div>
                        <div style={{ fontSize: 11, color: "#888" }}>Transaction</div>
                        <div style={{ fontWeight: 600 }}>{session.transactionId}</div>
                      </div>
                    )}
                  </div>
                </div>

                {["CHARGING", "STARTING", "PREPARING"].includes(session.status?.toUpperCase()) && (
                  <button
                    style={{ ...styles.button, ...styles.buttonDanger, padding: "8px 16px" }}
                    onClick={() => stopSession(session.sessionId)}
                  >
                    Stop
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
