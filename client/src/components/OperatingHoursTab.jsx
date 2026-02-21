import React, { useState, useEffect } from "react";
import styles from "../styles";
import { apiCall, EVBUDDY_API, API_BASE } from "../utils/api";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_DAYS = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i + 1,
  is_closed: false,
  open_time: "09:00",
  close_time: "21:00",
}));

export default function OperatingHoursTab() {
  // --- Sites & chargers lists ---
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [chargers, setChargers] = useState([]);
  const [chargersLoading, setChargersLoading] = useState(false);
  const [chargerSiteId, setChargerSiteId] = useState("");

  // --- Hours state ---
  const [scopeType, setScopeType] = useState("site");
  const [scopeId, setScopeId] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursMsg, setHoursMsg] = useState(null);

  // --- Exceptions state ---
  const [exceptions, setExceptions] = useState([]);
  const [excLoading, setExcLoading] = useState(false);
  const [excMsg, setExcMsg] = useState(null);
  const [excFrom, setExcFrom] = useState("2025-01-01");
  const [excTo, setExcTo] = useState("2026-12-31");

  // New exception form
  const [newExcDate, setNewExcDate] = useState("");
  const [newExcClosed, setNewExcClosed] = useState(true);
  const [newExcOpen, setNewExcOpen] = useState("09:00");
  const [newExcClose, setNewExcClose] = useState("17:00");
  const [newExcNote, setNewExcNote] = useState("");
  const [addExcLoading, setAddExcLoading] = useState(false);

  // ---- Load host sites on mount ----
  const fetchSites = async () => {
    setSitesLoading(true);
    try {
      let res = await fetch(`${EVBUDDY_API}/v1/host-sites`);
      if (!res.ok) res = await fetch(`${API_BASE}/api/services/host_sites`);
      if (res.ok) {
        const data = await res.json();
        setSites(Array.isArray(data) ? data : (data.data || data.sites || []));
      }
    } catch (_) { /* ignore */ }
    setSitesLoading(false);
  };

  // ---- Load chargers for a site ----
  const fetchChargers = async (siteId) => {
    setChargers([]);
    setScopeId("");
    if (!siteId) return;
    setChargersLoading(true);
    try {
      const res = await fetch(`${EVBUDDY_API}/v1/chargers/site/${siteId}`);
      if (res.ok) {
        const data = await res.json();
        setChargers(Array.isArray(data) ? data : (data.data || data.chargers || []));
      }
    } catch (_) { setChargers([]); }
    setChargersLoading(false);
  };

  useEffect(() => { fetchSites(); }, []);

  // When the charger-site filter changes, reload chargers
  useEffect(() => {
    if (scopeType === "charger" && chargerSiteId) {
      fetchChargers(chargerSiteId);
    } else {
      setChargers([]);
    }
  }, [chargerSiteId, scopeType]);

  // ---- Fetch hours ----
  const fetchHours = async () => {
    if (!scopeId) { setHoursMsg({ type: "error", text: "Enter a Scope ID" }); return; }
    setHoursLoading(true);
    setHoursMsg(null);
    const res = await apiCall("GET", `/api/operating-hours?scope_type=${scopeType}&scope_id=${scopeId}`);
    setHoursLoading(false);
    if (res.ok) {
      const loadedDays = res.data.days || [];
      // If no hours exist yet, pre-fill with defaults so user can save right away
      setDays(loadedDays.length > 0 ? loadedDays : DEFAULT_DAYS);
      setTimezone(res.data.timezone || "America/New_York");
      setHoursMsg({
        type: "success",
        text: loadedDays.length > 0
          ? `Loaded ${loadedDays.length} days (${res.duration}ms)`
          : `No hours configured yet — showing defaults (${res.duration}ms)`,
      });
    } else {
      setHoursMsg({ type: "error", text: res.data?.error || `Failed (${res.status})` });
    }
  };

  // ---- Save hours ----
  const saveHours = async () => {
    if (!scopeId) { setHoursMsg({ type: "error", text: "Select a scope first" }); return; }
    setHoursLoading(true);
    setHoursMsg(null);
    // Strip open/close times from closed days (API may reject them)
    const cleanDays = days.map(d => d.is_closed
      ? { day_of_week: d.day_of_week, is_closed: true }
      : { day_of_week: d.day_of_week, is_closed: false, open_time: d.open_time || "09:00", close_time: d.close_time || "21:00" }
    );
    const body = { scope_type: scopeType, scope_id: Number(scopeId), timezone, days: cleanDays };
    const res = await apiCall("PUT", "/api/operating-hours", body);
    setHoursLoading(false);
    if (res.ok) {
      setHoursMsg({ type: "success", text: `Saved — ${res.data.updated_days} days updated (${res.duration}ms)` });
    } else {
      setHoursMsg({ type: "error", text: res.data?.error || `Failed (${res.status})` });
    }
  };

  // ---- Day helpers ----
  const updateDay = (idx, field, value) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  // ---- Fetch exceptions ----
  const fetchExceptions = async () => {
    if (!scopeId) { setExcMsg({ type: "error", text: "Enter a Scope ID" }); return; }
    setExcLoading(true);
    setExcMsg(null);
    const url = `/api/operating-hours-exceptions?scope_type=${scopeType}&scope_id=${scopeId}&from=${excFrom}&to=${excTo}`;
    const res = await apiCall("GET", url);
    setExcLoading(false);
    if (res.ok && res.data?.items) {
      setExceptions(res.data.items);
      setExcMsg({ type: "success", text: `${res.data.items.length} exception(s) (${res.duration}ms)` });
    } else {
      setExcMsg({ type: "error", text: res.data?.error || `Failed (${res.status})` });
    }
  };

  // ---- Add exception ----
  const addException = async () => {
    if (!scopeId || !newExcDate) { setExcMsg({ type: "error", text: "Scope ID and Date are required" }); return; }
    setAddExcLoading(true);
    setExcMsg(null);
    const body = {
      scope_type: scopeType,
      scope_id: Number(scopeId),
      date_value: newExcDate,
      is_closed: newExcClosed,
      note: newExcNote || undefined,
    };
    if (!newExcClosed) {
      body.open_time = newExcOpen;
      body.close_time = newExcClose;
    }
    const res = await apiCall("POST", "/api/operating-hours-exceptions", body);
    setAddExcLoading(false);
    if (res.ok) {
      setExcMsg({ type: "success", text: `Exception created (id: ${res.data.id}) (${res.duration}ms)` });
      setNewExcDate("");
      setNewExcNote("");
      // Refresh list
      fetchExceptions();
    } else {
      setExcMsg({ type: "error", text: res.data?.error || `Failed (${res.status})` });
    }
  };

  // ============ Render ============
  return (
    <div>
      {/* ---- Scope selector ---- */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>🕐 Operating Hours</div>
        <div style={styles.row}>
          <div style={{ flex: "0 0 140px" }}>
            <label style={styles.label}>Scope Type</label>
            <select style={styles.select} value={scopeType} onChange={e => setScopeType(e.target.value)}>
              <option value="site">Site</option>
              <option value="business">Business</option>
              <option value="charger">Charger</option>
            </select>
          </div>
          {/* Site dropdown (shown for scope=site, or as filter for scope=charger) */}
          {(scopeType === "site" || scopeType === "charger") && (
            <div style={{ flex: "0 0 280px" }}>
              <label style={styles.label}>
                {scopeType === "charger" ? "Filter by Site" : "Host Site"}
              </label>
              <select
                style={styles.select}
                value={scopeType === "site" ? scopeId : chargerSiteId}
                onChange={e => {
                  if (scopeType === "site") {
                    setScopeId(e.target.value);
                  } else {
                    setChargerSiteId(e.target.value);
                  }
                }}
              >
                <option value="">
                  {sitesLoading ? "Loading sites…" : "— Select a site —"}
                </option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.site_name || `Site ${s.id}`} (ID {s.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Charger dropdown (only when scope=charger) */}
          {scopeType === "charger" && (
            <div style={{ flex: "0 0 280px" }}>
              <label style={styles.label}>Charger</label>
              <select
                style={styles.select}
                value={scopeId}
                onChange={e => setScopeId(e.target.value)}
              >
                <option value="">
                  {!chargerSiteId ? "Pick a site first" : chargersLoading ? "Loading chargers…" : chargers.length === 0 ? "No chargers found" : "— Select a charger —"}
                </option>
                {chargers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.ocpp_identity || `Charger ${c.id}`} (ID {c.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual ID input for business scope */}
          {scopeType === "business" && (
            <div style={{ flex: "0 0 140px" }}>
              <label style={styles.label}>Business ID</label>
              <input style={styles.input} type="number" placeholder="e.g. 5"
                value={scopeId} onChange={e => setScopeId(e.target.value)} />
            </div>
          )}
          <div style={{ flex: "0 0 200px" }}>
            <label style={styles.label}>Timezone</label>
            <input style={styles.input} value={timezone} onChange={e => setTimezone(e.target.value)} />
          </div>
          <button style={styles.button} onClick={fetchHours} disabled={hoursLoading}>
            {hoursLoading ? "Loading…" : "Load Hours"}
          </button>
        </div>
        {hoursMsg && (
          <div style={{
            ...styles.badge,
            ...(hoursMsg.type === "success" ? styles.badgeSuccess : styles.badgeError),
            marginBottom: 12,
          }}>{hoursMsg.text}</div>
        )}
      </div>

      {/* ---- Weekly schedule ---- */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>📅 Weekly Schedule</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Day</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Open</th>
              <th style={styles.th}>Close</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, idx) => (
              <tr key={day.day_of_week}>
                <td style={styles.td}>
                  <span style={{ fontWeight: 500 }}>{DAY_NAMES[day.day_of_week]}</span>
                </td>
                <td style={styles.td}>
                  <button
                    style={{
                      ...styles.buttonSecondary,
                      background: day.is_closed ? "#ff475733" : "#00d4aa33",
                      color: day.is_closed ? "#ff4757" : "#00d4aa",
                      border: "none",
                      minWidth: 80,
                    }}
                    onClick={() => updateDay(idx, "is_closed", !day.is_closed)}
                  >
                    {day.is_closed ? "Closed" : "Open"}
                  </button>
                </td>
                <td style={styles.td}>
                  {!day.is_closed && (
                    <input
                      type="time"
                      style={{ ...styles.input, width: 130, marginBottom: 0 }}
                      value={day.open_time || "09:00"}
                      onChange={e => updateDay(idx, "open_time", e.target.value)}
                    />
                  )}
                </td>
                <td style={styles.td}>
                  {!day.is_closed && (
                    <input
                      type="time"
                      style={{ ...styles.input, width: 130, marginBottom: 0 }}
                      value={day.close_time || "21:00"}
                      onChange={e => updateDay(idx, "close_time", e.target.value)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button style={styles.button} onClick={saveHours} disabled={hoursLoading}>
            {hoursLoading ? "Saving…" : "💾 Save Hours"}
          </button>
        </div>
      </div>

      {/* ---- Exceptions ---- */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>📌 Exceptions (Holidays / Overrides)</div>

        {/* Date range + fetch */}
        <div style={styles.row}>
          <div style={{ flex: "0 0 160px" }}>
            <label style={styles.label}>From</label>
            <input type="date" style={styles.input} value={excFrom} onChange={e => setExcFrom(e.target.value)} />
          </div>
          <div style={{ flex: "0 0 160px" }}>
            <label style={styles.label}>To</label>
            <input type="date" style={styles.input} value={excTo} onChange={e => setExcTo(e.target.value)} />
          </div>
          <button style={styles.button} onClick={fetchExceptions} disabled={excLoading}>
            {excLoading ? "Loading…" : "Load Exceptions"}
          </button>
        </div>

        {excMsg && (
          <div style={{
            ...styles.badge,
            ...(excMsg.type === "success" ? styles.badgeSuccess : styles.badgeError),
            marginBottom: 12,
          }}>{excMsg.text}</div>
        )}

        {/* List */}
        {exceptions.length > 0 && (
          <table style={{ ...styles.table, marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map(ex => (
                <tr key={ex.id}>
                  <td style={styles.td}>{ex.id}</td>
                  <td style={styles.td}>{ex.date_value}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(ex.is_closed ? styles.badgeError : styles.badgeSuccess),
                    }}>
                      {ex.is_closed ? "Closed" : `${ex.open_time} – ${ex.close_time}`}
                    </span>
                  </td>
                  <td style={styles.td}>{ex.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add exception form */}
        <div style={{ borderTop: "1px solid #333", paddingTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#ccc" }}>Add Exception</div>
          <div style={styles.row}>
            <div style={{ flex: "0 0 160px" }}>
              <label style={styles.label}>Date</label>
              <input type="date" style={styles.input} value={newExcDate} onChange={e => setNewExcDate(e.target.value)} />
            </div>
            <div style={{ flex: "0 0 100px" }}>
              <label style={styles.label}>Closed?</label>
              <select style={styles.select} value={newExcClosed ? "yes" : "no"}
                onChange={e => setNewExcClosed(e.target.value === "yes")}>
                <option value="yes">Closed</option>
                <option value="no">Custom Hours</option>
              </select>
            </div>
            {!newExcClosed && (
              <>
                <div style={{ flex: "0 0 130px" }}>
                  <label style={styles.label}>Open</label>
                  <input type="time" style={styles.input} value={newExcOpen} onChange={e => setNewExcOpen(e.target.value)} />
                </div>
                <div style={{ flex: "0 0 130px" }}>
                  <label style={styles.label}>Close</label>
                  <input type="time" style={styles.input} value={newExcClose} onChange={e => setNewExcClose(e.target.value)} />
                </div>
              </>
            )}
            <div style={{ flex: "1 1 200px" }}>
              <label style={styles.label}>Note</label>
              <input style={styles.input} placeholder="e.g. Independence Day" value={newExcNote}
                onChange={e => setNewExcNote(e.target.value)} />
            </div>
            <button style={styles.button} onClick={addException} disabled={addExcLoading}>
              {addExcLoading ? "Adding…" : "➕ Add Exception"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
