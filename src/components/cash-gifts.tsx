"use client";

import { useState } from "react";
import { Banknote, Landmark } from "lucide-react";
import { api, useApi, useMutation, usePagedApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Notice, Spinner } from "@/shared/ui/primitives";
import { PagedFooter } from "@/shared/ui/data";
import { useToast } from "@/shared/ui/overlay";

type CashGift = { id: string; reference: string; amountUsd: number; message: string; status: string; createdAt: string; paidOutAt: string | null; from: string };
type PayoutAccount = { bankName: string; accountName: string; accountNumber: string; updatedAt: string } | null;

const statusLabel: Record<string, { label: string; tone: "success" | "warning" | "plum" }> = {
  PayoutPending: { label: "Waiting for your bank details", tone: "warning" },
  Paid: { label: "Paid", tone: "plum" },
  PaidOut: { label: "Sent to your bank", tone: "success" },
};

/** Money people have sent instead of a gift, and the bank account it's paid into (simulated transfers, like vendor payouts). */
export function CashGiftsPanel() {
  const { data, items, error, loading, reload, setPage } = usePagedApi<CashGift>("/recipient/cash-gifts", {}, 10);
  const { fmt } = useSession();
  const waiting = (data?.counts?.needsPayoutAccount ?? 0) > 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div>
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
                </div>
                <Badge tone={statusLabel[g.status]?.tone ?? "plum"}>{statusLabel[g.status]?.label ?? g.status}</Badge>
              </Card>
            </li>
          ))}
        </ul>
        <PagedFooter data={data} onPage={setPage} className="mt-4 rounded-2xl border bg-white" />
      </div>
      <PayoutAccountCard highlight={waiting} onSaved={reload} />
    </div>
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
    <Card className={highlight ? "ring-2 ring-gold-400" : undefined}>
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
