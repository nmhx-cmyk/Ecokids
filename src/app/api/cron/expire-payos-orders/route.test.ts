import { afterEach, describe, expect, it, vi } from "vitest";

const { expireUnpaidPayosOrders } = vi.hoisted(() => ({
  expireUnpaidPayosOrders: vi.fn(),
}));

vi.mock("@/lib/server/payos-payment", () => ({
  expireUnpaidPayosOrders,
}));

import { GET } from "./route";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

afterEach(() => {
  vi.clearAllMocks();
  if (ORIGINAL_CRON_SECRET === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  }
});

describe("expire PayOS orders cron route", () => {
  it("fails closed when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(
      new Request("http://localhost/api/cron/expire-payos-orders"),
    );

    expect(response.status).toBe(500);
    expect(expireUnpaidPayosOrders).not.toHaveBeenCalled();
  });

  it("rejects requests with a wrong bearer token", async () => {
    process.env.CRON_SECRET = "secret";

    const response = await GET(
      new Request("http://localhost/api/cron/expire-payos-orders", {
        headers: { authorization: "Bearer wrong" },
      }),
    );

    expect(response.status).toBe(401);
    expect(expireUnpaidPayosOrders).not.toHaveBeenCalled();
  });

  it("expires orders when the bearer token matches", async () => {
    process.env.CRON_SECRET = "secret";
    expireUnpaidPayosOrders.mockResolvedValue(["ECO-2026-000001"]);

    const response = await GET(
      new Request("http://localhost/api/cron/expire-payos-orders", {
        headers: { authorization: "Bearer secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ canceled: 1, orderCodes: ["ECO-2026-000001"] });
  });
});
