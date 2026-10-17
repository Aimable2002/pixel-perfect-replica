import type { SupabaseClient } from "@supabase/supabase-js";

export async function signPaths(admin: SupabaseClient, paths: string[], seconds = 600) {
  if (!paths.length) return {} as Record<string, string>;
  const { data } = await admin.storage.from("masseur-photos").createSignedUrls(paths, seconds);
  const out: Record<string, string> = {};
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}

export async function getFeeConfig(admin: SupabaseClient) {
  const { data } = await admin.from("platform_settings").select("*").eq("id", 1).single();
  return data!;
}
