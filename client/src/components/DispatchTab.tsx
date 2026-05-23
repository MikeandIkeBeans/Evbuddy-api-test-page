import React, { useEffect, useState } from "react";
import "./feature-layout.css";
import { apiCall } from "../utils/api";
import type { ApiResponse } from "../types";
import { Button, Panel, SectionHeader, StatusPill } from "./primitives";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ServiceRequest = {
  id?: number;
  status?: string;
  service_code?: string;
  service_name?: string;
  request_type?: string;
  request_source?: string;
  priority_code?: string;
  notes?: string;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_TONES: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  requested: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
  closed: "neutral",
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "var(--semantic-error)" },
  high: { label: "High", color: "var(--semantic-warning)" },
  normal: { label: "Normal", color: "var(--accent-primary)" },
  low: { label: "Low", color: "var(--text-muted)" },
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function isServiceRequestArray(data: unknown): data is ServiceRequest[] {
  return Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null && "id" in data[0];
}

function isServiceRequestObject(data: unknown): data is ServiceRequest {
  return typeof data === "object" && data !== null && !Array.isArray(data) && "id" in data;
}

/* ------------------------------------------------------------------ */
/*  Card components                                                    */
/* ------------------------------------------------------------------ */

function ServiceRequestCard({ sr }: { sr: ServiceRequest }) {
  const statusTone = STATUS_TONES[sr.status ?? ""] ?? "neutral";
  const priority = PRIORITY_LABELS[sr.priority_code ?? ""] ?? PRIORITY_LABELS.normal;

  return (
    <div
      className="feature-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 16,
        transition: "border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--line-strong)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 25, 20, 0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "";
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Top row: ID + Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          className="feature-mono"
          style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}
        >
          #{sr.id}
        </span>
        <StatusPill tone={statusTone} label={sr.status ?? "unknown"} />
      </div>

      {/* Service name */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
          {sr.service_name || sr.service_code || "Service Request"}
        </div>
        {sr.service_code && sr.service_name && (
          <span className="feature-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {sr.service_code}
          </span>
        )}
      </div>

      {/* Details row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
        {sr.request_type && (
          <span style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-muted)" }}>Type:</span>{" "}
            <strong style={{ textTransform: "capitalize" }}>{sr.request_type}</strong>
          </span>
        )}
        {sr.request_source && (
          <span style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-muted)" }}>Source:</span>{" "}
            <strong>{sr.request_source.replace(/_/g, " ")}</strong>
          </span>
        )}
        {sr.priority_code && (
          <span>
            <span style={{ color: "var(--text-muted)" }}>Priority:</span>{" "}
            <strong style={{ color: priority.color }}>{priority.label}</strong>
          </span>
        )}
      </div>

      {/* Notes */}
      {sr.notes && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(0, 47, 39, 0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            lineHeight: 1.5,
          }}
        >
          {sr.notes}
        </div>
      )}

      {/* Timestamps */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--text-muted)",
          borderTop: "1px solid var(--line-soft)",
          paddingTop: 8,
          marginTop: 2,
        }}
      >
        <span>Created {formatDate(sr.createdAt)}</span>
        {sr.updatedAt && sr.updatedAt !== sr.createdAt && <span>Updated {formatDate(sr.updatedAt)}</span>}
      </div>
    </div>
  );
}

