# Customer service release

The storefront keeps its existing domain, content, campaign media, checkout and admin authentication. New modules require the storefront **and** updated API Worker.

## Deploy

From the repository root after pulling `react-v3-migration`:

```powershell
npm ci --no-audit --no-fund
npm --prefix worker ci --no-audit --no-fund
npm --prefix worker run deploy
npx firebase deploy --only firestore:rules --project drixel-sa
```

The existing GitHub workflow builds the store. No new API secrets are needed. Do not send live customer emails to test this release. The stock-alert queue uses the existing mail sender, suppression preferences and email quota. Uncertain sends stop for review.

## Customer care domains

The store already includes `/za/help` and 22 detailed, searchable guides, with equivalents under the other country routes. These work without DNS changes. A separate static help build uses the same content, preventing advice from drifting.

- `help.drixelsa.co.za`: searchable help centre and full guides.
- `members.drixelsa.co.za`: redirects to the existing membership page.
- `orders.drixelsa.co.za`: redirects to the existing authenticated order history.

The two shortcuts keep sign-in and private orders on the store's established domain. No private order pages are copied to the public help site. No wildcard domain or admin domain is introduced.

To deploy the three domains when `drixelsa.co.za` is an active zone in the same Cloudflare account:

```powershell
npm run deploy:help
```

Wrangler's Custom Domains provisioning creates the necessary routes/DNS and certificates for these exact names. Inspect and resolve any pre-existing records at these names rather than deleting them blindly. If the zone is managed elsewhere, first deploy without the `routes` entries to obtain the `drixel-help` Worker preview, and connect an appropriate supported hosting/custom-domain arrangement. Do not change apex records, mail/MX records or existing API DNS.

Main-store links point to `/za/help` until the custom domain has been verified, so customers never rely on an unprovisioned hostname. Help copies canonicalise to the original guides on the store. The existing store sitemap contains the guide pages.

## Google catalogue

The live feed at `https://drixel-api.drixelsa.workers.dev/api/products-feed` reads the current catalogue and allows five-minute caching. Use it for scheduled Merchant Center fetches after deploying the API.

`/products-feed.xml` provides active South African products and variants with SKU-specific links, ZAR prices and stock states from the build-time catalogue snapshot. `/product-feed-readiness.json` reports excluded entries. Submit the feed in the store's verified Merchant Center account and configure shipping/returns there. Account approval and search placement are external steps; this code cannot guarantee ranking or eligibility. Rebuild after catalogue/price/stock changes before a feed fetch. Supply verified age group, gender and identifiers if Google requires them for a particular apparel listing; do not invent them.

## Operational notes

- Returns are review requests, with purchased-quantity checks and an audit trail. One case per order; support can handle additions/reopening. A completed refund needs a provider reference and amount; this feature does not issue money or restock goods.
- Returns use authenticated API endpoints. Customer reads expose case updates, not internal notes. Existing legacy cases remain visible.
- Stock alerts are opt-in, verified-email only, South African catalogue, exact SKU, one notification per watch, 30-day expiry, maximum 20 pending options/account and at most one attempt/account/day.
- Analytics is off by default, respects GPC/DNT, and records deduplicated daily stage counts for consenting browser sessions. No emails, order IDs, full URLs or bag contents are included. Counters are directional, not verified sales. Pseudonymous daily deduplication records are stored server-side; no automatic deletion promise is made.
- Admin priorities show waiting paid orders, unresolved returns and queue failures. Existing dashboard reporting filters still apply to the supplied order set.
- Production email delivery, refund-provider reconciliation and DNS certificates must be checked in their respective service dashboards after deployment.
