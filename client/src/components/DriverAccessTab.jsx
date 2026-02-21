import React, { useState } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";
import { ResponseDisplay } from "./ResponseDisplay";

export default function DriverAccessTab() {
  const [siteId, setSiteId] = useState("1");
  const [driverId, setDriverId] = useState("");
  const [actorId, setActorId] = useState("1");
  const [drivers, setDrivers] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessEnd, setAccessEnd] = useState("");

  const getDrivers = async () => {
    setLoading(true);
    const res = await apiCall("GET", `/api/sites/${siteId}/drivers?actor_user_id=${actorId}`);
    setDrivers(res.data);
    setLoading(false);
  };

  const requestAccess = async () => {
    setLoading(true);
    const res = await apiCall("POST", `/api/sites/${siteId}/access-request`, {
      driver_user_id: parseInt(driverId),
      reason: "Requesting access via dashboard"
    });
    setResponse(res);
    getDrivers();
    setLoading(false);
  };

  const approveDriver = async () => {
    setLoading(true);
    const body = { actor_user_id: parseInt(actorId) };
    if (accessEnd) body.access_end = accessEnd;
    const res = await apiCall("POST", `/api/sites/${siteId}/drivers/${driverId}/approve`, body);
    setResponse(res);
    getDrivers();
    setLoading(false);
  };

  const blockDriver = async () => {
    setLoading(true);
    const res = await apiCall("POST", `/api/sites/${siteId}/drivers/${driverId}/block`, {
      actor_user_id: parseInt(actorId),
      reason: "Blocked via dashboard"
    });
    setResponse(res);
    getDrivers();
    setLoading(false);
  };

  const revokeDriver = async () => {
    setLoading(true);
    const res = await apiCall("POST", `/api/sites/${siteId}/drivers/${driverId}/revoke`, {
      actor_user_id: parseInt(actorId)
    });
    setResponse(res);
    getDrivers();
    setLoading(false);
  };

  const statusColor = (status) => {
    const colors = {
      approved: styles.badgeSuccess,
      pending: styles.badgePending,
      blocked: styles.badgeError,
      revoked: { background: "#88888822", color: "#888" }
    };
    return colors[status] || {};
  };

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>Driver Access List</div>
        <div style={styles.row}>
          <div>
            <div style={styles.label}>Site ID</div>
            <input style={{ ...styles.input, width: 80 }} value={siteId} onChange={e => setSiteId(e.target.value)} />
          </div>
          <div>
            <div style={styles.label}>Actor ID</div>
            <input style={{ ...styles.input, width: 80 }} value={actorId} onChange={e => setActorId(e.target.value)} />
          </div>
          <button style={styles.button} onClick={getDrivers}>Load Drivers</button>
        </div>

        {drivers?.drivers && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Driver</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {drivers.drivers.map((d, i) => (
                <tr key={i}>
                  <td style={styles.td}>{d.driver_user_id}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...statusColor(d.access_status) }}>
                      {d.access_status}
                    </span>
                  </td>
                  <td style={styles.td}>{d.access_end || "Unlimited"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Manage Driver Access</div>
        <div style={styles.label}>Driver User ID</div>
        <input style={styles.input} value={driverId} onChange={e => setDriverId(e.target.value)} placeholder="e.g., 10" />

        <div style={styles.label}>Access End (optional, for time-limited)</div>
        <input
          style={styles.input}
          type="datetime-local"
          value={accessEnd}
          onChange={e => setAccessEnd(e.target.value)}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button style={styles.button} onClick={requestAccess}>Request Access</button>
          <button style={{ ...styles.button, background: "#00d4aa" }} onClick={approveDriver}>Approve</button>
          <button style={{ ...styles.buttonSecondary }} onClick={revokeDriver}>Revoke</button>
          <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={blockDriver}>Block</button>
        </div>

        <ResponseDisplay response={response} loading={loading} />
      </div>
    </div>
  );
}
