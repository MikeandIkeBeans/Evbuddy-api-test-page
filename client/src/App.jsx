import React, { useState, useEffect } from "react";

// API Base URL
const API_BASE = "http://127.0.0.1:5000";

// Styles
const styles = {
  container: {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    maxWidth: 1400,
    margin: "0 auto",
    padding: 20,
    background: "#0a0a0a",
    minHeight: "100vh",
    color: "#e0e0e0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    borderBottom: "1px solid #333",
    paddingBottom: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: 700,
    background: "linear-gradient(135deg, #00d4aa, #00a8e8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  tabs: {
    display: "flex",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 20px",
    border: "1px solid #333",
    borderRadius: 8,
    background: "#1a1a1a",
    color: "#888",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s",
  },
  tabActive: {
    background: "linear-gradient(135deg, #00d4aa, #00a8e8)",
    color: "#000",
    borderColor: "transparent",
  },
  card: {
    background: "#1a1a1a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    border: "1px solid #2a2a2a",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #333",
    borderRadius: 6,
    background: "#0a0a0a",
    color: "#fff",
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    padding: "10px 20px",
    border: "none",
    borderRadius: 6,
    background: "linear-gradient(135deg, #00d4aa, #00a8e8)",
    color: "#000",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.1s",
  },
  buttonSecondary: {
    padding: "8px 16px",
    border: "1px solid #444",
    borderRadius: 6,
    background: "#2a2a2a",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  buttonDanger: {
    background: "linear-gradient(135deg, #ff4757, #ff3838)",
  },
  response: {
    background: "#0d1117",
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: 12,
    overflow: "auto",
    maxHeight: 400,
    border: "1px solid #30363d",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    marginLeft: 8,
  },
  badgeSuccess: { background: "#00d4aa22", color: "#00d4aa" },
  badgeError: { background: "#ff475722", color: "#ff4757" },
  badgePending: { background: "#ffa50022", color: "#ffa500" },
  select: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #333",
    borderRadius: 6,
    background: "#0a0a0a",
    color: "#fff",
    fontSize: 14,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
    display: "block",
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
    marginRight: 8,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "12px 8px",
    borderBottom: "1px solid #333",
    color: "#888",
    fontWeight: 500,
  },
  td: {
    padding: "12px 8px",
    borderBottom: "1px solid #222",
  },
};

// Helper to make API calls
async function apiCall(method, endpoint, body = null, userId = null) {
  const headers = { "Content-Type": "application/json" };
  if (userId) headers["X-User-ID"] = String(userId);
  
  const options = { method, headers };
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }
  
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const start = Date.now();
  
  try {
    const res = await fetch(url, options);
    const duration = Date.now() - start;
    const data = await res.json();
    return { ok: res.ok, status: res.status, data, duration };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err.message }, duration: Date.now() - start };
  }
}

// JSON Syntax Highlighter
function JsonView({ data }) {
  const json = JSON.stringify(data, null, 2);
  const highlighted = json
    .replace(/"([^"]+)":/g, '<span style="color:#79c0ff">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span style="color:#a5d6ff">"$1"</span>')
    .replace(/: (\d+)/g, ': <span style="color:#ffa657">$1</span>')
    .replace(/: (true|false)/g, ': <span style="color:#ff7b72">$1</span>')
    .replace(/: null/g, ': <span style="color:#8b949e">null</span>');
  
  return <pre style={styles.response} dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

// Response Display Component
function ResponseDisplay({ response, loading }) {
  if (loading) {
    return (
      <div style={{ ...styles.response, textAlign: "center", color: "#888" }}>
        Loading...
      </div>
    );
  }
  if (!response) return null;
  
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <span style={{
          ...styles.badge,
          ...(response.ok ? styles.badgeSuccess : styles.badgeError)
        }}>
          {response.status} {response.ok ? "OK" : "ERROR"}
        </span>
        <span style={{ fontSize: 12, color: "#666" }}>{response.duration}ms</span>
      </div>
      <JsonView data={response.data} />
    </div>
  );
}

