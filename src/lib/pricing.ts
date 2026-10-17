export type FeeConfig = { fee_type: "fixed" | "percent" | string; fee_value: number };

/** Platform fee for a given masseur base price. Fixed RWF today; percent supported for later. */
export function computeFee(base: number, cfg: FeeConfig): number {
  if (cfg.fee_type === "percent") return Math.round((base * cfg.fee_value) / 100);
  return cfg.fee_value;
}

export function computeBreakdown(base: number, cfg: FeeConfig) {
  const platform_fee = computeFee(base, cfg);
  return { base_price: base, platform_fee, total: base + platform_fee };
}

export function formatRWF(n: number) {
  return `${new Intl.NumberFormat("en-RW").format(n)} RWF`;
}
