# Drixel V2 Architecture

This branch modernizes Drixel without copying another retailer's branding or proprietary assets. Reference sites are used only to study general ecommerce UX patterns: editorial merchandising, restrained navigation, product discovery, whitespace, responsive hierarchy, and clear conversion paths.

## Architecture principles
- Customer storefront and administration are separate surfaces.
- Firestore is the source of truth for catalogue/order/customer operational data.
- One reusable product-detail experience replaces duplicated product HTML over time.
- Shared components replace copied headers, footers, payment modals, and admin controls.
- Payment/email secrets stay server-side.
- Admin mutations remain protected by backend/Firestore authorization.
- Media uses semantic filenames and organized asset folders.
- Progressive migration: existing production flows remain available until their replacement is tested.

## Target structure
- public/assets: brand, campaigns, products, lookbook, icons, video
- src/components: reusable storefront UI
- src/pages: page-level controllers
- src/services: Firebase/auth/catalogue/orders/payment APIs
- src/admin: dedicated administration application
- functions: trusted email/payment/order/webhook operations

## Migration sequence
1. Security hardening.
2. Dedicated admin shell and read-only operational overview.
3. Product/inventory editor with variants and SKU stock.
4. Order fulfilment workspace and tracking timeline.
5. Campaign/homepage content manager.
6. Storefront shared components and navigation.
7. Catalogue filters/search and dynamic product detail.
8. Cart/checkout/payment consolidation.
9. Customer account/order history.
10. Asset cleanup, performance, accessibility, SEO and regression testing.

Do not remove legacy pages until the corresponding V2 flow is verified end-to-end.
