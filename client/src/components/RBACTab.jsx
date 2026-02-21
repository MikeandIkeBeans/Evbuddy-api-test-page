import React, { useState, useEffect } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";
import { ResponseDisplay } from "./ResponseDisplay";

export default function RBACTab() {
  const [roles, setRoles] = useState(null);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("driver");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRoles = async () => {
    const res = await apiCall("GET", "/api/security/roles");
    setRoles(res.data);
  };

  useEffect(() => { fetchRoles(); }, []);

  const assignRole = async () => {
    if (!userId) return;
    setLoading(true);
    const res = await apiCall("POST", `/api/users/${userId}/roles`, { role, actor_user_id: 1 });
    setResponse(res);
    setLoading(false);
  };

  const getUserRoles = async () => {
    if (!userId) return;
    setLoading(true);
    const res = await apiCall("GET", `/api/users/${userId}/roles`);
    setResponse(res);
    setLoading(false);
  };

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>Role Definitions</div>
        {roles && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={styles.label}>Global Roles</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {roles.global_roles?.map(r => (
                  <span key={r} style={{ ...styles.badge, background: "#00d4aa22", color: "#00d4aa" }}>{r}</span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={styles.label}>Site Roles</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {roles.site_roles?.map(r => (
                  <span key={r} style={{ ...styles.badge, background: "#ffa50022", color: "#ffa500" }}>{r}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={styles.label}>Operator (CPO) Roles</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {roles.operator_roles?.map(r => (
                  <span key={r} style={{ ...styles.badge, background: "#00a8e822", color: "#00a8e8" }}>{r}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Assign User Role</div>
        <div style={styles.label}>User ID</div>
        <input
          style={styles.input}
          type="number"
          placeholder="e.g., 100"
          value={userId}
          onChange={e => setUserId(e.target.value)}
        />
        <div style={styles.label}>Role</div>
        <select style={styles.select} value={role} onChange={e => setRole(e.target.value)}>
          <optgroup label="Global">
            <option value="platform_admin">platform_admin</option>
            <option value="ops">ops</option>
            <option value="host">host</option>
            <option value="driver">driver</option>
          </optgroup>
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.button} onClick={assignRole}>Assign Role</button>
          <button style={styles.buttonSecondary} onClick={getUserRoles}>Get Roles</button>
        </div>
        <ResponseDisplay response={response} loading={loading} />
      </div>
    </div>
  );
}
