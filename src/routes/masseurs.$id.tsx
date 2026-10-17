import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublicMasseur } from "@/lib/directory.functions";
import { formatRWF } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Lock } from "lucide-react";

export const Route = createFileRoute("/masseurs/$id")({
  loader: async ({ params }) => {
    const m = await getPublicMasseur({ data: { id: params.id } });
    if (!m) throw notFound();
    return m;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.display_name} — Masseur in ${loaderData.location} | Umubiri` },
          { name: "description", content: loaderData.short_bio },
          { property: "og:title", content: `${loaderData.display_name} — Umubiri` },
          { property: "og:description", content: loaderData.short_bio },
        ]
      : [{ title: "Unavailable — Umubiri" }, { name: "robots", content: "noindex" }],
  }),
  component: Detail,
});

function Detail() {
  const m = Route.useLoaderData();
  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-3">
        {m.photos[0] && <img src={m.photos[0]} alt={m.display_name} className="aspect-[4/3] w-full rounded-xl object-cover" />}
        {m.photos.length > 1 && (
          <div className="grid grid-cols-3 gap-3">
            {m.photos.slice(1).map((p) => <img key={p} src={p} alt="" loading="lazy" className="aspect-square rounded-lg object-cover" />)}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-4xl font-semibold">{m.display_name}</h1>
        <p className="mt-2 flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{m.location} · {m.experience_years} yrs experience</p>
        <div className="mt-4 flex flex-wrap gap-2">{m.massage_types.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
        <p className="mt-6 whitespace-pre-line leading-relaxed">{m.bio || m.short_bio}</p>

        {m.services.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold">Services</h2>
            <ul className="mt-3 space-y-3">
              {m.services.map((s) => (
                <li key={s.id} className="rounded-lg border bg-card p-3"><p className="font-medium">{s.name}</p><p className="text-sm text-muted-foreground">{s.description}</p></li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">24-hour contact access</p>
          <p className="mt-1 text-3xl font-semibold text-primary">{formatRWF(m.final_price)}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-3.5 w-3.5" />Phone, WhatsApp and full gallery unlock after payment.</p>
          <Button asChild size="lg" className="mt-4 w-full"><Link to="/pay/$id" params={{ id: m.id }}>Unlock contact for 24 hours</Link></Button>
        </div>
      </div>
    </div>
  );
}
