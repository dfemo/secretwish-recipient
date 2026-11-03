"use client";

import { Banknote } from "lucide-react";
import { useApi, type Paged } from "@/shared/lib/api";
import { ButtonLink, Notice } from "@/shared/ui/primitives";

/** Whether cash gifts are waiting for this recipient's bank details (from the cash-gifts list counts). */
export function useCashWaiting() {
  const { data } = useApi<Paged<unknown>>("/recipient/cash-gifts?pageSize=1");
  return (data?.counts?.needsPayoutAccount ?? 0) > 0;
}

/** A prompt to add bank details, shown wherever a recipient lands while cash is waiting for them. */
export function CashWaitingBanner({ className }: { className?: string }) {
  if (!useCashWaiting()) return null;
  return (
    <Notice className={className} tone="warning" icon={Banknote} title="You have a cash gift waiting">
      Add your bank details so SecretWish can send it to you.
      <div className="mt-2">
        <ButtonLink href="/gifts?tab=cash" size="sm" variant="gold">Add bank details</ButtonLink>
      </div>
    </Notice>
  );
}
