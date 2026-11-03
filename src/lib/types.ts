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
  product: { id: string; name: string; priceUsd: number; emoji: string; tint: string; vendor: string; availability: string } | null;
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
  /** Set when SecretWish closed the list: nobody can gift from it until it's reopened. */
  closedAt?: string | null;
  /** On the single-list view: gifts received (orders and cash, including cash for the list as a whole). */
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
