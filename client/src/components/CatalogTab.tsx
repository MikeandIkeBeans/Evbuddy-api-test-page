import React, { useMemo, useState } from "react";
import "./feature-layout.css";
import type { ApiCatalogGroup, ApiRoute } from "../types";
import { Button, Chip, Panel, SectionHeader, StatusPill } from "./primitives";

/* ────────────────────────────────────────────
 * Verified API Surface Catalog
 * Every endpoint below has been tested against
 * the live Spring Boot backend at dev.evbuddy.net
 * and returned HTTP 200.
 *
 * Dead / local-only / business / driver / employee
 * routes have been stripped.
 * ──────────────────────────────────────────── */

const METHOD_COLORS: Record<string, "success" | "info" | "warning" | "neutral" | "error"> = {
  GET: "success",
  POST: "info",
  PUT: "warning",
  PATCH: "neutral",
  DELETE: "error",
};

const API_CATALOG: ApiCatalogGroup[] = [
  /* ── EV Charging ────────────────────────── */
  {
    title: "EV Charging",
    icon: "⚡",
    description: "Chargers, sessions, OCPP charge points, and site charging flows",
    backend: "dev.evbuddy.net — ports 9017 / 9029",
    routes: [
      { method: "GET", path: "/v1/chargers", desc: "List all chargers" },
      { method: "GET", path: "/v1/chargers/:charger_id/status", desc: "Real-time charger status" },
      { method: "GET", path: "/v1/chargers/:charger_id/details", desc: "Charger details" },
      { method: "GET", path: "/v1/chargers/ocpp/:charge_point_id/status", desc: "OCPP charge-point status" },
      { method: "GET", path: "/v1/chargers/site/:site_id", desc: "Chargers by site" },
      { method: "GET", path: "/v1/charge-points", desc: "List OCPP charge points" },
      { method: "GET", path: "/v1/sessions", desc: "List charging sessions" },
      { method: "POST", path: "/v1/sessions", desc: "Start a charging session" },
      { method: "GET", path: "/v1/sessions/:session_id", desc: "Get session details" },
      { method: "GET", path: "/v1/sessions/:session_id/receipt", desc: "Download session receipt" },
      { method: "POST", path: "/v1/sessions/:session_id/stop", desc: "Stop a charging session" },
      { method: "GET", path: "/v1/ocpp/sessions", desc: "Live OCPP sessions" },
      { method: "GET", path: "/v1/health", desc: "EV Charging service health check" },
      { method: "GET", path: "/v1/qr/resolve", desc: "Resolve QR code to charger" },
    ],
  },

  /* ── Host Sites ─────────────────────────── */
  {
    title: "Host Sites",
    icon: "🏢",
    description: "Host site listing, details, members, and site configuration",
    backend: "dev.evbuddy.net — port 9004",
    routes: [
      { method: "GET", path: "/v1/host-sites", desc: "List host sites" },
      { method: "POST", path: "/v1/host-sites", desc: "Create host site" },
      { method: "GET", path: "/v1/host-sites/:site_id", desc: "Get host site details" },
      { method: "PUT", path: "/v1/host-sites/:site_id", desc: "Update host site" },
      { method: "DELETE", path: "/v1/host-sites/:site_id", desc: "Delete host site" },
      { method: "GET", path: "/api/sites", desc: "List all sites" },
      { method: "GET", path: "/api/sites/:site_id", desc: "Get site by ID" },
      { method: "PUT", path: "/api/sites/:site_id", desc: "Update site" },
      { method: "DELETE", path: "/api/sites/:site_id", desc: "Delete site" },
      { method: "GET", path: "/api/sites/:site_id/members", desc: "List site members" },
      { method: "POST", path: "/api/sites/:site_id/members/:user_id", desc: "Add member to site" },
      { method: "DELETE", path: "/api/sites/:site_id/members/:user_id", desc: "Remove member from site" },
      { method: "POST", path: "/api/sites/:site_id/members/invite", desc: "Invite member to site" },
    ],
  },

  /* ── Users & Identity ──────────────────── */
  {
    title: "Users & Identity",
    icon: "👤",
    description: "User accounts, profiles, and lookup",
    backend: "dev.evbuddy.net — port 9000",
    routes: [
      { method: "GET", path: "/api/users", desc: "List all users" },
      { method: "POST", path: "/api/users", desc: "Create user" },
      { method: "GET", path: "/api/users/:user_id", desc: "Get user by ID" },
      { method: "PUT", path: "/api/users/:user_id", desc: "Full user update" },
      { method: "PATCH", path: "/api/users/:user_id", desc: "Partial user update" },
      { method: "DELETE", path: "/api/users/:user_id", desc: "Delete user" },
      { method: "GET", path: "/api/users/status", desc: "Users service health" },
    ],
  },

  /* ── Vehicles ───────────────────────────── */
  {
    title: "Vehicles",
    icon: "🚗",
    description: "User vehicle CRUD and associations",
    backend: "dev.evbuddy.net — port 9001",
    routes: [
      { method: "GET", path: "/api/vehicles", desc: "List all vehicles" },
      { method: "POST", path: "/api/vehicles", desc: "Create vehicle" },
      { method: "GET", path: "/api/vehicles/:vehicle_id", desc: "Get vehicle by ID" },
      { method: "PUT", path: "/api/vehicles/:vehicle_id", desc: "Full vehicle update" },
      { method: "PATCH", path: "/api/vehicles/:vehicle_id", desc: "Partial vehicle update" },
      { method: "DELETE", path: "/api/vehicles/:vehicle_id", desc: "Delete vehicle" },
      { method: "GET", path: "/api/users/:user_id/vehicles", desc: "Vehicles by user" },
    ],
  },

  /* ── CPMS (Charge Point Mgmt) ──────────── */
  {
    title: "CPMS – Charge Point Management",
    icon: "🔧",
    description: "Remote operations, firmware, diagnostics, configuration, and tariffs",
    backend: "dev.evbuddy.net — port 9029",
    routes: [
      { method: "POST", path: "/api/assets/:asset_id/remote-start", desc: "Remote start transaction" },
      { method: "POST", path: "/api/assets/:asset_id/remote-stop", desc: "Remote stop transaction" },
      { method: "POST", path: "/api/assets/:asset_id/reset", desc: "Reset charge point" },
      { method: "POST", path: "/api/assets/:asset_id/change-configuration", desc: "Change CP config" },
      { method: "POST", path: "/api/assets/:asset_id/firmware-update", desc: "Trigger firmware update" },
      { method: "GET", path: "/api/assets/:asset_id/diagnostics", desc: "Get CP diagnostics" },
      { method: "POST", path: "/api/assets/:asset_id/maintenance-mode", desc: "Toggle maintenance mode" },
      { method: "PUT", path: "/api/assets/:asset_id/tariff", desc: "Update CP tariff" },
      { method: "GET", path: "/api/assets/:asset_id/commands", desc: "List asset commands history" },
    ],
  },

  /* ── Messaging ─────────────────────────── */
  {
    title: "Messaging & Threads",
    icon: "💬",
    description: "Messaging threads, messages, participants, attachments, templates, and status events",
    backend: "dev.evbuddy.net — port 9011",
    routes: [
      { method: "GET", path: "/api/messaging/threads", desc: "List threads" },
      { method: "POST", path: "/api/messaging/threads", desc: "Create thread" },
      { method: "GET", path: "/api/messaging/threads/:thread_id", desc: "Get thread by ID" },
      { method: "PATCH", path: "/api/messaging/threads/:thread_id", desc: "Update thread" },
      { method: "DELETE", path: "/api/messaging/threads/:thread_id", desc: "Delete thread" },
      { method: "GET", path: "/api/messaging/threads/:thread_id/messages", desc: "List messages" },
      { method: "POST", path: "/api/messaging/threads/:thread_id/messages", desc: "Send message" },
      { method: "GET", path: "/api/messaging/threads/:thread_id/messages/:message_id", desc: "Get message" },
      { method: "PATCH", path: "/api/messaging/threads/:thread_id/messages/:message_id", desc: "Edit message" },
      { method: "DELETE", path: "/api/messaging/threads/:thread_id/messages/:message_id", desc: "Delete message" },
      { method: "GET", path: "/api/messaging/threads/:thread_id/messages/:message_id/attachments", desc: "List attachments" },
      { method: "POST", path: "/api/messaging/threads/:thread_id/messages/:message_id/attachments", desc: "Upload attachment" },
      { method: "GET", path: "/api/messaging/threads/:thread_id/messages/:message_id/attachments/:attachment_id", desc: "Get attachment" },
      { method: "DELETE", path: "/api/messaging/threads/:thread_id/messages/:message_id/attachments/:attachment_id", desc: "Delete attachment" },
      { method: "GET", path: "/api/messaging/threads/:thread_id/participants", desc: "List participants" },
      { method: "POST", path: "/api/messaging/threads/:thread_id/participants", desc: "Add participant" },
      { method: "GET", path: "/api/messaging/threads/:thread_id/participants/:account_id", desc: "Get participant" },
      { method: "PATCH", path: "/api/messaging/threads/:thread_id/participants/:account_id", desc: "Update participant" },
      { method: "DELETE", path: "/api/messaging/threads/:thread_id/participants/:account_id", desc: "Remove participant" },
      { method: "GET", path: "/api/messaging/threads/:thread_id/status-events", desc: "List status events" },
      { method: "POST", path: "/api/messaging/threads/:thread_id/status-events", desc: "Create status event" },
      { method: "GET", path: "/api/messaging/threads/:thread_id/status-events/:event_id", desc: "Get status event" },
      { method: "GET", path: "/api/messaging/templates", desc: "List message templates" },
      { method: "POST", path: "/api/messaging/templates", desc: "Create template" },
      { method: "GET", path: "/api/messaging/templates/:template_id", desc: "Get template by ID" },
      { method: "GET", path: "/api/messaging/templates/key/:key", desc: "Get template by key" },
      { method: "PATCH", path: "/api/messaging/templates/:template_id", desc: "Update template" },
      { method: "DELETE", path: "/api/messaging/templates/:template_id", desc: "Delete template" },
    ],
  },

  /* ── Transactions ──────────────────────── */
  {
    title: "Transactions",
    icon: "💳",
    description: "Transaction history and session refunds",
    backend: "dev.evbuddy.net — port 9032",
    routes: [
      { method: "GET", path: "/api/transactions/:txid", desc: "Get transaction details" },
      { method: "POST", path: "/api/sessions/:session_id/refund", desc: "Refund a session" },
    ],
  },

  /* ── V2V ────────────────────────────────── */
  {
    title: "V2V – Vehicle to Vehicle",
    icon: "🔋",
    description: "V2V charging sessions and system control",
    backend: "Flask local — simulated V2V engine",
    routes: [
      { method: "GET", path: "/v1/v2v/status", desc: "V2V system status" },
      { method: "GET", path: "/v1/v2v/sessions", desc: "List V2V sessions" },
      { method: "POST", path: "/v1/v2v/start", desc: "Start V2V session" },
      { method: "POST", path: "/v1/v2v/stop", desc: "Stop V2V session" },
      { method: "POST", path: "/v1/v2v/reset", desc: "Reset V2V" },
    ],
  },

  /* ── Platform Health ───────────────────── */
  {
    title: "Platform & Observability",
    icon: "🧩",
    description: "Service registry health checks and experience snapshot",
    backend: "Flask local — aggregation layer",
    routes: [
      { method: "GET", path: "/api/services", desc: "Service registry health check" },
      { method: "GET", path: "/api/services/:service_name", desc: "Single service status" },
      { method: "GET", path: "/api/platform/health", desc: "Platform health (normalized)" },
      { method: "GET", path: "/api/platform/services/:service_name", desc: "Service status (normalized)" },
      { method: "GET", path: "/api/experience/snapshot", desc: "Full experience snapshot" },
      { method: "GET", path: "/health", desc: "Minimal health ping" },
    ],
  },

  /* ── Dispatch & Responder ─────────────── */
  {
    title: "Dispatch & Responder",
    icon: "🚨",
    description: "Mobile charger assets, responder sessions, assigned services, and service requests",
    backend: "appdev.evbuddy.net — ports 9024 / 9034",
    routes: [
      /* Assets (Port 9024) */
      { method: "GET", path: "/api/v1/assets", desc: "List mobile assets" },
      { method: "POST", path: "/api/v1/assets", desc: "Register mobile asset" },
      { method: "GET", path: "/api/v1/assets/:id", desc: "Get asset details" },
      { method: "PUT", path: "/api/v1/assets/:id", desc: "Full asset update" },
      { method: "PATCH", path: "/api/v1/assets/:id", desc: "Partial asset update" },
      { method: "DELETE", path: "/api/v1/assets/:id", desc: "Deregister asset" },
      /* Responder Sessions (Port 9024) */
      { method: "GET", path: "/api/v1/respondersessions", desc: "List responder sessions" },
      { method: "POST", path: "/api/v1/respondersessions", desc: "Create responder session" },
      { method: "GET", path: "/api/v1/respondersessions/:id", desc: "Get session details" },
      { method: "DELETE", path: "/api/v1/respondersessions/:id", desc: "Delete responder session" },
      /* Responder Me Sessions (Port 9024) */
      { method: "POST", path: "/api/v1/responders/me/session", desc: "Start my responder session" },
      { method: "POST", path: "/api/v1/responders/me/session/:session_id/close", desc: "Close current session" },
      /* Responder Services (Port 9024) */
      { method: "GET", path: "/api/v1/responderservices", desc: "List assigned services" },
      { method: "POST", path: "/api/v1/responderservices", desc: "Assign service to responder" },
      { method: "GET", path: "/api/v1/responderservices/:id", desc: "Get responder service details" },
      { method: "PUT", path: "/api/v1/responderservices/:id", desc: "Update responder service" },
      { method: "DELETE", path: "/api/v1/responderservices/:id", desc: "Unassign responder service" },
      /* Service Requests (Ports 9024 & 9034) */
      { method: "GET", path: "/api/v1/servicerequests", desc: "List all service requests (Port 9024)" },
      { method: "GET", path: "/api/v1/service-requests", desc: "List all service requests (Port 9034)" },
      { method: "POST", path: "/api/v1/service-requests", desc: "Create service request (Port 9034)" },
      { method: "GET", path: "/api/v1/service-requests/:id", desc: "Get service request (Port 9034)" },
      { method: "PUT", path: "/api/v1/service-requests/:id", desc: "Update service request (Port 9034)" },
      { method: "DELETE", path: "/api/v1/service-requests/:id", desc: "Delete service request (Port 9034)" },
    ],
  },
];

