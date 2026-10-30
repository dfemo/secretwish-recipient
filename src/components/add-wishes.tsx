"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote, Gift, Link2, Plus, Search, ShoppingBag, X } from "lucide-react";
import { api, ApiError, useApi, useMutation, type Paged } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Button, cx, Input, Notice, ProductArt, Select, Spinner, Textarea } from "@/shared/ui/primitives";
import { Modal, useToast } from "@/shared/ui/overlay";

type Kind = "Custom" | "Catalog" | "Cash";
type CatalogProduct = { id: string; name: string; priceUsd: number; emoji: string; tint: string; category: string; vendor: { name: string } };
type Row = {
  key: number;
  kind: Kind;
  title: string;
  url: string;
  imageUrl: string;
  price: string;
  amount: string;
  categoryId: string;
  notes: string;
  product: CatalogProduct | null;
  previewing: boolean;
};

let nextKey = 1;
const blank = (kind: Kind = "Custom"): Row => ({ key: nextKey++, kind, title: "", url: "", imageUrl: "", price: "", amount: "", categoryId: "", notes: "", product: null, previewing: false });
const looksLikeUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());

const kinds: { value: Kind; label: string; icon: typeof Gift }[] = [
  { value: "Custom", label: "Something else", icon: Gift },
  { value: "Catalog", label: "From SecretWish", icon: ShoppingBag },
  { value: "Cash", label: "Cash instead", icon: Banknote },
];

/**
 * Add several wishes in one go, like writing a list. Each row is something described in words (with an optional link to a shop
 * like Zara — pasting one fills in the details), a gift from the SecretWish catalogue, or cash instead. Enter adds another row.
 */
