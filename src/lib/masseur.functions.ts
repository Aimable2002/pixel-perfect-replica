import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeBreakdown } from "./pricing";

// All writes go through the user's own client: RLS + triggers restrict to their own listing.

export const getMyListing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: m } = await sb.from("masseurs").select("*").eq("user_id", context.userId).maybeSingle();
    if (!m) return null;
    const [{ data: contact }, { data: services }, { data: photos }, { data: cfg }] = await Promise.all([
      sb.from("masseur_contacts").select("*").eq("masseur_id", m.id).maybeSingle(),
      sb.from("masseur_services").select("*").eq("masseur_id", m.id).order("created_at"),
      sb.from("masseur_photos").select("*").eq("masseur_id", m.id).order("created_at"),
      sb.from("platform_settings").select("*").eq("id", 1).single(),
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signPaths } = await import("./storage.server");
    const urls = await signPaths(supabaseAdmin, (photos ?? []).map((p) => p.storage_path));
    const { count: paid } = await supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("masseur_id", m.id).eq("status", "success");
    const { count: active } = await supabaseAdmin.from("access_grants").select("id", { count: "exact", head: true }).eq("masseur_id", m.id).gt("expires_at", new Date().toISOString());
    return {
      listing: m,
      contact,
      services: services ?? [],
      photos: (photos ?? []).map((p) => ({ ...p, url: urls[p.storage_path] ?? null })),
      pricing: { ...computeBreakdown(m.base_price, cfg!), min: cfg!.min_base_price, max: cfg!.max_base_price },
      stats: { confirmedUnlocks: paid ?? 0, activeAccess: active ?? 0 },
    };
  });

const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(80),
  massage_types: z.array(z.string().trim().min(1).max(40)).max(12),
  short_bio: z.string().trim().max(200),
  bio: z.string().trim().max(3000),
  experience_years: z.number().int().min(0).max(60),
  base_price: z.number().int().min(0).max(10_000_000),
});

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("masseurs").update(data).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const contactSchema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,18}$/, "Invalid phone").or(z.literal("")),
  whatsapp: z.string().trim().regex(/^\+?[0-9 ]{9,18}$/, "Invalid WhatsApp number").or(z.literal("")),
  email: z.string().trim().email().or(z.literal("")),
  other_info: z.string().trim().max(500),
});

async function myMasseurId(sb: any, userId: string) {
  const { data } = await sb.from("masseurs").select("id").eq("user_id", userId).single();
  if (!data) throw new Error("No listing");
  return data.id as string;
}

export const saveContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => contactSchema.parse(d))
  .handler(async ({ data, context }) => {
    const id = await myMasseurId(context.supabase, context.userId);
    const { error } = await context.supabase.from("masseur_contacts").upsert({ masseur_id: id, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const id = await myMasseurId(context.supabase, context.userId);
    const { error } = await context.supabase.from("masseur_services").insert({ masseur_id: id, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("masseur_services").delete().eq("id", data.id);
    return { ok: true };
  });

export const registerPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().min(5).max(300), is_public: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Invalid path");
    const id = await myMasseurId(context.supabase, context.userId);
    const { error } = await context.supabase.from("masseur_photos").insert({ masseur_id: id, storage_path: data.path, is_public: data.is_public });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), is_public: z.boolean().optional(), is_primary: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.is_primary) {
      const id = await myMasseurId(sb, context.userId);
      await sb.from("masseur_photos").update({ is_primary: false }).eq("masseur_id", id);
    }
    const patch: { is_public?: boolean; is_primary?: boolean } = {};
    if (data.is_public !== undefined) patch.is_public = data.is_public;
    if (data.is_primary !== undefined) patch.is_primary = data.is_primary;
    const { error } = await sb.from("masseur_photos").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: p } = await sb.from("masseur_photos").select("storage_path").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("Not found");
    await sb.storage.from("masseur-photos").remove([p.storage_path]);
    await sb.from("masseur_photos").delete().eq("id", data.id);
    return { ok: true };
  });
