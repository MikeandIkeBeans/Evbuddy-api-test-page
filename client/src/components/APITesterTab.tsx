import React, { useState } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";
import { ResponseDisplay } from "./ResponseDisplay";
import { ApiResponse, HttpMethod } from "../types";
import { Button, Panel, SectionHeader } from "./primitives";

export default function APITesterTab() {
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState("/health");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
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
    const res = await apiCall(method as HttpMethod, endpoint, parsedBody, userId || null);
    setResponse(res);
    setLoading(false);
  };

  const quickEndpoints = [
    { method: "GET", endpoint: "/health", label: "Health" },
    { method: "GET", endpoint: "/api/services", label: "Services" },
    { method: "GET", endpoint: "/api/sites/1/members", label: "Site 1 Members" },
    { method: "GET", endpoint: "/api/sites/1/drivers?actor_user_id=1", label: "Site 1 Drivers" },
    { method: "GET", endpoint: "/api/audit-log?limit=10", label: "Audit Log" },
  ];

  return (
    <div style={styles.grid}>
      <Panel>
        <SectionHeader title="API Tester" />

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

        <Button variant="primary" onClick={sendRequest}>Send Request</Button>

        <ResponseDisplay response={response} loading={loading} />
      </Panel>

      <Panel>
        <SectionHeader title="Quick Actions" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {quickEndpoints.map((ep, i) => (
            <Button
              key={i}
              variant="secondary"
              style={styles.buttonSecondary}
              onClick={() => {
                setMethod(ep.method);
                setEndpoint(ep.endpoint);
              }}
            >
              <span style={{
                color: ep.method === "GET" ? "var(--accent-primary)" :
                       ep.method === "POST" ? "var(--semantic-info)" : "var(--semantic-warning)",
                marginRight: 8,
                fontWeight: 600
              }}>
                {ep.method}
              </span>
              {ep.label}
            </Button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

