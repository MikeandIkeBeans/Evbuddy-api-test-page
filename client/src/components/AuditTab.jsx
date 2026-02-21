import React, { useState } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";

export default function AuditTab() {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState("20");

  const fetchLogs = async () => {
    setLoading(true);
    // First ensure platform_admin exists
    await apiCall("POST", `/api/users/100/roles`, { role: "platform_admin", actor_user_id: 100 });
    const res = await apiCall("GET", `/api/security/audit-log?limit=${limit}`, null, 100);
    setLogs(res.data);
    setLoading(false);
  };

  const actionColor = (action) => {
    if (action.includes("DENIED") || action.includes("VIOLATION")) return "#ff4757";
    if (action.includes("APPROVED") || action.includes("AUTHORIZED")) return "#00d4aa";
    if (action.includes("BLOCKED") || action.includes("REVOKED")) return "#ffa500";
    return "#888";
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        Security Audit Log
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={{ ...styles.input, width: 60, marginBottom: 0 }}
            type="number"
            value={limit}
            onChange={e => setLimit(e.target.value)}
          />
          <button style={styles.button} onClick={fetchLogs}>Load Logs</button>
        </div>
      </div>

      {loading && <p style={{ color: "#888" }}>Loading...</p>}

      {logs?.logs && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Timestamp</th>
              <th style={styles.th}>Action</th>
              <th style={styles.th}>Actor</th>
              <th style={styles.th}>Resource</th>
              <th style={styles.th}>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {logs.logs.map((log, i) => (
              <tr key={i}>
                <td style={styles.td}>
                  <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ color: actionColor(log.action), fontWeight: 500 }}>
                    {log.action}
                  </span>
                </td>
                <td style={styles.td}>User {log.actor_user_id}</td>
                <td style={styles.td}>
                  {log.asset_id || log.resource_id || "-"}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    ...(log.outcome === "success" ? styles.badgeSuccess :
                        log.outcome === "denied" ? styles.badgeError : styles.badgePending)
                  }}>
                    {log.outcome}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
