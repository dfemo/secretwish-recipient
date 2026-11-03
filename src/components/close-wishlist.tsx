"use client";

import { useState } from "react";
import { Heart, Lock } from "lucide-react";
import { api, useMutation } from "@/shared/lib/api";
import { Button, cx, Field, Notice, Switch, Textarea } from "@/shared/ui/primitives";
import { Modal, useToast } from "@/shared/ui/overlay";
import type { Wishlist } from "@/lib/types";

type Kind = "thanks" | "no-longer-needed";

const kinds: { value: Kind; title: string; body: string; placeholder: string }[] = [
  { value: "thanks", title: "Say thank you", body: "You've received what you hoped for. Everyone who gifted gets your message.", placeholder: "Thank you all so much — the party was perfect because of you!" },
  { value: "no-longer-needed", title: "I don't need gifts any more", body: "Plans changed or the occasion has passed. Tell visitors why it's closed.", placeholder: "The event has been moved, so I'm closing this list for now. Thank you for thinking of me." },
];

/** Closes the owner's wishlist for good, with a thank-you or "no longer needed" message (optionally shown on the public list). */
export function CloseWishlistModal({ list, open, onClose, onClosed }: { list: Wishlist; open: boolean; onClose: () => void; onClosed: () => void }) {
  const [kind, setKind] = useState<Kind>("thanks");
  const [note, setNote] = useState("");
  const [showPublicly, setShowPublicly] = useState(true);
  const toast = useToast();
  const close = useMutation(() => api<{ thanked: number }>(`/recipient/wishlists/${list.id}/close`, { method: "POST", body: { kind, note, showPublicly } }));
  const chosen = kinds.find((k) => k.value === kind)!;
  const isPrivate = list.visibility === "Private";

  const submit = async () => {
    const r = await close.run();
    if (!r) return;
    toast({ tone: "success", title: "Wishlist closed", body: r.thanked > 0 ? `We've sent your message to ${r.thanked} gifter${r.thanked === 1 ? "" : "s"}.` : "Nobody can send gifts from it any more." });
    onClosed();
  };

  return (
    <Modal
      open={open}
      onClose={() => { close.setError(null); onClose(); }}
      title="Close this wishlist?"
      description={`Once “${list.title}” is closed, nobody can send gifts or fulfil wishes from it again. Gifts already on their way still arrive.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Keep it open</Button>
          <Button variant="danger" icon={Lock} loading={close.pending} onClick={submit}>Close wishlist</Button>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Why are you closing it?</legend>
        {kinds.map((k) => (
          <label key={k.value} className={cx("flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ring-inset", kind === k.value ? "bg-plum-50 ring-plum-400" : "ring-ink-200")}>
            <input type="radio" name="close-kind" className="mt-1" checked={kind === k.value} onChange={() => setKind(k.value)} />
            <span>
              <span className="flex items-center gap-1.5 font-semibold">{k.value === "thanks" && <Heart className="size-4 text-plum-600" aria-hidden />}{k.title}</span>
              <span className="block text-xs text-ink-500">{k.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Field label={kind === "thanks" ? "Your thank-you message" : "Your message"} className="mt-4" error={close.error?.errors?.note?.[0]} hint="Your gifters stay anonymous to you; we pass your message on.">
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={chosen.placeholder} />}
      </Field>
      {!isPrivate && (
        <div className="mt-4">
          <Switch checked={showPublicly} onChange={setShowPublicly} label="Show my message on the wishlist page" description="Anyone viewing the list, including on the SecretWish website, will see it." />
        </div>
      )}
      <Notice className="mt-4" tone="warning">You can&apos;t reopen it yourself. If you change your mind, contact support.</Notice>
      {close.error && !close.error.errors?.note && <Notice className="mt-3" tone="danger">{close.error.message}</Notice>}
    </Modal>
  );
}