// ============================================================================
// Services Status Tab
// ============================================================================
function ServicesTab() {
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    const res = await apiCall("GET", "/api/services");
    setServices(res);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        Microservices Status
        <button style={styles.buttonSecondary} onClick={fetchServices}>Refresh</button>
      </div>
      
      {loading && <p style={{ color: "#888" }}>Loading services...</p>}
      
      {services?.data?.services && (
        <>
          <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
            <div style={{ ...styles.card, background: "#00d4aa11", flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#00d4aa" }}>
                {services.data.summary.available}
              </div>
              <div style={{ color: "#888", fontSize: 13 }}>Available</div>
            </div>
            <div style={{ ...styles.card, background: "#ff475711", flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#ff4757" }}>
                {services.data.summary.unavailable}
              </div>
              <div style={{ color: "#888", fontSize: 13 }}>Unavailable</div>
            </div>
          </div>
          
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Service</th>
                <th style={styles.th}>Port</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(services.data.services).map(([name, info]) => (
                <tr key={name}>
                  <td style={styles.td}>{name}</td>
                  <td style={styles.td}>{info.port}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusDot,
                      background: info.available ? "#00d4aa" : "#ff4757"
                    }} />
                    {info.available ? "Online" : "Offline"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ============================================================================
// RBAC Tab - Roles & Access Control
// ============================================================================
function RBACTab() {
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

// ============================================================================
// Host Sites Tab (EV Buddy API - port 8080)
// ============================================================================
function HostSitesTab() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteChargers, setSiteChargers] = useState([]);

  // Hotel auth flow state
  const [showHotelAuth, setShowHotelAuth] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authResponse, setAuthResponse] = useState(null);
  const [authError, setAuthError] = useState(null);

  const openHotelAuth = (site) => {
    setShowHotelAuth(true);
    setRoomNumber("");
    setLastName("");
    setSelectedCharger(null);
    setAuthResponse(null);
    setAuthError(null);
  };

  const submitHotelAuth = async () => {
    if (!roomNumber || !lastName) return;
    setAuthLoading(true);
    setAuthError(null);
    setAuthResponse(null);
    try {
      const chargerId = selectedCharger?.ocpp_identity || selectedCharger?.name || selectedCharger?.id || "atl001";
      const res = await fetch(`${EVBUDDY_API}/v1/auth/hotel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: String(selectedSite.id),
          chargerId: String(chargerId),
          roomNumber: roomNumber,
          lastName: lastName,
          hostId: selectedSite.host_id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthResponse(data);
      } else {
        const errText = await res.text();
        setAuthError(errText || `Auth failed (${res.status})`);
      }
    } catch (err) {
      setAuthError(`Connection failed: ${err.message}`);
    }
    setAuthLoading(false);
  };

  const fetchSites = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try EV Buddy proxy first, then direct
      let res = await fetch(`${EVBUDDY_API}/v1/host-sites`);
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/services/host_sites`);
      }
      if (res.ok) {
        const data = await res.json();
        setSites(Array.isArray(data) ? data : (data.data || data.sites || []));
      } else {
        setError(`Failed to fetch: ${res.status}`);
      }
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
    }
    setLoading(false);
  };

  const fetchSiteChargers = async (siteId) => {
    try {
      const res = await fetch(`${EVBUDDY_API}/v1/chargers/site/${siteId}`);
      if (res.ok) {
        const data = await res.json();
        setSiteChargers(Array.isArray(data) ? data : (data.data || data.chargers || []));
      }
    } catch (err) {
      setSiteChargers([]);
    }
  };

  useEffect(() => { fetchSites(); }, []);

  useEffect(() => {
    if (selectedSite?.id) {
      fetchSiteChargers(selectedSite.id);
    }
  }, [selectedSite]);

  const getStatusBadge = (status) => {
    const colors = {
      active: { bg: "#00d4aa22", color: "#00d4aa" },
      inactive: { bg: "#88888822", color: "#888" },
      pending: { bg: "#ffa50022", color: "#ffa500" },
    };
    const style = colors[status?.toLowerCase()] || colors.inactive;
    return { ...styles.badge, background: style.bg, color: style.color };
  };

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          🏨 Host Sites
          <button style={{ ...styles.buttonSecondary, marginLeft: "auto" }} onClick={fetchSites}>
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ background: "#ff475722", color: "#ff4757", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && <p style={{ color: "#888" }}>Loading host sites...</p>}

        {!loading && sites.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Address</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(site => (
                <tr 
                  key={site.id} 
                  style={{ 
                    background: selectedSite?.id === site.id ? "#2a2a3a" : "transparent",
                    cursor: "pointer"
                  }}
                  onClick={() => setSelectedSite(site)}
                >
                  <td style={styles.td}>{site.id}</td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600 }}>{site.name || site.site_name || "Unnamed"}</div>
                    {site.host_id && <div style={{ fontSize: 11, color: "#888" }}>Host ID: {site.host_id}</div>}
                  </td>
                  <td style={styles.td}>
                    <div>{site.address || site.street_address || "—"}</div>
                    {(site.city || site.state) && (
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {[site.city, site.state, site.zip_code].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={getStatusBadge(site.status)}>
                      {site.status || "unknown"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button 
                        style={styles.buttonSecondary}
                        onClick={(e) => { e.stopPropagation(); setSelectedSite(site); }}
                      >
                        Details
                      </button>
                      <button
                        style={{ ...styles.button, padding: "6px 12px", fontSize: 12 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSite(site);
                          openHotelAuth(site);
                        }}
                      >
                        🔑 Hotel Auth
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && sites.length === 0 && !error && (
          <p style={{ color: "#888" }}>No host sites found.</p>
        )}
      </div>

      {selectedSite && (
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              📍 {selectedSite.name || selectedSite.site_name || `Site ${selectedSite.id}`}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#888" }}>Site ID</div>
                <div style={{ fontWeight: 600 }}>{selectedSite.id}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#888" }}>Host ID</div>
                <div style={{ fontWeight: 600 }}>{selectedSite.host_id || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#888" }}>Status</div>
                <span style={getStatusBadge(selectedSite.status)}>
                  {selectedSite.status || "unknown"}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#888" }}>Visibility</div>
                <div style={{ fontWeight: 600 }}>{selectedSite.visibility || selectedSite.site_visibility || "—"}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, color: "#888" }}>Address</div>
                <div style={{ fontWeight: 600 }}>
                  {selectedSite.address || selectedSite.street_address || "—"}
                  {(selectedSite.city || selectedSite.state) && (
                    <span style={{ color: "#888", marginLeft: 8 }}>
                      {[selectedSite.city, selectedSite.state, selectedSite.zip_code].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              {selectedSite.latitude && selectedSite.longitude && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 11, color: "#888" }}>Coordinates</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {selectedSite.latitude}, {selectedSite.longitude}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>
              🔌 Site Chargers ({siteChargers.length})
              {!showHotelAuth && (
                <button
                  style={{ ...styles.button, marginLeft: "auto", padding: "6px 14px", fontSize: 12 }}
                  onClick={() => openHotelAuth(selectedSite)}
                >
                  🔑 Hotel Auth Flow
                </button>
              )}
            </div>
            {siteChargers.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {siteChargers.map(charger => (
                  <div 
                    key={charger.id || charger.ocpp_identity}
                    style={{
                      background: selectedCharger?.id === charger.id && showHotelAuth ? "#1a2a3a" : "#0a0a0a",
                      border: `1px solid ${selectedCharger?.id === charger.id && showHotelAuth ? "#00a8e8" : "#333"}`,
                      borderRadius: 8,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: showHotelAuth ? "pointer" : "default",
                      transition: "all 0.15s",
                    }}
                    onClick={() => { if (showHotelAuth) setSelectedCharger(charger); }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {charger.ocpp_identity || charger.name || `Charger ${charger.id}`}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {charger.model || charger.charger_model || "Unknown model"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={getStatusBadge(charger.status)}>
                        {charger.status || "unknown"}
                      </span>
                      {showHotelAuth && selectedCharger?.id === charger.id && (
                        <span style={{ color: "#00a8e8", fontSize: 12, fontWeight: 600 }}>Selected</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#888", fontSize: 13 }}>No chargers assigned to this site.</p>
            )}
          </div>
        </div>
      )}

      {/* Hotel Auth Flow Modal */}
      {showHotelAuth && selectedSite && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHotelAuth(false); }}
        >
          <div style={{
            background: "#1a1a1a",
            borderRadius: 16,
            padding: 28,
            width: 440,
            maxWidth: "90vw",
            border: "1px solid #333",
            maxHeight: "90vh",
            overflow: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>
                🔑 Hotel Guest Auth
              </div>
              <button
                style={{ ...styles.buttonSecondary, padding: "4px 10px", fontSize: 16 }}
                onClick={() => setShowHotelAuth(false)}
              >
                ✕
              </button>
            </div>

            {/* Site Info */}
            <div style={{
              background: "#0a0a0a",
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              border: "1px solid #2a2a2a",
            }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Host Site</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#fff" }}>
                {selectedSite.name || selectedSite.site_name || `Site ${selectedSite.id}`}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                ID: {selectedSite.id}
                {selectedSite.host_id && ` · Host ID: ${selectedSite.host_id}`}
              </div>
            </div>

            {/* Charger Selection */}
            {siteChargers.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={styles.label}>Select Charger</div>
                <select
                  style={styles.select}
                  value={selectedCharger ? (selectedCharger.id || selectedCharger.ocpp_identity || "") : ""}
                  onChange={(e) => {
                    const ch = siteChargers.find(c => String(c.id || c.ocpp_identity) === e.target.value);
                    setSelectedCharger(ch || null);
                  }}
                >
                  <option value="">— Pick a charger —</option>
                  {siteChargers.map(ch => (
                    <option key={ch.id || ch.ocpp_identity} value={ch.id || ch.ocpp_identity}>
                      {ch.ocpp_identity || ch.name || `Charger ${ch.id}`} ({ch.status || "unknown"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Guest Credentials */}
            <div style={{ marginBottom: 12 }}>
              <div style={styles.label}>Room Number</div>
              <input
                style={styles.input}
                placeholder="e.g., 412"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitHotelAuth(); }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={styles.label}>Last Name</div>
              <input
                style={styles.input}
                placeholder="e.g., Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitHotelAuth(); }}
              />
            </div>

            <button
              style={{ ...styles.button, width: "100%", padding: "12px 20px", fontSize: 15 }}
              onClick={submitHotelAuth}
              disabled={authLoading || !roomNumber || !lastName}
            >
              {authLoading ? "Authenticating..." : "Authenticate Guest"}
            </button>

            {/* Error */}
            {authError && (
              <div style={{
                background: "#ff475722",
                color: "#ff4757",
                padding: 12,
                borderRadius: 8,
                marginTop: 14,
                fontSize: 13,
              }}>
                {authError}
              </div>
            )}

            {/* Success */}
            {authResponse && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  background: "#00d4aa15",
                  border: "1px solid #00d4aa44",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <span style={{ fontWeight: 700, color: "#00d4aa", fontSize: 15 }}>Guest Authenticated</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#888" }}>Guest</div>
                      <div style={{ fontWeight: 600 }}>{authResponse.guest?.displayName || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#888" }}>Expires In</div>
                      <div style={{ fontWeight: 600 }}>{authResponse.expiresInSec ? `${Math.round(authResponse.expiresInSec / 60)} min` : "—"}</div>
                    </div>
                    {authResponse.guest?.reservationId && (
                      <div>
                        <div style={{ fontSize: 11, color: "#888" }}>Reservation ID</div>
                        <div style={{ fontWeight: 600 }}>{authResponse.guest.reservationId}</div>
                      </div>
                    )}
                    {authResponse.guest?.checkInDate && (
                      <div>
                        <div style={{ fontSize: 11, color: "#888" }}>Stay</div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>
                          {authResponse.guest.checkInDate} → {authResponse.guest.checkOutDate}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Access Token</div>
                  <div style={{
                    background: "#0d1117",
                    borderRadius: 6,
                    padding: 10,
                    fontFamily: "monospace",
                    fontSize: 11,
                    wordBreak: "break-all",
                    color: "#a5d6ff",
                    border: "1px solid #30363d",
                  }}>
                    {authResponse.accessToken}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Site Members Tab
// ============================================================================
function SiteMembersTab() {
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

// ============================================================================
// Driver Access Tab
// ============================================================================
function DriverAccessTab() {
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

// ============================================================================
// CPMS Operations Tab
// ============================================================================
function CPMSTab() {
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

// ============================================================================
// Live Chargers Tab (EV Buddy API - same server as Flask)
// ============================================================================
const EVBUDDY_API = (() => {
  if (typeof window === "undefined") return "";
  if (window.location.port === "5173") return "http://localhost:5000";
  return window.location.origin;
})();

function LiveChargersTab() {
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

// ============================================================================
// Active Sessions Tab (EV Buddy API)
// ============================================================================
function ActiveSessionsTab() {
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
        // Endpoint might not exist yet
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

// ============================================================================
// Manage Access Tab (Mobile-style Wireframe)
// ============================================================================
function ManageAccessTab() {
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

// ============================================================================
// Audit Log Tab
// ============================================================================
function AuditTab() {
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

// ============================================================================
// API Tester Tab
// ============================================================================
function APITesterTab() {
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState("/api/health");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    let parsedBody = null;
    if (body && method !== "GET") {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        setResponse({ ok: false, status: 0, data: { error: "Invalid JSON body" }, duration: 0 });
        setLoading(false);
        return;
      }
    }
    const res = await apiCall(method, endpoint, parsedBody, userId || null);
    setResponse(res);
    setLoading(false);
  };

  const quickEndpoints = [
    { method: "GET", endpoint: "/health", label: "Health" },
    { method: "GET", endpoint: "/api/services", label: "Services" },
    { method: "GET", endpoint: "/api/roles", label: "Roles" },
    { method: "GET", endpoint: "/api/security/roles", label: "Security Roles" },
    { method: "GET", endpoint: "/api/sites/1/members", label: "Site 1 Members" },
    { method: "GET", endpoint: "/api/sites/1/drivers?actor_user_id=1", label: "Site 1 Drivers" },
    { method: "GET", endpoint: "/api/audit-log?limit=10", label: "Audit Log" },
  ];

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>API Tester</div>
        
        <div style={styles.row}>
          <div>
            <div style={styles.label}>Method</div>
            <select style={{ ...styles.select, width: 100 }} value={method} onChange={e => setMethod(e.target.value)}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.label}>Endpoint</div>
            <input style={styles.input} value={endpoint} onChange={e => setEndpoint(e.target.value)} />
          </div>
          <div>
            <div style={styles.label}>X-User-ID</div>
            <input style={{ ...styles.input, width: 80 }} value={userId} onChange={e => setUserId(e.target.value)} placeholder="opt" />
          </div>
        </div>

        {method !== "GET" && (
          <>
            <div style={styles.label}>Request Body (JSON)</div>
            <textarea
              style={{ ...styles.input, height: 100, fontFamily: "monospace", resize: "vertical" }}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </>
        )}

        <button style={styles.button} onClick={sendRequest}>Send Request</button>
        
        <ResponseDisplay response={response} loading={loading} />
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Quick Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {quickEndpoints.map((ep, i) => (
            <button
              key={i}
              style={styles.buttonSecondary}
              onClick={() => {
                setMethod(ep.method);
                setEndpoint(ep.endpoint);
              }}
            >
              <span style={{ 
                color: ep.method === "GET" ? "#00d4aa" : 
                       ep.method === "POST" ? "#00a8e8" : "#ffa500",
                marginRight: 8,
                fontWeight: 600
              }}>
                {ep.method}
              </span>
              {ep.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main App
// ============================================================================
export default function App() {
  const [activeTab, setActiveTab] = useState("services");

  const tabs = [
    { id: "services", label: "Services", component: <ServicesTab /> },
    { id: "chargers", label: "🔌 Chargers", component: <LiveChargersTab /> },
    { id: "sessions", label: "⚡ Sessions", component: <ActiveSessionsTab /> },
    { id: "hostsites", label: "🏨 Host Sites", component: <HostSitesTab /> },
    { id: "access", label: "🔐 Manage Access", component: <ManageAccessTab /> },
    { id: "rbac", label: "Roles", component: <RBACTab /> },
    { id: "sites", label: "Site Members", component: <SiteMembersTab /> },
    { id: "drivers", label: "Driver Access", component: <DriverAccessTab /> },
    { id: "cpms", label: "CPMS Operations", component: <CPMSTab /> },
    { id: "audit", label: "Audit Log", component: <AuditTab /> },
    { id: "tester", label: "API Tester", component: <APITesterTab /> },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>EV Buddy</div>
        <div style={{ color: "#666", fontSize: 14 }}>API Dashboard</div>
      </div>

      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.find(t => t.id === activeTab)?.component}
    </div>
  );
}
