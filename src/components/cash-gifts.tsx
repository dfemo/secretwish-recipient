"use client";

import Link from "next/link";
import { useState } from "react";
import { Banknote, CheckCircle2, Heart, Landmark } from "lucide-react";
import { api, useApi, useMutation, usePagedApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Notice, Spinner, Textarea } from "@/shared/ui/primitives";
import { PagedFooter } from "@/shared/ui/data";
import { Modal, useToast } from "@/shared/ui/overlay";

type CashGift = {
  id: string; reference: string; amountUsd: number; message: string; status: string; createdAt: string; paidOutAt: string | null; from: string;
  receivedAt: string | null; thankYouNote: string | null; canConfirm: boolean;
};
type PayoutAccount = { bankName: string; accountName: string; accountNumber: string; updatedAt: string } | null;

const statusLabel: Record<string, { label: string; tone: "success" | "warning" | "plum" }> = {
  Paid: { label: "Paid", tone: "plum" },
  PaidOut: { label: "Sent to your bank", tone: "plum" },
  Received: { label: "Received", tone: "success" },
};

/** PayoutPending means the sender has paid and SecretWish still has to transfer it; whether it's waiting on you depends on your bank details. */
const pendingLabel = (hasAccount: boolean) => (hasAccount ? { label: "SecretWish is sending it", tone: "plum" as const } : { label: "Waiting for your bank details", tone: "warning" as const });

