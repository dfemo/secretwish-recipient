"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { Button, EmptyState, ErrorState, PageHeader, Skeleton } from "@/shared/ui/primitives";
import { WishlistForm } from "@/components/wishlist-form";
import { WishlistCover } from "@/components/wishlist-cover";
import type { Wishlist } from "@/lib/types";

export default function WishlistsPage() {
  const { data, error, loading, reload } = useApi<Wishlist[]>("/recipient/wishlists");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  return (
    <>
      <PageHeader title="My wishlists" description="Private by default. You decide who can see each list." actions={<Button icon={Plus} onClick={() => setCreating(true)}>New wishlist</Button>} />
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      )}
      {data?.length === 0 && <EmptyState icon={ListChecks} title="No wishlists yet" description="Create your first list and add gifts from approved vendors." action={<Button onClick={() => setCreating(true)}>Create a wishlist</Button>} />}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((w) => (<li key={w.id}><WishlistCover w={w} /></li>))}
      </ul>
      <WishlistForm open={creating} onClose={() => setCreating(false)} onSaved={(id) => router.push(`/wishlists/${id}`)} />
    </>
  );
}
