export const API_BASE = "http://127.0.0.1:5000";

// Resolve Flask origin in production, or localhost:5000 in Vite dev mode.
export const EVBUDDY_API = (() => {
  if (typeof window === "undefined") {
    return API_BASE;
  }
  if (window.location.port === "5173") {
    return API_BASE;
  }
  return window.location.origin;
})();

function resolveApiUrl(endpoint) {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  return `${EVBUDDY_API}${endpoint}`;
}

async function parseResponsePayload(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return { error: "Invalid JSON response" };
    }
  }

  const text = await response.text();
  return text ? { raw: text } : {};
}

/**
 * Helper to make API calls.
 * Returns { ok, status, data, duration }.
 */
export async function apiCall(method, endpoint, body = null, userId = null) {
  const headers = { "Content-Type": "application/json" };
  if (userId) {
    headers["X-User-ID"] = String(userId);
  }

  const options = { method, headers };
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const url = resolveApiUrl(endpoint);
  const start = Date.now();

  try {
    const response = await fetch(url, options);
    const duration = Date.now() - start;
    const data = await parseResponsePayload(response);
    return { ok: response.ok, status: response.status, data, duration };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: err.message },
      duration: Date.now() - start,
    };
  }
}
