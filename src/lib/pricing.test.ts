import { describe, it, expect } from "vitest";
import { computeBreakdown } from "./pricing";

describe("pricing", () => {
  it("customer total = base 5000 + fixed fee 1000 = 6000", () => {
    expect(computeBreakdown(5000, { fee_type: "fixed", fee_value: 1000 })).toEqual({
      base_price: 5000,
      platform_fee: 1000,
      total: 6000,
    });
  });
  it("percent fee option: 10% of 5000 = 500", () => {
    expect(computeBreakdown(5000, { fee_type: "percent", fee_value: 10 }).total).toBe(5500);
  });
});
