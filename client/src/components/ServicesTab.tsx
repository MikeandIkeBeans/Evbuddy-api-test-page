import React, { useEffect, useMemo, useState } from "react";
import "./feature-layout.css";
import { apiCall } from "../utils/api";
import type { ApiResponse } from "../types";
import { Button, Panel, SectionHeader, StatusPill, TabButton, Chip, Badge } from "./primitives";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ServiceItem = {
  id: number;
  category: string;
  serviceCode: string;
  serviceName: string;
  description: string;
  basePriceCents: number | null;
  pricingType: string | null;
  isActive: number | boolean;
};

type PricingRule = {
  id: number;
  serviceCode: string;
  pricingScope: string;
  pricingType: string;
  scopeValue: string;
  priceCents: number;
  surgeMultiplier: number;
  currency: string;
  createdAt?: string;
};

type ProviderService = {
  id: number;
  userId: number | null;
  serviceCode: string | null;
  priceOverrideCents: number | null;
  serviceRadiusMiles: number | null;
  availability: string | null;
  status: string;
  hostSiteId: number | null;
};

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

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                   */
/* ------------------------------------------------------------------ */

function formatCurrency(cents: number | null, currency = "USD"): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(cents / 100);
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Icon and color configs for the service catalog cards
const getServiceConfig = (code: string, category: string) => {
  const normCode = (code || "").toUpperCase();
  const normCat = (category || "").toLowerCase();
  
  if (normCode.includes("EV_DC") || normCode.includes("DC_FAST")) {
    return { icon: "⚡", color: "var(--semantic-info)", tone: "info" as const };
  }
  if (normCode.includes("EV_AC") || normCode.includes("EV_L2") || normCode.includes("CHARGE")) {
    return { icon: "🔌", color: "var(--accent-primary)", tone: "success" as const };
  }
  if (normCode.includes("V2L") || normCode.includes("POWER")) {
    return { icon: "🔋", color: "#a855f7", tone: "neutral" as const }; // Purple accent
  }
  if (normCode.includes("JUMP")) {
    return { icon: "⚡🔋", color: "var(--semantic-warning)", tone: "warning" as const };
  }
  if (normCode.includes("AIR") || normCode.includes("TIRE")) {
    return { icon: "💨", color: "#06b6d4", tone: "info" as const };
  }
  if (normCode.includes("LOCKOUT") || normCode.includes("KEY")) {
    return { icon: "🔑", color: "#ec4899", tone: "error" as const };
  }
  if (normCode.includes("WASH")) {
    return { icon: "🧼", color: "var(--semantic-success)", tone: "success" as const };
  }
  
  // Category default mappings
  if (normCat.includes("charging") || normCat.includes("power")) {
    return { icon: "⚡", color: "var(--semantic-info)", tone: "info" as const };
  }
  if (normCat.includes("roadside")) {
    return { icon: "🚗", color: "var(--semantic-error)", tone: "error" as const };
  }
  if (normCat.includes("convenience")) {
    return { icon: "🧼", color: "var(--semantic-success)", tone: "success" as const };
  }

  return { icon: "🛠️", color: "var(--text-muted)", tone: "neutral" as const };
};

/* ------------------------------------------------------------------ */
/*  Subcomponents for Each Tab                                        */
/* ------------------------------------------------------------------ */

