import React, { useState, useEffect } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";

/* ------------------------------------------------------------------ */
/*  API endpoint catalog – Spring Boot / backend-connected routes only */
/* ------------------------------------------------------------------ */
const API_CATALOG = [
  {
    title: "EV Charging",
    icon: "\u26A1",
    description: "Charger lookup, OCPP status, host sites & sessions",
    backend: "Ports 9000 / 9004 / 9017 / 9029",
    routes: [
      { method: "POST", path: "/v1/auth/card/init", desc: "Credit-card auth (user lookup via port 9000)" },
      { method: "GET",  path: "/v1/chargers", desc: "List chargers (by siteId or status)" },
      { method: "GET",  path: "/v1/chargers/site/:site_id", desc: "Chargers for a specific site" },
      { method: "GET",  path: "/v1/chargers/:charger_id/details", desc: "Detailed charger info" },
      { method: "GET",  path: "/v1/chargers/:charger_id/status", desc: "Real-time connector status (OCPP)" },
      { method: "GET",  path: "/v1/chargers/ocpp/:cp_id/status", desc: "Full OCPP charge-point status" },
      { method: "POST", path: "/v1/sessions", desc: "Start charging session (OCPP remote-start)" },
      { method: "GET",  path: "/v1/sessions/:session_id", desc: "Session status (polls OCPP)" },
      { method: "POST", path: "/v1/sessions/:session_id/stop", desc: "Stop charging session (OCPP remote-stop)" },
      { method: "GET",    path: "/v1/host-sites", desc: "List all host sites" },
      { method: "GET",    path: "/v1/host-sites/:site_id", desc: "Get a single host site" },
      { method: "POST",   path: "/v1/host-sites", desc: "Create a new host site" },
      { method: "PUT",    path: "/v1/host-sites/:site_id", desc: "Full update a host site" },
      { method: "DELETE", path: "/v1/host-sites/:site_id", desc: "Delete a host site" },
      { method: "GET",  path: "/v1/charge-points", desc: "List OCPP charge points" },
      { method: "GET",  path: "/v1/ocpp/sessions", desc: "Aggregate live OCPP sessions" },
      { method: "POST", path: "/v1/real/user/getByEmail", desc: "Get user by email" },
      { method: "GET",  path: "/v1/real/users", desc: "List all users" },
      { method: "POST", path: "/v1/real/proxy", desc: "Generic proxy to real API" },
    ],
  },
  {
    title: "Users",
    icon: "\uD83D\uDC65",
    description: "User CRUD (full + partial update)",
    backend: "Port 9000 (users)",
    routes: [
      { method: "GET",    path: "/api/users/status", desc: "Users service health" },
      { method: "GET",    path: "/api/users", desc: "List all users" },
      { method: "GET",    path: "/api/users/:uid", desc: "Get user by ID" },
      { method: "POST",   path: "/api/users", desc: "Create a user" },
      { method: "PUT",    path: "/api/users/:uid", desc: "Full user update" },
      { method: "PATCH",  path: "/api/users/:uid", desc: "Partial user update" },
      { method: "DELETE", path: "/api/users/:uid", desc: "Delete a user" },
    ],
  },
  {
    title: "Vehicles",
    icon: "\uD83D\uDE99",
    description: "Vehicle CRUD + per-user vehicle lookup",
    backend: "Port 9001 (user_vehicles)",
    routes: [
      { method: "GET",    path: "/api/vehicles", desc: "List all vehicles" },
      { method: "GET",    path: "/api/vehicles/:vid", desc: "Get a vehicle" },
      { method: "GET",    path: "/api/users/:uid/vehicles", desc: "Vehicles for a user" },
      { method: "POST",   path: "/api/vehicles", desc: "Create a vehicle" },
      { method: "PUT",    path: "/api/vehicles/:vid", desc: "Full vehicle update" },
      { method: "PATCH",  path: "/api/vehicles/:vid", desc: "Partial vehicle update" },
      { method: "DELETE", path: "/api/vehicles/:vid", desc: "Delete a vehicle" },
    ],
  },
  {
    title: "Payments",
    icon: "\uD83D\uDCB3",
    description: "Payment method CRUD",
    backend: "Port 9002 (user_payments)",
    routes: [
      { method: "GET",    path: "/api/payments", desc: "List all payment methods" },
      { method: "GET",    path: "/api/payments/:pid", desc: "Get a payment method" },
      { method: "GET",    path: "/api/users/:uid/payments", desc: "Payment methods for user" },
      { method: "POST",   path: "/api/payments", desc: "Create payment method" },
      { method: "DELETE", path: "/api/payments/:pid", desc: "Delete payment method" },
    ],
  },
  {
    title: "Invites & Access Grants",
    icon: "\u2709\uFE0F",
    description: "Invitation tracking & charger access grant management",
    backend: "Port 9005 (evbuddy_homepage)",
    routes: [
      { method: "GET", path: "/api/invites", desc: "List all invites" },
      { method: "GET", path: "/api/invites/invited-by/:user_id", desc: "Invites sent by a user" },
      { method: "GET", path: "/api/accessgrants/charger_access/grants", desc: "All charger access grants" },
      { method: "GET", path: "/api/accessgrants/charger_access/grantsbyuser/:user_id", desc: "Grants issued by a user" },
    ],
  },
  {
    title: "Operating Hours",
    icon: "\uD83D\uDD50",
    description: "Weekly operating hours & holiday/exception overrides",
    backend: "Port 9008 (operating_hours)",
    routes: [
      { method: "GET", path: "/api/operating-hours?scope_type=site&scope_id=:id", desc: "Get weekly hours for a scope" },
      { method: "PUT", path: "/api/operating-hours", desc: "Save (upsert) weekly hours" },
      { method: "GET", path: "/api/operating-hours-exceptions?scope_type=site&scope_id=:id&from=:date&to=:date", desc: "List exceptions in date range" },
      { method: "POST", path: "/api/operating-hours-exceptions", desc: "Create an exception (holiday/override)" },
    ],
  },
  {
    title: "Businesses",
    icon: "\uD83C\uDFE2",
    description: "Business entity CRUD",
    backend: "Port 9005 (evbuddy_homepage)",
    routes: [
      { method: "GET",    path: "/api/businesses", desc: "List all businesses" },
      { method: "GET",    path: "/api/businesses/:business_id", desc: "Get a business" },
      { method: "POST",   path: "/api/businesses", desc: "Create a business" },
      { method: "PUT",    path: "/api/businesses/:business_id", desc: "Update a business" },
      { method: "DELETE", path: "/api/businesses/:business_id", desc: "Delete a business" },
    ],
  },
  {
    title: "Sites",
    icon: "\uD83D\uDCCD",
    description: "Site CRUD, membership, data, preorders & subscriptions",
    backend: "Port 9005 (evbuddy_homepage)",
    routes: [
      { method: "GET",    path: "/api/sites", desc: "List all sites" },
      { method: "GET",    path: "/api/sites/:site_id", desc: "Get a site" },
      { method: "GET",    path: "/api/businesses/:business_id/sites", desc: "Sites for a business" },
      { method: "POST",   path: "/api/businesses/:business_id/sites", desc: "Create a site under a business" },
      { method: "PUT",    path: "/api/sites/:site_id", desc: "Update a site" },
      { method: "DELETE", path: "/api/sites/:site_id", desc: "Delete a site" },
      { method: "GET",    path: "/api/sites/:site_id/members", desc: "List site members" },
      { method: "POST",   path: "/api/sites/:site_id/members/invite", desc: "Invite a member" },
      { method: "POST",   path: "/api/sites/:site_id/members/:user_id", desc: "Add a member" },
      { method: "DELETE", path: "/api/sites/:site_id/members/:user_id", desc: "Remove a member" },
      { method: "GET",    path: "/api/data", desc: "Fetch site data" },
      { method: "POST",   path: "/api/preorder", desc: "Submit a pre-order" },
      { method: "POST",   path: "/api/subscribe", desc: "Subscribe to updates" },
    ],
  },
  {
    title: "Employees",
    icon: "\uD83D\uDC77",
    description: "Employee CRUD, site assignments, permissions & roles",
    backend: "Port 9005 (evbuddy_homepage)",
    routes: [
      { method: "GET",    path: "/api/businesses/:business_id/employees", desc: "Employees for a business" },
      { method: "GET",    path: "/api/employees/:employee_id", desc: "Get an employee" },
      { method: "POST",   path: "/api/businesses/:business_id/employees", desc: "Create an employee" },
      { method: "PUT",    path: "/api/employees/:employee_id", desc: "Update an employee" },
      { method: "DELETE", path: "/api/employees/:employee_id", desc: "Delete an employee" },
      { method: "GET",    path: "/api/employees/:employee_id/sites", desc: "Sites assigned to employee" },
      { method: "POST",   path: "/api/employees/:employee_id/sites", desc: "Assign employee to site" },
      { method: "PUT",    path: "/api/employees/:employee_id/sites/:site_id", desc: "Update site assignment" },
      { method: "DELETE", path: "/api/employees/:employee_id/sites/:site_id", desc: "Remove site assignment" },
      { method: "GET",    path: "/api/sites/:site_id/employees", desc: "Employees at a site" },
      { method: "POST",   path: "/api/sites/:site_id/employees", desc: "Add employee to site" },
      { method: "GET",    path: "/api/employees/:employee_id/permissions", desc: "Employee permissions" },
      { method: "POST",   path: "/api/employees/:employee_id/permissions", desc: "Add permission" },
      { method: "DELETE", path: "/api/employees/:employee_id/permissions/:permission_id", desc: "Remove permission" },
      { method: "GET",    path: "/api/roles", desc: "List all roles" },
      { method: "GET",    path: "/api/users/:user_id/roles", desc: "Roles for a user" },
      { method: "POST",   path: "/api/users/:user_id/roles", desc: "Assign role to user" },
    ],
  },
  {
    title: "Drivers & Access",
    icon: "\uD83D\uDE97",
    description: "Driver access requests, invitations, approval & audit log",
    backend: "Port 9005 (evbuddy_homepage)",
    routes: [
      { method: "GET",  path: "/api/sites/:site_id/drivers", desc: "Drivers for a site" },
      { method: "POST", path: "/api/sites/:site_id/drivers/invite", desc: "Invite a driver" },
      { method: "POST", path: "/api/sites/:site_id/access-request", desc: "Request access to a site" },
      { method: "POST", path: "/api/sites/:site_id/drivers/:driver_id/approve", desc: "Approve a driver" },
      { method: "POST", path: "/api/sites/:site_id/drivers/:driver_id/block", desc: "Block a driver" },
      { method: "POST", path: "/api/sites/:site_id/drivers/:driver_id/revoke", desc: "Revoke driver access" },
      { method: "POST", path: "/api/sites/:site_id/drivers/:driver_id/unblock", desc: "Unblock a driver" },
      { method: "GET",  path: "/api/me/site-access", desc: "My site access" },
      { method: "GET",  path: "/api/me/site-access/all", desc: "All my site access" },
      { method: "GET",  path: "/api/invitations/:token", desc: "Get invitation by token" },
      { method: "POST", path: "/api/invitations/:token/accept", desc: "Accept an invitation" },
      { method: "GET",  path: "/api/audit-log", desc: "View audit log" },
      { method: "GET",  path: "/api/auth/can-manage-site/:site_id", desc: "Check site management permission" },
      { method: "GET",  path: "/api/auth/can-use-site/:site_id", desc: "Check site usage permission" },
    ],
  },
  {
    title: "CPMS / Asset Management",
    icon: "\uD83D\uDD27",
    description: "Remote charger control, diagnostics, firmware & tariffs",
    backend: "OCPP bridge",
    routes: [
      { method: "POST", path: "/api/assets/:asset_id/remote-start", desc: "Remote start transaction" },
      { method: "POST", path: "/api/assets/:asset_id/remote-stop", desc: "Remote stop transaction" },
      { method: "POST", path: "/api/assets/:asset_id/maintenance-mode", desc: "Toggle maintenance mode" },
      { method: "GET",  path: "/api/assets/:asset_id/diagnostics", desc: "Get charger diagnostics" },
      { method: "POST", path: "/api/assets/:asset_id/reset", desc: "Reset charger" },
      { method: "POST", path: "/api/assets/:asset_id/firmware-update", desc: "Trigger firmware update" },
      { method: "POST", path: "/api/assets/:asset_id/change-configuration", desc: "Change charger config" },
      { method: "POST", path: "/api/sessions/:session_id/refund", desc: "Refund a session" },
      { method: "PUT",  path: "/api/assets/:asset_id/tariff", desc: "Set asset tariff" },
    ],
  },
  {
    title: "Security",
    icon: "\uD83D\uDD12",
    description: "RBAC roles, audit log & operator/asset setup",
    backend: "Local (Flask)",
    routes: [
      { method: "GET",  path: "/api/security/roles", desc: "List security roles" },
      { method: "GET",  path: "/api/security/audit-log", desc: "Security audit log" },
      { method: "POST", path: "/api/security/setup/operator", desc: "Setup operator" },
      { method: "POST", path: "/api/security/setup/asset", desc: "Setup asset" },
    ],
  },
];

