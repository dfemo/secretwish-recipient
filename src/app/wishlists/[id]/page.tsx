"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarHeart, CheckCircle2, Copy, ExternalLink, GripVertical, Pencil, Plus, RefreshCw, Settings, Trash2 } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, useApi, useMutation } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { Badge, Button, Card, cx, ErrorState, Field, Input, Notice, PageSkeleton, ProductArt, Select, StatusBadge, Textarea } from "@/shared/ui/primitives";
import { ConfirmDialog, Modal, useToast } from "@/shared/ui/overlay";
import { WishlistForm } from "@/components/wishlist-form";
import { AddWishesModal } from "@/components/add-wishes";
import { shareLink, type Wishlist, type WishlistItem } from "@/lib/types";

export default function WishlistDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: w, error, loading, reload } = useApi<Wishlist>(`/recipient/wishlists/${id}`);
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [category, setCategory] = useState("");
  const [order, setOrder] = useState<WishlistItem[]>([]);
  useEffect(() => setOrder(w?.items ?? []), [w]);
  const del = useMutation(async () => { await api(`/recipient/wishlists/${id}`, { method: "DELETE" }); return true; });
  const rotate = useMutation(() => api(`/recipient/wishlists/${id}/rotate-link`, { method: "POST" }));
  const categories = useMemo(() => Array.from(new Set(order.map((i) => i.category).filter(Boolean))), [order]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (loading) return <PageSkeleton />;
  if (error || !w) return <ErrorState error={error} onRetry={reload} />;
  const items = order.filter((i) => !category || i.category === category);
  const link = shareLink(w.shareToken);

  /** Optimistically shows the new order, then saves it; puts it back if saving fails. */
  async function saveOrder(next: WishlistItem[]) {
    const previous = order;
    setOrder(next);
    try {
      await api(`/recipient/wishlists/${id}/order`, { method: "PUT", body: { itemIds: next.map((i) => i.id) } });
    } catch (e) {
      setOrder(previous);
      toast({ tone: "error", title: "Couldn't save the new order", body: (e as Error).message });
    }
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    saveOrder(arrayMove(order, order.findIndex((i) => i.id === active.id), order.findIndex((i) => i.id === over.id)));
  };
  const move = (itemId: string, by: -1 | 1) => {
    const from = order.findIndex((i) => i.id === itemId);
    const to = from + by;
    if (to >= 0 && to < order.length) saveOrder(arrayMove(order, from, to));
  };

  return (
    <>
      <Link href="/wishlists" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-plum-700">
        <ArrowLeft className="size-4" aria-hidden /> My wishlists
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-semibold text-plum-900">{w.title}</h1>
            <StatusBadge status={w.visibility} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-500">
            {w.occasion && (
              <span className="inline-flex items-center gap-1 font-semibold text-gold-700">
                <CalendarHeart className="size-4" aria-hidden /> {w.occasion}
                {w.eventDate && ` · ${date(w.eventDate)}`}
              </span>
            )}
            <span>{w.items.length} wishes · {w.items.filter((i) => i.fulfilled).length} gifted</span>
          </p>
          {w.description && <p className="mt-2 max-w-2xl text-[15px] text-ink-700">{w.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Settings} onClick={() => setEditing(true)}>Settings</Button>
          <Button variant="ghost" icon={Trash2} onClick={() => setDeleting(true)} aria-label="Delete wishlist" />
        </div>
      </header>

      <Card className="mb-8 p-5">
        {w.visibility === "Private" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-700"><b>Private.</b> Only you can see this list. Change visibility in settings to share it.</p>
            <Button size="sm" variant="subtle" onClick={() => setEditing(true)}>Share this list</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{w.visibility === "Public" ? "Public — discoverable by senders, and shareable by link" : "Anyone with this link can view and gift from this list"}</p>
            <div className="flex flex-wrap gap-2">
              <label htmlFor="share" className="sr-only">Share link</label>
              <Input id="share" readOnly value={link} className="min-w-[240px] flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(link); toast({ tone: "success", title: "Link copied" }); } catch { toast({ tone: "error", title: "Copy failed — select the link manually" }); } }}>Copy</Button>
              <Button variant="secondary" icon={RefreshCw} onClick={() => setRotating(true)}>New link</Button>
            </div>
            <p className="text-xs text-ink-500">Senders see your first name and city only. Your address stays private.</p>
          </div>
        )}
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-plum-900">Your wishes</h2>
          <p className="text-xs text-ink-500">{category ? "Show all to reorder." : "Drag to put them in order. Top is what you want most."}</p>
        </div>
        <Button icon={Plus} onClick={() => setAdding(true)}>Add wishes</Button>
      </div>

      {categories.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {["", ...categories].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={cx("rounded-full px-3 py-1.5 text-xs font-semibold", category === c ? "bg-plum-800 text-ivory-50" : "bg-white text-ink-700 ring-1 ring-ink-200")}>
              {c || "All"}
            </button>
          ))}
        </div>
      )}

      {order.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-display text-xl font-semibold text-plum-900">Your list is empty</p>
          <p className="mt-1 text-sm text-ink-500">Add anything: gifts from SecretWish, things from any shop (paste the link), or cash.</p>
          <Button className="mt-4" icon={Plus} onClick={() => setAdding(true)}>Add wishes</Button>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy} disabled={!!category}>
            <ol className="space-y-2" aria-label="Wishes, most wanted first">
              {items.map((i) => (
                <SortableWish key={i.id} item={i} rank={order.indexOf(i) + 1} total={order.length} sortable={!category} onEdit={() => setEditItem(i)} onMove={(by) => move(i.id, by)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <WishlistForm open={editing} onClose={() => setEditing(false)} existing={w} />
      {adding && <AddWishesModal wishlistId={w.id} existingProductIds={order.filter((i) => i.product).map((i) => i.product!.id)} onClose={() => setAdding(false)} />}
      {editItem && <EditItemModal item={editItem} onClose={() => setEditItem(null)} />}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        tone="danger"
        title={`Delete “${w.title}”?`}
        description="The list and its share link will stop working immediately. Gifts already on their way are not affected."
        confirmLabel="Delete wishlist"
        pending={del.pending}
        error={del.error?.message}
        onConfirm={async () => { if (await del.run()) { toast({ tone: "success", title: "Wishlist deleted" }); router.push("/wishlists"); } }}
      />
      <ConfirmDialog
        open={rotating}
        onClose={() => setRotating(false)}
        title="Create a new share link?"
        description="The old link stops working straight away. Anyone who still needs access will need the new link."
        confirmLabel="Create new link"
        pending={rotate.pending}
        onConfirm={async () => { await rotate.run(); setRotating(false); toast({ tone: "success", title: "New link created", body: "The previous link no longer works." }); }}
      />
    </>
  );
}

function WishArt({ item }: { item: WishlistItem }) {
  if (item.product) return <ProductArt emoji={item.product.emoji} tint={item.product.tint} size="sm" className={cx(item.fulfilled && "opacity-60")} />;
  if (item.kind === "Custom" && item.imageUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt="" referrerPolicy="no-referrer" className={cx("size-12 shrink-0 rounded-xl object-cover", item.fulfilled && "opacity-60")} />;
  return <ProductArt emoji={item.kind === "Cash" ? "💸" : "🎁"} tint={item.kind === "Cash" ? "sage" : "lavender"} size="sm" className={cx(item.fulfilled && "opacity-60")} />;
}

function SortableWish({ item: i, rank, total, sortable, onEdit, onMove }: { item: WishlistItem; rank: number; total: number; sortable: boolean; onEdit: () => void; onMove: (by: -1 | 1) => void }) {
  const { fmt } = useSession();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: i.id, disabled: !sortable });
  const price = i.product?.priceUsd ?? i.cashAmountUsd ?? i.estimatedPriceUsd;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx("relative", isDragging && "z-10")}>
      <Card className={cx("flex items-center gap-3 p-3", isDragging && "shadow-[var(--shadow-pop)] ring-2 ring-plum-300")}>
        {sortable && (
          <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className="grid h-12 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-ink-400 hover:bg-ink-100 active:cursor-grabbing" aria-label={`Reorder ${i.name}, number ${rank} of ${total}. Press space, then arrow keys.`}>
            <GripVertical className="size-5" />
          </button>
        )}
        <span className="w-5 shrink-0 text-center text-xs font-bold text-ink-400" aria-hidden>{rank}</span>
        <WishArt item={i} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{i.name}</span>
            {i.fulfilled && <Badge tone="success" icon={CheckCircle2}>Gifted</Badge>}
            {i.kind === "Cash" && !i.fulfilled && <Badge tone="gold">Cash</Badge>}
            {i.product && i.product.availability !== "In stock" && !i.fulfilled && <Badge tone="warning">{i.product.availability}</Badge>}
          </p>
          <p className="truncate text-xs text-ink-500">
            {i.product ? i.product.vendor : i.kind === "Custom" ? "Vendors can source this" : "Sent to your bank"}
            {i.category && i.kind !== "Cash" && ` · ${i.category}`}
            {i.quantity > 1 && ` · ×${i.quantity}`}
          </p>
          {i.notes && <p className="mt-0.5 line-clamp-1 text-xs text-ink-700 italic">“{i.notes}”</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {price != null && <b className="text-sm tabular">{i.kind === "Custom" ? "~" : ""}{fmt(price)}</b>}
          <div className="flex items-center">
            {i.url && (
              <a href={i.url} target="_blank" rel="noopener noreferrer nofollow" className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-plum-700" aria-label={`Open the link for ${i.name}`}>
                <ExternalLink className="size-4" />
              </a>
            )}
            {sortable && (
              <>
                <button type="button" disabled={rank === 1} onClick={() => onMove(-1)} className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label={`Move ${i.name} up`}><ArrowUp className="size-4" /></button>
                <button type="button" disabled={rank === total} onClick={() => onMove(1)} className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label={`Move ${i.name} down`}><ArrowDown className="size-4" /></button>
              </>
            )}
            <button type="button" onClick={onEdit} className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-plum-700" aria-label={`Edit ${i.name}`}><Pencil className="size-4" /></button>
          </div>
        </div>
      </Card>
    </li>
  );
}

