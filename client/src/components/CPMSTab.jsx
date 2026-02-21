import React, { useState } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";
import { ResponseDisplay } from "./ResponseDisplay";

export default function CPMSTab() {
  const [assetId, setAssetId] = useState("CHARGER-001");
  const [operatorId, setOperatorId] = useState("1");
  const [userId, setUserId] = useState("50");
  const [operatorRole, setOperatorRole] = useState("operator_admin");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  // Setup functions
  const setupPlatformAdmin = async () => {
    setLoading(true);
    await apiCall("POST", `/api/users/100/roles`, { role: "platform_admin", actor_user_id: 100 });
    setResponse({ ok: true, status: 200, data: { message: "Platform admin (user 100) created" }, duration: 0 });
    setLoading(false);
  };

  const setupOperator = async () => {
    setLoading(true);
    const res = await apiCall("POST", "/api/security/setup/operator", {
      operator_id: parseInt(operatorId),
      user_id: parseInt(userId),
      role: operatorRole
    }, 100);
    setResponse(res);
    setLoading(false);
  };

  const registerAsset = async () => {
    setLoading(true);
    const res = await apiCall("POST", "/api/security/setup/asset", {
      asset_id: assetId,
      operator_id: parseInt(operatorId)
    }, 100);
    setResponse(res);
    setLoading(false);
  };

  // CPMS Operations
  const remoteStart = async () => {
    setLoading(true);
    const res = await apiCall("POST", `/api/assets/${assetId}/remote-start`, { connector_id: 1 }, userId);
    setResponse(res);
    setLoading(false);
  };

  const remoteStop = async () => {
    setLoading(true);
    const res = await apiCall("POST", `/api/assets/${assetId}/remote-stop`, { transaction_id: "TXN-001" }, userId);
    setResponse(res);
    setLoading(false);
  };

  const maintenanceMode = async (enabled) => {
    setLoading(true);
    const res = await apiCall("POST", `/api/assets/${assetId}/maintenance-mode`, {
      enabled,
      reason: enabled ? "Dashboard maintenance" : "Maintenance complete"
    }, userId);
    setResponse(res);
    setLoading(false);
  };

  const getDiagnostics = async () => {
    setLoading(true);
    const res = await apiCall("GET", `/api/assets/${assetId}/diagnostics`, null, userId);
    setResponse(res);
    setLoading(false);
  };

  const resetCharger = async (type) => {
    setLoading(true);
    const res = await apiCall("POST", `/api/assets/${assetId}/reset`, { type }, userId);
    setResponse(res);
    setLoading(false);
  };

  return (
    <div>
      {/* Setup Section */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Setup (One-Time)</div>
        <div style={styles.row}>
          <button style={styles.buttonSecondary} onClick={setupPlatformAdmin}>
            1. Create Platform Admin (User 100)
          </button>
        </div>
        <div style={styles.row}>
          <div>
            <div style={styles.label}>Operator ID</div>
            <input style={{ ...styles.input, width: 80 }} value={operatorId} onChange={e => setOperatorId(e.target.value)} />
          </div>
          <div>
            <div style={styles.label}>User ID</div>
            <input style={{ ...styles.input, width: 80 }} value={userId} onChange={e => setUserId(e.target.value)} />
          </div>
          <div>
            <div style={styles.label}>Operator Role</div>
            <select style={{ ...styles.select, width: 160 }} value={operatorRole} onChange={e => setOperatorRole(e.target.value)}>
              <option value="operator_owner">operator_owner</option>
              <option value="operator_admin">operator_admin</option>
              <option value="operator_ops">operator_ops</option>
              <option value="operator_tech">operator_tech</option>
              <option value="operator_finance">operator_finance</option>
              <option value="operator_support">operator_support</option>
              <option value="operator_viewer">operator_viewer</option>
            </select>
          </div>
          <button style={styles.buttonSecondary} onClick={setupOperator}>2. Assign Operator Role</button>
        </div>
        <div style={styles.row}>
          <div>
            <div style={styles.label}>Asset ID</div>
            <input style={{ ...styles.input, width: 150 }} value={assetId} onChange={e => setAssetId(e.target.value)} />
          </div>
          <button style={styles.buttonSecondary} onClick={registerAsset}>3. Register Asset to Operator</button>
        </div>
      </div>

      {/* Operations Grid */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Charger Controls</div>
          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <div style={styles.label}>Asset ID</div>
              <input style={styles.input} value={assetId} onChange={e => setAssetId(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.label}>Acting as User ID</div>
              <input style={styles.input} value={userId} onChange={e => setUserId(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={{ ...styles.button, background: "#00d4aa" }} onClick={remoteStart}>
              Remote Start
            </button>
            <button style={{ ...styles.button, background: "#ff4757" }} onClick={remoteStop}>
              Remote Stop
            </button>
            <button style={styles.buttonSecondary} onClick={() => maintenanceMode(true)}>
              Enable Maintenance
            </button>
            <button style={styles.buttonSecondary} onClick={() => maintenanceMode(false)}>
              Exit Maintenance
            </button>
            <button style={styles.buttonSecondary} onClick={getDiagnostics}>
              Get Diagnostics
            </button>
            <button style={styles.buttonSecondary} onClick={() => resetCharger("Soft")}>
              Soft Reset
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Restricted Operations (Admin Only)</div>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
            These require operator_owner or operator_admin role
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={() => resetCharger("Hard")}>
              Hard Reset
            </button>
            <button
              style={styles.buttonSecondary}
              onClick={async () => {
                setLoading(true);
                const res = await apiCall("POST", `/api/assets/${assetId}/firmware-update`, {
                  firmware_url: "https://example.com/firmware/v2.0"
                }, userId);
                setResponse(res);
                setLoading(false);
              }}
            >
              Firmware Update
            </button>
            <button
              style={styles.buttonSecondary}
              onClick={async () => {
                setLoading(true);
                const res = await apiCall("PUT", `/api/assets/${assetId}/tariff`, {
                  tariff: { per_kwh: 0.35, per_minute: 0.05 }
                }, userId);
                setResponse(res);
                setLoading(false);
              }}
            >
              Update Tariff
            </button>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Response</div>
        <ResponseDisplay response={response} loading={loading} />
      </div>
    </div>
  );
}