const METHOD_COLORS = {
  GET:    "#00d4aa",
  POST:   "#00a8e8",
  PUT:    "#ffa500",
  PATCH:  "#d4a0ff",
  DELETE: "#ff4757",
};

const totalRoutes = API_CATALOG.reduce((n, g) => n + g.routes.length, 0);

/* ------------------------------------------------------------------ */
/*  Collapsible API section                                            */
/* ------------------------------------------------------------------ */
function APISection({ group, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      background: "#111",
      borderRadius: 10,
      border: "1px solid #2a2a2a",
      marginBottom: 10,
      overflow: "hidden",
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          border: "none",
          background: "transparent",
          color: "#e0e0e0",
          cursor: "pointer",
          textAlign: "left",
          fontSize: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{group.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{group.title}</div>
            <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>{group.description}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            background: "#00d4aa18",
            color: "#00d4aa",
            padding: "3px 10px",
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 600,
          }}>
            {group.routes.length} endpoint{group.routes.length !== 1 ? "s" : ""}
          </span>
          <span style={{
            color: "#555",
            fontSize: 11,
            fontFamily: "monospace",
          }}>
            {group.backend}
          </span>
          <span style={{ color: "#555", fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
            &#x25BC;
          </span>
        </div>
      </button>

      {/* Route table */}
      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          <table style={{ ...styles.table, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 70 }}>Method</th>
                <th style={styles.th}>Endpoint</th>
                <th style={styles.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {group.routes.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ ...styles.td, padding: "8px" }}>
                    <span style={{
                      color: METHOD_COLORS[r.method] || "#888",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}>
                      {r.method}
                    </span>
                  </td>
                  <td style={{
                    ...styles.td,
                    padding: "8px",
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    fontSize: 12,
                    color: "#ccc",
                    wordBreak: "break-all",
                  }}>
                    {r.path}
                  </td>
                  <td style={{ ...styles.td, padding: "8px", color: "#999", fontSize: 12 }}>
                    {r.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ServicesTab                                                    */
/* ------------------------------------------------------------------ */
export default function ServicesTab() {
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("status"); // "status" | "catalog"
  const [search, setSearch] = useState("");

  const fetchServices = async () => {
    setLoading(true);
    const res = await apiCall("GET", "/api/services");
    setServices(res);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  /* filter catalog when searching */
  const filteredCatalog = search.trim()
    ? API_CATALOG.map(g => {
        const q = search.toLowerCase();
        const matchedRoutes = g.routes.filter(
          r => r.path.toLowerCase().includes(q) ||
               r.desc.toLowerCase().includes(q) ||
               r.method.toLowerCase().includes(q)
        );
        if (matchedRoutes.length > 0) return { ...g, routes: matchedRoutes };
        if (g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)) return g;
        return null;
      }).filter(Boolean)
    : API_CATALOG;

  const filteredRouteCount = filteredCatalog.reduce((n, g) => n + g.routes.length, 0);

  return (
    <div>
      {/* Toggle bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <button
          style={{
            ...styles.buttonSecondary,
            ...(view === "status" ? { background: "linear-gradient(135deg, #00d4aa, #00a8e8)", color: "#000", borderColor: "transparent" } : {}),
          }}
          onClick={() => setView("status")}
        >
          Microservice Status
        </button>
        <button
          style={{
            ...styles.buttonSecondary,
            ...(view === "catalog" ? { background: "linear-gradient(135deg, #00d4aa, #00a8e8)", color: "#000", borderColor: "transparent" } : {}),
          }}
          onClick={() => setView("catalog")}
        >
          API Catalog ({totalRoutes} endpoints)
        </button>
      </div>

      {/* ============================================================ */}
      {/*  VIEW: Microservice Status                                    */}
      {/* ============================================================ */}
      {view === "status" && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            Microservices Status
            <button style={styles.buttonSecondary} onClick={fetchServices}>Refresh</button>
          </div>

          {loading && <p style={{ color: "#888" }}>Loading services...</p>}

          {services?.data?.services && (
            <>
              {/* Summary cards */}
              <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                <div style={{ ...styles.card, background: "#00d4aa11", flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "#00d4aa" }}>
                    {services.data.summary.available}
                  </div>
                  <div style={{ color: "#888", fontSize: 13 }}>Available</div>
                </div>
                <div style={{ ...styles.card, background: "#ff475711", flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "#ff4757" }}>
                    {services.data.summary.unavailable}
                  </div>
                  <div style={{ color: "#888", fontSize: 13 }}>Unavailable</div>
                </div>
                <div style={{ ...styles.card, background: "#00a8e811", flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "#00a8e8" }}>
                    {services.data.summary.total}
                  </div>
                  <div style={{ color: "#888", fontSize: 13 }}>Total Services</div>
                </div>
              </div>

              {/* Host info */}
              {services.data.microservice_host && (
                <div style={{
                  background: "#0d1117",
                  borderRadius: 6,
                  padding: "8px 14px",
                  marginBottom: 16,
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#888",
                  border: "1px solid #21262d",
                }}>
                  Host: <span style={{ color: "#00d4aa" }}>{services.data.microservice_host}</span>
                </div>
              )}

              {/* Services table */}
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Service</th>
                    <th style={styles.th}>Port</th>
                    <th style={styles.th}>Base URL</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(services.data.services)
                    .sort(([, a], [, b]) => a.port - b.port)
                    .map(([name, info]) => (
                      <tr key={name}>
                        <td style={{ ...styles.td, fontWeight: 500 }}>{name}</td>
                        <td style={{ ...styles.td, fontFamily: "monospace", color: "#00a8e8" }}>{info.port}</td>
                        <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12, color: "#888" }}>
                          {info.base_url}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "3px 10px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: info.available ? "#00d4aa18" : "#ff475718",
                            color: info.available ? "#00d4aa" : "#ff4757",
                          }}>
                            <span style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: info.available ? "#00d4aa" : "#ff4757",
                              display: "inline-block",
                            }} />
                            {info.available ? "Online" : "Offline"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}

          {!loading && !services?.data?.services && (
            <p style={{ color: "#ff4757" }}>
              Failed to load services.{" "}
              <button style={{ ...styles.buttonSecondary, fontSize: 12 }} onClick={fetchServices}>Retry</button>
            </p>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  VIEW: API Catalog                                            */}
      {/* ============================================================ */}
      {view === "catalog" && (
        <div>
          {/* Search bar */}
          <div style={{ marginBottom: 16 }}>
            <input
              style={{ ...styles.input, maxWidth: 420 }}
              placeholder="Search endpoints... (path, method, or description)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                Showing {filteredRouteCount} of {totalRoutes} endpoints
              </div>
            )}
          </div>

          {/* Method legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(METHOD_COLORS).map(([m, c]) => (
              <span key={m} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                <span style={{ color: c, fontWeight: 700, fontFamily: "monospace" }}>{m}</span>
              </span>
            ))}
            <span style={{ color: "#666", fontSize: 12, marginLeft: "auto" }}>
              {API_CATALOG.length} categories &middot; {totalRoutes} endpoints
            </span>
          </div>

          {/* Sections */}
          {filteredCatalog.map((group) => (
            <APISection key={group.title} group={group} defaultOpen={!!search} />
          ))}

          {filteredCatalog.length === 0 && (
            <div style={{ color: "#666", textAlign: "center", padding: 40 }}>
              No endpoints match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
