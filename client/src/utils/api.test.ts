import { afterEach, describe, expect, it, vi } from "vitest";

import { apiCall } from "./api";

function jsonResponse(payload: unknown, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" },
    });
}

describe("apiCall", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns parsed JSON payload on success", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
            jsonResponse({ ok: true, items: [1, 2, 3] }, 200),
        );

        const result = await apiCall("GET", "/api/test");

        expect(result.ok).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toEqual({ ok: true, items: [1, 2, 3] });
        expect(typeof result.duration).toBe("number");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("returns structured payload for non-JSON response", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
            new Response("plain text body", {
                status: 502,
                headers: { "content-type": "text/plain" },
            }),
        );

        const result = await apiCall("GET", "/api/text");

        expect(result.ok).toBe(false);
        expect(result.status).toBe(502);
        expect(result.data).toEqual({ raw: "plain text body" });
    });

    it("sends JSON body and X-User-ID for non-GET calls", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ created: true }, 201));

        await apiCall("POST", "/api/create", { name: "alpha" }, 123);

        const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(options.method).toBe("POST");
        expect(options.body).toBe(JSON.stringify({ name: "alpha" }));
        expect((options.headers as Record<string, string>)["X-User-ID"]).toBe("123");
    });

    it("handles fetch/network failures", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));

        const result = await apiCall("GET", "/api/unreachable");

        expect(result.ok).toBe(false);
        expect(result.status).toBe(0);
        expect(result.data).toEqual({ error: "network down" });
    });
});