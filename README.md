# SecretWish — Recipient

A private space to build wishlists, choose who can see them, receive surprises without spoilers and verify gifts with a secret code.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · lucide-react. All data comes from the SecretWish .NET API (`../Backend`).

## Run

```bash
npm install
cp .env.example .env.local   # optional — defaults point at http://localhost:5080
npm run dev                  # http://localhost:3003
```

Start the API first (`dotnet run --project ../Backend/src/SecretWish.Api --launch-profile http`). Production build: `npm run build && npm start`. Type check: `npm run typecheck`.

## Screens

| Screen | What you can do |
|---|---|
| Home | Profile, wishlists, recently added items, sharing controls, gift activity |
| Wishlists | Create / edit / delete; visibility Private · Link · Public (public needs explicit consent); occasion and date |
| Wishlist detail | Add items from approved vendors, set priority, quantity, notes and your own groups; copy or rotate the share link |
| Gifts | Incoming gifts with no item/price/sender shown; secret-code verification with format validation, incorrect / locked / expired / already-used states and a support path; received gifts |
| Privacy | Delivery address (never shown to senders), discreet notifications, report suspicious or unwanted activity, support |

**Demo helper:** on an incoming gift, *Get demo code* asks the development-only API endpoint to issue a fresh code (it's generated and hashed on the server and never stored in the app). *Expire code* lets you see the expired state. Neither endpoint exists outside Development.

Demo persona: **Ada Nwosu**.

## Shared design system

`src/shared` is identical in Admin, Sender, Recipient and Vendor (tokens, components, API client, app shells). Edit it in one app, then run `sync-shared.ps1` from the workspace root to copy it to the others. A later step is to publish it as a private `@secretwish/ui` package.

## Prototype notes

- **Demo sign-in:** pick a synthetic persona; the API trusts the `X-Demo-User` header. Not real authentication.
- **Sample data only.** Figures are generated, not production analytics.
- Browser storage holds only per-viewer conveniences (chosen persona, currency, sidebar state, recently viewed).
- Prices are stored in USD and shown in USD or NGN at the recorded sample FX rate (toggle in the header).
