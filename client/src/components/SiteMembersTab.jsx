import React, { useState, useEffect } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";
import { ResponseDisplay } from "./ResponseDisplay";

export default function SiteMembersTab() {
  const [siteId, setSiteId] = useState("1");
  const [userId, setUserId] = useState("");
  const [siteRole, setSiteRole] = useState("staff");
  const [members, setMembers] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const getMembers = async () => {
    setLoading(true);
    const res = await apiCall("GET", `/api/sites/${siteId}/members`);
    setMembers(res.data);
    setLoading(false);
  };

  const addMember = async () => {
    if (!userId) return;
    setLoading(true);
    const res = await apiCall("POST", `/api/sites/${siteId}/members/${userId}`, {
      site_role: siteRole,
      actor_user_id: 1
    });
    setResponse(res);
    getMembers();
    setLoading(false);
  };

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>Site Members</div>
        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <div style={styles.label}>Site ID</div>
            <input style={styles.input} value={siteId} onChange={e => setSiteId(e.target.value)} />
          </div>
          <button style={styles.button} onClick={getMembers}>Load Members</button>
        </div>

        {members?.members && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User ID</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.members.map((m, i) => (
                <tr key={i}>
                  <td style={styles.td}>{m.user_id}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: "#ffa50022", color: "#ffa500" }}>
                      {m.site_role}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(m.status === "active" ? styles.badgeSuccess : styles.badgeError)
                    }}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Add Site Member</div>
        <div style={styles.label}>User ID</div>
        <input style={styles.input} value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g., 5" />
        <div style={styles.label}>Site Role</div>
        <select style={styles.select} value={siteRole} onChange={e => setSiteRole(e.target.value)}>
          <option value="owner">owner</option>
          <option value="supervisor">supervisor</option>
          <option value="staff">staff</option>
          <option value="viewer">viewer</option>
        </select>
        <button style={styles.button} onClick={addMember}>Add Member</button>
        <ResponseDisplay response={response} loading={loading} />
      </div>
    </div>
  );
}
