# Launch resolution — 7 October 2026

## Code changes

- Bag shows delivery calculated at checkout; removes the obsolete R70/free-over-R1,000 calculation.
- Admin access fails when the security service is unavailable. Missing backend/Firestore security configuration requires device verification by default. An explicit server-owned `passkeysRequired:false` remains an intentional compatibility setting.
- Account loading, address saves, password resets and sign-out have confirmation or retry feedback.
- Bag, account and login have their own titles and noindex metadata. Regional alternatives omit the invalid EU country tag. Both the root and www production hosts are eligible for indexing.
- Gallery instructions appear only with a second photo and occupy a full row. Support links and category labels have consistent styling.
- Homepage campaigns recheck scheduling while open. Homepage photography/reels are editable, sortable, uploadable and hideable; the default selection is three photos/two reels, with one newsletter signup.
- Newsletter signup explains marketing consent, opt-out and privacy.
- Products, orders, customers, returns, coupons, subscribers and audit logs use bounded record pages. Search and bulk changes clearly apply to the loaded page. Aggregate analytics, inventory and specialist campaign tools still need a server-side reporting/query migration for very large datasets.
- Product admin flags missing prices, descriptions, stock, photos and measurements without creating business data.
- Service Health has an authenticated readiness check for seller fields, queues, email configuration and the Resend sending domain. Provider permission errors are reported as unverified, rather than ready.
- Build writes static route entries for supported markets and active product URLs, and regenerates the sitemap. CI obtains a public catalogue snapshot and fails if that snapshot cannot be fetched.
- Router and gRPC dependencies are updated. Deployments preserve existing Cloudflare payment variables; default test values are no longer written over production settings.
- Custom authentication domain can be configured with `VITE_FIREBASE_AUTH_DOMAIN` after its hosting/OAuth setup is complete.

## Production activation

1. Deploy the frontend through React V3 Quality Gate.
2. Deploy the Worker with `npm --prefix worker run deploy`. The deployment preserves dashboard variables; verify `CARD_PAYMENTS_ENABLED`, `YOCO_MODE`, `PUBLIC_SITE_URL`, `MAIL_FROM` and `ADMIN_PASSKEYS_ENABLED` in the existing production environment. Secrets remain in Cloudflare.
3. Deploy `firestore:rules,firestore:indexes` for project `drixel-sa`. Existing passkey registration/recovery endpoints permit enrollment separately from protected admin data.
4. In Service Health, check/create the queue index and check launch services. A sender-domain check requires domain-read permission; sending-only keys may not allow it.
5. Verify the actual phone/laptop passkey session, one explicitly selected test recipient's delivery event and inbox, and a controlled live payment/order/receipt. Do not rerun an uncertain campaign.

## Business and account facts required

- Publish accurate seller identity, service and physical addresses, privacy contact and applicable business legal documents in Store settings.
- Enter real product stock and measured size charts. Upload separate front/back product photos; rename generic products according to their actual designs.
- Confirm SnapScan webhook provisioning and the merchant SnapCode with SnapScan before enabling that method. The merchant ID and public QR code discrepancy remains unresolved until the provider confirms it.
- Configure Google OAuth branding and the authorized redirect URL `https://auth.drixelsa.co.za/__/auth/handler`, verify Firebase Hosting/domain certificate and authorized domains, then set the repository variable `VITE_FIREBASE_AUTH_DOMAIN=auth.drixelsa.co.za`. A reachable URL alone does not establish OAuth readiness.

## Hosting and recovery work requiring account access

GitHub Pages cannot apply `firebase.json` response headers. Configure the actual Cloudflare response-header rules (or move to the configured Firebase hosting service) and verify live responses for CSP, anti-framing, referrer and content-type protections. Do not claim header protection from a file that the active host ignores.

Create a recoverable Firestore backup/export using the production Google Cloud account, document retention and storage cost, and exercise restoration in an isolated project. Configure production monitoring for failed/stale mail queues and payment-webhook errors. Console health records and local tests do not replace external alerts or a tested backup.

No inbox delivery, paid transaction, domain configuration, backup, seller data or production rules deployment is confirmed merely by a successful frontend build.