export function AddWishesModal({ wishlistId, existingProductIds, onClose }: { wishlistId: string; existingProductIds: string[]; onClose: () => void }) {
  const { currency, meta } = useSession();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const focusKey = useRef<number | null>(null);
  const fx = meta?.fxRateNgn ?? 1550;
  const symbol = currency === "NGN" ? "₦" : "$";
  const toUsd = (v: string) => (v.trim() === "" ? null : Math.round((Number(v) / (currency === "NGN" ? fx : 1)) * 100) / 100);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = (after?: number, kind?: Kind) => {
    const row = blank(kind ?? rows.find((r) => r.key === after)?.kind ?? "Custom");
    focusKey.current = row.key;
    setRows((rs) => {
      const i = after === undefined ? rs.length - 1 : rs.findIndex((r) => r.key === after);
      return [...rs.slice(0, i + 1), row, ...rs.slice(i + 1)];
    });
  };
  useEffect(() => {
    if (focusKey.current === null) return;
    document.getElementById(`wish-${focusKey.current}`)?.focus();
    focusKey.current = null;
  }, [rows]);

  async function preview(key: number, url: string) {
    if (!looksLikeUrl(url)) return;
    update(key, { previewing: true });
    try {
      const p = await api<{ title: string | null; imageUrl: string | null; priceUsd: number | null }>("/recipient/link-preview", { method: "POST", body: { url } });
      setRows((rs) => rs.map((r) => r.key !== key ? r : {
        ...r, previewing: false,
        title: r.title || p.title || "",
        imageUrl: p.imageUrl ?? r.imageUrl,
        price: r.price || (p.priceUsd ? String(Math.round(p.priceUsd * (currency === "NGN" ? fx : 1))) : ""),
      }));
    } catch {
      update(key, { previewing: false });
    }
  }

  const filled = rows.filter((r) => (r.kind === "Custom" ? r.title.trim() || r.url.trim() : r.kind === "Cash" ? r.amount.trim() : r.product));
  const save = useMutation(() =>
    api<{ id: string }[]>(`/recipient/wishlists/${wishlistId}/items/bulk`, {
      method: "POST",
      body: {
        items: filled.map((r) =>
          r.kind === "Catalog"
            ? { kind: "Catalog", productId: r.product!.id, notes: r.notes }
            : r.kind === "Cash"
              ? { kind: "Cash", cashAmountUsd: toUsd(r.amount), notes: r.notes }
              : { kind: "Custom", title: r.title.trim() || r.url.trim(), url: r.url.trim() || null, imageUrl: r.imageUrl || null, estimatedPriceUsd: toUsd(r.price), categoryId: r.categoryId || null, notes: r.notes },
        ),
      },
    }),
  );

  async function submit() {
    setRowErrors({});
    const created = await save.run();
    if (created) {
      toast({ tone: "success", title: `${created.length} wish${created.length === 1 ? "" : "es"} added` });
      onClose();
      return;
    }
  }
  // Map "items[n]" validation errors back onto the rows that were sent.
  useEffect(() => {
    const errs = (save.error as ApiError | null)?.errors;
    if (!errs) return;
    const map: Record<number, string> = {};
    for (const [k, v] of Object.entries(errs)) {
      const n = /^items\[(\d+)\]$/.exec(k)?.[1];
      if (n !== undefined && filled[Number(n)]) map[filled[Number(n)].key] = v[0];
    }
    setRowErrors(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.error]);

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Add wishes"
      description="Write your list: anything from any shop, gifts from SecretWish vendors, or cash. Press Enter for the next one."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={save.pending} disabled={filled.length === 0} onClick={submit}>
            Add {filled.length || ""} wish{filled.length === 1 ? "" : "es"}
          </Button>
        </>
      }
    >
      <ol className="space-y-3">
        {rows.map((r, index) => (
          <li key={r.key} className={cx("rounded-2xl border bg-white p-3", rowErrors[r.key] ? "border-danger-300" : "border-ink-200")}>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-plum-100 text-xs font-bold text-plum-800">{index + 1}</span>
              <div className="flex flex-1 flex-wrap gap-1" role="radiogroup" aria-label={`Type of wish ${index + 1}`}>
                {kinds.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    role="radio"
                    aria-checked={r.kind === k.value}
                    onClick={() => update(r.key, { kind: k.value })}
                    className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", r.kind === k.value ? "bg-plum-800 text-ivory-50" : "bg-ink-100 text-ink-700 hover:bg-plum-50")}
                  >
                    <k.icon className="size-3.5" aria-hidden /> {k.label}
                  </button>
                ))}
              </div>
              {rows.length > 1 && (
                <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100" aria-label={`Remove wish ${index + 1}`}>
                  <X className="size-4" />
                </button>
              )}
            </div>

            {r.kind === "Custom" && (
              <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
                <Input
                  id={`wish-${r.key}`}
                  aria-label="What would you like?"
                  placeholder="What would you like? e.g. Zara black blazer, size M — or paste a link"
                  value={r.title}
                  maxLength={200}
                  enterKeyHint="next"
                  onChange={(e) => {
                    const v = e.target.value;
                    // Pasted a link into the main field: move it to the link field and fill in what we can.
                    if (looksLikeUrl(v)) { update(r.key, { url: v.trim(), title: "" }); preview(r.key, v.trim()); }
                    else update(r.key, { title: v });
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(r.key); } }}
                />
                <Input aria-label={`Rough price (${symbol}), optional`} placeholder={`${symbol} price (optional)`} inputMode="decimal" value={r.price} onChange={(e) => update(r.key, { price: e.target.value.replace(/[^\d.]/g, "") })} />
                <div className="relative sm:col-span-2">
                  <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
                  <Input aria-label="Link to the item, optional" placeholder="Link to it (optional), e.g. https://www.zara.com/…" className="pl-9" inputMode="url" value={r.url} onChange={(e) => update(r.key, { url: e.target.value })} onBlur={(e) => preview(r.key, e.target.value)} />
                </div>
                {(r.previewing || r.imageUrl) && (
                  <div className="flex items-center gap-2 text-xs text-ink-500 sm:col-span-2">
                    {r.previewing ? <><Spinner label="" /> Looking up the link…</> : <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.imageUrl} alt="" className="size-10 rounded-lg object-cover" referrerPolicy="no-referrer" /> Picture from the link
                    </>}
                  </div>
                )}
                <Select aria-label="Category, helps vendors find it" value={r.categoryId} onChange={(e) => update(r.key, { categoryId: e.target.value })}>
                  <option value="">Category (optional)</option>
                  {meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </Select>
                <Input aria-label="Note for gifters, optional" placeholder="Size, colour… (optional)" maxLength={500} value={r.notes} onChange={(e) => update(r.key, { notes: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(r.key); } }} />
              </div>
            )}

            {r.kind === "Cash" && (
              <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
                <Input id={`wish-${r.key}`} aria-label={`Amount (${symbol})`} placeholder={`${symbol} amount`} inputMode="decimal" value={r.amount} onChange={(e) => update(r.key, { amount: e.target.value.replace(/[^\d.]/g, "") })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(r.key, "Custom"); } }} />
                <Input aria-label="What it's for, optional" placeholder="What it's for (optional), e.g. saving for a trip" maxLength={500} value={r.notes} onChange={(e) => update(r.key, { notes: e.target.value })} />
                <p className="text-xs text-ink-500 sm:col-span-2">Gifters send money through SecretWish; you'll add your bank details to receive it.</p>
              </div>
            )}

            {r.kind === "Catalog" && (
              r.product ? (
                <div className="flex items-center gap-3">
                  <ProductArt emoji={r.product.emoji} tint={r.product.tint} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.product.name}</p>
                    <p className="text-xs text-ink-500">{r.product.vendor.name}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => update(r.key, { product: null })}>Change</Button>
                  <Input aria-label="Note for gifters, optional" placeholder="Note (optional)" className="hidden w-48 sm:block" maxLength={500} value={r.notes} onChange={(e) => update(r.key, { notes: e.target.value })} />
                </div>
              ) : (
                <CatalogPicker inputId={`wish-${r.key}`} exclude={[...existingProductIds, ...rows.filter((x) => x.product).map((x) => x.product!.id)]} onPick={(p) => update(r.key, { product: p })} />
              )
            )}
            {rowErrors[r.key] && <p className="mt-2 text-xs font-semibold text-danger-700" role="alert">{rowErrors[r.key]}</p>}
          </li>
        ))}
      </ol>
      <Button variant="secondary" icon={Plus} className="mt-3 w-full" onClick={() => addRow()}>Add another</Button>
      {save.error && !Object.keys(rowErrors).length && <Notice tone="danger" className="mt-3">{save.error.message}</Notice>}
    </Modal>
  );
}

function CatalogPicker({ inputId, exclude, onPick }: { inputId: string; exclude: string[]; onPick: (p: CatalogProduct) => void }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, loading } = useApi<Paged<CatalogProduct>>(`/catalog/products?search=${encodeURIComponent(debounced)}&pageSize=6`);
  const { fmt } = useSession();
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <Input id={inputId} className="pl-9" placeholder="Search SecretWish gifts" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {loading && <Spinner />}
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {data?.items.map((p) => {
          const taken = exclude.includes(p.id);
          return (
            <li key={p.id}>
              <button type="button" disabled={taken} onClick={() => onPick(p)} className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left hover:bg-plum-50 disabled:opacity-50">
                <ProductArt emoji={p.emoji} tint={p.tint} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{p.name}</span>
                  <span className="block text-xs text-ink-500">{taken ? "Already on your list" : `${fmt(p.priceUsd)} · ${p.vendor.name}`}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
