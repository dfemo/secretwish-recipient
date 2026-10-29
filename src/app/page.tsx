"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Copy, Gift, Lock, Plus, ShieldCheck } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date, timeAgo } from "@/shared/lib/format";
import { Avatar, Button, ButtonLink, Card, CardHeader, cx, ErrorState, PageSkeleton, ProductArt, StatusBadge } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/overlay";
import { WishlistForm } from "@/components/wishlist-form";
import { WishlistCover } from "@/components/wishlist-cover";
import { shareLink, type Gift as GiftT, type Wishlist } from "@/lib/types";

type Home = {
  user: { name: string; city: string; hasAddress: boolean };
  stats: { wishlists: number; items: number; gifted: number; shared: number };
  wishlists: Wishlist[];
  recentItems: { id: string; wishlist: string; wishlistId: string; addedAt: string; fulfilled: boolean; product: { name: string; emoji: string; tint: string; priceUsd: number } }[];
  gifts: GiftT[];
};

export default function RecipientHome() {
  const { data, error, loading, reload } = useApi<Home>("/recipient/home");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"lists" | "gifts">("lists");
  const { fmt } = useSession();
  const toast = useToast();
  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  const shared = data.wishlists.filter((w) => w.visibility !== "Private");

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareLink(token));
      toast({ tone: "success", title: "Link copied", body: "Only people with this link can open the list." });
    } catch {
      toast({ tone: "error", title: "Couldn't copy", body: shareLink(token) });
    }
  };

  return (
    <div className="space-y-10">
      <section className="flex flex-col items-center text-center">
        <Avatar name={data.user.name} size={104} className="ring-4 ring-gold-300/60" />
        <h1 className="mt-4 font-display text-4xl font-semibold text-plum-900">{data.user.name}</h1>
        <p className="text-sm text-ink-500">{data.user.city} · {data.stats.wishlists} wishlists · {data.stats.gifted} wishes come true</p>
        <div className="mt-5 inline-flex rounded-2xl bg-white p-1 shadow-[var(--shadow-card)]" role="tablist">
          {(["lists", "gifts"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx("rounded-xl px-6 py-2 text-sm font-semibold", tab === t ? "bg-plum-800 text-ivory-50" : "text-ink-500 hover:text-ink-900")}>
              {t === "lists" ? "My lists" : "Gift activity"}
            </button>
          ))}
        </div>
      </section>

      {!data.user.hasAddress && (
        <Link href="/privacy" className="block rounded-2xl bg-gold-100 px-5 py-4 text-sm font-semibold text-gold-700">
          Add a delivery address so friends can gift from your wishlists →
        </Link>
      )}

      {tab === "lists" ? (
        <>
          <section aria-labelledby="lists-h">
            <div className="mb-4 flex items-end justify-between">
              <h2 id="lists-h" className="font-display text-2xl font-semibold text-plum-900">My wishlists</h2>
              <Button icon={Plus} onClick={() => setCreating(true)}>New wishlist</Button>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.wishlists.map((w) => (
                <li key={w.id}><WishlistCover w={w} /></li>
              ))}
              <li>
                <button type="button" onClick={() => setCreating(true)} className="flex h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-white/60 text-ink-400 hover:border-plum-300 hover:text-plum-700">
                  <span className="grid size-14 place-items-center rounded-full bg-plum-800 text-white"><Plus className="size-7" aria-hidden /></span>
                  <span className="font-display text-lg font-semibold">Add wishlist</span>
                </button>
              </li>
            </ul>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader title="Recently added" action={<Link href="/wishlists" className="text-xs font-semibold text-plum-700 hover:underline">Manage</Link>} />
              <ul className="divide-y divide-ink-100 px-5 pb-3">
                {data.recentItems.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <ProductArt emoji={i.product.emoji} tint={i.product.tint} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.product.name}</p>
                      <p className="text-xs text-ink-500">
                        <Link href={`/wishlists/${i.wishlistId}`} className="hover:underline">{i.wishlist}</Link> · {timeAgo(i.addedAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular">{fmt(i.product.priceUsd)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Sharing" description="Lists people can open" />
              <ul className="space-y-2 px-5 pb-5">
                {shared.length === 0 && <li className="text-sm text-ink-500">All your lists are private.</li>}
                {shared.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-50 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{w.title}</span>
                      <StatusBadge status={w.visibility} />
                    </span>
                    <Button size="sm" variant="secondary" icon={Copy} onClick={() => copy(w.shareToken)}>Copy link</Button>
                  </li>
                ))}
              </ul>
              <div className="mx-5 mb-5 flex gap-3 rounded-xl bg-plum-50 p-3 text-[13px] text-plum-800">
                <ShieldCheck className="size-5 shrink-0" aria-hidden />
                <p>Your address is never shown to senders. <Link href="/privacy" className="font-semibold underline">Privacy settings</Link></p>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <section aria-labelledby="gifts-h">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="gifts-h" className="font-display text-2xl font-semibold text-plum-900">Gift activity</h2>
            <Link href="/gifts" className="inline-flex items-center gap-1 text-sm font-semibold text-plum-700 hover:underline">All gifts <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          {data.gifts.length === 0 ? (
            <Card className="p-8 text-center text-sm text-ink-500">No gifts yet — share a wishlist to get started.</Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {data.gifts.map((g) => (
                <li key={g.id}>
                  <Card className="flex items-center gap-4 p-4">
                    {g.arrived && g.item ? <ProductArt emoji={g.item.emoji} size="md" /> : <span className="grid size-14 place-items-center rounded-xl bg-plum-800 text-2xl text-gold-300" aria-hidden><Lock className="size-6" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{g.arrived && g.item ? g.item.productName : "A surprise for you"}</p>
                      <p className="text-xs text-ink-500">{g.arrived ? `From ${g.from} · ${date(g.deliveredAt)}` : `Expected by ${date(g.deliveryDate)}`}</p>
                    </div>
                    <StatusBadge status={g.arrived ? "Delivered" : g.status === "On its way" ? "Dispatched" : "Processing"} />
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 text-center">
            <ButtonLink href="/gifts" icon={Gift} variant="secondary">Verify a gift</ButtonLink>
          </div>
        </section>
      )}
      <WishlistForm open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
