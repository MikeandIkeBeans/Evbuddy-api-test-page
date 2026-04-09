import React, { useEffect, useMemo, useState } from "react";
import "./feature-layout.css";
import { apiCall } from "../utils/api";
import type { ApiCatalogGroup, ApiResponse } from "../types";
import { Button, Chip, Panel, SectionHeader, StatusPill } from "./primitives";

type ServicesPayload = {
  summary?: { available: number; unavailable: number; total: number };
  microservice_host?: string;
  services?: Record<
    string,
    {
      port?: number;
      base_url?: string;
      available?: boolean;
      status?: number;
      latency_ms?: number;
    }
  >;
};

const METHOD_COLORS: Record<string, "success" | "info" | "warning" | "neutral" | "error"> = {
  GET: "success",
  POST: "info",
  PUT: "warning",
  PATCH: "neutral",
  DELETE: "error",
};

const API_CATALOG: ApiCatalogGroup[] = [
  {
    title: "EV Charging",
    icon: "⚡",
    description: "Chargers, sessions, OCPP controls, and site charging flows",
    backend: "appdev.evbuddy.net ports 9000/9004/9017/9029",
    routes: [
      { method: "GET", path: "/v1/chargers", desc: "List chargers" },
      { method: "GET", path: "/v1/chargers/:charger_id/status", desc: "Read charger status" },
      { method: "POST", path: "/v1/sessions", desc: "Start charging session" },
      { method: "POST", path: "/v1/sessions/:session_id/stop", desc: "Stop charging session" },
      { method: "GET", path: "/v1/host-sites", desc: "List host sites" },
      { method: "GET", path: "/v1/ocpp/sessions", desc: "Live OCPP sessions" },
    ],
  },
  {
    title: "Identity & Profiles",
    icon: "👥",
    description: "Users, vehicles, and payment methods",
    backend: "appdev.evbuddy.net ports 9000/9001/9002",
    routes: [
      { method: "GET", path: "/api/users", desc: "List users" },
      { method: "PATCH", path: "/api/users/:uid", desc: "Partial user update" },
      { method: "GET", path: "/api/users/:uid/vehicles", desc: "Vehicles by user" },
      { method: "POST", path: "/api/payments", desc: "Create payment method" },
      { method: "DELETE", path: "/api/payments/:pid", desc: "Delete payment method" },
    ],
  },
  {
    title: "Operations",
    icon: "🕒",
    description: "Operating hours, invites, access grants, and messaging",
    backend: "appdev.evbuddy.net ports 9005/9008/9011",
    routes: [
      { method: "GET", path: "/api/operating-hours", desc: "Fetch operating hours" },
      { method: "POST", path: "/api/operating-hours-exceptions", desc: "Create exception" },
      { method: "GET", path: "/api/invites", desc: "List invites" },
      { method: "GET", path: "/api/accessgrants/charger_access/grants", desc: "List grants" },
      { method: "GET", path: "/api/messaging/threads", desc: "List messaging threads" },
    ],
  },
];

function normalizeServicesPayload(response: ApiResponse): ServicesPayload {
  if (!response.ok || !response.data || typeof response.data !== "object") {
    return {};
  }
  return response.data as ServicesPayload;
}

