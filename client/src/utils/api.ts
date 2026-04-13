import type { ApiResponse, HttpMethod } from "../types";

export const API_BASE = "http://127.0.0.1:5000";

// Resolve Flask origin in production, or localhost:5000 in Vite dev mode.
export const EVBUDDY_API = (() => {
  if (typeof window === "undefined") {
    return API_BASE;
  }
  // In dev, Vite may run on any port (5173, 5174, etc.) — always point to Flask
  if (window.location.port !== "5000" && window.location.port !== "") {
    return API_BASE;
  }
  return window.location.origin;
})();

function resolveApiUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  return `${EVBUDDY_API}${endpoint}`;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
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
export async function apiCall(
  method: HttpMethod,
  endpoint: string,
  body: unknown = null,
  userId: string | number | null = null,
): Promise<ApiResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) {
    headers["X-User-ID"] = String(userId);
  }

  const options: RequestInit = { method, headers };
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
  } catch (err: unknown) {
    return {
      ok: false,
      status: 0,
      data: { error: (err as Error).message },
      duration: Date.now() - start,
    };
  }
}
