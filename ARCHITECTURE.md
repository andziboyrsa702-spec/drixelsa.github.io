# Drixel V2 architecture

This branch begins the migration from a monolithic static storefront to a maintainable commerce application while keeping the existing storefront operational.

## Current problems being removed

- Storefront, authentication, payments, admin, fulfilment, marketing and catalogue logic are concentrated in one very large `index.js`.
- Admin UI is injected into customer-facing pages.
- Repeated HTML, favicons and manifests exist throughout product directories.
- Product data is duplicated between local JavaScript and Firestore.
- Large campaign media is committed at repository root with source-device filenames.
- Page-specific styles and shared styles are mixed in one very large stylesheet.

## Target boundaries

```text
/admin                 dedicated back office
/assets                organised brand/product/campaign media
/src/components         shared storefront components
/src/pages              page controllers
/src/services           Firebase/auth/catalogue/order/payment services
/src/styles             design tokens, base, components, page styles
/functions              trusted server operations, webhooks and email
```

## Admin V2

The new `/admin/` area is deliberately separate from the storefront. It currently provides:

- authenticated administrator gate
- store overview
- orders and fulfilment status management
- product catalogue CRUD
- stock overview
- customer list
- campaign/banner visibility
- discounts visibility
- payment review queue
- shipping queue
- store settings foundation

Firestore rules remain the final authorization layer. Hiding UI is never treated as security.

## Migration plan

1. Security hardening (PR #1).
2. Dedicated Admin V2 and repository boundaries (this branch).
3. Extract Firebase/auth/catalogue/order/cart/payment modules from `index.js`.
4. Create shared header, footer, modal, product-card, filters and search components.
5. Replace static product directories with one product route/template backed by Firestore.
6. Move campaign media into organised assets/CDN storage and remove duplicated icons/manifests.
7. Replace repeated storefront HTML with shared templates/components.
8. Build inventory variants (SKU + size + colour + stock) and order fulfilment timeline.
9. Add content/homepage manager and campaign publishing.
10. Regression-test home → product → cart → auth → checkout → payment → order → admin → fulfilment → tracking.

## Rules for new code

- No secrets in client JavaScript or localStorage.
- No admin controls in storefront HTML.
- No new product data hard-coded into page scripts.
- No new duplicated favicons/manifests per product.
- No root-level WhatsApp/camera filenames for production assets.
- Prefer semantic HTML, accessible controls and responsive layouts.
- Firestore/server rules authorize every privileged operation.
