import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminOverview, setListingStatus, setUserSuspended, updateSettings } from "@/lib/admin.functions";
import { formatRWF } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Umubiri" }, { name: "description", content: "Manage Umubiri listings, users, payments and platform settings." }, { property: "og:title", content: "Admin — Umubiri" }, { property: "og:description", content: "Manage Umubiri listings, users, payments and platform settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

const th = "p-2 text-left font-medium text-muted-foreground";
const td = "p-2 align-top";

function Admin() {
  const fn = useServerFn(adminOverview);
  const setStatus = useServerFn(setListingStatus);
  const suspend = useServerFn(setUserSuspended);
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["admin"], queryFn: () => fn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const act = async (p: Promise<unknown>) => { try { await p; toast.success("Updated"); refresh(); } catch (e) { toast.error((e as Error).message); } };

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin" />;
  if (isError) return <p className="text-center text-destructive">{(error as Error).message === "Forbidden" ? "Admins only." : "Failed to load."}</p>;
  if (!data) return <p className="py-10 text-center text-muted-foreground">No admin information available.</p>;
  const d = data;
  return (
    <div>
      <h1 className="text-3xl font-semibold">Admin</h1>
      <Tabs defaultValue="listings" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="grants">Access grants</TabsTrigger>
          <TabsTrigger value="settings">Fees & settings</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Name</th><th className={th}>Status</th><th className={th}>Base / Fee / Total</th><th className={th}>Actions</th></tr></thead>
            <tbody>
              {d.masseurs.map((m: any) => (
                <tr key={m.id} className="border-t">
                  <td className={td}>{m.display_name} {m.is_demo && <Badge variant="outline">demo</Badge>}<div className="text-xs text-muted-foreground">{m.location}</div></td>
                  <td className={td}><Badge>{m.status}</Badge> <Badge variant="secondary">{m.is_published ? "published" : "hidden"}</Badge></td>
                  <td className={td}>{formatRWF(m.base_price)} / {formatRWF(m.platform_fee)} / <b>{formatRWF(m.total)}</b></td>
                  <td className={`${td} space-x-1 whitespace-nowrap`}>
                    {m.status !== "approved" && <Button size="sm" onClick={() => act(setStatus({ data: { id: m.id, status: "approved", is_published: true } }))}
              {d.masseurs.length === 0 && <tr><td colSpan=4 className="p-6 text-center text-muted-foreground">No listings yet.</td></tr>}>Approve & publish</Button>}
                    {m.status === "pending" && <Button size="sm" variant="outline" onClick={() => act(setStatus({ data: { id: m.id, status: "rejected" } }))}>Reject</Button>}
                    {m.status === "approved" && <Button size="sm" variant="outline" onClick={() => act(setStatus({ data: { id: m.id, is_published: !m.is_published } }))}>{m.is_published ? "Unpublish" : "Publish"}</Button>}
                    {m.status === "approved" && <Button size="sm" variant="destructive" onClick={() => act(setStatus({ data: { id: m.id, status: "suspended" } }))}>Suspend</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="users" className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>User</th><th className={th}>Roles</th><th className={th}>State</th><th className={th}></th></tr></thead>
            <tbody>
              {d.users.map((u: any) => (
                <tr key={u.id} className="border-t">
                  <td className={td}>{u.display_name}<div className="text-xs text-muted-foreground">{u.email}</div></td>
                  <td className={td}>{u.roles.join(", ")}</td>
                  <td className={td}>{u.is_suspended ? <Badge variant="destructive">suspended</Badge> : <Badge variant="secondary">active</Badge>}</td>
                  <td className={td}><Button size="sm" variant="outline" onClick={() => act(suspend({ data: { id: u.id, suspended: !u.is_suspended } }))}
              {d.users.length === 0 && <tr><td colSpan=4 className="p-6 text-center text-muted-foreground">No users yet.</td></tr>}>{u.is_suspended ? "Reactivate" : "Suspend"}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Confirmed payment volume (recorded)" value={formatRWF(d.totals.volume)} />
            <Stat label="Platform fees recorded" value={formatRWF(d.totals.fees)} />
            <Stat label="Success / pending / failed / cancelled" value={`${d.totals.count.success} / ${d.totals.count.pending} / ${d.totals.count.failed} / ${d.totals.count.cancelled}`} />
          </div>
          <p className="text-xs text-muted-foreground">Amounts are recorded from payment confirmations; settlement is not verified here.</p>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Date</th><th className={th}>Customer</th><th className={th}>Masseur</th><th className={th}>Base</th><th className={th}>Fee</th><th className={th}>Total</th><th className={th}>Status</th><th className={th}>Reference</th></tr></thead>
              <tbody>
                {d.payments.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className={td}>{new Date(p.created_at).toLocaleString()}</td><td className={td}>{p.customer_email}</td><td className={td}>{p.masseurs?.display_name}</td>
                    <td className={td}>{formatRWF(p.base_price)}</td><td className={td}>{formatRWF(p.platform_fee)}</td><td className={td}>{formatRWF(p.total)}</td>
                    <td className={td}><Badge variant={p.status === "success" ? "default" : "secondary"}>{p.status}</Badge></td><td className={`${td} text-xs`}>{p.backend_reference}</td>
                  </tr>
                ))}
              {d.payments.length === 0 && <tr><td colSpan=8 className="p-6 text-center text-muted-foreground">No payments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="grants" className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Customer</th><th className={th}>Masseur</th><th className={th}>Start</th><th className={th}>Expires</th><th className={th}>State</th></tr></thead>
            <tbody>
              {d.grants.map((g: any) => (
                <tr key={g.id} className="border-t">
                  <td className={td}>{g.customer_email}</td><td className={td}>{g.masseurs?.display_name}</td>
                  <td className={td}>{new Date(g.starts_at).toLocaleString()}</td><td className={td}>{new Date(g.expires_at).toLocaleString()}</td>
                  <td className={td}>{new Date(g.expires_at) > new Date() ? <Badge>active</Badge> : <Badge variant="secondary">expired</Badge>}</td>
                </tr>
              ))}
              {d.grants.length === 0 && <tr><td colSpan=5 className="p-6 text-center text-muted-foreground">No access grants yet.</td></tr>}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="settings">{d.settings ? <SettingsForm settings={d.settings} onSaved={refresh} /> : <p className="py-6 text-muted-foreground">Platform settings are not configured.</p>}</TabsContent>

        <TabsContent value="audit" className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <tbody>
              {d.logs.map((l: any) => (
                <tr key={l.id} className="border-t"><td className={td}>{new Date(l.created_at).toLocaleString()}</td><td className={td}>{l.action}</td><td className={`${td} text-xs`}>{l.target}</td><td className={`${td} text-xs`}>{JSON.stringify(l.details)}</td></tr>
              ))}
              {d.logs.length === 0 && <tr><td className={td}>No entries yet.</td></tr>}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}

function SettingsForm({ settings, onSaved }: any) {
  const save = useServerFn(updateSettings);
  const [f, setF] = useState(settings);
  useEffect(() => setF(settings), [settings]);
  return (
    <div className="max-w-lg rounded-xl border bg-card p-6">
      <p className="text-sm text-muted-foreground">Fee changes apply to new payments only. Existing payments keep their original breakdown.</p>
      <div className="mt-4 space-y-4">
        <div><Label>Fixed platform fee (RWF)</Label><Input type="number" value={f.fee_value} onChange={(e) => setF({ ...f, fee_value: e.target.value })} /></div>
        <div><Label>Minimum masseur base price (RWF)</Label><Input type="number" value={f.min_base_price} onChange={(e) => setF({ ...f, min_base_price: e.target.value })} /></div>
        <div><Label>Maximum masseur base price (RWF)</Label><Input type="number" value={f.max_base_price} onChange={(e) => setF({ ...f, max_base_price: e.target.value })} /></div>
        <Button onClick={async () => {
          try { await save({ data: { fee_value: Number(f.fee_value), min_base_price: Number(f.min_base_price), max_base_price: Number(f.max_base_price) } }); toast.success("Settings saved"); onSaved(); }
          catch (e) { toast.error((e as Error).message); }
        }}>Save settings</Button>
      </div>
    </div>
  );
}
