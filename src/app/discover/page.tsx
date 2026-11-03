"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Check, Compass, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { api, useApi, useMutation, usePagedApi } from "@/shared/lib/api";
import { PagedFooter } from "@/shared/ui/data";
import { useSession } from "@/shared/lib/session";
import { Button, Card, cx, EmptyState, ErrorState, Field, Input, Notice, PageHeader, ProductArt, SearchInput, Select, Skeleton } from "@/shared/ui/primitives";
import { Modal, useToast } from "@/shared/ui/overlay";
import type { Wishlist } from "@/lib/types";

type Product = { id: string; name: string; description: string; priceUsd: number; emoji: string; tint: string; images?: string[]; rating: number; category: string; vendor: { id: string; name: string; city: string } };
type Picked = { product: Product; quantity: number };

export default function DiscoverPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}>
      <Discover />
    </Suspense>
  );
}

/** Browse approved gifts from every vendor and pick as many as you like (with how many of each) for one of your wishlists. */
function Discover() {
  const params = useSearchParams();
  const { meta, fmt } = useSession();
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState("");
  const { data, items, error, loading, reload, setPage, search, setSearch } = usePagedApi<Product>("/catalog/products", { categoryId, sort }, 24);
  const [picked, setPicked] = useState<Record<string, Picked>>({});
  const [adding, setAdding] = useState(false);
  const count = Object.keys(picked).length;

  const toggle = (p: Product) =>
    setPicked((xs) => {
      const next = { ...xs };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = { product: p, quantity: 1 };
      return next;
    });
  const setQuantity = (id: string, quantity: number) => setPicked((xs) => ({ ...xs, [id]: { ...xs[id], quantity: Math.min(10, Math.max(1, quantity)) } }));

  return (
    <>
      <PageHeader title="Discover gifts" description="Browse gifts from SecretWish's approved vendors and pick as many as you like for your wishlist. You can still add your own wishes, links and cash too." />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} label="Search gifts" placeholder="Search gifts, vendors or categories" className="min-w-[220px] flex-1 sm:flex-none sm:w-80" />
        <label htmlFor="cat" className="sr-only">Category</label>
        <Select id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-48">
          <option value="">All categories</option>
          {meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </Select>
        <label htmlFor="sort" className="sr-only">Sort</label>
        <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-44">
          <option value="">Most popular</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </Select>
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}
      {items?.length === 0 && <EmptyState icon={Compass} title="No gifts match" description="Try another search or category." />}
      <ul className={cx("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", count > 0 && "pb-24")}>
        {loading && !data && Array.from({ length: 8 }).map((_, i) => <li key={i}><Skeleton className="h-72 rounded-2xl" /></li>)}
        {items?.map((p) => {
          const on = picked[p.id];
          return (
            <li key={p.id}>
              <Card className={cx("flex h-full flex-col overflow-hidden", on && "ring-2 ring-plum-500")}>
                <button type="button" onClick={() => toggle(p)} aria-pressed={!!on} className="relative text-left" aria-label={on ? `Remove ${p.name}` : `Pick ${p.name}`}>
                  <ProductArt emoji={p.emoji} tint={p.tint} src={p.images?.[0]} size="lg" className="rounded-none" label={p.name} />
                  {on && <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-plum-700 text-white shadow"><Check className="size-4" aria-hidden /></span>}
                  {(p.images?.length ?? 0) > 1 && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-ink-700">{p.images!.length} photos</span>}
                </button>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs font-semibold text-gold-700">{p.category}</p>
                  <p className="line-clamp-2 font-semibold text-ink-900">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                    {p.vendor.name} · {p.vendor.city}
                    {p.rating > 0 && <><Star className="ml-1 size-3 fill-gold-500 text-gold-500" aria-hidden /> {p.rating.toFixed(1)}</>}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <p className="font-bold tabular">{fmt(p.priceUsd)}</p>
                    {on ? (
                      <div className="flex items-center gap-1" role="group" aria-label={`How many ${p.name}`}>
                        <Button size="sm" variant="secondary" icon={Minus} aria-label="One fewer" onClick={() => (on.quantity === 1 ? toggle(p) : setQuantity(p.id, on.quantity - 1))} />
                        <span className="w-6 text-center text-sm font-semibold tabular" aria-live="polite">{on.quantity}</span>
                        <Button size="sm" variant="secondary" icon={Plus} aria-label="One more" disabled={on.quantity >= 10} onClick={() => setQuantity(p.id, on.quantity + 1)} />
                      </div>
                    ) : (
                      <Button size="sm" variant="subtle" icon={Plus} onClick={() => toggle(p)}>Pick</Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      <PagedFooter data={data} onPage={setPage} className="mt-6 rounded-2xl border bg-white" />

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold"><ShoppingBag className="mr-1.5 inline size-4 text-plum-700" aria-hidden />{count} gift{count === 1 ? "" : "s"} picked</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPicked({})}>Clear</Button>
              <Button icon={Plus} onClick={() => setAdding(true)}>Add to wishlist</Button>
            </div>
          </div>
        </div>
      )}
      <AddToWishlist open={adding} picked={Object.values(picked)} preferred={params.get("list")} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); setPicked({}); }} />
    </>
  );
}

function AddToWishlist({ open, picked, preferred, onClose, onAdded }: { open: boolean; picked: Picked[]; preferred: string | null; onClose: () => void; onAdded: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { data: lists } = useApi<Wishlist[]>(open ? "/recipient/wishlists" : null);
  const openLists = useMemo(() => (lists ?? []).filter((l) => !l.closedAt), [lists]);
  const [choice, setChoice] = useState<string>("");
  const [title, setTitle] = useState("");
  const target = choice || (preferred && openLists.some((l) => l.id === preferred) ? preferred : openLists[0]?.id ?? "new");
  const list = openLists.find((l) => l.id === target);
  // A list can hold each catalogue gift once; skip the ones already on it.
  const already = new Set(list?.items.map((i) => i.product?.id).filter(Boolean));
  const toAdd = picked.filter((p) => !already.has(p.product.id));

  const add = useMutation(async () => {
    let id = target;
    if (target === "new") id = (await api<{ id: string }>("/recipient/wishlists", { method: "POST", body: { title: title.trim(), visibility: "Link" } })).id;
    if (toAdd.length) await api(`/recipient/wishlists/${id}/items/bulk`, { method: "POST", body: { items: toAdd.map((p) => ({ kind: "Catalog", productId: p.product.id, quantity: p.quantity })) } });
    return id;
  });
  const ready = (target !== "new" || title.trim().length > 0) && toAdd.length > 0;

  return (
    <Modal
      open={open}
      onClose={() => { add.setError(null); onClose(); }}
      title="Add to a wishlist"
      description={`${picked.length} gift${picked.length === 1 ? "" : "s"} picked. Senders gift them from your list; SecretWish delivers to your saved address.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Keep browsing</Button>
          <Button
            icon={Plus}
            disabled={!ready}
            loading={add.pending}
            onClick={async () => {
              const id = await add.run();
              if (!id) return;
              toast({ tone: "success", title: `Added ${toAdd.length} gift${toAdd.length === 1 ? "" : "s"}`, body: picked.length > toAdd.length ? `${picked.length - toAdd.length} were already on the list.` : undefined });
              onAdded();
              router.push(`/wishlists/${id}`);
            }}
          >
            Add {toAdd.length || ""} to wishlist
          </Button>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Which wishlist?</legend>
        {openLists.map((l) => (
          <label key={l.id} className={cx("flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 ring-inset", target === l.id ? "bg-plum-50 ring-plum-400" : "ring-ink-200")}>
            <input type="radio" name="list" checked={target === l.id} onChange={() => setChoice(l.id)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{l.title}</span>
              <span className="text-xs text-ink-500">{l.items.length} wish{l.items.length === 1 ? "" : "es"}</span>
            </span>
          </label>
        ))}
        <label className={cx("flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 ring-inset", target === "new" ? "bg-plum-50 ring-plum-400" : "ring-ink-200")}>
          <input type="radio" name="list" checked={target === "new"} onChange={() => setChoice("new")} />
          <span className="font-semibold">A new wishlist</span>
        </label>
      </fieldset>
      {target === "new" && (
        <Field label="Wishlist name" className="mt-4" hint="Shared by link to start with; change who can see it in the list's settings.">
          {(id, d) => <Input id={id} aria-describedby={d} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My 30th birthday" />}
        </Field>
      )}
      {list && picked.length > toAdd.length && (
        <Notice className="mt-4" tone="info">{picked.length - toAdd.length} of these {picked.length - toAdd.length === 1 ? "is" : "are"} already on “{list.title}” and will be skipped.</Notice>
      )}
      <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
        {picked.map((p) => (
          <li key={p.product.id} className={cx("flex items-center gap-3 text-sm", already.has(p.product.id) && "opacity-50")}>
            <ProductArt emoji={p.product.emoji} tint={p.product.tint} src={p.product.images?.[0]} size="sm" />
            <span className="min-w-0 flex-1 truncate">{p.product.name}</span>
            <span className="text-xs text-ink-500">×{p.quantity}</span>
          </li>
        ))}
      </ul>
      {add.error && <Notice className="mt-3" tone="danger">{add.error.message}</Notice>}
      <p className="mt-3 text-xs text-ink-500">
        Want something we don&apos;t sell? <Link href="/wishlists" className="font-semibold text-plum-700 hover:underline">Add your own wishes</Link> to any list.
      </p>
    </Modal>
  );
}
