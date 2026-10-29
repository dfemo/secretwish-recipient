"use client";

import { useEffect, useState } from "react";
import { Globe2, Link2, Lock } from "lucide-react";
import { api, ApiError, useMutation } from "@/shared/lib/api";
import { Button, cx, Field, Input, Notice, Select, Textarea } from "@/shared/ui/primitives";
import { Modal, useToast } from "@/shared/ui/overlay";
import type { Wishlist } from "@/lib/types";

export const visibilityOptions = [
  { v: "Private", icon: Lock, title: "Private", body: "Only you can see it." },
  { v: "Link", icon: Link2, title: "Anyone with the link", body: "Share a private link with chosen people." },
  { v: "Public", icon: Globe2, title: "Publicly discoverable", body: "Senders can find it in SecretWish." },
] as const;

const occasions = ["Birthday", "Wedding", "Anniversary", "Graduation", "Housewarming", "Baby shower", "Just because"];

/** Create or edit a wishlist. Public discovery requires an explicit consent tick (also enforced by the API). */
export function WishlistForm({ open, onClose, existing, onSaved }: { open: boolean; onClose: () => void; existing?: Wishlist; onSaved?: (id: string) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ title: "", description: "", occasion: "", eventDate: "", visibility: "Private", confirmPublic: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(
      existing
        ? { title: existing.title, description: existing.description, occasion: existing.occasion ?? "", eventDate: existing.eventDate ?? "", visibility: existing.visibility, confirmPublic: existing.visibility === "Public" }
        : { title: "", description: "", occasion: "", eventDate: "", visibility: "Private", confirmPublic: false },
    );
  }, [open, existing]);

  const save = useMutation(() =>
    api<{ id: string }>(existing ? `/recipient/wishlists/${existing.id}` : "/recipient/wishlists", {
      method: existing ? "PUT" : "POST",
      body: { ...f, occasion: f.occasion || null, eventDate: f.eventDate || null },
    }),
  );

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Give your wishlist a name.";
    if (f.title.length > 80) e.title = "Keep it under 80 characters.";
    if (f.visibility === "Public" && !f.confirmPublic) e.confirmPublic = "Please confirm you want this list to be public.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const r = await save.run();
    if (r) {
      toast({ tone: "success", title: existing ? "Wishlist updated" : "Wishlist created" });
      onClose();
      onSaved?.(r.id);
    }
  };
  const serverError = save.error instanceof ApiError ? save.error.message : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Wishlist settings" : "Create a wishlist"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={save.pending} onClick={submit}>{existing ? "Save changes" : "Create wishlist"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2" error={errors.title}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.title} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="My 30th birthday" />}
        </Field>
        <Field label="Description" className="sm:col-span-2" hint="Optional — a note for people browsing your list.">
          {(id, d) => <Textarea id={id} aria-describedby={d} maxLength={400} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}
        </Field>
        <Field label="Occasion">
          {(id) => (
            <Select id={id} value={f.occasion} onChange={(e) => setF({ ...f, occasion: e.target.value })}>
              <option value="">No occasion</option>
              {occasions.map((o) => (<option key={o}>{o}</option>))}
            </Select>
          )}
        </Field>
        <Field label="Date">{(id) => <Input id={id} type="date" value={f.eventDate} onChange={(e) => setF({ ...f, eventDate: e.target.value })} />}</Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-[13px] font-semibold text-ink-700">Who can see it?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {visibilityOptions.map((o) => (
              <label key={o.v} className={cx("flex cursor-pointer flex-col gap-1 rounded-2xl border p-3 text-sm", f.visibility === o.v ? "border-plum-500 bg-plum-50" : "border-ink-200 hover:border-plum-200")}>
                <span className="flex items-center gap-2 font-semibold">
                  <input type="radio" name="visibility" className="accent-plum-700" checked={f.visibility === o.v} onChange={() => setF({ ...f, visibility: o.v, confirmPublic: false })} />
                  <o.icon className="size-4 text-plum-600" aria-hidden /> {o.title}
                </span>
                <span className="text-xs text-ink-500">{o.body}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {f.visibility === "Public" && (
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-xl bg-gold-100/60 p-3 text-[13px]">
              <input type="checkbox" className="mt-0.5 accent-plum-700" checked={f.confirmPublic} onChange={(e) => setF({ ...f, confirmPublic: e.target.checked })} />
              <span>I understand this wishlist&apos;s title, first name, city and items will be discoverable by SecretWish senders. My address is never shown.</span>
            </label>
            {errors.confirmPublic && <p className="mt-1 text-xs font-medium text-danger-700" role="alert">{errors.confirmPublic}</p>}
          </div>
        )}
        {serverError && <Notice tone="danger" className="sm:col-span-2">{serverError}</Notice>}
      </div>
    </Modal>
  );
}
