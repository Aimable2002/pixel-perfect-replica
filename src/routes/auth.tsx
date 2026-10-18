import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Sign in — Umubiri" },
      { name: "description", content: "Sign in or create a customer or masseur account." },
      { property: "og:title", content: "Sign in — Umubiri" },
      { property: "og:description", content: "Sign in or create an account on Umubiri." },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  if (!p) return "/";
  try {
    const u = new URL(p, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : "/";
  } catch { return "/"; }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [type, setType] = useState<"customer" | "masseur">("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: safePath(redirect) as "/" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name, account_type: type } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: type === "masseur" ? "/dashboard" : (safePath(redirect) as "/") });
        else toast.success("Check your email to confirm your account.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "up" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(["customer", "masseur"] as const).map((t) => (
                <Button key={t} type="button" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>
                  {t === "customer" ? "I'm a customer" : "I'm a masseur"}
                </Button>
              ))}
            </div>
            <div><Label>Display name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          </>
        )}
        <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>Password</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Sign up"}</Button>
      </form>
      <button className="mt-4 text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
