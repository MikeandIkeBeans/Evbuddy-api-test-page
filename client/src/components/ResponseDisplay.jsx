import React from "react";
import styles from "../styles";

/** JSON Syntax Highlighter */
export function JsonView({ data }) {
  const json = JSON.stringify(data, null, 2);
  const highlighted = json
    .replace(/"([^"]+)":/g, '<span style="color:#79c0ff">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span style="color:#a5d6ff">"$1"</span>')
    .replace(/: (\d+)/g, ': <span style="color:#ffa657">$1</span>')
    .replace(/: (true|false)/g, ': <span style="color:#ff7b72">$1</span>')
    .replace(/: null/g, ': <span style="color:#8b949e">null</span>');

  return <pre style={styles.response} dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

/** Response Display Component */
export function ResponseDisplay({ response, loading }) {
  if (loading) {
    return (
      <div style={{ ...styles.response, textAlign: "center", color: "#888" }}>
        Loading...
      </div>
    );
  }
  if (!response) return null;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <span style={{
          ...styles.badge,
          ...(response.ok ? styles.badgeSuccess : styles.badgeError)
        }}>
          {response.status} {response.ok ? "OK" : "ERROR"}
        </span>
        <span style={{ fontSize: 12, color: "#666" }}>{response.duration}ms</span>
      </div>
      <JsonView data={response.data} />
    </div>
  );
}
