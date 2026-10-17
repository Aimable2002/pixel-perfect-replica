import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { myAccess } from "@/lib/customer.functions";
import { formatRWF } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-access")({
  head: () => ({ meta: [{ title: "My access — Umubiri" }, { name: "robots", content: "noindex" }] }),
  component: MyAccess,
});

function MyAccess() {
  const fn = useServerFn(myAccess);
  const { data, isLoading } = useQuery({ queryKey: ["my-access"], queryFn: () => fn() });
  if (isLoading || !data) return <Loader2 className="mx-auto h-6 w-6 animate-spin" />;
  const now = Date.now();
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold">My access</h1>
        {data.grants.length === 0 ? <p className="mt-4 text-muted-foreground">No unlocks yet.</p> : (
          <ul className="mt-4 divide-y rounded-xl border bg-card">
            {data.grants.map((g: any) => {
              const active = new Date(g.expires_at).getTime() > now;
              return (
                <li key={g.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{g.masseurs?.display_name}</p>
                    <p className="text-xs text-muted-foreground">Until {new Date(g.expires_at).toLocaleString()}</p>
                  </div>
                  {active ? <Link className="text-sm text-primary underline" to="/access/$id" params={{ id: g.masseur_id }}>Open contact</Link> : <Badge variant="secondary">Expired</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-2xl font-semibold">Payments</h2>
        <ul className="mt-4 divide-y rounded-xl border bg-card">
          {data.payments.map((p: any) => (
            <li key={p.id} className="flex items-center justify-between p-4 text-sm">
              <span>{p.masseurs?.display_name} · {new Date(p.created_at).toLocaleString()}</span>
              <span className="flex items-center gap-3">{formatRWF(p.total)}<Badge variant={p.status === "success" ? "default" : "secondary"}>{p.status}</Badge></span>
            </li>
          ))}
          {data.payments.length === 0 && <li className="p-4 text-muted-foreground">No payments yet.</li>}
        </ul>
      </section>
    </div>
  );
}
