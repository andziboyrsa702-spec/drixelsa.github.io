# Drixel marketing studio — MKT.02

## Open the right version

Use the React branch `react-v3-migration`, run `npm install`, then `npm run dev -- --force`. Open the Local URL printed by Vite, followed by `/za/admin/marketing/email`. The page must show `MKT.02` and “Make every message count.” The separate announcement workspace is `/za/admin/marketing/updates`; subscribers are at `/za/admin/marketing/subscribers`.

If that marker is missing, verify the branch and commit before clearing caches. A branch push updates repository source; it does not deploy Firebase Functions.

## Creative library

18 advertisement designs cover launches, restocks, member access, lookbooks, editorial stories, offers, gifting, essentials and community letters. 16 update templates cover outages, maintenance, service restoration, sold-out collections, restock delays, delivery delays, dispatch pauses, payment interruptions, order delays, holidays, weather, corrections, product notices, support availability, policies and community announcements.

Use template search and category filters. The cards show the actual email design. The composer includes subject/preheader, headline/message, optional details, links and artwork, offer/code fields, sign-off, and service status. Lookbooks support a second image. Desktop/mobile previews are sandboxed. Test email sends only to the address entered; it does not contact the subscriber list. Sending to the audience requires an explicit confirmation.

Templates are editable starting points, not automated incident detection. Verify facts, dates, stock, offer terms, affected regions and next-update times before sending. Update messages go to the opted-in subscriber list; they do not automatically target customers with specific orders.

## Subscriber connection

Storefront/footer signup posts to `subscribeNewsletter`. The function validates and normalizes email, writes a SHA-256 email document ID in `subscribers`, preserves the original signup source and preference token, and returns success only after Firestore commits. Repeated signups update one record. A deliberate new signup reactivates an unsubscribed address. The admin uses live Firestore subscriptions.

The separate checkout notification flow can create pending subscriptions that require confirmation. Its confirmation links use the Firebase Hosting origin, so they also work when the storefront is served by GitHub Pages. Pending, unsubscribed and other inactive statuses are excluded by both the composer and the campaign sender. Existing records without a status retain legacy active treatment. Campaign addresses are deduplicated.

## Production deployment

The production marketing client uses `https://drixel-sa.web.app` by default, including when the frontend is served by GitHub Pages or its custom domain. Local Vite uses its Functions proxy. `VITE_API_BASE_URL` can override the production API origin at build time. The marketing Functions allow the Drixel, Firebase and repository Pages origins explicitly. Localhost origins are allowed only inside the Functions emulator.

From the project root, with the correct Firebase account authenticated:

```powershell
npm install
npm --prefix functions install
npm run build
npx firebase deploy --only "hosting,functions:subscribeNewsletter,functions:unsubscribeNewsletter,functions:sendCampaign,functions:sendEmail,functions:newsletterPreferences,functions:orderNotifications" --project drixel-sa
```

The existing Firestore rules must also be deployed and permit verified admin access to subscribers and campaigns. Deployment requires Firebase access and appropriate project billing. This repository update does not prove deployment or live inbox delivery.

`RESEND_API_KEY` must exist as a Firebase secret bound to `sendCampaign` and `sendEmail`. If it is missing, configure it using the Firebase CLI secure prompt:

```powershell
npx firebase functions:secrets:set RESEND_API_KEY --project drixel-sa
```

Never put the key in a Vite environment variable, source code or chat. Resend must verify the sender domain `customer.drixelsa.co.za` (or the domain configured in `MAIL_FROM`). The default sender is `Drixel SA <info@customer.drixelsa.co.za>`. `PUBLIC_SITE_URL`, if set, must point to Firebase Hosting or another site that actually serves the unsubscribe route. Its default is the Firebase Hosting origin.

## Send results

The sender atomically claims a saved draft. Concurrent sends, previously submitted records and delivery-unknown records cannot send again. It submits personalised batches of up to 100 with pacing and stable provider idempotency keys. Each email contains its own unsubscribe link and List-Unsubscribe headers. Legacy/checkout records receive a working preference token before sending.

HTTP rejection is recorded as failed with a provider diagnostic. An ambiguous/network/interrupted send is `delivery_unknown` and must be reconciled in provider logs before copying/resending. Accepted and failed counts are recorded during the send. Full acceptance is `sent`; mixed results are `partial`; complete explicit rejection is `failed`. `sent` means submitted to the provider, not confirmed inbox delivery. Opens, clicks, bounces and inbox delivery are not tracked here.

Unsubscribe links first show a confirmation page on GET so email scanners do not silently remove subscribers. POST performs unsubscribe; one-click unsubscribe clients can POST directly. The sender supports at most 5,000 active addresses per campaign.

## Local checks

```powershell
node --test tests/admin-campaign.cjs
npm run test:admin
npm run test:marketing
```

Browser checks require a running Vite server and Playwright Chromium. They use isolated Firebase and email fixtures; they do not send real email or write production subscriptions.

For local Firebase data, opt in with `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local`, restart Vite and run the Functions, Auth and Firestore emulators. Local users and subscriber records are separate from production. Do not assume a locally authenticated admin or subscriber already exists.

## Artwork previews and sent email

The library thumbnails and composer resolve bundled artwork against the current website origin, so local Vite previews load local files. Outgoing HTML uses verified public JPEGs pinned to repository revision `768eb98e781d23c7223bad847b988c4093548ea8` for the nine bundled campaign photos; it does not use localhost or depend on the missing custom-domain asset URLs. Custom image URLs are preserved. Destination links continue to point to the public store.

Marketing browser checks load the real bundled JPEGs and assert successful decoding in all advertisement thumbnails and both Lookbook images. Keep `public/assets/campaigns` in the checkout and build.