// 1. Services Catalog View
function ServicesCatalogView({ services }: { services: ServiceItem[] }) {
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = useMemo(() => {
    const cats = new Set(services.map((s) => s.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [services]);

  const filteredServices = useMemo(() => {
    if (categoryFilter === "All") return services;
    return services.filter((s) => s.category === categoryFilter);
  }, [services, categoryFilter]);

  if (services.length === 0) {
    return <div className="feature-empty">No services currently registered in the catalog.</div>;
  }

  return (
    <div className="feature-stack">
      {/* Category Filters */}
      <div className="feature-toolbar" style={{ gap: 8, paddingBottom: 6 }}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            selected={categoryFilter === cat}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat}
          </Chip>
        ))}
      </div>

      <div className="feature-grid-equal" style={{ marginTop: 8 }}>
        {filteredServices.map((service) => {
          const config = getServiceConfig(service.serviceCode, service.category);
          return (
            <div
              key={service.id}
              className="feature-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
                borderColor: "rgba(255, 255, 255, 0.08)",
                background: "rgba(33, 95, 85, 0.12)",
                minHeight: 180,
                justifyContent: "space-between",
                transition: "border-color 0.18s ease, transform 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--line-strong)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div className="feature-stack" style={{ gap: 8 }}>
                {/* Header Row: Category Badge & Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge tone={config.tone} style={{ textTransform: "uppercase", fontSize: 9 }}>
                    {service.category || "General"}
                  </Badge>
                  <StatusPill
                    tone={service.isActive ? "success" : "neutral"}
                    label={service.isActive ? "Active" : "Inactive"}
                  />
                </div>

                {/* Service Name & Code */}
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                    <span style={{ marginRight: 6 }}>{config.icon}</span>
                    {service.serviceName}
                  </h4>
                  <span className="feature-mono" style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.8 }}>
                    Code: {service.serviceCode}
                  </span>
                </div>

                {/* Description */}
                {service.description && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {service.description}
                  </p>
                )}
              </div>

              {/* Price / Pricing Type */}
              <div
                style={{
                  borderTop: "1px solid var(--line-soft)",
                  paddingTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginTop: 6,
                }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Base Pricing</span>
                <strong style={{ fontSize: 14, color: config.color }}>
                  {formatCurrency(service.basePriceCents)}
                  {service.pricingType && (
                    <span style={{ fontSize: 11, fontWeight: "normal", color: "var(--text-muted)", marginLeft: 4 }}>
                      ({service.pricingType.replace(/_/g, " ")})
                    </span>
                  )}
                </strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 2. Pricing Rules View
function PricingRulesView({ rules }: { rules: PricingRule[] }) {
  const metrics = useMemo(() => {
    if (rules.length === 0) return { total: 0, maxSurge: 1.0, avgPrice: 0 };
    const total = rules.length;
    const maxSurge = Math.max(...rules.map((r) => r.surgeMultiplier));
    const avgPrice = rules.reduce((acc, curr) => acc + curr.priceCents, 0) / total;
    return { total, maxSurge, avgPrice };
  }, [rules]);

  if (rules.length === 0) {
    return <div className="feature-empty">No custom service pricing rules defined.</div>;
  }

  return (
    <div className="feature-stack">
      {/* Metric Cards Row */}
      <div className="feature-grid-equal" style={{ marginBottom: 12 }}>
        <div className="feature-kpi" style={{ padding: 12 }}>
          <p className="feature-kpi-value" style={{ fontSize: 24 }}>{metrics.total}</p>
          <p className="feature-kpi-label">Pricing Rules</p>
        </div>
        <div className="feature-kpi" style={{ padding: 12 }}>
          <p className="feature-kpi-value" style={{ fontSize: 24 }}>{formatCurrency(metrics.avgPrice)}</p>
          <p className="feature-kpi-label">Average Unit Price</p>
        </div>
        <div className="feature-kpi" style={{ padding: 12 }}>
          <p className="feature-kpi-value" style={{ fontSize: 24, color: "var(--semantic-warning)" }}>
            {metrics.maxSurge.toFixed(1)}x
          </p>
          <p className="feature-kpi-label">Maximum Surge</p>
        </div>
      </div>

      <div className="feature-table-wrap">
        <table className="feature-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Service Code</th>
              <th>Scope</th>
              <th>Scope ID/Value</th>
              <th>Rate Type</th>
              <th>Base Price</th>
              <th>Surge Factor</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="feature-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  #{rule.id}
                </td>
                <td className="feature-mono" style={{ fontWeight: 700 }}>{rule.serviceCode}</td>
                <td>
                  <Badge tone={rule.pricingScope === "host" ? "info" : "neutral"} style={{ fontSize: 10 }}>
                    {rule.pricingScope}
                  </Badge>
                </td>
                <td className="feature-mono">{rule.scopeValue || "—"}</td>
                <td className="feature-mono" style={{ fontSize: 11, textTransform: "capitalize" }}>
                  {rule.pricingType.toLowerCase()}
                </td>
                <td className="feature-mono" style={{ color: "var(--accent-primary)", fontWeight: 700 }}>
                  {formatCurrency(rule.priceCents, rule.currency)}
                </td>
                <td>
                  <span
                    style={{
                      fontWeight: 700,
                      color: rule.surgeMultiplier > 1 ? "var(--semantic-warning)" : "var(--text-muted)",
                    }}
                  >
                    {rule.surgeMultiplier.toFixed(1)}x
                  </span>
                </td>
                <td className="feature-mono" style={{ fontSize: 11 }}>{formatDate(rule.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 3. Provider Services View
function ProviderServicesView({ providers }: { providers: ProviderService[] }) {
  const metrics = useMemo(() => {
    const total = providers.length;
    const activeCount = providers.filter((p) => p.status === "active" || p.status === "available").length;
    return { total, activeCount };
  }, [providers]);

  const getStatusTone = (status: string) => {
    const norm = status.toLowerCase();
    if (norm === "active" || norm === "available") return "success";
    if (norm === "coming_soon") return "info";
    if (norm === "temporarily_unavailable") return "warning";
    if (norm === "discontinued") return "error";
    return "neutral";
  };

  if (providers.length === 0) {
    return <div className="feature-empty">No service providers allocated.</div>;
  }

  return (
    <div className="feature-stack">
      {/* Metric Cards Row */}
      <div className="feature-grid-equal" style={{ marginBottom: 12 }}>
        <div className="feature-kpi" style={{ padding: 12 }}>
          <p className="feature-kpi-value" style={{ fontSize: 24 }}>{metrics.total}</p>
          <p className="feature-kpi-label">Provider Allocations</p>
        </div>
        <div className="feature-kpi" style={{ padding: 12 }}>
          <p className="feature-kpi-value" style={{ fontSize: 24, color: "var(--semantic-success)" }}>
            {metrics.activeCount}
          </p>
          <p className="feature-kpi-label">Online / Available Providers</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {providers.map((p) => (
          <div
            key={p.id}
            className="feature-card"
            style={{
              padding: 14,
              border: "1px solid var(--line-soft)",
              background: "rgba(255, 255, 255, 0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="feature-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                ID: #{p.id}
              </span>
              <StatusPill tone={getStatusTone(p.status)} label={p.status.replace(/_/g, " ")} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(68, 181, 161, 0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                🛠️
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "var(--text-primary)" }}>
                  {p.serviceCode || "Unknown Service"}
                </strong>
                <span className="feature-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  User ID: {p.userId !== null ? p.userId : "Global / System"}
                </span>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.01)",
                border: "1px solid rgba(255,255,255,0.03)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px 12px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 10, display: "block" }}>Radius</span>
                <strong>{p.serviceRadiusMiles !== null ? `${p.serviceRadiusMiles} miles` : "Global"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 10, display: "block" }}>Override Price</span>
                <strong style={{ color: p.priceOverrideCents ? "var(--semantic-success)" : "var(--text-muted)" }}>
                  {p.priceOverrideCents ? formatCurrency(p.priceOverrideCents) : "None"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 10, display: "block" }}>Availability</span>
                <span style={{ fontWeight: 600 }}>{p.availability || "Always"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 10, display: "block" }}>Host Site</span>
                <span className="feature-mono" style={{ fontSize: 11, fontWeight: 700 }}>
                  {p.hostSiteId ? `#${p.hostSiteId}` : "Any Site"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Platform System Health View (Original Health Check Table)
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

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ServicesTab() {
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"catalog" | "pricing" | "providers" | "health">("catalog");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [providers, setProviders] = useState<ProviderService[]>([]);
  const [healthResponse, setHealthResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesRes, pricingRes, providersRes, healthRes] = await Promise.all([
        apiCall("GET", "/api/v1/services"),
        apiCall("GET", "/api/v1/service-pricing"),
        apiCall("GET", "/api/v1/provider-services"),
        apiCall("GET", "/api/services"),
      ]);

      if (servicesRes.ok) {
        setServices((servicesRes.data as ServiceItem[]) || []);
      } else {
        setError(`Failed to fetch catalog: HTTP ${servicesRes.status}`);
      }

      if (pricingRes.ok) {
        setPricingRules((pricingRes.data as PricingRule[]) || []);
      }

      if (providersRes.ok) {
        setProviders((providersRes.data as ProviderService[]) || []);
      }

      setHealthResponse(healthRes);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while loading services data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const healthPayload = useMemo(() => {
    if (!healthResponse || !healthResponse.ok || typeof healthResponse.data !== "object") {
      return {} as ServicesPayload;
    }
    return healthResponse.data as ServicesPayload;
  }, [healthResponse]);

  const summary = healthPayload.summary ?? { available: 0, unavailable: 0, total: 0 };

  return (
    <div className="feature-shell">
      <Panel>
        <SectionHeader
          title="Services Catalog & Pricing"
          icon="🛠️"
          subtitle="Explore available service definitions, custom pricing rules, and provider allocations on Port 9026"
          action={
            <Button variant="secondary" onClick={fetchAllData} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Data"}
            </Button>
          }
        />

        {error && <div className="feature-error" style={{ marginTop: 12 }}>{error}</div>}

        {/* Sub-Tab Navigation Switcher */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            marginBottom: 16,
            borderBottom: "1px solid var(--line-soft)",
            paddingBottom: 12,
            overflowX: "auto",
          }}
        >
          <TabButton active={activeSubTab === "catalog"} onClick={() => setActiveSubTab("catalog")}>
            Services Catalog
          </TabButton>
          <TabButton active={activeSubTab === "pricing"} onClick={() => setActiveSubTab("pricing")}>
            Pricing Rules
          </TabButton>
          <TabButton active={activeSubTab === "providers"} onClick={() => setActiveSubTab("providers")}>
            Provider Services
          </TabButton>
          <TabButton active={activeSubTab === "health"} onClick={() => setActiveSubTab("health")}>
            System Health Check
          </TabButton>
        </div>

        {loading ? (
          <div className="feature-empty" style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            Loading service data from Port 9026...
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {activeSubTab === "catalog" && <ServicesCatalogView services={services} />}
            {activeSubTab === "pricing" && <PricingRulesView rules={pricingRules} />}
            {activeSubTab === "providers" && <ProviderServicesView providers={providers} />}
            
            {activeSubTab === "health" && (
              <div className="feature-stack" style={{ gap: 14 }}>
                <div className="feature-grid-equal">
                  <div className="feature-kpi">
                    <p className="feature-kpi-value">{summary.available}</p>
                    <p className="feature-kpi-label">Available Services</p>
                  </div>
                  <div className="feature-kpi">
                    <p className="feature-kpi-value">{summary.unavailable}</p>
                    <p className="feature-kpi-label">Unavailable Services</p>
                  </div>
                  <div className="feature-kpi">
                    <p className="feature-kpi-value">{summary.total}</p>
                    <p className="feature-kpi-label">Total Services</p>
                  </div>
                </div>

                {healthPayload.microservice_host && (
                  <div className="feature-card feature-mono" style={{ fontSize: 11 }}>
                    Service Status Host: {healthPayload.microservice_host}
                  </div>
                )}

                {healthPayload.services ? (
                  <ServicesTable services={healthPayload.services} />
                ) : (
                  <div className="feature-empty">No system health payload returned.</div>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
