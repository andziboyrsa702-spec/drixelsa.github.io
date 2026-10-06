# Upgrade status

## Implemented in source

- Professional admin and marketing layouts, 34 editable advertisement/service-update templates, responsive email previews and subscriber management.
- Shared production API routing; checkout quote recovery and form preservation; catalogue loading/error recovery; malformed cart protection; Pages deep-link recovery.
- Persisted campaign batches, SAST scheduling, source/market/purchase segmentation, affected-order customer updates, cancellation and evidence-based uncertain-delivery reconciliation.
- Signed delivery/bounce/complaint webhooks, duplicate event protection, provider acceptance versus delivery counts and email suppression.
- Current consent checks at send time; protected server-owned queue/history records; private operational settings; client order mutations blocked.
- Firebase Admin SDK v14 compatibility for existing HTTP handlers and new Functions initialization.
- Atomic reservation and restoration for products without variants, as well as variant stock. Old orders without a plain-stock reservation are not incorrectly restocked.
- Lazy storefront routes, separate Firebase Auth loading, storefront crash recovery, canonical links, regional alternatives, product currency/availability metadata, robots and a static regional sitemap.
- Optional managed email artwork base URL and an Operations service-health page for the scheduled worker.
- Automated queue, webhook, cart, stock, admin and responsive-browser regression checks; CI runs the new campaign tests.

## Requires live account configuration and verification

The code is not a substitute for deployment. Firebase Functions, rules, indexes and scheduler must be deployed; Resend secrets, sender verification and signed webhook registration must be completed. Real inbox delivery, production ordering and deployed access controls remain unverified. No production emails or customer-data changes were performed by this update.

Card payments remain disabled pending provider setup and end-to-end payment verification. Daily backups and external monitoring notification channels require Google Cloud configuration. Managed email artwork needs verification on the chosen host before changing the build variable. The static sitemap does not enumerate live products. A Firebase dependency chunk remains above Vite's size warning threshold despite reducing the main entry bundle.

Follow [marketing operations and rollout](marketing-operations.md) for exact local-update, deployment, monitoring and acceptance steps. Pull the `react-v3-migration` branch; finish any existing merge first. Hosting/Pages publishing alone does not deploy the email backend.

## Product media and bag follow-up

Product records now preserve the real Firestore document ID even when old stored fields contain a different ID. Add-to-bag reports validation failure instead of navigating to an empty bag, and blank variant price overrides inherit the base price. A browser regression covers this complete flow and reload persistence.

Separate front/back uploads, hover/focus image switching, gallery uploads, a studio media library, email/campaign artwork uploads and a homepage-video upload are implemented. Inter is hosted locally with its font license; storefront controls share typography and styled dropdowns. Firebase Storage rules and administrator-only media metadata rules are included and tested. Live upload permission still depends on enabling Storage and deploying these rules. The live Firebase API routes returned 404 during this follow-up; email/checkout cannot work there until the backend is deployed.
