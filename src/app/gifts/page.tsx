"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FlaskConical, Gift as GiftIcon, KeyRound, LifeBuoy, Lock, ShieldX, XCircle } from "lucide-react";
import { api, useMutation, usePagedApi } from "@/shared/lib/api";
import { PagedFooter } from "@/shared/ui/data";
import { useSession } from "@/shared/lib/session";
import { date, dateTime } from "@/shared/lib/format";
import { Badge, Button, Card, cx, EmptyState, ErrorState, Field, Input, Notice, PageHeader, ProductArt, Spinner, Tabs } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/overlay";
import type { Gift } from "@/lib/types";
import { CashGiftsPanel } from "@/components/cash-gifts";

type VerifyResult = { result: "success" | "incorrect" | "locked" | "expired" | "already_used" | "invalid_format" | "not_found"; message: string; remaining?: number };

const resultStyle: Record<VerifyResult["result"], { tone: "success" | "danger" | "warning" | "neutral"; icon: typeof CheckCircle2; title: string }> = {
  success: { tone: "success", icon: CheckCircle2, title: "Gift verified" },
  incorrect: { tone: "danger", icon: XCircle, title: "That code didn't match" },
  invalid_format: { tone: "warning", icon: AlertTriangle, title: "Check the format" },
  locked: { tone: "danger", icon: Lock, title: "Verification locked" },
  expired: { tone: "warning", icon: Clock, title: "Code expired" },
  already_used: { tone: "neutral", icon: CheckCircle2, title: "Already verified" },
  not_found: { tone: "neutral", icon: ShieldX, title: "No code yet" },
};

