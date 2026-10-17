import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeBreakdown } from "./pricing";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function audit(a: any, actor: string, action: string, target: string, details: object = {}) {
  await a.from("audit_logs").insert({ actor_id: actor, action, target, details });
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const a = await requireAdmin(context);
    const [{ data: masseurs }, { data: profiles }, { data: roles }, { data: settings }, { data: payments }, { data: grants }, { data: logs }] = await Promise.all([
      a.from("masseurs").select("id, user_id, display_name, location, base_price, status, is_published, is_demo, created_at").order("created_at", { ascending: false }),
      a.from("profiles").select("id, display_name, email, is_suspended, created_at").order("created_at", { ascending: false }),
      a.from("user_roles").select("user_id, role"),
      a.from("platform_settings").select("*").eq("id", 1).single(),
      a.from("payments").select("id, customer_id, masseur_id, base_price, platform_fee, total, status, backend_reference, created_at, masseurs(display_name)").order("created_at", { ascending: false }).limit(200),
      a.from("access_grants").select("id, customer_id, masseur_id, payment_id, starts_at, expires_at, masseurs(display_name)").order("created_at", { ascending: false }).limit(200),
      a.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    const roleMap: Record<string, string[]> = {};
    (roles ?? []).forEach((r: any) => (roleMap[r.user_id] ??= []).push(r.role));
    const emails: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => (emails[p.id] = p.email));
    const ps = payments ?? [];
    const ok = ps.filter((p: any) => p.status === "success");
    return {
      masseurs: (masseurs ?? []).map((m: any) => ({ ...m, ...computeBreakdown(m.base_price, settings!) })),
      users: (profiles ?? []).map((p: any) => ({ ...p, roles: roleMap[p.id] ?? [] })),
      settings: settings!,
      payments: ps.map((p: any) => ({ ...p, customer_email: emails[p.customer_id] ?? p.customer_id })),
      grants: (grants ?? []).map((g: any) => ({ ...g, customer_email: emails[g.customer_id] ?? g.customer_id })),
      logs: logs ?? [],
      totals: {
        count: { success: ok.length, pending: ps.filter((p: any) => p.status === "pending").length, failed: ps.filter((p: any) => p.status === "failed").length, cancelled: ps.filter((p: any) => p.status === "cancelled").length },
        volume: ok.reduce((s: number, p: any) => s + p.total, 0),
        fees: ok.reduce((s: number, p: any) => s + p.platform_fee, 0),
      },
    };
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(), is_published: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const a = await requireAdmin(context);
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.is_published !== undefined) patch.is_published = data.is_published;
    const { error } = await a.from("masseurs").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(a, context.userId, "listing.update", data.id, patch);
    return { ok: true };
  });

export const setUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), suspended: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await requireAdmin(context);
    if (data.id === context.userId) throw new Error("You cannot suspend yourself");
    await a.from("profiles").update({ is_suspended: data.suspended }).eq("id", data.id);
    await audit(a, context.userId, data.suspended ? "user.suspend" : "user.reactivate", data.id);
    return { ok: true };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ fee_value: z.number().int().min(0).max(1_000_000), min_base_price: z.number().int().min(0), max_base_price: z.number().int().min(1) })
      .refine((v) => v.max_base_price >= v.min_base_price, "Max must be ≥ min")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const a = await requireAdmin(context);
    // Effective policy: applies to payments created after this change; past payments keep their stored breakdown.
    await a.from("platform_settings").update({ ...data, fee_type: "fixed", updated_at: new Date().toISOString() }).eq("id", 1);
    await audit(a, context.userId, "settings.update", "platform_settings", data);
    return { ok: true };
  });
