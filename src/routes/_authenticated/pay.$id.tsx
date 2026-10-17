import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { getQuote, startPayment, checkPayment, cancelPayment } from "@/lib/customer.functions";
import { formatRWF } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pay/$id")({
  validateSearch: z.object({ payment: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Unlock contact — Umubiri" }, { name: "robots", content: "noindex" }] }),
  component: Pay,
});

function Pay() {
  const { id } = Route.useParams();
  const { payment } = Route.useSearch();
  const navigate = useNavigate({ from: "/pay/$id" });
  const quoteFn = useServerFn(getQuote);
  const startFn = useServerFn(startPayment);
  const checkFn = useServerFn(checkPayment);
  const cancelFn = useServerFn(cancelPayment);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const quote = useQuery({ queryKey: ["quote", id], queryFn: () => quoteFn({ data: { masseurId: id } }) });
  const status = useQuery({
    queryKey: ["payment", payment],
    queryFn: () => checkFn({ data: { paymentId: payment! } }),
    enabled: !!payment,
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
  });

  useEffect(() => {
    if (status.data?.status === "success") {
      const t = setTimeout(() => navigate({ to: "/access/$id", params: { id } }), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [status.data?.status]);

  const start = async () => {
    setBusy(true);
    try {
      const r = await startFn({ data: { masseurId: id, phone: phone.replace(/\s/g, "") } });
      navigate({ search: { payment: r.paymentId } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  if (quote.isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin" />;
  if (quote.isError) return <p className="text-center text-destructive">{(quote.error as Error).message}</p>;
  const q = quote.data!;

  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
      <p className="text-sm text-muted-foreground">Unlock contact for {q.hours} hours</p>
      <h1 className="mt-1 text-3xl font-semibold">{q.display_name}</h1>
      <p className="mt-4 text-4xl font-semibold text-primary">{formatRWF(q.total)}</p>

      {!payment ? (
        <div className="mt-6 space-y-4">
          <div>
            <Label>Mobile money number</Label>
            <Input placeholder="+250 78x xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button className="w-full" size="lg" disabled={busy || phone.length < 9} onClick={start}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Pay {formatRWF(q.total)}
          </Button>
        </div>
      ) : status.isLoading || !status.data ? (
        <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin" />
      ) : status.data.status === "pending" ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 font-medium"><Loader2 className="h-4 w-4 animate-spin" />Waiting for confirmation…</div>
          <p className="rounded-lg bg-muted p-4 text-sm">{status.data.instructions}</p>
          <Button variant="outline" onClick={async () => { await cancelFn({ data: { paymentId: payment } }); status.refetch(); }}>Cancel</Button>
        </div>
      ) : status.data.status === "success" ? (
        <div className="mt-6 flex items-center gap-2 text-success"><CheckCircle2 className="h-5 w-5" />Payment confirmed — opening contact page…</div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" />Payment {status.data.status}.</div>
          <Button onClick={() => navigate({ search: {} })}>Try again</Button>
        </div>
      )}
      <Link to="/masseurs/$id" params={{ id }} className="mt-6 block text-sm text-muted-foreground underline">Back to profile</Link>
    </div>
  );
}
