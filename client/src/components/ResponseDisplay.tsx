import React from "react";
import styles from "../styles";
import type { ApiResponse } from "../types";
import { StatusPill } from "./primitives";

/** JSON Syntax Highlighter – renders safe React elements (no dangerouslySetInnerHTML). */
export function JsonView({ data }: { data: unknown }) {
  if (data === undefined || data === null) {
    return <pre style={styles.response}>{String(data)}</pre>;
  }

  const json = JSON.stringify(data, null, 2);

  // Tokenize into colored spans without innerHTML to avoid XSS.
  const TOKEN_RE = /("(?:[^"\\]|\\.)*"\s*:\s*)|("(?:[^"\\]|\\.)*")|\b(\d+(?:\.\d+)?)\b|\b(true|false)\b|\b(null)\b/g;
  const parts: { text: string; color: string | null }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(json)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: json.slice(lastIndex, match.index), color: null });
    }
    if (match[1]) parts.push({ text: match[1], color: "var(--semantic-info)" });
    else if (match[2]) parts.push({ text: match[2], color: "var(--accent-primary)" });
    else if (match[3]) parts.push({ text: match[3], color: "var(--semantic-warning)" });
    else if (match[4]) parts.push({ text: match[4], color: "var(--semantic-error)" });
    else if (match[5]) parts.push({ text: match[5], color: "var(--semantic-neutral)" });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < json.length) {
    parts.push({ text: json.slice(lastIndex), color: null });
  }

  return (
    <pre style={styles.response}>
      {parts.map((p, i) =>
        p.color ? <span key={i} style={{ color: p.color }}>{p.text}</span> : p.text
      )}
    </pre>
  );
}

/** Response Display Component */
export function ResponseDisplay({ response, loading }: { response: ApiResponse | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ ...styles.response, textAlign: "center", color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  }
  if (!response) return null;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <StatusPill tone={response.ok ? "success" : "error"} label={`${response.status} ${response.ok ? "OK" : "ERROR"}`} />
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{response.duration}ms</span>
      </div>
      <JsonView data={response.data} />
    </div>
  );
}