function ServiceRequestDetail({ sr }: { sr: ServiceRequest }) {
  const statusTone = STATUS_TONES[sr.status ?? ""] ?? "neutral";
  const priority = PRIORITY_LABELS[sr.priority_code ?? ""] ?? PRIORITY_LABELS.normal;

  // Collect all fields into key-value pairs for display
  const knownKeys = new Set([
    "id", "status", "service_code", "service_name", "request_type",
    "request_source", "priority_code", "notes", "currency", "createdAt", "updatedAt",
  ]);
  const extraFields = Object.entries(sr).filter(([k]) => !knownKeys.has(k) && sr[k] != null);

  return (
    <div className="feature-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            {sr.service_name || sr.service_code || `Request #${sr.id}`}
          </div>
          <span className="feature-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            ID: {sr.id} {sr.service_code ? `· ${sr.service_code}` : ""}
          </span>
        </div>
        <StatusPill tone={statusTone} label={sr.status ?? "unknown"} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        {sr.request_type && (
          <div className="feature-kpi" style={{ padding: 12 }}>
            <p className="feature-kpi-label">Type</p>
            <p className="feature-kpi-value" style={{ fontSize: 16, textTransform: "capitalize" }}>
              {sr.request_type}
            </p>
          </div>
        )}
        {sr.request_source && (
          <div className="feature-kpi" style={{ padding: 12 }}>
            <p className="feature-kpi-label">Source</p>
            <p className="feature-kpi-value" style={{ fontSize: 16 }}>
              {sr.request_source.replace(/_/g, " ")}
            </p>
          </div>
        )}
        {sr.priority_code && (
          <div className="feature-kpi" style={{ padding: 12 }}>
            <p className="feature-kpi-label">Priority</p>
            <p className="feature-kpi-value" style={{ fontSize: 16, color: priority.color }}>
              {priority.label}
            </p>
          </div>
        )}
        {sr.currency && (
          <div className="feature-kpi" style={{ padding: 12 }}>
            <p className="feature-kpi-label">Currency</p>
            <p className="feature-kpi-value" style={{ fontSize: 16 }}>{sr.currency}</p>
          </div>
        )}
      </div>

      {sr.notes && (
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(0, 47, 39, 0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
            NOTES
          </span>
          {sr.notes}
        </div>
      )}

      {extraFields.length > 0 && (
        <div className="feature-table-wrap" style={{ marginBottom: 14 }}>
          <table className="feature-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {extraFields.map(([k, v]) => (
                <tr key={k}>
                  <td className="feature-mono" style={{ fontSize: 12 }}>{k}</td>
                  <td style={{ fontSize: 12 }}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, fontSize: 12, color: "var(--text-muted)" }}>
        <span>Created: <strong>{formatDate(sr.createdAt)}</strong></span>
        <span>Updated: <strong>{formatDate(sr.updatedAt)}</strong></span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Response display                                                   */
/* ------------------------------------------------------------------ */

function SmartResponseDisplay({ response }: { response: ApiResponse }) {
  const [showRaw, setShowRaw] = useState(false);
  const data = response.data;

  const isArray = isServiceRequestArray(data);
  const isSingle = isServiceRequestObject(data);
  const hasSmartView = isArray || isSingle;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="feature-row" style={{ marginBottom: 8 }}>
        <h3>Response</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="feature-muted" style={{ fontSize: 12 }}>
            Duration: <strong className="feature-mono">{response.duration}ms</strong>
          </span>
          <StatusPill
            tone={response.ok ? "success" : "error"}
            label={`HTTP ${response.status}`}
          />
          {hasSmartView && (
            <Button variant="secondary" onClick={() => setShowRaw(!showRaw)}>
              {showRaw ? "Card View" : "Raw JSON"}
            </Button>
          )}
        </div>
      </div>

      {isArray && !showRaw && (
        <div style={{ marginTop: 12 }}>
          <p className="feature-muted" style={{ marginBottom: 10, fontSize: 12 }}>
            {(data as ServiceRequest[]).length} service request{(data as ServiceRequest[]).length !== 1 ? "s" : ""}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 14,
              maxHeight: 640,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {(data as ServiceRequest[]).map((sr, i) => (
              <ServiceRequestCard key={sr.id ?? i} sr={sr} />
            ))}
          </div>
        </div>
      )}

      {isSingle && !showRaw && (
        <div style={{ marginTop: 12 }}>
          <ServiceRequestDetail sr={data as ServiceRequest} />
        </div>
      )}

      {(showRaw || !hasSmartView) && (
        <pre
          style={{
            background: "var(--code-surface)",
            borderRadius: 10,
            padding: 16,
            marginTop: 12,
            fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 12,
            overflow: "auto",
            maxHeight: 400,
            border: "1px solid var(--line-soft)",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function DispatchTab() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">("GET");
  const [path, setPath] = useState("/api/v1/service-requests");
  const [body, setBody] = useState("");
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);

  const checkHealth = async () => {
    const result = await apiCall("GET", "/api/v1/assets");
    // If it's a 200 or even a 401/404, the service is alive. If status is 0 (network error), it's offline.
    setServiceOnline(result.status !== 0);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handlePresetRequest = async (presetMethod: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", presetPath: string) => {
    setLoading(true);
    setMethod(presetMethod);
    setPath(presetPath);
    const result = await apiCall(presetMethod, presetPath);
    setResponse(result);
    setLoading(false);
  };

  const handleCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let parsedBody: unknown = null;
    if (["POST", "PUT", "PATCH"].includes(method) && body.trim()) {
      try {
        parsedBody = JSON.parse(body);
      } catch (err) {
        setResponse({
          ok: false,
          status: 400,
          data: { error: "Invalid JSON in request body" },
          duration: 0,
        });
        setLoading(false);
        return;
      }
    }

    const result = await apiCall(method, path, parsedBody);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="feature-shell">
      <Panel>
        <SectionHeader
          title="Responder & Dispatch"
          icon="🚨"
          subtitle="Service requests, responder dashboard, and dispatch operations — port 9024"
          action={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="feature-muted">Service Status:</span>
              <StatusPill
                tone={serviceOnline === true ? "success" : serviceOnline === false ? "error" : "neutral"}
                label={serviceOnline === true ? "Online" : serviceOnline === false ? "Offline" : "Checking..."}
              />
              <Button variant="secondary" onClick={checkHealth}>
                Test Connection
              </Button>
            </div>
          }
        />

        <div style={{ marginTop: 20 }}>
          <h3>Quick Action Presets</h3>
          <p className="feature-muted">Test common API endpoints on the dispatch and responder microservice.</p>
          <div className="feature-grid-equal" style={{ marginTop: 12 }}>
            <div className="feature-kpi" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
              <strong>GET /assets</strong>
              <span className="feature-muted" style={{ fontSize: 11 }}>Active mobile assets in Dispatch</span>
              <Button variant="secondary" onClick={() => handlePresetRequest("GET", "/api/v1/assets")}>
                Fire Request
              </Button>
            </div>
            <div className="feature-kpi" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
              <strong>GET /respondersessions</strong>
              <span className="feature-muted" style={{ fontSize: 11 }}>All active responder sessions</span>
              <Button variant="secondary" onClick={() => handlePresetRequest("GET", "/api/v1/respondersessions")}>
                Fire Request
              </Button>
            </div>
            <div className="feature-kpi" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
              <strong>GET /service-requests</strong>
              <span className="feature-muted" style={{ fontSize: 11 }}>List all dispatch requests</span>
              <Button variant="secondary" onClick={() => handlePresetRequest("GET", "/api/v1/service-requests")}>
                Fire Request
              </Button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3>Custom Request Builder</h3>
          <form onSubmit={handleCustomRequest} className="feature-stack" style={{ marginTop: 12 }}>
            <div className="feature-form-grid">
              <div>
                <label className="feature-label" htmlFor="dispatch-method">Method</label>
                <select
                  id="dispatch-method"
                  className="feature-select"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="feature-label" htmlFor="dispatch-path">Endpoint Path</label>
                <input
                  id="dispatch-path"
                  className="feature-input"
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                />
              </div>
            </div>

            {["POST", "PUT", "PATCH"].includes(method) && (
              <div>
                <label className="feature-label" htmlFor="dispatch-body">Request Body (JSON)</label>
                <textarea
                  id="dispatch-body"
                  className="feature-textarea"
                  placeholder='{ "status": "AVAILABLE" }'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </form>
        </div>

        {response && <SmartResponseDisplay response={response} />}
      </Panel>

      <Panel>
        <SectionHeader
          title="Service Routing Details"
          icon="ℹ️"
          subtitle="Understanding paths and proxy rules for Port 9024"
        />
        <div className="feature-stack" style={{ marginTop: 12 }}>
          <p className="feature-muted" style={{ fontSize: 13 }}>
            The local Flask proxy forwards request paths under the <code>/api/v1</code> prefix to active services:
          </p>
          <ul className="feature-muted" style={{ fontSize: 13, paddingLeft: 20 }}>
            <li>
              Paths matching <code>service-requests</code> or <code>servicerequests</code> map to Port 9034.
            </li>
            <li>
              All other paths (including <code>assets</code> and <code>respondersessions</code>) map directly to Port 9024.
            </li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}
