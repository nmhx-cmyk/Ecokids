import { describe, expect, it } from "vitest";
import { requestReturnSchema } from "@/lib/validations/return";

describe("requestReturnSchema", () => {
  const base = {
    orderCode: "EK2026-0001",
    reason: "San pham bi loi duong may.",
  };

  it("accepts a valid return request", () => {
    const r = requestReturnSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.reason).toBe("San pham bi loi duong may.");
  });

  it("rejects an empty orderCode", () => {
    expect(
      requestReturnSchema.safeParse({ ...base, orderCode: "" }).success,
    ).toBe(false);
  });

  it("rejects a reason shorter than 10 chars", () => {
    expect(
      requestReturnSchema.safeParse({ ...base, reason: "qua ngan" }).success,
    ).toBe(false);
  });

  it("rejects a reason longer than 1000 chars", () => {
    expect(
      requestReturnSchema.safeParse({ ...base, reason: "a".repeat(1001) }).success,
    ).toBe(false);
  });

  it("trims the reason before validating length", () => {
    const r = requestReturnSchema.safeParse({
      ...base,
      reason: "   valid reason here   ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.reason).toBe("valid reason here");
  });
});