/** Money people have sent instead of a gift, and the bank account it's paid into (simulated transfers, like vendor payouts). */
export function CashGiftsPanel() {
  const { data, items, error, loading, reload, setPage } = usePagedApi<CashGift>("/recipient/cash-gifts", {}, 10);
  const { fmt } = useSession();
  const waiting = (data?.counts?.needsPayoutAccount ?? 0) > 0;
  const hasAccount = (data?.counts?.hasPayoutAccount ?? 0) > 0;
  const needsProfile = (data?.counts?.needsProfile ?? 0) > 0;
  const [confirming, setConfirming] = useState<CashGift | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div>
        {needsProfile && (
          <Notice className="mb-4" tone="warning" title="Add your phone number and city">
            We need them to reach you about your gifts, even cash. <Link href="/privacy" className="font-semibold underline">Add them in Privacy &amp; settings</Link>.
          </Notice>
        )}
        {loading && <Spinner />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {items?.length === 0 && <EmptyState icon={Banknote} title="No cash gifts yet" description="Add a “Cash instead” wish to any list, and gifters can send money through SecretWish." />}
        <ul className="space-y-3">
          {items?.map((g) => (
            <li key={g.id}>
              <Card className="flex flex-wrap items-center gap-4 p-4">
                <span className="grid size-12 place-items-center rounded-xl bg-sage-tint text-2xl" aria-hidden>💸</span>
                <div className="min-w-[160px] flex-1">
                  <p className="font-semibold">{fmt(g.amountUsd)} from {g.from}</p>
                  <p className="text-xs text-ink-500">{g.reference} · {date(g.createdAt)}</p>
                  {g.message && <p className="mt-1 text-sm text-plum-900 italic">“{g.message}”</p>}
                  {g.receivedAt && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-success-700">
                      <CheckCircle2 className="size-3.5" aria-hidden /> You confirmed it arrived on {date(g.receivedAt)}{g.thankYouNote && " and sent a thank-you"}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {(() => {
                    const s = g.status === "PayoutPending" ? pendingLabel(hasAccount) : statusLabel[g.status];
                    return <Badge tone={s?.tone ?? "plum"}>{s?.label ?? g.status}</Badge>;
                  })()}
                  {g.canConfirm && <Button size="sm" icon={CheckCircle2} onClick={() => setConfirming(g)}>I received it</Button>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
        <PagedFooter data={data} onPage={setPage} className="mt-4 rounded-2xl border bg-white" />
      </div>
      <PayoutAccountCard highlight={waiting} onSaved={reload} />
      <ConfirmReceipt gift={confirming} onClose={() => setConfirming(null)} onDone={reload} />
    </div>
  );
}

/** Confirms a transferred cash gift arrived, with an optional thank-you that's emailed to the sender (who stays anonymous if they chose to). */
function ConfirmReceipt({ gift, onClose, onDone }: { gift: CashGift | null; onClose: () => void; onDone: () => void }) {
  const { fmt } = useSession();
  const toast = useToast();
  const [note, setNote] = useState("");
  const confirm = useMutation(() => api(`/recipient/cash-gifts/${gift!.id}/confirm`, { method: "POST", body: { note: note.trim() || null } }));
  const close = () => {
    setNote("");
    confirm.setError(null);
    onClose();
  };
  return (
    <Modal
      open={!!gift}
      onClose={close}
      title="Confirm you received it"
      description={gift ? `${fmt(gift.amountUsd)} from ${gift.from} · ${gift.reference}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            icon={Heart}
            loading={confirm.pending}
            onClick={async () => {
              if ((await confirm.run()) !== undefined) {
                toast({ tone: "success", title: "Thanks for confirming", body: note.trim() ? "We've sent your note to the person who gifted it." : "We've let them know it arrived." });
                close();
                onDone();
              }
            }}
          >
            Confirm it arrived
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-700">Only confirm once the money is in your bank account. We&apos;ll let the person who sent it know.</p>
        <Field label="Thank-you note (optional)" hint="Emailed to the sender. You won't see their email address, and they stay anonymous if they chose to." error={confirm.error?.errors?.note?.[0]}>
          {(id, d) => <Textarea id={id} aria-describedby={d} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thank you so much, this means a lot!" />}
        </Field>
        {confirm.error && !confirm.error.errors?.note && <Notice tone="danger">{confirm.error.message}</Notice>}
      </div>
    </Modal>
  );
}

function PayoutAccountCard({ highlight, onSaved }: { highlight: boolean; onSaved: () => void }) {
  const { data: account, loading, reload } = useApi<PayoutAccount>("/recipient/payout-account");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bankName: "", accountName: "", accountNumber: "" });
  const toast = useToast();
  const save = useMutation(() => api<PayoutAccount>("/recipient/payout-account", { method: "PUT", body: form }));
  const showForm = editing || (!loading && !account);
  return (
    // While cash is waiting, the card comes first on phones (beside the list on wide screens).
    <Card className={highlight ? "order-first ring-2 ring-gold-400 lg:order-none" : undefined}>
      <CardHeader title="Where cash gifts go" description="Your account number is encrypted and only the last 4 digits are ever shown." />
      <div className="p-5 pt-0">
        {highlight && <Notice className="mb-4" tone="warning">Someone sent you cash. Add your bank details to receive it.</Notice>}
        {loading && <Spinner />}
        {account && !editing && (
          <div className="flex items-center gap-3">
            <Landmark className="size-6 text-plum-700" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold">{account.bankName} {account.accountNumber}</p>
              <p className="text-xs text-ink-500">{account.accountName}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Change</Button>
          </div>
        )}
        {showForm && (
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save.run()) {
                toast({ tone: "success", title: "Bank details saved" });
                setEditing(false);
                setForm({ bankName: "", accountName: "", accountNumber: "" });
                reload();
                onSaved();
              }
            }}
          >
            <Field label="Bank">{(id) => <Input id={id} required maxLength={80} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. GTBank" />}</Field>
            <Field label="Name on the account">{(id) => <Input id={id} required maxLength={120} autoComplete="name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />}</Field>
            <Field label="Account number" hint="Nigerian accounts (NUBAN) have 10 digits.">{(id, d) => <Input id={id} aria-describedby={d} required inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />}</Field>
            {save.error && <Notice tone="danger">{save.error.message}</Notice>}
            <div className="flex gap-2">
              <Button type="submit" loading={save.pending}>Save bank details</Button>
              {account && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
