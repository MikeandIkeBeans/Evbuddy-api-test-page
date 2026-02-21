import React, { useState, useEffect } from "react";
import styles from "../styles";
import { EVBUDDY_API, API_BASE } from "../utils/api";
import { JsonView } from "./ResponseDisplay";

export default function HostSitesTab() {
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
