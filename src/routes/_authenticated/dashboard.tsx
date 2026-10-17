import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyListing, saveProfile, saveContact, addService, deleteService, registerPhoto, updatePhoto, deletePhoto } from "@/lib/masseur.functions";
import { formatRWF, computeBreakdown } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My listing — Umubiri" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

const card = "rounded-xl border bg-card p-6";

function Dashboard() {
  const fn = useServerFn(getMyListing);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-listing"], queryFn: () => fn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-listing"] });
  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin" />;
  if (!data) return <p className="text-center text-muted-foreground">This area is for masseur accounts.</p>;
  const { listing, pricing, stats } = data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">My listing</h1>
        <Badge>{listing.status}</Badge>
        <Badge variant="secondary">{listing.is_published ? "Published" : "Not published"}</Badge>
      </div>
      {listing.status === "pending" && <p className="rounded-lg bg-muted p-3 text-sm">Your listing is awaiting admin approval. Complete your profile, contact info and photos meanwhile.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}><p className="text-sm text-muted-foreground">Confirmed unlocks (recorded)</p><p className="text-3xl font-semibold">{stats.confirmedUnlocks}</p></div>
        <div className={card}><p className="text-sm text-muted-foreground">Customers with active access</p><p className="text-3xl font-semibold">{stats.activeAccess}</p></div>
      </div>
      <ProfileForm listing={listing} pricing={pricing} onSaved={refresh} />
      <ContactForm contact={data.contact} onSaved={refresh} />
      <Services services={data.services} onSaved={refresh} />
      <Photos photos={data.photos} onSaved={refresh} />
    </div>
  );
}

function ProfileForm({ listing, pricing, onSaved }: any) {
  const save = useServerFn(saveProfile);
  const [f, setF] = useState({ ...listing, massage_types: listing.massage_types.join(", ") });
  const [busy, setBusy] = useState(false);
  const fee = pricing.platform_fee;
  const base = Number(f.base_price) || 0;
  const preview = computeBreakdown(base, { fee_type: "fixed", fee_value: fee });
  const submit = async () => {
    setBusy(true);
    try {
      await save({ data: {
        display_name: f.display_name, location: f.location, short_bio: f.short_bio, bio: f.bio,
        experience_years: Number(f.experience_years) || 0, base_price: base,
        massage_types: f.massage_types.split(",").map((s: string) => s.trim()).filter(Boolean),
      } });
      toast.success("Profile saved"); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const field = (k: string, label: string, type = "text") => (
    <div><Label>{label}</Label><Input type={type} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <section className={card}>
      <h2 className="text-xl font-semibold">Profile & price</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {field("display_name", "Display name")}
        {field("location", "Location (e.g. Kigali)")}
        {field("massage_types", "Massage types (comma separated)")}
        {field("experience_years", "Years of experience", "number")}
        <div className="md:col-span-2">{field("short_bio", "Short description")}</div>
        <div className="md:col-span-2"><Label>Biography</Label><Textarea rows={5} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <div>
          <Label>Your base price (RWF), {formatRWF(pricing.min)} – {formatRWF(pricing.max)}</Label>
          <Input type="number" value={f.base_price} onChange={(e) => setF({ ...f, base_price: e.target.value })} />
        </div>
        <div className="rounded-lg bg-muted p-4 text-sm">
          <p>Your base price: <b>{formatRWF(preview.base_price)}</b></p>
          <p>Platform fee: <b>{formatRWF(preview.platform_fee)}</b></p>
          <p>Customer pays: <b>{formatRWF(preview.total)}</b></p>
        </div>
      </div>
      <Button className="mt-4" disabled={busy} onClick={submit}>Save profile</Button>
    </section>
  );
}

function ContactForm({ contact, onSaved }: any) {
  const save = useServerFn(saveContact);
  const [f, setF] = useState({ phone: "", whatsapp: "", email: "", other_info: "", ...(contact ?? {}) });
  useEffect(() => { if (contact) setF((p: any) => ({ ...p, ...contact })); }, [contact]);
  const submit = async () => {
    try {
      await save({ data: { phone: f.phone ?? "", whatsapp: f.whatsapp ?? "", email: f.email ?? "", other_info: f.other_info ?? "" } });
      toast.success("Contact info saved"); onSaved();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <section className={card}>
      <h2 className="text-xl font-semibold">Private contact info</h2>
      <p className="text-sm text-muted-foreground">Only shown to customers with active paid access.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(["phone", "whatsapp", "email"] as const).map((k) => (
          <div key={k}><Label className="capitalize">{k}</Label><Input value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        <div><Label>Other info</Label><Input value={f.other_info ?? ""} onChange={(e) => setF({ ...f, other_info: e.target.value })} /></div>
      </div>
      <Button className="mt-4" onClick={submit}>Save contact</Button>
    </section>
  );
}

function Services({ services, onSaved }: any) {
  const add = useServerFn(addService);
  const del = useServerFn(deleteService);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <section className={card}>
      <h2 className="text-xl font-semibold">Services</h2>
      <ul className="mt-4 space-y-2">
        {services.map((s: any) => (
          <li key={s.id} className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="font-medium">{s.name}</p><p className="text-sm text-muted-foreground">{s.description}</p></div>
            <Button variant="ghost" size="icon" onClick={async () => { await del({ data: { id: s.id } }); onSaved(); }}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
        <Input placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <Button onClick={async () => {
          try { await add({ data: { name, description: desc } }); setName(""); setDesc(""); onSaved(); } catch (e) { toast.error((e as Error).message); }
        }}>Add</Button>
      </div>
    </section>
  );
}

function Photos({ photos, onSaved }: any) {
  const reg = useServerFn(registerPhoto);
  const upd = useServerFn(updatePhoto);
  const del = useServerFn(deletePhoto);
  const [busy, setBusy] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const upload = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Use JPG, PNG or WEBP"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = `${u.user!.id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("masseur-photos").upload(path, file, { contentType: file.type });
      if (error) throw error;
      await reg({ data: { path, is_public: isPublic } });
      toast.success("Photo uploaded"); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <section className={card}>
      <h2 className="text-xl font-semibold">Photos</h2>
      <p className="text-sm text-muted-foreground">Public photos appear on your listing. Private photos are only visible to customers with paid access.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><Switch checked={isPublic} onCheckedChange={setIsPublic} />Upload as public</label>
        <Input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="max-w-xs" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {photos.map((p: any) => (
          <div key={p.id} className="overflow-hidden rounded-lg border">
            {p.url && <img data-zoom data-zoom-group="mine" src={p.url} alt="" className="cursor-zoom-in aspect-square w-full object-cover" />}
            <div className="flex items-center justify-between p-2 text-xs">
              <label className="flex items-center gap-1"><Switch checked={p.is_public} onCheckedChange={async (v) => { await upd({ data: { id: p.id, is_public: v } }); onSaved(); }} />{p.is_public ? "Public" : "Private"}</label>
              <div className="flex">
                <Button variant="ghost" size="icon" title="Make primary" onClick={async () => { await upd({ data: { id: p.id, is_primary: true } }); onSaved(); }}><Star className={`h-4 w-4 ${p.is_primary ? "fill-primary text-primary" : ""}`} /></Button>
                <Button variant="ghost" size="icon" onClick={async () => { await del({ data: { id: p.id } }); onSaved(); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
