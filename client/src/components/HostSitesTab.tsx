import React, { useState, useEffect } from "react";
import styles from "../styles";
import { EVBUDDY_API, API_BASE } from "../utils/api";
import { JsonView } from "./ResponseDisplay";
import { HostSite, SiteCharger } from "../types";
import { Button, Panel, SectionHeader, StatusPill } from "./primitives";

export default function HostSitesTab() {
  const [sites, setSites] = useState<HostSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<HostSite | null>(null);
  const [siteChargers, setSiteChargers] = useState<SiteCharger[]>([]);

  // Hotel auth flow state
  const [showHotelAuth, setShowHotelAuth] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedCharger, setSelectedCharger] = useState<SiteCharger | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authResponse, setAuthResponse] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const openHotelAuth = (_site: HostSite) => {
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
          siteId: String(selectedSite!.id),
          chargerId: String(chargerId),
          roomNumber: roomNumber,
          lastName: lastName,
          hostId: selectedSite!.host_id || null,
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
      setAuthError(`Connection failed: ${(err as Error).message}`);
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
      setError(`Connection failed: ${(err as Error).message}`);
    }
    setLoading(false);
  };

  const fetchSiteChargers = async (siteId: number) => {
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

  const getStatusBadge = (status: string | undefined) => {
    const colors: Record<string, { bg: string; color: string }> = {
      active: { bg: "var(--semantic-success-soft)", color: "var(--accent-primary)" },
      inactive: { bg: "var(--semantic-neutral-soft)", color: "var(--text-muted)" },
      pending: { bg: "var(--semantic-warning-soft)", color: "var(--semantic-warning)" },
    };
    const style = colors[status?.toLowerCase() ?? ""] || colors.inactive;
    return { ...styles.badge, background: style.bg, color: style.color };
  };

  return (
    <div>
      <Panel>
        <SectionHeader
          icon="🏨"
          title="Host Sites"
          action={<Button variant="secondary" style={{ marginLeft: "auto" }} onClick={fetchSites}>Refresh</Button>}
        />

        {error && (
          <div style={{ background: "var(--semantic-error-soft)", color: "var(--semantic-error)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && <p style={{ color: "var(--text-muted)" }}>Loading host sites...</p>}

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
                    background: selectedSite?.id === site.id ? "var(--surface-elevated)" : "transparent",
                    cursor: "pointer"
                  }}
                  onClick={() => setSelectedSite(site)}
                >
                  <td style={styles.td}>{site.id}</td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600 }}>{site.name || site.site_name || "Unnamed"}</div>
                    {site.host_id && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Host ID: {site.host_id}</div>}
                  </td>
                  <td style={styles.td}>
                    <div>{site.address || site.street_address || "—"}</div>
                    {(site.city || site.state) && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
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
                      <Button
                        variant="secondary"
                        style={styles.buttonSecondary}
                        onClick={(e) => { e.stopPropagation(); setSelectedSite(site); }}
                      >
                        Details
                      </Button>
                      <Button
                        variant="primary"
                        style={{ ...styles.button, padding: "6px 12px", fontSize: 12 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSite(site);
                          openHotelAuth(site);
                        }}
                      >
                        🔑 Hotel Auth
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && sites.length === 0 && !error && (
          <p style={{ color: "var(--text-muted)" }}>No host sites found.</p>
        )}
      </Panel>

      {selectedSite && (
        <div style={styles.grid}>
          <Panel>
            <SectionHeader icon="📍" title={selectedSite.name || selectedSite.site_name || `Site ${selectedSite.id}`} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Site ID</div>
                <div style={{ fontWeight: 600 }}>{selectedSite.id}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Host ID</div>
                <div style={{ fontWeight: 600 }}>{selectedSite.host_id || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Status</div>
                <span style={getStatusBadge(selectedSite.status)}>
                  {selectedSite.status || "unknown"}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Visibility</div>
                <div style={{ fontWeight: 600 }}>{selectedSite.visibility || selectedSite.site_visibility || "—"}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Address</div>
                <div style={{ fontWeight: 600 }}>
                  {selectedSite.address || selectedSite.street_address || "—"}
                  {(selectedSite.city || selectedSite.state) && (
                    <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                      {[selectedSite.city, selectedSite.state, selectedSite.zip_code].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              {selectedSite.latitude && selectedSite.longitude && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Coordinates</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {selectedSite.latitude}, {selectedSite.longitude}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              icon="🔌"
              title={`Site Chargers (${siteChargers.length})`}
              action={!showHotelAuth ? <Button variant="primary" style={{ marginLeft: "auto", padding: "6px 14px", fontSize: 12 }} onClick={() => openHotelAuth(selectedSite)}>🔑 Hotel Auth Flow</Button> : undefined}
            />
            {siteChargers.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {siteChargers.map(charger => (
                  <div
                    key={charger.id || charger.ocpp_identity}
                    style={{
                      background: selectedCharger?.id === charger.id && showHotelAuth ? "var(--surface-elevated)" : "var(--surface-panel)",
                      border: `1px solid ${selectedCharger?.id === charger.id && showHotelAuth ? "var(--semantic-info)" : "var(--line-soft)"}`,
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
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {charger.model || charger.charger_model || "Unknown model"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={getStatusBadge(charger.status)}>
                        {charger.status || "unknown"}
                      </span>
                      {showHotelAuth && selectedCharger?.id === charger.id && <StatusPill tone="info" label="Selected" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No chargers assigned to this site.</p>
            )}
          </Panel>
        </div>
      )}

      {/* Hotel Auth Flow Modal */}
      {showHotelAuth && selectedSite && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "var(--surface-overlay)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHotelAuth(false); }}
        >
          <div style={{
            background: "var(--surface-panel)",
            borderRadius: 16,
            padding: 28,
            width: 440,
            maxWidth: "90vw",
            border: "1px solid var(--line-soft)",
            maxHeight: "90vh",
            overflow: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                🔑 Hotel Guest Auth
              </div>
              <Button variant="secondary" style={{ ...styles.buttonSecondary, padding: "4px 10px", fontSize: 16 }} onClick={() => setShowHotelAuth(false)}>
                ✕
              </Button>
            </div>

            {/* Site Info */}
            <div style={{
              background: "var(--surface-panel)",
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              border: "1px solid var(--line-soft)",
            }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Host Site</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
                {selectedSite.name || selectedSite.site_name || `Site ${selectedSite.id}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
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

            <Button
              variant="primary"
              style={{ ...styles.button, width: "100%", padding: "12px 20px", fontSize: 15 }}
              onClick={submitHotelAuth}
              disabled={authLoading || !roomNumber || !lastName}
            >
              {authLoading ? "Authenticating..." : "Authenticate Guest"}
            </Button>

            {/* Error */}
            {authError && (
              <div style={{
                background: "var(--semantic-error-soft)",
                color: "var(--semantic-error)",
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
                  background: "var(--semantic-success-soft)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <span style={{ fontWeight: 700, color: "var(--accent-primary)", fontSize: 15 }}>Guest Authenticated</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Guest</div>
                      <div style={{ fontWeight: 600 }}>{authResponse.guest?.displayName || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Expires In</div>
                      <div style={{ fontWeight: 600 }}>{authResponse.expiresInSec ? `${Math.round(authResponse.expiresInSec / 60)} min` : "—"}</div>
                    </div>
                    {authResponse.guest?.reservationId && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Reservation ID</div>
                        <div style={{ fontWeight: 600 }}>{authResponse.guest.reservationId}</div>
                      </div>
                    )}
                    {authResponse.guest?.checkInDate && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Stay</div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>
                          {authResponse.guest.checkInDate} → {authResponse.guest.checkOutDate}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Access Token</div>
                  <div style={{
                    background: "var(--surface-elevated)",
                    borderRadius: 6,
                    padding: 10,
                    fontFamily: "monospace",
                    fontSize: 11,
                    wordBreak: "break-all",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--line-soft)",
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



