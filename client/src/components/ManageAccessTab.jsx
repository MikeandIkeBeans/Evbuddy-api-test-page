import React, { useState, useEffect } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";
import { ResponseDisplay } from "./ResponseDisplay";

export default function ManageAccessTab() {
  // View mode: "home" = Rent-A-Charger Host, "commercial" = CPO Operator
  const [viewMode, setViewMode] = useState("home");

  // Site selection
  const [siteId, setSiteId] = useState("1");
  const [siteName, setSiteName] = useState("Home Level 2 – Edison, NJ");
  const [scopeLabel, setScopeLabel] = useState("This Charger");
  const [actorId, setActorId] = useState("1");

  // Sub-tabs: drivers, staff, pending, invite
  const [subTab, setSubTab] = useState("drivers");

  // Data
  const [drivers, setDrivers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionResponse, setActionResponse] = useState(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteType, setInviteType] = useState("driver"); // driver or staff
  const [inviteScope, setInviteScope] = useState("entire_site");
  const [inviteRole, setInviteRole] = useState("staff");

  // Load drivers for the site
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await apiCall("GET", `/api/sites/${siteId}/drivers?actor_user_id=${actorId}`);
      if (res.ok && res.data?.drivers) {
        setDrivers(res.data.drivers);
      } else {
        setDrivers([]);
      }
    } catch { setDrivers([]); }
    setLoading(false);
  };

  // Load members for the site
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await apiCall("GET", `/api/sites/${siteId}/members`);
      if (res.ok && res.data?.members) {
        setMembers(res.data.members);
      } else {
        setMembers([]);
      }
    } catch { setMembers([]); }
    setLoading(false);
  };

  // Actions
  const approveDriver = async (driverId) => {
    const res = await apiCall("POST", `/api/sites/${siteId}/drivers/${driverId}/approve`, { actor_user_id: parseInt(actorId) });
    setActionResponse(res);
    fetchDrivers();
  };
  const rejectDriver = async (driverId) => {
    const res = await apiCall("POST", `/api/sites/${siteId}/drivers/${driverId}/revoke`, { actor_user_id: parseInt(actorId), reason: "Rejected by host" });
    setActionResponse(res);
    fetchDrivers();
  };
  const revokeDriver = async (driverId) => {
    const res = await apiCall("POST", `/api/sites/${siteId}/drivers/${driverId}/revoke`, { actor_user_id: parseInt(actorId) });
    setActionResponse(res);
    fetchDrivers();
  };
  const blockDriver = async (driverId) => {
    const res = await apiCall("POST", `/api/sites/${siteId}/drivers/${driverId}/block`, { actor_user_id: parseInt(actorId), reason: "Blocked by host" });
    setActionResponse(res);
    fetchDrivers();
  };

  // Invite
  const sendInvite = async () => {
    if (!inviteEmail) return;
    setLoading(true);
    let res;
    if (inviteType === "driver") {
      res = await apiCall("POST", `/api/sites/${siteId}/drivers/invite`, { email: inviteEmail, actor_user_id: parseInt(actorId) });
    } else {
      res = await apiCall("POST", `/api/sites/${siteId}/members/invite`, { email: inviteEmail, site_role: inviteRole, actor_user_id: parseInt(actorId) });
    }
    setActionResponse(res);
    setInviteEmail("");
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
    fetchMembers();
  }, [siteId]);

  // Palette matching the wireframe
  const teal = "#2d6a5a";
  const tealLight = "#e8f5f1";
  const tealDark = "#1a4a3e";
  const greenBtn = "#2d7a5a";
  const redBtn = "#c0392b";
  const redOutline = "#c0392b";
  const white = "#ffffff";
  const lightGray = "#f4f6f5";
  const borderColor = "#d4ddd9";
  const textDark = "#1a1a1a";
  const textMuted = "#6b7c75";

  // Computed lists
  const authorizedDrivers = drivers.filter(d => d.access_status === "approved");
  const pendingDrivers = drivers.filter(d => d.access_status === "pending");
  const staffMembers = members.filter(m => m.site_role !== "owner");

  const subTabs = viewMode === "home"
    ? [
        { id: "drivers", label: "Authorized", count: authorizedDrivers.length },
        { id: "pending", label: "Pending", count: pendingDrivers.length },
        { id: "invite", label: "Invite" },
      ]
    : [
        { id: "drivers", label: "Drivers", count: authorizedDrivers.length },
        { id: "staff", label: "Staff", count: staffMembers.length },
        { id: "pending", label: "Pending", count: pendingDrivers.length },
        { id: "invite", label: "Invite" },
      ];

  // ---- Phone frame wrapper ----
  const PhoneFrame = ({ title, children }) => (
    <div style={{
      width: 400,
      minHeight: 600,
      background: white,
      borderRadius: 20,
      overflow: "hidden",
      border: `1px solid ${borderColor}`,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    }}>
      {/* Top bar */}
      <div style={{ background: tealDark, color: white, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ cursor: "pointer", fontSize: 15 }}>← Back</span>
      </div>
      {/* Header */}
      <div style={{ padding: "18px 20px 10px", background: white }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: textDark, marginBottom: 2 }}>Manage Access</div>
        {children}
      </div>
    </div>
  );

  // ---- Shared card for a person ----
  const PersonCard = ({ name, subtitle, status, actions, trailing }) => (
    <div style={{
      background: white,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: textDark }}>{name}</div>
          {subtitle && <div style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>{subtitle}</div>}
          {status && (
            <div style={{ fontSize: 13, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: status === "Active" ? "#27ae60" : status === "Pending" ? "#f39c12" : "#95a5a6",
                display: "inline-block",
              }} />
              <span style={{ color: textMuted }}>Status: </span>
              <span style={{ color: status === "Active" ? "#27ae60" : textMuted, fontWeight: 500 }}>{status}</span>
            </div>
          )}
        </div>
        <span style={{ cursor: "pointer", color: textMuted, fontSize: 18, letterSpacing: 2 }}>···</span>
      </div>
      {trailing && <div style={{ marginTop: 8 }}>{trailing}</div>}
      {actions && <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );

  // Shared button styles
  const btnGreen = { padding: "7px 18px", borderRadius: 6, background: greenBtn, color: white, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" };
  const btnRedFill = { padding: "7px 18px", borderRadius: 6, background: redBtn, color: white, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" };
  const btnOutline = { padding: "7px 18px", borderRadius: 6, background: "transparent", color: textDark, border: `1px solid ${borderColor}`, fontSize: 13, fontWeight: 500, cursor: "pointer" };
  const btnRedOutline = { padding: "7px 18px", borderRadius: 6, background: "transparent", color: redOutline, border: `1px solid ${redOutline}`, fontSize: 13, fontWeight: 600, cursor: "pointer" };

  // ---- Content for each sub-tab ----
  const renderSubTab = () => {
    if (subTab === "drivers") {
      const list = viewMode === "home" ? authorizedDrivers : [...authorizedDrivers, ...pendingDrivers];
      if (list.length === 0) return <div style={{ padding: 20, color: textMuted, textAlign: "center" }}>No drivers found. Load site data or invite a driver.</div>;
      return (
        <div>
          {list.map((d, i) => (
            <PersonCard
              key={i}
              name={`Driver #${d.driver_user_id}`}
              subtitle={
                viewMode === "commercial"
                  ? (d.access_status === "approved" ? `Permission: ${d.reason || "Use Only"}` : `Requested access`)
                  : (d.reason || `driver@user${d.driver_user_id}.com`)
              }
              status={d.access_status === "approved" ? "Active" : d.access_status === "pending" ? "Pending" : d.access_status}
              actions={
                d.access_status === "approved" ? (
                  <>
                    <button style={btnOutline} onClick={() => {}}>Change Permission</button>
                    <button style={btnRedFill} onClick={() => revokeDriver(d.driver_user_id)}>Revoke Access</button>
                  </>
                ) : d.access_status === "pending" ? (
                  <>
                    <button style={btnGreen} onClick={() => approveDriver(d.driver_user_id)}>Approve</button>
                    <button style={btnRedOutline} onClick={() => rejectDriver(d.driver_user_id)}>Reject</button>
                  </>
                ) : null
              }
            />
          ))}
          {viewMode === "home" && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                style={{ background: "none", border: "none", color: greenBtn, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                onClick={() => setSubTab("invite")}
              >
                + Invite New Driver
              </button>
            </div>
          )}
        </div>
      );
    }

    if (subTab === "staff") {
      if (staffMembers.length === 0) return <div style={{ padding: 20, color: textMuted, textAlign: "center" }}>No staff members found.</div>;
      return (
        <div>
          {staffMembers.map((m, i) => (
            <PersonCard
              key={i}
              name={`User #${m.user_id}`}
              subtitle={`Role: ${m.site_role}`}
              status={m.status === "active" ? "Active" : m.status}
              actions={
                <>
                  <button style={btnOutline} onClick={() => {}}>Change Role</button>
                  <button style={btnRedOutline} onClick={() => {}}>Remove</button>
                </>
              }
            />
          ))}
        </div>
      );
    }

    if (subTab === "pending") {
      if (pendingDrivers.length === 0) return <div style={{ padding: 20, color: textMuted, textAlign: "center" }}>No pending requests.</div>;
      return (
        <div>
          {pendingDrivers.map((d, i) => (
            <PersonCard
              key={i}
              name={`Driver #${d.driver_user_id}`}
              subtitle={d.reason || "Requested Access"}
              actions={
                <>
                  <button style={btnGreen} onClick={() => approveDriver(d.driver_user_id)}>Approve</button>
                  <button style={btnRedOutline} onClick={() => rejectDriver(d.driver_user_id)}>Reject</button>
                </>
              }
            />
          ))}
        </div>
      );
    }

    if (subTab === "invite") {
      return (
        <div style={{ padding: "4px 0" }}>
          <div style={{
            background: white,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: "16px",
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: textDark, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Invite</span>
              <span style={{ cursor: "pointer", color: textMuted, fontSize: 18, letterSpacing: 2 }}>···</span>
            </div>
            {/* Type selector */}
            <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, color: textDark }}>
                <input type="radio" name="inviteType" checked={inviteType === "driver"} onChange={() => setInviteType("driver")} style={{ accentColor: teal }} />
                Driver
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, color: textDark }}>
                <input type="radio" name="inviteType" checked={inviteType === "staff"} onChange={() => setInviteType("staff")} style={{ accentColor: teal }} />
                Staff
              </label>
            </div>
            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}>Email</div>
              <input
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${borderColor}`,
                  fontSize: 14, color: textDark, background: white, boxSizing: "border-box",
                }}
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            {/* Scope */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}>Scope</div>
                <select style={{
                  width: "100%", padding: "9px 10px", borderRadius: 6, border: `1px solid ${borderColor}`,
                  fontSize: 13, color: textDark, background: white,
                }} value={inviteScope} onChange={e => setInviteScope(e.target.value)}>
                  <option value="entire_site">Entire Site</option>
                  <option value="this_charger">This Charger</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}>Role</div>
                <select style={{
                  width: "100%", padding: "9px 10px", borderRadius: 6, border: `1px solid ${borderColor}`,
                  fontSize: 13, color: textDark, background: white,
                }} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  {inviteType === "driver" ? (
                    <>
                      <option value="use_only">Use Only</option>
                      <option value="operator">Operator</option>
                    </>
                  ) : (
                    <>
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="viewer">Viewer</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <button
              style={{ ...btnGreen, width: "100%", padding: "11px 20px", fontSize: 15, borderRadius: 8 }}
              onClick={sendInvite}
              disabled={!inviteEmail}
            >
              Send Invite
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Config bar for the dashboard */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Manage Access Preview</div>
        <div style={styles.row}>
          <div>
            <div style={styles.label}>Site ID</div>
            <input style={{ ...styles.input, width: 80 }} value={siteId} onChange={e => setSiteId(e.target.value)} />
          </div>
          <div>
            <div style={styles.label}>Actor (Your) ID</div>
            <input style={{ ...styles.input, width: 80 }} value={actorId} onChange={e => setActorId(e.target.value)} />
          </div>
          <div>
            <div style={styles.label}>Site Name</div>
            <input style={{ ...styles.input, width: 220 }} value={siteName} onChange={e => setSiteName(e.target.value)} />
          </div>
          <button style={styles.button} onClick={() => { fetchDrivers(); fetchMembers(); }}>Reload</button>
        </div>
        {actionResponse && (
          <div style={{ marginTop: 8 }}>
            <ResponseDisplay response={actionResponse} />
          </div>
        )}
      </div>

      {/* Two phone frames side by side */}
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center", marginTop: 20 }}>
        {/* ---- HOME HOST FRAME ---- */}
        <div onClick={() => setViewMode("home")} style={{ cursor: "pointer", opacity: viewMode === "home" ? 1 : 0.5, transition: "opacity 0.2s" }}>
          <div style={{ textAlign: "center", color: "#888", fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Rent A Charger Host (Home)</div>
          <PhoneFrame title="Home">
            <div style={{ fontSize: 14, color: textMuted }}>Charger: {siteName}</div>
            <div style={{ fontSize: 13, color: textMuted, marginBottom: 14 }}>Scope: {scopeLabel}</div>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
              {[
                { id: "drivers", label: "Authorized" },
                { id: "pending", label: "Pending" },
                { id: "invite", label: "Invite" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={(e) => { e.stopPropagation(); setSubTab(t.id); setViewMode("home"); }}
                  style={{
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1px solid ${borderColor}`,
                    borderRadius: t.id === "drivers" ? "8px 0 0 8px" : t.id === "invite" ? "0 8px 8px 0" : 0,
                    background: (viewMode === "home" && subTab === t.id) ? teal : white,
                    color: (viewMode === "home" && subTab === t.id) ? white : textDark,
                    cursor: "pointer",
                    marginLeft: t.id !== "drivers" ? -1 : 0,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content area */}
            <div style={{ padding: "0 0 16px", maxHeight: 340, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 20, color: textMuted, textAlign: "center" }}>Loading...</div>
              ) : viewMode === "home" ? (
                renderSubTab()
              ) : (
                <div style={{ padding: 20, color: textMuted, textAlign: "center", fontSize: 13 }}>Click to activate this view</div>
              )}
            </div>

            {/* Footer share link */}
            {viewMode === "home" && subTab === "drivers" && (
              <div style={{
                borderTop: `1px solid ${borderColor}`,
                padding: "12px 0 8px",
                textAlign: "center",
                fontSize: 13,
                color: textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}>
                Grant access to {siteName} <span style={{ fontSize: 14 }}>↗</span>
              </div>
            )}

            {/* Bottom nav */}
            <div style={{
              display: "flex",
              justifyContent: "space-around",
              borderTop: `1px solid ${borderColor}`,
              padding: "10px 0 8px",
              background: tealDark,
              marginTop: "auto",
            }}>
              {["💬 Chat", "🔍 Search", "🏠 Home", "🏨 Host", "👤 Profile"].map(label => (
                <div key={label} style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
                  <div style={{ fontSize: 18 }}>{label.split(" ")[0]}</div>
                  <div>{label.split(" ")[1]}</div>
                </div>
              ))}
            </div>
          </PhoneFrame>
        </div>

        {/* ---- CPO OPERATOR FRAME ---- */}
        <div onClick={() => setViewMode("commercial")} style={{ cursor: "pointer", opacity: viewMode === "commercial" ? 1 : 0.5, transition: "opacity 0.2s" }}>
          <div style={{ textAlign: "center", color: "#888", fontSize: 13, marginBottom: 8, fontWeight: 600 }}>CPO Operator (Commercial Site)</div>
          <PhoneFrame title="Commercial">
            <div style={{ fontSize: 14, color: textMuted, marginBottom: 4 }}>Site: {siteName}</div>
            {/* Scope dropdown */}
            <select style={{
              width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${borderColor}`,
              fontSize: 14, color: textDark, background: white, marginBottom: 14,
            }} value={scopeLabel} onChange={e => setScopeLabel(e.target.value)}>
              <option value="Entire Site">Entire Site</option>
              <option value="This Charger">This Charger</option>
            </select>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
              {[
                { id: "drivers", label: "Drivers" },
                { id: "staff", label: "Staff" },
                { id: "pending", label: "Pending" },
                { id: "invite", label: "Invite" },
              ].map((t, idx, arr) => (
                <button
                  key={t.id}
                  onClick={(e) => { e.stopPropagation(); setSubTab(t.id); setViewMode("commercial"); }}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1px solid ${borderColor}`,
                    borderRadius: idx === 0 ? "8px 0 0 8px" : idx === arr.length - 1 ? "0 8px 8px 0" : 0,
                    background: (viewMode === "commercial" && subTab === t.id) ? teal : white,
                    color: (viewMode === "commercial" && subTab === t.id) ? white : textDark,
                    cursor: "pointer",
                    marginLeft: idx !== 0 ? -1 : 0,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content area */}
            <div style={{ padding: "0 0 16px", maxHeight: 340, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 20, color: textMuted, textAlign: "center" }}>Loading...</div>
              ) : viewMode === "commercial" ? (
                renderSubTab()
              ) : (
                <div style={{ padding: 20, color: textMuted, textAlign: "center", fontSize: 13 }}>Click to activate this view</div>
              )}
            </div>

            {/* Bottom nav */}
            <div style={{
              display: "flex",
              justifyContent: "space-around",
              borderTop: `1px solid ${borderColor}`,
              padding: "10px 0 8px",
              background: tealDark,
              marginTop: "auto",
            }}>
              {["💬 Chat", "🔍 Search", "🏠 Home", "🏨 Host", "👤 Profile"].map(label => (
                <div key={label} style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
                  <div style={{ fontSize: 18 }}>{label.split(" ")[0]}</div>
                  <div>{label.split(" ")[1]}</div>
                </div>
              ))}
            </div>
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}
