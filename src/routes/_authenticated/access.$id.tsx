import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProtectedProfile } from "@/lib/customer.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, MessageCircle, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/access/$id")({
  head: () => ({ meta: [{ title: "Contact details — Umubiri" }, { name: "description", content: "View masseur contact details with active Umubiri access." }, { property: "og:title", content: "Contact details — Umubiri" }, { property: "og:description", content: "View masseur contact details with active Umubiri access." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Access,
});

function Access() {
  const { id } = Route.useParams();
  const fn = useServerFn(getProtectedProfile);
  const { data, isLoading, isError } = useQuery({ queryKey: ["access", id], queryFn: () => fn({ data: { masseurId: id } }) });

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin" />;
  if (isError) return <p className="text-center text-destructive">Could not load this page.</p>;
  if (!data?.allowed)
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold">No active access</h1>
        <p className="mt-2 text-muted-foreground">Your access has expired or hasn't been unlocked yet.</p>
        <Button asChild className="mt-6"><Link to="/pay/$id" params={{ id }}>Unlock for 24 hours</Link></Button>
      </div>
    );

  const { profile: p, contact: c, grant } = data;
  const wa = c.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-4xl font-semibold">{p.display_name}</h1>
        <p className="mt-1 text-muted-foreground">{p.location}</p>
        <div className="mt-6 space-y-3 rounded-xl border bg-card p-6">
          {c.phone && <Button asChild className="w-full justify-start" size="lg"><a href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone className="mr-2 h-4 w-4" />{c.phone}</a></Button>}
          {wa && <Button asChild variant="secondary" className="w-full justify-start" size="lg"><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>}
          {c.email && <Button asChild variant="outline" className="w-full justify-start"><a href={`mailto:${c.email}`}><Mail className="mr-2 h-4 w-4" />{c.email}</a></Button>}
          {c.other_info && <p className="text-sm">{c.other_info}</p>}
          {!c.phone && !wa && !c.email && <p className="text-sm text-muted-foreground">This masseur hasn't added contact details yet.</p>}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Contact {p.display_name} directly to arrange your appointment and pay for the session.</p>
        <p className="mt-2 text-xs text-muted-foreground">Access from {new Date(grant.starts_at).toLocaleString()} until {new Date(grant.expires_at).toLocaleString()}</p>
        <p className="mt-6 whitespace-pre-line">{p.bio}</p>
        {data.services.length === 0 && <p className="mt-6 text-muted-foreground">No services listed.</p>}
        {data.services.length > 0 && (
          <ul className="mt-6 space-y-2">{data.services.map((s) => <li key={s.id}><b>{s.name}</b> — <span className="text-muted-foreground">{s.description}</span></li>)}</ul>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 self-start">
        {data.photos.length === 0 && <p className="col-span-2 text-muted-foreground">No photos available.</p>}
        {data.photos.map((u) => <img data-zoom data-zoom-group="private" key={u} src={u} alt="" className="cursor-zoom-in aspect-square w-full rounded-lg object-cover" />)}
      </div>
    </div>
  );
}
