import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeFee } from "./pricing";

const listSchema = z.object({
  q: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  type: z.string().max(100).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).optional(),
  page: z.number().int().min(1).max(1000).optional(),
});

const PAGE_SIZE = 9;

// Public: returns only safe fields. Base price & fee are never returned.
export const listMasseurs = createServerFn({ method: "GET" })
  .inputValidator((d) => listSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getFeeConfig, signPaths } = await import("./storage.server");
    const cfg = await getFeeConfig(supabaseAdmin);
    const { data: rows, error } = await supabaseAdmin
      .from("masseurs")
      .select("id, display_name, location, massage_types, short_bio, base_price, demo_cover, created_at, user_id, masseur_photos(storage_path, is_public, is_primary)")
      .eq("status", "approved")
      .eq("is_published", true);
    if (error) throw new Error("Could not load listings");

    let suspended = new Set<string>();
    const uids = (rows ?? []).map((r) => r.user_id).filter(Boolean) as string[];
    if (uids.length) {
      const { data: s } = await supabaseAdmin.from("profiles").select("id").in("id", uids).eq("is_suspended", true);
      suspended = new Set((s ?? []).map((x) => x.id));
    }

    let items = (rows ?? [])
      .filter((r) => !r.user_id || !suspended.has(r.user_id))
      .map((r) => {
        const pub = (r.masseur_photos ?? []).filter((p) => p.is_public).sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
        return {
          id: r.id,
          display_name: r.display_name,
          location: r.location,
          massage_types: r.massage_types,
          short_bio: r.short_bio,
          final_price: r.base_price + computeFee(r.base_price, cfg),
          photo_path: pub[0]?.storage_path ?? null,
          demo_cover: r.demo_cover,
          created_at: r.created_at,
        };
      });

    const locations = [...new Set(items.map((i) => i.location).filter(Boolean))].sort();
    const types = [...new Set(items.flatMap((i) => i.massage_types))].sort();

    const q = data.q?.toLowerCase().trim();
    if (q) items = items.filter((i) => [i.display_name, i.short_bio, i.location, ...i.massage_types].join(" ").toLowerCase().includes(q));
    if (data.location) items = items.filter((i) => i.location === data.location);
    if (data.type) items = items.filter((i) => i.massage_types.includes(data.type!));
    const sort = data.sort ?? "newest";
    items.sort((a, b) =>
      sort === "price_asc" ? a.final_price - b.final_price
      : sort === "price_desc" ? b.final_price - a.final_price
      : sort === "name" ? a.display_name.localeCompare(b.display_name)
      : b.created_at.localeCompare(a.created_at),
    );

    const page = data.page ?? 1;
    const total = items.length;
    const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const urls = await signPaths(supabaseAdmin, slice.map((s) => s.photo_path).filter(Boolean) as string[], 3600);
    return {
      items: slice.map(({ photo_path, created_at, ...rest }) => ({ ...rest, photo: photo_path ? urls[photo_path] ?? null : rest.demo_cover })),
      total,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      page,
      locations,
      types,
    };
  });

export const getPublicMasseur = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getFeeConfig, signPaths } = await import("./storage.server");
    const { data: m } = await supabaseAdmin
      .from("masseurs")
      .select("id, display_name, location, massage_types, short_bio, bio, experience_years, base_price, demo_cover, user_id, status, is_published")
      .eq("id", data.id)
      .maybeSingle();
    if (!m || m.status !== "approved" || !m.is_published) return null;
    if (m.user_id) {
      const { data: p } = await supabaseAdmin.from("profiles").select("is_suspended").eq("id", m.user_id).maybeSingle();
      if (p?.is_suspended) return null;
    }
    const cfg = await getFeeConfig(supabaseAdmin);
    const [{ data: services }, { data: photos }] = await Promise.all([
      supabaseAdmin.from("masseur_services").select("id, name, description").eq("masseur_id", m.id).order("created_at"),
      supabaseAdmin.from("masseur_photos").select("storage_path, is_primary").eq("masseur_id", m.id).eq("is_public", true).order("is_primary", { ascending: false }),
    ]);
    const urls = await signPaths(supabaseAdmin, (photos ?? []).map((p) => p.storage_path), 3600);
    const photoUrls = (photos ?? []).map((p) => urls[p.storage_path]).filter(Boolean);
    return {
      id: m.id,
      display_name: m.display_name,
      location: m.location,
      massage_types: m.massage_types,
      short_bio: m.short_bio,
      bio: m.bio,
      experience_years: m.experience_years,
      final_price: m.base_price + computeFee(m.base_price, cfg),
      photos: photoUrls.length ? photoUrls : m.demo_cover ? [m.demo_cover] : [],
      services: services ?? [],
    };
  });
