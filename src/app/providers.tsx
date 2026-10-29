"use client";

import type { ReactNode } from "react";
import { Gift, Home, ListChecks, ShieldCheck } from "lucide-react";
import { SessionProvider } from "@/shared/lib/session";
import { ConsumerShell, type NavItem } from "@/shared/layout/shell";
import { ToastProvider } from "@/shared/ui/overlay";

const items: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/wishlists", label: "Wishlists", icon: ListChecks },
  { href: "/gifts", label: "Gifts", icon: Gift },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
];

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider
        app="recipient"
        intro={
          <>
            <h1 className="font-display text-4xl leading-tight font-semibold md:text-5xl">
              Wish out loud. <span className="text-gold-400">Stay private.</span>
            </h1>
            <p className="mt-4 max-w-md text-plum-200">Build wishlists from approved vendors, share them only with the people you choose, and let SecretWish keep every surprise a surprise.</p>
          </>
        }
      >
        <ConsumerShell items={items} tagline="Wishlists">
          {children}
        </ConsumerShell>
      </SessionProvider>
    </ToastProvider>
  );
}
