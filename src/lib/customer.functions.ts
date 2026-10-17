import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeBreakdown, computeFee } from "./pricing";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function ensureActive(userId: string) {
  const a = await admin();
  const { data } = await a.from("profiles").select("is_suspended").eq("id", userId).maybeSingle();
  if (data?.is_suspended) throw new Error("Your account is suspended");
}

/** Server computes the price — never trusts client totals. */
export const getQuote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ masseurId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { getFeeConfig } = await import("./storage.server");
    const { data: m } = await a.from("masseurs").select("id, display_name, base_price, status, is_published").eq("id", data.masseurId).maybeSingle();
    if (!m || m.status !== "approved" || !m.is_published) throw new Error("Listing not available");
    const cfg = await getFeeConfig(a);
    return { masseurId: m.id, display_name: m.display_name, total: m.base_price + computeFee(m.base_price, cfg), hours: cfg.access_hours };
  });

export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ masseurId: z.string().uuid(), phone: z.string().regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number") }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureActive(context.userId);
    const a = await admin();
    const { getFeeConfig } = await import("./storage.server");
    const { initiatePayment } = await import("./payment-backend.server");
    const { data: m } = await a.from("masseurs").select("id, display_name, base_price, status, is_published").eq("id", data.masseurId).maybeSingle();
    if (!m || m.status !== "approved" || !m.is_published) throw new Error("Listing not available");
    const cfg = await getFeeConfig(a);
    const b = computeBreakdown(m.base_price, cfg);
    const { data: pay, error } = await a
      .from("payments")
      .insert({ customer_id: context.userId, masseur_id: m.id, ...b, status: "pending" })
      .select("id")
      .single();
    if (error || !pay) throw new Error("Could not create payment");
    try {
      const res = await initiatePayment({ paymentId: pay.id, amount: b.total, currency: "RWF", phone: data.phone, description: `24h contact access: ${m.display_name}` });
      await a.from("payments").update({ backend_reference: res.reference, instructions: res.instructions, updated_at: new Date().toISOString() }).eq("id", pay.id);
    } catch (e) {
      console.error("payment initiation failed", e);
      await a.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", pay.id);
      throw new Error("Payment service unavailable, please try again");
    }
    return { paymentId: pay.id };
  });

/** Polls trusted backend status; creates access grant once on confirmed success. */
export const checkPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await admin();
    const { getPaymentStatus } = await import("./payment-backend.server");
    const { data: p } = await a.from("payments").select("*").eq("id", data.paymentId).eq("customer_id", context.userId).maybeSingle();
    if (!p) throw new Error("Payment not found");
    let status = p.status;
    if (status === "pending" && p.backend_reference) {
      status = await getPaymentStatus(p.backend_reference);
      if (status !== "pending") await a.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("id", p.id).eq("status", "pending");
    }
    if (status === "success") {
      const { data: g } = await a.from("access_grants").select("id").eq("payment_id", p.id).maybeSingle();
      if (!g) {
        const { getFeeConfig } = await import("./storage.server");
        const cfg = await getFeeConfig(a);
        const now = new Date();
        await a.from("access_grants").upsert(
          { customer_id: p.customer_id, masseur_id: p.masseur_id, payment_id: p.id, starts_at: now.toISOString(), expires_at: new Date(now.getTime() + cfg.access_hours * 3600_000).toISOString() },
          { onConflict: "payment_id", ignoreDuplicates: true },
        );
      }
    }
    return { status, total: p.total, instructions: p.instructions, masseurId: p.masseur_id };
  });

export const cancelPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await admin();
    // Local cancel only marks our record; the backend remains the source of truth for money.
    await a.from("payments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", data.paymentId).eq("customer_id", context.userId).eq("status", "pending");
    return { ok: true };
  });

export const getProtectedProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ masseurId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await admin();
    const { signPaths } = await import("./storage.server");
    const { data: grant } = await a
      .from("access_grants")
      .select("starts_at, expires_at")
      .eq("customer_id", context.userId)
      .eq("masseur_id", data.masseurId)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!grant) return { allowed: false as const };
    const [{ data: m }, { data: c }, { data: photos }, { data: services }] = await Promise.all([
      a.from("masseurs").select("display_name, location, massage_types, bio, experience_years, demo_cover").eq("id", data.masseurId).single(),
      a.from("masseur_contacts").select("phone, whatsapp, email, other_info").eq("masseur_id", data.masseurId).maybeSingle(),
      a.from("masseur_photos").select("storage_path").eq("masseur_id", data.masseurId).order("is_primary", { ascending: false }),
      a.from("masseur_services").select("id, name, description").eq("masseur_id", data.masseurId),
    ]);
    const urls = await signPaths(a, (photos ?? []).map((p) => p.storage_path), 600);
    const gallery = (photos ?? []).map((p) => urls[p.storage_path]).filter(Boolean);
    return {
      allowed: true as const,
      grant,
      profile: m!,
      contact: c ?? { phone: null, whatsapp: null, email: null, other_info: null },
      photos: gallery.length ? gallery : m?.demo_cover ? [m.demo_cover] : [],
      services: services ?? [],
    };
  });

export const myAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const a = await admin();
    const [{ data: grants }, { data: payments }] = await Promise.all([
      a.from("access_grants").select("id, masseur_id, starts_at, expires_at, masseurs(display_name)").eq("customer_id", context.userId).order("created_at", { ascending: false }),
      a.from("payments").select("id, masseur_id, total, status, created_at, masseurs(display_name)").eq("customer_id", context.userId).order("created_at", { ascending: false }).limit(50),
    ]);
    return { grants: grants ?? [], payments: payments ?? [] };
  });
