import React, { useState, useEffect } from "react";
import styles from "../styles";
import { EVBUDDY_API } from "../utils/api";
import { JsonView } from "./ResponseDisplay";

export default function LiveChargersTab() {
  const [chargePoints, setChargePoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedCp, setSelectedCp] = useState(null);
  const [cpStatus, setCpStatus] = useState(null);

  const fetchChargePoints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${EVBUDDY_API}/v1/charge-points`);
      if (res.ok) {
        const data = await res.json();
        setChargePoints(data.data || data || []);
      } else {
        setError(`Failed to fetch: ${res.status}`);
      }
    } catch (err) {
      setError(`Connection failed: ${err.message}. Is the EV Buddy server running?`);
    }
    setLoading(false);
  };

  const fetchCpStatus = async (cpId) => {
    try {
      const res = await fetch(`${EVBUDDY_API}/v1/chargers/ocpp/${cpId}/status`);
      if (res.ok) {
        const data = await res.json();
        setCpStatus(data);
      }
    } catch (err) {
      setCpStatus({ error: err.message });
    }
  };

  useEffect(() => { fetchChargePoints(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchChargePoints, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (selectedCp) fetchCpStatus(selectedCp);
  }, [selectedCp]);

  const getStatusColor = (status) => {
    if (!status) return "#888";
    const s = status.toLowerCase();
    if (s === "available") return "#00d4aa";
    if (s === "charging") return "#00a8e8";
    if (s === "preparing") return "#ffa500";
    if (s === "faulted") return "#ff4757";
    if (s === "offline" || s === "unavailable") return "#666";
    return "#888";
  };

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          🔌 Live Charge Points
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (10s)
            </label>
            <button style={styles.buttonSecondary} onClick={fetchChargePoints}>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#ff475722", color: "#ff4757", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && <p style={{ color: "#888" }}>Loading charge points...</p>}

        {!loading && chargePoints.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {chargePoints.map(cp => (
              <div
                key={cp.charge_point_id || cp.id}
                style={{
                  background: selectedCp === cp.charge_point_id ? "#2a2a3a" : "#1a1a1a",
                  border: `1px solid ${selectedCp === cp.charge_point_id ? "#00d4aa" : "#333"}`,
                  borderRadius: 10,
                  padding: 16,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => setSelectedCp(cp.charge_point_id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{cp.charge_point_id}</div>
                  <span style={{
                    ...styles.badge,
                    background: cp.online ? "#00d4aa22" : "#ff475722",
                    color: cp.online ? "#00d4aa" : "#ff4757"
                  }}>
                    {cp.online ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  {cp.charge_point_model || "Unknown Model"}
                </div>
                {cp.charge_point_vendor && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                    {cp.charge_point_vendor}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && chargePoints.length === 0 && !error && (
          <p style={{ color: "#888" }}>No charge points found. Make sure the OCPP Central System is running.</p>
        )}
      </div>

      {selectedCp && cpStatus && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            📊 {selectedCp} Status
          </div>

          {cpStatus.connectors && cpStatus.connectors.length > 0 ? (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {cpStatus.connectors.map(conn => (
                <div
                  key={conn.connector_id}
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: 10,
                    padding: 16,
                    minWidth: 180,
                    flex: "1 1 180px"
                  }}
                >
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                    Connector {conn.connector_id}
                  </div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: getStatusColor(conn.status),
                    marginBottom: 8
                  }}>
                    {conn.status || "Unknown"}
                  </div>
                  {conn.current_transaction_id && (
                    <div style={{ fontSize: 11, color: "#888" }}>
                      Transaction: {conn.current_transaction_id}
                    </div>
                  )}
                  {conn.error_code && conn.error_code !== "NoError" && (
                    <div style={{ fontSize: 11, color: "#ff4757", marginTop: 4 }}>
                      Error: {conn.error_code}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <JsonView data={cpStatus} />
          )}
        </div>
      )}
    </div>
  );
}