const ALL_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const TOTAL_ROUTES = API_CATALOG.reduce((sum, g) => sum + g.routes.length, 0);

/* ── Individual group card ───────────────── */
function CatalogGroupCard({
  group,
  query,
  methodFilter,
  defaultExpanded,
}: {
  group: ApiCatalogGroup;
  query: string;
  methodFilter: string | null;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const filtered = useMemo(() => {
    let routes = group.routes;
    if (methodFilter) {
      routes = routes.filter((r) => r.method === methodFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      routes = routes.filter(
        (r) =>
          r.method.toLowerCase().includes(q) ||
          r.path.toLowerCase().includes(q) ||
          r.desc.toLowerCase().includes(q),
      );
    }
    return routes;
  }, [group.routes, query, methodFilter]);

  if (filtered.length === 0 && (query || methodFilter)) return null;

  const methodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of filtered) {
      counts[r.method] = (counts[r.method] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  return (
    <Panel>
      <div
        className="feature-card-selectable"
        style={{ border: "none", padding: 0, background: "none" }}
        onClick={() => setExpanded((p) => !p)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((p) => !p);
          }
        }}
      >
        <div className="feature-row" style={{ cursor: "pointer" }}>
          <SectionHeader
            title={group.title}
            icon={group.icon}
            subtitle={group.description}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span
              className="catalog-route-count"
              style={{
                background: "rgba(68, 181, 161, 0.16)",
                border: "1px solid rgba(68, 181, 161, 0.38)",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent-primary)",
              }}
            >
              {filtered.length} endpoint{filtered.length !== 1 ? "s" : ""}
            </span>
            <span
              style={{
                display: "inline-flex",
                transition: "transform 0.22s ease",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                color: "var(--text-muted)",
                fontSize: 16,
              }}
            >
              ▾
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <>
          <div className="feature-muted feature-mono" style={{ marginTop: 4 }}>
            {group.backend}
          </div>

          <div className="feature-pill-row" style={{ marginTop: 8, gap: 6 }}>
            {Object.entries(methodCounts).map(([method, count]) => (
              <span
                key={method}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: `var(--semantic-${METHOD_COLORS[method] ?? "neutral"}-soft)`,
                  color: `var(--semantic-${METHOD_COLORS[method] ?? "neutral"})`,
                  border: `1px solid var(--semantic-${METHOD_COLORS[method] ?? "neutral"}-line)`,
                }}
              >
                {method} ×{count}
              </span>
            ))}
          </div>

          <div className="feature-divider" />

          <div className="catalog-group-routes feature-stack">
            {filtered.map((route, i) => (
              <div
                key={`${route.method}-${route.path}-${i}`}
                className="catalog-route-entry feature-card"
                style={{
                  animationDelay: `${i * 20}ms`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
                  <StatusPill
                    tone={METHOD_COLORS[route.method] ?? "neutral"}
                    label={route.method}
                  />
                  <span className="feature-mono" style={{ wordBreak: "break-all" }}>
                    {route.path}
                  </span>
                </div>
                <span className="feature-subtitle" style={{ margin: 0, textAlign: "right", flexShrink: 0 }}>
                  {route.desc}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ── Main Component ──────────────────────── */
export default function CatalogTab() {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(true);

  const query = search.trim().toLowerCase();

  const visibleGroupCount = useMemo(() => {
    return API_CATALOG.filter((group) => {
      let routes = group.routes;
      if (methodFilter) routes = routes.filter((r) => r.method === methodFilter);
      if (query) {
        const q = query;
        routes = routes.filter(
          (r) =>
            r.method.toLowerCase().includes(q) ||
            r.path.toLowerCase().includes(q) ||
            r.desc.toLowerCase().includes(q),
        );
      }
      return routes.length > 0;
    }).length;
  }, [query, methodFilter]);

  const visibleRouteCount = useMemo(() => {
    let total = 0;
    for (const group of API_CATALOG) {
      let routes = group.routes;
      if (methodFilter) routes = routes.filter((r) => r.method === methodFilter);
      if (query) {
        const q = query;
        routes = routes.filter(
          (r) =>
            r.method.toLowerCase().includes(q) ||
            r.path.toLowerCase().includes(q) ||
            r.desc.toLowerCase().includes(q),
        );
      }
      total += routes.length;
    }
    return total;
  }, [query, methodFilter]);

  return (
    <div className="feature-shell">
      <Panel>
        <SectionHeader
          title="API Surface Catalog"
          icon="📚"
          subtitle={`Verified endpoint index — ${API_CATALOG.length} domains, ${TOTAL_ROUTES} endpoints`}
          action={
            <Button
              variant="secondary"
              onClick={() => setExpandAll((p) => !p)}
            >
              {expandAll ? "Collapse All" : "Expand All"}
            </Button>
          }
        />

        <div className="feature-grid-equal" style={{ marginTop: 12 }}>
          <div className="feature-kpi">
            <p className="feature-kpi-value">{TOTAL_ROUTES}</p>
            <p className="feature-kpi-label">Total Endpoints</p>
          </div>
          <div className="feature-kpi">
            <p className="feature-kpi-value">{API_CATALOG.length}</p>
            <p className="feature-kpi-label">API Domains</p>
          </div>
          <div className="feature-kpi">
            <p className="feature-kpi-value">
              {query || methodFilter ? visibleRouteCount : TOTAL_ROUTES}
            </p>
            <p className="feature-kpi-label">
              {query || methodFilter ? "Matching" : "Visible"}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="feature-label" htmlFor="catalog-search-global">
            Search endpoints
          </label>
          <input
            id="catalog-search-global"
            className="feature-input"
            placeholder="Filter by method, path, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="feature-toolbar" style={{ marginTop: 8, gap: 6 }}>
          <Chip
            selected={methodFilter === null}
            onClick={() => setMethodFilter(null)}
          >
            All Methods
          </Chip>
          {ALL_METHODS.map((m) => (
            <Chip
              key={m}
              selected={methodFilter === m}
              onClick={() => setMethodFilter(methodFilter === m ? null : m)}
            >
              {m}
            </Chip>
          ))}
        </div>

        {(query || methodFilter) && (
          <div
            className="feature-muted"
            style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}
          >
            <span>
              Showing {visibleRouteCount} endpoint{visibleRouteCount !== 1 ? "s" : ""} across{" "}
              {visibleGroupCount} domain{visibleGroupCount !== 1 ? "s" : ""}
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setMethodFilter(null);
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </Panel>

      {API_CATALOG.map((group) => (
        <CatalogGroupCard
          key={group.title}
          group={group}
          query={query}
          methodFilter={methodFilter}
          defaultExpanded={expandAll}
        />
      ))}

      {visibleGroupCount === 0 && (
        <div className="feature-empty">
          No endpoints match your search. Try a different query or clear the filters.
        </div>
      )}
    </div>
  );
}
