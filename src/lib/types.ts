/** One wish. Catalog = an approved SecretWish gift; Custom = anything else, described and/or linked; Cash = money instead. */
export type WishlistItem = {
  id: string;
  kind: "Catalog" | "Custom" | "Cash";
  position: number;
  priority: number;
  name: string;
  notes: string;
  quantity: number;
  fulfilled: boolean;
  addedAt: string;
  category: string;
  categoryId: string | null;
  url: string | null;
  imageUrl: string | null;
  estimatedPriceUsd: number | null;
  cashAmountUsd: number | null;
  product: { id: string; name: string; priceUsd: number; emoji: string; tint: string; image?: string | null; vendor: string; availability: string } | null;
};

export type Wishlist = {
  id: string;
  title: string;
  /** The currency the owner enters prices in and visitors see (amounts are stored in USD). */
  currency?: string;
  description: string;
  occasion?: string;
  eventDate?: string;
  visibility: "Private" | "Link" | "Public";
  shareToken: string;
  createdAt: string;
  /** The owner asked SecretWish to deliver their gifts; viaHub is whether it does (also when gifts come from several vendors). */
  deliverViaHub?: boolean;
  viaHub?: boolean;
  /** Set once the list is closed (by its owner, for good, or by SecretWish): nobody can gift from it. */
  closedAt?: string | null;
  /** Thanks / NoLongerNeeded when the owner closed it (with their message), Staff when SecretWish did. */
  closure?: { kind: "Thanks" | "NoLongerNeeded" | "Staff"; note: string | null; showPublicly: boolean } | null;
  /** Gifts received (orders and cash, including cash for the list as a whole). */
  gifts?: number | null;
  cashGifts?: number | null;
  items: WishlistItem[];
};

export type Gift = {
  id: string;
  status: string;
  arrived: boolean;
  deliveryDate?: string;
  deliveredAt?: string;
  item: { productName: string; emoji: string } | null;
  price: number | null;
  from: string;
  message: string | null;
  canVerify: boolean;
  events: { at: string; title: string; detail: string }[];
};

export const SENDER_URL = process.env.NEXT_PUBLIC_SENDER_URL ?? "http://localhost:3002";
export const shareLink = (token: string) => `${SENDER_URL}/w/${token}`;
