"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Landmark } from "lucide-react";
import { api, useApi, useMutation } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Button, Field, Input, Notice } from "@/shared/ui/primitives";
import { Modal, useToast } from "@/shared/ui/overlay";

export type PayoutAccount = { bankName: string; accountName: string; accountNumber: string; updatedAt: string } | null;

/** Whether this recipient has told SecretWish where to send cash gifts. undefined while loading. */
export function usePayoutAccount() {
  const { data, loading, reload } = useApi<PayoutAccount>("/recipient/payout-account");
  return { account: data, hasAccount: loading ? undefined : !!data, reload };
}

/** Bank, account name and number. The number is encrypted by the API and only its last 4 digits are ever shown again. */
export function BankDetailsForm({ onSaved, onCancel, submitLabel = "Save bank details", cancelLabel = "Cancel" }: { onSaved: () => void; onCancel?: () => void; submitLabel?: string; cancelLabel?: string }) {
  const [form, setForm] = useState({ bankName: "", accountName: "", accountNumber: "" });
  const toast = useToast();
  const save = useMutation(() => api<PayoutAccount>("/recipient/payout-account", { method: "PUT", body: form }));
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await save.run()) {
          toast({ tone: "success", title: "Bank details saved", body: "Cash gifts will be sent to this account." });
          setForm({ bankName: "", accountName: "", accountNumber: "" });
          onSaved();
        }
      }}
    >
      <Field label="Bank">{(id) => <Input id={id} required maxLength={80} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. GTBank" />}</Field>
      <Field label="Name on the account">{(id) => <Input id={id} required maxLength={120} autoComplete="name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />}</Field>
      <Field label="Account number" hint="Nigerian accounts (NUBAN) have 10 digits.">
        {(id, d) => <Input id={id} aria-describedby={d} required inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />}
      </Field>
      {save.error && <Notice tone="danger">{save.error.message}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={save.pending}>{submitLabel}</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>}
      </div>
    </form>
  );
}

/** Asks for bank details right when they're needed, e.g. just after adding a cash wish, so gifters' money can reach the recipient. */
export function BankDetailsModal({ onClose, reason }: { onClose: () => void; reason?: string }) {
  return (
    <Modal open onClose={onClose} size="sm" title="Where should we send your cash?" description={reason ?? "Add your bank details so SecretWish can pay cash gifts straight into your account."}>
      <div className="mb-4 flex items-start gap-3 rounded-2xl bg-plum-50 p-3 text-sm text-plum-800">
        <Landmark className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>Your account number is encrypted, and only its last 4 digits are ever shown. You can change it any time under Gifts → Cash.</p>
      </div>
      <BankDetailsForm onSaved={onClose} onCancel={onClose} cancelLabel="Later" />
    </Modal>
  );
}

/**
 * After signing in, reminds a recipient with no bank details to add them, so cash gifts can be paid without delay. Shown once per
 * browser session (Later hides it until they next sign in), never in demo mode, and not on the Gifts page, which has the form.
 */
export function BankDetailsReminder() {
  const { profile, isDemo } = useSession();
  const pathname = usePathname();
  const { hasAccount, reload } = usePayoutAccount();
  const [open, setOpen] = useState(false);
  const key = profile ? `secretwish.recipient.bankReminder.${profile.id}` : null;
  useEffect(() => {
    if (!key || isDemo || hasAccount !== false || pathname.startsWith("/gifts")) return;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "shown");
    } catch {
      /* storage unavailable: show it this once */
    }
    setOpen(true);
  }, [key, isDemo, hasAccount, pathname]);
  if (!open) return null;
  return (
    <BankDetailsModal
      reason="Add your bank details now so any cash gift people send you can be paid straight into your account."
      onClose={() => { setOpen(false); reload(); }}
    />
  );
}