function ServicesTable({ services }: { services: NonNullable<ServicesPayload["services"]> }) {
  const sorted = Object.entries(services).sort((a, b) => {
    const ap = a[1]?.port ?? 0;
    const bp = b[1]?.port ?? 0;
    return ap - bp;
  });

  return (
    <div className="feature-table-wrap">
      <table className="feature-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Port</th>
            <th>Base URL</th>
            <th>Status</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([name, info]) => (
            <tr key={name}>
              <td>{name}</td>
              <td className="feature-mono">{info.port ?? "—"}</td>
              <td className="feature-mono">{info.base_url ?? "—"}</td>
              <td>
                <StatusPill
                  tone={info.available ? "success" : "error"}
                  label={info.available ? "Online" : "Offline"}
                />
              </td>
              <td className="feature-mono">{typeof info.latency_ms === "number" ? `${info.latency_ms}ms` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CatalogSection({ group, search }: { group: ApiCatalogGroup; search: string }) {
  const query = search.trim().toLowerCase();
  const routes = query
    ? group.routes.filter(
        (r) =>
          r.method.toLowerCase().includes(query) ||
          r.path.toLowerCase().includes(query) ||
          r.desc.toLowerCase().includes(query)
      )
    : group.routes;

  if (routes.length === 0 && query.length > 0) {
    return null;
  }

  return (
    <Panel>
      <SectionHeader title={group.title} icon={group.icon} subtitle={group.description} />
      <div className="feature-muted feature-mono">{group.backend}</div>
      <div className="feature-divider" />
      <div className="feature-stack">
        {routes.map((route) => (
          <div key={`${route.method}-${route.path}`} className="feature-card">
            <div className="feature-row">
              <div className="feature-pill-row">
                <StatusPill tone={METHOD_COLORS[route.method] ?? "neutral"} label={route.method} />
                <span className="feature-mono">{route.path}</span>
              </div>
            </div>
            <p className="feature-subtitle">{route.desc}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function ServicesTab() {
  const [mode, setMode] = useState<"status" | "catalog">("status");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [search, setSearch] = useState("");

  const fetchServices = async () => {
    setLoading(true);
    const result = await apiCall("GET", "/api/services");
    setResponse(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const payload = useMemo(() => {
    if (!response) return {} as ServicesPayload;
    return normalizeServicesPayload(response);
  }, [response]);

  const summary = payload.summary ?? { available: 0, unavailable: 0, total: 0 };

  return (
    <div className="feature-shell">
      <div className="feature-toolbar">
        <Chip selected={mode === "status"} onClick={() => setMode("status")}>Microservice Status</Chip>
        <Chip selected={mode === "catalog"} onClick={() => setMode("catalog")}>API Catalog</Chip>
      </div>

      {mode === "status" && (
        <Panel>
          <SectionHeader
            title="Platform Service Health"
            icon="🧩"
            subtitle="Aggregated status from registered downstream services"
            action={<Button variant="secondary" onClick={fetchServices}>Refresh</Button>}
          />

          {loading && <div className="feature-empty">Loading service status…</div>}

          {!loading && response?.ok && (
            <div className="feature-tab-shell">
              <div className="feature-grid-equal">
                <div className="feature-kpi">
                  <p className="feature-kpi-value">{summary.available}</p>
                  <p className="feature-kpi-label">Available</p>
                </div>
                <div className="feature-kpi">
                  <p className="feature-kpi-value">{summary.unavailable}</p>
                  <p className="feature-kpi-label">Unavailable</p>
                </div>
                <div className="feature-kpi">
                  <p className="feature-kpi-value">{summary.total}</p>
                  <p className="feature-kpi-label">Total</p>
                </div>
              </div>

              {payload.microservice_host && (
                <div className="feature-card feature-mono">Host: {payload.microservice_host}</div>
              )}

              {payload.services ? (
                <ServicesTable services={payload.services} />
              ) : (
                <div className="feature-empty">No service payload returned.</div>
              )}
            </div>
          )}

          {!loading && response && !response.ok && (
            <div className="feature-error">
              Failed to load service status. HTTP {response.status}
            </div>
          )}
        </Panel>
      )}

      {mode === "catalog" && (
        <div className="feature-stack">
          <Panel>
            <SectionHeader
              title="API Surface Catalog"
              icon="🧭"
              subtitle="Design-system oriented endpoint index grouped by domain"
            />
            <label className="feature-label" htmlFor="catalog-search">Search endpoints</label>
            <input
              id="catalog-search"
              className="feature-input"
              placeholder="method, path, or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Panel>

          {API_CATALOG.map((group) => (
            <CatalogSection key={group.title} group={group} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}

