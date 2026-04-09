import React, { useState, useEffect } from "react";
import styles from "../styles";
import { EVBUDDY_API } from "../utils/api";
import { JsonView } from "./ResponseDisplay";
import { ChargePoint, ChargePointStatus } from "../types";
import { Button, Panel, SectionHeader, StatusPill } from "./primitives";

export default function LiveChargersTab() {
  const [chargePoints, setChargePoints] = useState<ChargePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedCp, setSelectedCp] = useState<string | null>(null);
  const [cpStatus, setCpStatus] = useState<ChargePointStatus | null>(null);

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
      setError(`Connection failed: ${(err as Error).message}. Is the EV Buddy server running?`);
    }
    setLoading(false);
  };

  const fetchCpStatus = async (cpId: string) => {
    try {
      const res = await fetch(`${EVBUDDY_API}/v1/chargers/ocpp/${cpId}/status`);
      if (res.ok) {
        const data = await res.json();
        setCpStatus(data);
      }
    } catch (err) {
      setCpStatus({ error: (err as Error).message });
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

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "var(--text-muted)";
    const s = status.toLowerCase();
    if (s === "available") return "var(--accent-primary)";
    if (s === "charging") return "var(--semantic-info)";
    if (s === "preparing") return "var(--semantic-warning)";
    if (s === "faulted") return "var(--semantic-error)";
    if (s === "offline" || s === "unavailable") return "var(--text-muted)";
    return "var(--text-muted)";
  };

  return (
    <div>
      <Panel>
        <SectionHeader
          icon="🔌"
          title="Live Charge Points"
          action={<div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (10s)
            </label>
            <Button variant="secondary" style={styles.buttonSecondary} onClick={fetchChargePoints}>Refresh</Button>
          </div>}
        />

        {error && (
          <div style={{ background: "var(--semantic-error-soft)", color: "var(--semantic-error)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && <p style={{ color: "var(--text-muted)" }}>Loading charge points...</p>}

        {!loading && chargePoints.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {chargePoints.map(cp => (
              <div
                key={cp.charge_point_id || cp.id}
                style={{
                  background: selectedCp === cp.charge_point_id ? "var(--surface-elevated)" : "var(--surface-panel)",
                  border: `1px solid ${selectedCp === cp.charge_point_id ? "var(--accent-primary)" : "var(--line-soft)"}`,
                  borderRadius: 10,
                  padding: 16,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => setSelectedCp(cp.charge_point_id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{cp.charge_point_id}</div>
                  <StatusPill tone={cp.online ? "success" : "error"} label={cp.online ? "ONLINE" : "OFFLINE"} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {cp.charge_point_model || "Unknown Model"}
                </div>
                {cp.charge_point_vendor && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {cp.charge_point_vendor}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && chargePoints.length === 0 && !error && (
          <p style={{ color: "var(--text-muted)" }}>No charge points found. Make sure the OCPP Central System is running.</p>
        )}
      </Panel>

      {selectedCp && cpStatus && (
        <Panel>
          <SectionHeader icon="📊" title={`${selectedCp} Status`} />

          {cpStatus.connectors && cpStatus.connectors.length > 0 ? (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {cpStatus.connectors.map(conn => (
                <div
                  key={conn.connector_id}
                  style={{
                    background: "var(--surface-panel)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 10,
                    padding: 16,
                    minWidth: 180,
                    flex: "1 1 180px"
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
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
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Transaction: {conn.current_transaction_id}
                    </div>
                  )}
                  {conn.error_code && conn.error_code !== "NoError" && (
                    <div style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 4 }}>
                      Error: {conn.error_code}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <JsonView data={cpStatus} />
          )}
        </Panel>
      )}
    </div>
  );
}



