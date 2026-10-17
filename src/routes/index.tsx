import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { useState, useEffect } from "react";
import { listMasseurs } from "@/lib/directory.functions";
import { formatRWF } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

const search = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).optional(),
  page: z.number().int().min(1).optional(),
});
type S = z.infer<typeof search>;

const listQuery = (s: S) => queryOptions({ queryKey: ["masseurs", s], queryFn: () => listMasseurs({ data: s }) });

export const Route = createFileRoute("/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Find a masseur in Rwanda — Umubiri" },
      { name: "description", content: "Browse approved masseurs in Kigali, Musanze, Rubavu and beyond. Unlock contact details for 24 hours." },
      { property: "og:title", content: "Find a masseur in Rwanda — Umubiri" },
      { property: "og:description", content: "Browse approved masseurs across Rwanda and unlock contact for 24 hours." },
    ],
  }),
  component: Index,
});

const selectCls = "h-10 rounded-md border border-input bg-card px-3 text-sm";

function Index() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [q, setQ] = useState(s.q ?? "");
  const { data, isLoading, isError, refetch } = useQuery({ ...listQuery(s), placeholderData: keepPreviousData });
  const set = (patch: Partial<S>) => navigate({ search: (p: S) => ({ ...p, ...patch, page: patch.page ?? undefined }) });

  useEffect(() => {
    const t = setTimeout(() => { if ((s.q ?? "") !== q) set({ q: q || undefined }); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-semibold md:text-5xl">Masseurs across Rwanda</h1>
        <p className="mt-2 text-muted-foreground">Pick a therapist, unlock their contact for 24 hours, and arrange your session directly.</p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <Input placeholder="Search name, style, keyword…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 bg-card" />
        <select className={selectCls} value={s.location ?? ""} onChange={(e) => set({ location: e.target.value || undefined })}>
          <option value="">All locations</option>
          {data?.locations.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select className={selectCls} value={s.type ?? ""} onChange={(e) => set({ type: e.target.value || undefined })}>
          <option value="">All massage types</option>
          {data?.types.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select className={selectCls} value={s.sort ?? "newest"} onChange={(e) => set({ sort: e.target.value as S["sort"] })}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name">Name</option>
        </select>
      </div>

      {isError ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p>Couldn't load listings.</p>
          <Button className="mt-4" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : isLoading || !data ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">No masseurs match your filters.</div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((m) => (
              <article key={m.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md">
                <div className="aspect-[5/4] overflow-hidden bg-muted">
                  {m.photo && <img src={m.photo} alt={m.display_name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-semibold">{m.display_name}</h2>
                    <span className="whitespace-nowrap font-semibold text-primary">{formatRWF(m.final_price)}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{m.location}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{m.massage_types.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
                  <p className="mt-3 line-clamp-2 text-sm">{m.short_bio}</p>
                  <Button asChild className="mt-4 w-full"><Link to="/masseurs/$id" params={{ id: m.id }}>View details</Link></Button>
                </div>
              </article>
            ))}
          </div>
          {data.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={data.page <= 1} onClick={() => set({ page: data.page - 1 })}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {data.page} of {data.pages}</span>
              <Button variant="outline" disabled={data.page >= data.pages} onClick={() => set({ page: data.page + 1 })}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
