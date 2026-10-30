"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, CalendarHeart, CheckCircle2, Copy, Pencil, Plus, RefreshCw, Settings, Trash2 } from "lucide-react";
import { api, useApi, useMutation, type Paged } from "@/shared/lib/api";
import { PagedFooter } from "@/shared/ui/data";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { Badge, Button, Card, cx, ErrorState, Field, Input, Notice, PageSkeleton, ProductArt, SearchInput, Select, Spinner, StatusBadge, Textarea } from "@/shared/ui/primitives";
import { ConfirmDialog, Modal, useToast } from "@/shared/ui/overlay";
import { WishlistForm } from "@/components/wishlist-form";
import { shareLink, type Wishlist, type WishlistItem } from "@/lib/types";

type CatalogProduct = { id: string; name: string; priceUsd: number; emoji: string; tint: string; category: string; vendor: { name: string } };
const priorityLabel: Record<number, string> = { 1: "Top wish", 2: "Would love", 3: "Nice to have" };

export default function WishlistDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: w, error, loading, reload } = useApi<Wishlist>(`/recipient/wishlists/${id}`);
  const { fmt } = useSession();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [category, setCategory] = useState("");
  const del = useMutation(async () => { await api(`/recipient/wishlists/${id}`, { method: "DELETE" }); return true; });
  const rotate = useMutation(() => api(`/recipient/wishlists/${id}/rotate-link`, { method: "POST" }));
  const categories = useMemo(() => Array.from(new Set(w?.items.map((i) => i.category) ?? [])), [w]);

  if (loading) return <PageSkeleton />;
  if (error || !w) return <ErrorState error={error} onRetry={reload} />;
  const items = w.items.filter((i) => !category || i.category === category);
  const link = shareLink(w.shareToken);

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

      {categories.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {["", ...categories].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={cx("rounded-full px-3 py-1.5 text-xs font-semibold", category === c ? "bg-plum-800 text-ivory-50" : "bg-white text-ink-700 ring-1 ring-ink-200")}>
              {c || "All"}
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        <li>
          <button type="button" onClick={() => setAdding(true)} className="flex aspect-square w-full items-center justify-center rounded-2xl bg-ink-100 hover:bg-plum-50" aria-label="Add a wish">
            <span className="grid size-16 place-items-center rounded-full bg-plum-800 text-white shadow-lg"><Plus className="size-8" aria-hidden /></span>
          </button>
          <p className="mt-2.5 font-display text-lg font-semibold text-ink-400">Add wish</p>
        </li>
        {items.map((i) =>
          i.product ? (
            <li key={i.id}>
              <div className="relative">
                <ProductArt emoji={i.product.emoji} tint={i.product.tint} size="lg" label={i.product.name} className={cx(i.fulfilled && "opacity-60")} />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {i.fulfilled ? <Badge tone="success" icon={CheckCircle2}>Gifted</Badge> : i.priority === 1 && <Badge tone="gold">★ Top wish</Badge>}
                  {i.product.availability !== "In stock" && !i.fulfilled && <Badge tone="warning">{i.product.availability}</Badge>}
                </div>
                <button type="button" onClick={() => setEditItem(i)} className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/90 text-ink-700 shadow hover:text-plum-700" aria-label={`Edit ${i.product.name}`}>
                  <Pencil className="size-4" />
                </button>
              </div>
              <p className="mt-2.5 line-clamp-1 text-sm font-semibold">{i.product.name}</p>
              <p className="text-xs text-ink-500">{i.product.vendor} · {i.category}</p>
              <p className="mt-0.5 flex items-center justify-between text-sm">
                <b className="tabular">{fmt(i.product.priceUsd)}</b>
                <span className="text-[11px] text-ink-500">{priorityLabel[i.priority]}{i.quantity > 1 && ` · ×${i.quantity}`}</span>
              </p>
              {i.notes && <p className="mt-1 line-clamp-2 text-xs text-ink-700 italic">“{i.notes}”</p>}
            </li>
          ) : null,
        )}
      </ul>

      <WishlistForm open={editing} onClose={() => setEditing(false)} existing={w} />
      {adding && <AddItemModal wishlistId={w.id} existing={w.items.map((i) => i.product?.id ?? "")} onClose={() => setAdding(false)} />}
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

function AddItemModal({ wishlistId, existing, onClose }: { wishlistId: string; existing: string[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState({ priority: 2, notes: "", quantity: 1, category: "" });
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [search]);
  const { data: paged, loading } = useApi<Paged<CatalogProduct>>(`/catalog/products?search=${encodeURIComponent(search)}&page=${page}&pageSize=24`);
  const data = paged?.items;
  const { fmt } = useSession();
  const toast = useToast();
  const add = useMutation(() => api(`/recipient/wishlists/${wishlistId}/items`, { method: "POST", body: { productId: picked!.id, ...form } }));

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={picked ? "Add details" : "Add a wish"}
      description={picked ? picked.name : "Choose from approved SecretWish vendors"}
      footer={
        picked ? (
          <>
            <Button variant="ghost" onClick={() => setPicked(null)}>Back</Button>
            <Button loading={add.pending} onClick={async () => { if ((await add.run()) !== undefined) { toast({ tone: "success", title: `${picked.name} added` }); onClose(); } }}>Add to wishlist</Button>
          </>
        ) : undefined
      }
    >
      {!picked ? (
        <>
          <SearchInput value={search} onChange={setSearch} label="Search catalogue" placeholder="Search gifts" className="mb-4" />
          {loading && <Spinner />}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data?.map((p) => {
              const already = existing.includes(p.id);
              return (
                <li key={p.id}>
                  <button type="button" disabled={already} onClick={() => { setPicked(p); setForm((f) => ({ ...f, category: p.category })); }} className="w-full rounded-2xl p-1 text-left hover:bg-plum-50 disabled:opacity-50">
                    <ProductArt emoji={p.emoji} tint={p.tint} size="lg" />
                    <p className="mt-2 line-clamp-1 text-[13px] font-semibold">{p.name}</p>
                    <p className="text-xs text-ink-500">{already ? "Already on this list" : `${fmt(p.priceUsd)} · ${p.vendor.name}`}</p>
                  </button>
                </li>
              );
            })}
          </ul>
          <PagedFooter data={paged} onPage={setPage} className="mt-3" />
        </>
      ) : (
        <ItemFields form={form} setForm={setForm} error={add.error?.message} />
      )}
    </Modal>
  );
}

function EditItemModal({ item, onClose }: { item: WishlistItem; onClose: () => void }) {
  const [form, setForm] = useState({ priority: item.priority, notes: item.notes, quantity: item.quantity, category: item.category });
  const toast = useToast();
  const save = useMutation(() => api(`/recipient/items/${item.id}`, { method: "PUT", body: { productId: item.product?.id, ...form } }));
  const remove = useMutation(async () => { await api(`/recipient/items/${item.id}`, { method: "DELETE" }); return true; });
  return (
    <Modal
      open
      onClose={onClose}
      title={item.product?.name ?? "Edit wish"}
      footer={
        <>
          <Button variant="ghost" icon={Trash2} loading={remove.pending} onClick={async () => { if (await remove.run()) { toast({ tone: "success", title: "Removed from wishlist" }); onClose(); } }}>Remove</Button>
          <Button loading={save.pending} onClick={async () => { if ((await save.run()) !== undefined) { toast({ tone: "success", title: "Wish updated" }); onClose(); } }}>Save</Button>
        </>
      }
    >
      {item.fulfilled && <Notice className="mb-4" tone="success">Someone already gifted this. 🎉</Notice>}
      <ItemFields form={form} setForm={setForm} error={save.error?.message ?? remove.error?.message} />
    </Modal>
  );
}

type ItemForm = { priority: number; notes: string; quantity: number; category: string };
function ItemFields({ form, setForm, error }: { form: ItemForm; setForm: (f: ItemForm) => void; error?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Priority">
        {(id) => (
          <Select id={id} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}>
            <option value={1}>★ Top wish</option>
            <option value={2}>Would love</option>
            <option value={3}>Nice to have</option>
          </Select>
        )}
      </Field>
      <Field label="Quantity">{(id) => <Input id={id} type="number" min={1} max={10} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.min(10, Math.max(1, Number(e.target.value))) })} />}</Field>
      <Field label="Group / category" hint="Organise your list, e.g. “Kitchen”, “Self-care”." className="sm:col-span-2">
        {(id, d) => <Input id={id} aria-describedby={d} maxLength={40} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />}
      </Field>
      <Field label="Notes for gifters" hint="Size, colour, anything that helps. Visible to people you share with." className="sm:col-span-2">
        {(id, d) => <Textarea id={id} aria-describedby={d} maxLength={200} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
      </Field>
      {error && <Notice tone="danger" className="sm:col-span-2">{error}</Notice>}
    </div>
  );
}