function EditItemModal({ item, onClose }: { item: WishlistItem; onClose: () => void }) {
  const { currency, meta } = useSession();
  const fx = currency === "NGN" ? (meta?.fxRateNgn ?? 1550) : 1;
  const symbol = currency === "NGN" ? "₦" : "$";
  const shown = (usd: number | null) => (usd == null ? "" : String(Math.round(usd * fx * 100) / 100));
  const toUsd = (v: string) => (v.trim() === "" ? null : Math.round((Number(v) / fx) * 100) / 100);
  const [form, setForm] = useState({
    notes: item.notes, quantity: item.quantity, category: item.category, categoryId: item.categoryId ?? "",
    title: item.kind === "Custom" ? item.name : "", url: item.url ?? "", price: shown(item.estimatedPriceUsd), amount: shown(item.cashAmountUsd),
  });
  const toast = useToast();
  const save = useMutation(() =>
    api(`/recipient/items/${item.id}`, {
      method: "PUT",
      body: {
        notes: form.notes, quantity: form.quantity, category: form.category, categoryId: form.categoryId || null,
        title: form.title, url: form.url || null, imageUrl: item.imageUrl, estimatedPriceUsd: toUsd(form.price), cashAmountUsd: toUsd(form.amount),
      },
    }),
  );
  const remove = useMutation(async () => { await api(`/recipient/items/${item.id}`, { method: "DELETE" }); return true; });
  return (
    <Modal
      open
      onClose={onClose}
      title={item.name || "Edit wish"}
      footer={
        <>
          <Button variant="ghost" icon={Trash2} loading={remove.pending} onClick={async () => { if (await remove.run()) { toast({ tone: "success", title: "Removed from wishlist" }); onClose(); } }}>Remove</Button>
          <Button loading={save.pending} onClick={async () => { if ((await save.run()) !== undefined) { toast({ tone: "success", title: "Wish updated" }); onClose(); } }}>Save</Button>
        </>
      }
    >
      {item.fulfilled && <Notice className="mb-4" tone="success">Someone already gifted this. 🎉</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        {item.kind === "Custom" && (
          <>
            <Field label="What would you like?" className="sm:col-span-2">{(id) => <Input id={id} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}</Field>
            <Field label="Link (optional)" className="sm:col-span-2">{(id) => <Input id={id} inputMode="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />}</Field>
            <Field label={`Rough price (${symbol})`}>{(id) => <Input id={id} inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })} />}</Field>
            <Field label="Category">
              {(id) => (
                <Select id={id} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">None</option>
                  {meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </Select>
              )}
            </Field>
          </>
        )}
        {item.kind === "Cash" && (
          <Field label={`Amount (${symbol})`} className="sm:col-span-2">{(id) => <Input id={id} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} />}</Field>
        )}
        {item.kind !== "Cash" && (
          <Field label="Quantity">{(id) => <Input id={id} type="number" min={1} max={10} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.min(10, Math.max(1, Number(e.target.value))) })} />}</Field>
        )}
        {item.kind === "Catalog" && (
          <Field label="Group" hint="Organise your list, e.g. “Kitchen”.">{(id, d) => <Input id={id} aria-describedby={d} maxLength={40} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />}</Field>
        )}
        <Field label="Notes for gifters" hint="Size, colour, anything that helps. Visible to people you share with." className="sm:col-span-2">
          {(id, d) => <Textarea id={id} aria-describedby={d} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
        </Field>
        {(save.error ?? remove.error) && <Notice tone="danger" className="sm:col-span-2">{(save.error ?? remove.error)!.message}</Notice>}
      </div>
    </Modal>
  );
}