export default function GiftsPage() {
  const [tab, setTab] = useState<"incoming" | "received" | "cash">("incoming");
  const { data, items, error, loading, reload, setPage } = usePagedApi<Gift>(tab === "cash" ? null : "/recipient/gifts", { tab }, 10);
  const tabs = <Tabs className="mb-6 w-fit" value={tab} onChange={setTab} tabs={[{ value: "incoming", label: "On the way", count: data?.counts?.incoming }, { value: "received", label: "Received", count: data?.counts?.received }, { value: "cash", label: "Cash" }]} />;
  const header = <PageHeader title="Your gifts" description="We keep surprises secret: no item, price or sender is shown until a gift arrives — and the sender only if they choose." />;
  if (tab === "cash") return <>{header}{tabs}<CashGiftsPanel /></>;
  if (loading) return <Spinner />;
  if (error || !data || !items) return <ErrorState error={error} onRetry={reload} />;
  const incoming = tab === "incoming" ? items : [];
  const received = tab === "received" ? items : [];

  return (
    <>
      {header}
      {tabs}
      {tab === "incoming" ? (
        incoming.length === 0 ? (
          <EmptyState icon={GiftIcon} title="Nothing on the way right now" description="When someone sends you a gift, you'll see it here — without spoilers." />
        ) : (
          <ul className="space-y-5">
            {incoming.map((g) => (
              <li key={g.id}><IncomingGift gift={g} /></li>
            ))}
          </ul>
        )
      ) : received.length === 0 ? (
        <EmptyState icon={GiftIcon} title="No gifts received yet" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {received.map((g) => (
            <li key={g.id}>
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <ProductArt emoji={g.item?.emoji ?? "🎁"} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{g.item?.productName}</p>
                    <p className="text-xs text-ink-500">From {g.from} · {date(g.deliveredAt)}</p>
                  </div>
                  <Badge tone="success" icon={CheckCircle2}>Delivered</Badge>
                </div>
                {g.message && <p className="mt-4 rounded-xl bg-plum-50 px-4 py-3 font-display text-plum-900 italic">“{g.message}”</p>}
                {g.price !== null && <p className="mt-2 text-xs text-ink-500">The sender chose to share the value.</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <PagedFooter data={data} onPage={setPage} className="mt-4 rounded-2xl border bg-white" />
    </>
  );
}

function IncomingGift({ gift }: { gift: Gift }) {
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const toast = useToast();
  const verify = useMutation(() => api<VerifyResult>(`/recipient/gifts/${gift.id}/verify`, { method: "POST", body: { code } }));
  const issue = useMutation(() => api<{ code: string }>(`/demo/orders/${gift.id}/issue-code`, { method: "POST" }));
  const expire = useMutation(() => api(`/demo/orders/${gift.id}/expire-code`, { method: "POST" }));
  const help = useMutation(() => api<{ reference: string }>("/me/tickets", { method: "POST", body: { subject: "I can't find my gift verification code", description: "My gift is on its way but I don't have a working verification code. Please help me confirm delivery.", category: "MissingGift", orderId: gift.id } }));

  const normalised = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const formatError = touched && normalised.length !== 8 ? "Codes have 8 letters and numbers, like ABCD-2345." : null;
  const locked = result?.result === "locked";

  const submit = async () => {
    setTouched(true);
    if (normalised.length !== 8) return;
    const r = await verify.run();
    if (r) {
      setResult(r);
      if (r.result === "success") toast({ tone: "success", title: "Verified! ✨", body: "Your gift is now marked as delivered." });
    }
  };

  const style = result ? resultStyle[result.result] : null;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-plum-800 to-plum-950 p-5 text-ivory-50">
        <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-3xl" aria-hidden>🎁</span>
        <div className="flex-1">
          <p className="font-display text-xl font-semibold">A surprise for you</p>
          <p className="text-sm text-plum-200">{gift.status} · expected by {date(gift.deliveryDate)}</p>
        </div>
        <Badge tone="gold" icon={Lock}>Details hidden until arrival</Badge>
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[1fr_1.2fr]">
        <ol className="space-y-3 text-sm">
          {gift.events.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold-500" aria-hidden />
              <span><b>{e.title}</b><br /><span className="text-xs text-ink-500">{e.detail} · {dateTime(e.at)}</span></span>
            </li>
          ))}
          {gift.events.length === 0 && <li className="text-ink-500">Your gift is being prepared.</li>}
        </ol>

        {gift.canVerify ? (
          <div className="rounded-2xl border border-ink-200 p-4">
            <p className="flex items-center gap-2 font-semibold"><KeyRound className="size-4 text-plum-600" aria-hidden /> Received it? Enter your secret code</p>
            <p className="mt-1 text-xs text-ink-500">You&apos;ll find it on the card inside your gift. Verifying confirms safe delivery.</p>
            <form className="mt-3 flex flex-wrap items-start gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <Field label="Secret code" error={formatError} className="min-w-[180px] flex-1">
                {(id, d) => (
                  <Input
                    id={id}
                    aria-describedby={d}
                    aria-invalid={!!formatError}
                    value={code}
                    disabled={locked || result?.result === "success"}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))}
                    placeholder="ABCD-2345"
                    autoComplete="one-time-code"
                    className="font-mono text-lg tracking-[0.2em] uppercase"
                  />
                )}
              </Field>
              <Button type="submit" className="mt-[26px]" loading={verify.pending} disabled={locked || result?.result === "success"}>Verify</Button>
            </form>
            {verify.error && <Notice className="mt-3" tone="danger">{verify.error.message}</Notice>}
            {style && result && (
              <Notice className="mt-3" tone={style.tone} icon={style.icon} title={style.title}>
                {result.message}
                {typeof result.remaining === "number" && (
                  <span className="mt-1 flex gap-1" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => <span key={i} className={cx("h-1.5 w-6 rounded-full", i < result.remaining! ? "bg-current" : "bg-current/20")} />)}
                  </span>
                )}
              </Notice>
            )}
            {(result?.result === "expired" || result?.result === "locked" || helpOpen) && (
              <div className="mt-3 rounded-xl bg-ink-50 p-3 text-[13px]">
                <p className="font-semibold">Need a hand?</p>
                <p className="text-ink-700">Our team can confirm delivery with the courier or issue a new code.</p>
                <Button size="sm" variant="secondary" icon={LifeBuoy} className="mt-2" loading={help.pending} onClick={async () => { const r = await help.run(); if (r) toast({ tone: "success", title: `Support ticket ${r.reference} opened`, body: "We'll get back to you shortly." }); }}>
                  Ask support for help
                </Button>
              </div>
            )}
            {!helpOpen && result?.result !== "expired" && result?.result !== "locked" && (
              <button type="button" className="mt-3 text-xs font-semibold text-plum-700 hover:underline" onClick={() => setHelpOpen(true)}>Lost your code?</button>
            )}

            <div className="mt-4 rounded-xl border border-dashed border-gold-400 bg-gold-100/40 p-3 text-[12px] text-gold-700">
              <p className="flex items-center gap-1.5 font-semibold"><FlaskConical className="size-3.5" aria-hidden /> Demo helper (development API only)</p>
              <p className="mt-0.5">In real life the code is printed on the card in your gift. For testing, issue one here — it&apos;s generated and hashed on the server, never stored in this app.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" loading={issue.pending} onClick={async () => { const r = await issue.run(); if (r) { setDemoCode(r.code); setResult(null); } }}>Get demo code</Button>
                <Button size="sm" variant="ghost" loading={expire.pending} onClick={async () => { await expire.run(); setDemoCode(null); toast({ tone: "info", title: "Code expired (demo)", body: "Try verifying to see the expired state." }); }}>Expire code</Button>
                {demoCode && <code className="rounded-lg bg-white px-2 py-1 font-mono text-sm font-bold tracking-widest text-plum-900">{demoCode}</code>}
              </div>
              {issue.error && <p className="mt-1">{issue.error.message}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-ivory-100 p-4 text-sm text-ink-700">
            <Clock className="size-5 shrink-0 text-plum-600" aria-hidden />
            Being prepared. You&apos;ll be able to verify it once it&apos;s on its way.
          </div>
        )}
      </div>
    </Card>
  );
}
