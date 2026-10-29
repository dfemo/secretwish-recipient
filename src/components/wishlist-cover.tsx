import Link from "next/link";
import { ProductArt, StatusBadge } from "@/shared/ui/primitives";
import type { Wishlist } from "@/lib/types";

/** Collage cover inspired by a gift board: one hero item and two supporting items. */
export function WishlistCover({ w }: { w: Wishlist }) {
  const items = w.items.filter((i) => i.product);
  const [a, b, c] = [items[0]?.product, items[1]?.product, items[2]?.product];
  return (
    <Link href={`/wishlists/${w.id}`} className="group block">
      <div className="grid h-52 grid-cols-[2fr_1fr] gap-1 overflow-hidden rounded-2xl" aria-hidden>
        <ProductArt emoji={a?.emoji ?? "🎁"} tint={a?.tint ?? "lavender"} size="lg" className="!aspect-auto h-full rounded-none text-7xl transition-transform group-hover:scale-[1.03]" />
        <div className="grid grid-rows-2 gap-1">
          <ProductArt emoji={b?.emoji ?? "✨"} tint={b?.tint ?? "gold"} size="lg" className="!aspect-auto h-full rounded-none text-4xl" />
          <ProductArt emoji={c?.emoji ?? "💝"} tint={c?.tint ?? "rose"} size="lg" className="!aspect-auto h-full rounded-none text-4xl" />
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900 group-hover:text-plum-700">{w.title}</p>
          <p className="text-xs text-ink-500">
            {w.items.length} wish{w.items.length === 1 ? "" : "es"} · {w.items.filter((i) => i.fulfilled).length} gifted
          </p>
        </div>
        <StatusBadge status={w.visibility} />
      </div>
    </Link>
  );
}
