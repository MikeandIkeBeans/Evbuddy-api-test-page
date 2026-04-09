import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import V2VTab from "./V2VTab";

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
  } as unknown as Response;
}

type MockMode = "offline" | "online";

function installFetchMock(mode: MockMode) {
  const statusPayload =
    mode === "offline"
      ? {
          success: true,
          charger: {
            online: false,
            charge_point_model: "Hypergrid-X",
            charge_point_vendor: "EVBuddy Labs",
            charge_point_serial_number: "CP-7781",
            firmware_version: "2.4.1",
            last_heartbeat: undefined,
          },
          connectors: [
            { connector_id: 1, status: "Charging" },
            { connector_id: 2, status: "Available" },
          ],
        }
      : {
          success: true,
          charger: {
            online: true,
            charge_point_model: "Hypergrid-X",
            charge_point_vendor: "EVBuddy Labs",
            charge_point_serial_number: "CP-7781",
            firmware_version: "2.4.1",
            last_heartbeat: new Date().toISOString(),
          },
          connectors: [
            { connector_id: 1, status: "Charging" },
            { connector_id: 2, status: "Available" },
          ],
        };

  const sessionsPayload = {
    success: true,
    sessions: [
      {
        transaction_id: 918273,
        connector_id: 1,
        status: "InProgress",
        is_active: true,
        duration_seconds: 180,
      },
    ],
  };

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.includes("/v1/v2v/status")) {
      return jsonResponse(statusPayload);
    }
    if (url.includes("/v1/v2v/sessions")) {
      return jsonResponse(sessionsPayload);
    }
    if (url.includes("/v1/v2v/start") || url.includes("/v1/v2v/stop") || url.includes("/v1/v2v/reset")) {
      return jsonResponse({ success: true });
    }

    throw new Error(`Unhandled fetch call in test: ${url}`);
  });
}

describe("V2VTab", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders offline connector cards as last-known and read-only", async () => {
    installFetchMock("offline");

    render(<V2VTab />);

    expect(await screen.findByText(/Charger offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Connector status may be stale until heartbeat returns\./i)).toBeInTheDocument();

    expect(screen.getByText("Charging (last known)")).toBeInTheDocument();
    expect(screen.getByText("Available (last known)")).toBeInTheDocument();

    expect(screen.getAllByText(/Controls unavailable while charger is offline\./i).length).toBeGreaterThan(0);

    expect(screen.queryByRole("button", { name: /^Start$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Stop$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Refresh Status/i }).length).toBeGreaterThan(0);
  });

  it("keeps connector controls available when charger is online", async () => {
    installFetchMock("online");

    render(<V2VTab />);

    expect(await screen.findByText("ONLINE")).toBeInTheDocument();
    expect(screen.queryByText(/Connector status may be stale until heartbeat returns\./i)).not.toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: /^Start$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Stop$/i }).length).toBeGreaterThan(0);
  });
});
