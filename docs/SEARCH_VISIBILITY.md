# Drixel search visibility

The production build creates public route HTML with descriptive titles, descriptions, canonical URLs, English regional alternates, breadcrumbs and structured brand/product data. Product pages and category links have a readable initial HTML snapshot; React loads the interactive store and current prices. The snapshot is the same for people and crawlers. Product prices and stock offers remain live client data, avoiding fabricated currency conversions or stock in static HTML.

`/sitemap.xml` is the sitemap index; child files contain up to 10,000 public URLs per country, active products and their images. Only actual product update timestamps produce lastmod. `/sitemap.html` is the visitor directory linked from the footer. Private pages, checkout, search and unavailable pages use noindex and are excluded from XML sitemaps. Authentication and database rules protect private data; robots directives are not access control.

Production CI uses BUILD_LIVE_CATALOGUE=true and fails if the public catalogue cannot be fetched. Rebuild after publishing, renaming or unpublishing products so the static routes and sitemap reflect the latest catalogue. Product images/variants are decoded from nested Firestore fields. Explicit country URLs remain stable; only the unprefixed homepage uses automatic location selection.

After the GitHub Pages deployment succeeds:
1. Verify ownership of https://drixelsa.co.za in Google Search Console with the domain's DNS TXT record (obtain the actual value from Search Console).
2. Submit https://drixelsa.co.za/sitemap.xml under Sitemaps.
3. Inspect /za, /za/w/tees and a real product URL. Test the live URL and check rendered content, canonical URL and indexing availability.
4. Use Google's Rich Results Test on a product page. Confirm displayed price, currency and availability match the markup.
5. Monitor Pages, Sitemaps, Core Web Vitals and search performance. Check that private routes remain excluded.

No rank, indexing date, rich-result display or placement for unrelated keywords is guaranteed. Use accurate product names, original descriptions, fabric/fit information, clear photos and useful public policies. Do not add hidden keywords, fabricated reviews or artificial pages for unrelated searches.

Build and regression verification do not establish that Google has crawled or indexed the deployed site. Search Console ownership/submission and live Google validation need the owner's account; no verification token is committed by this change.
