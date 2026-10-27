# Product and delivery operations

- Products: enter verified fabric/composition, fit and care instructions. Existing measurements and colour photos remain available; blank details stay hidden. Do not guess garment measurements.
- Products: set a non-negative low-stock threshold. Dashboard and Inventory compare each variant against it; Inventory can show only low or empty stock.
- Settings → Markets: enter actual delivery processing/transit timeframes. Product and bag pages show configured delivery fees and free-shipping thresholds. Checkout remains authoritative.
- Orders: open a paid order, save courier name, tracking number and optional HTTPS tracking URL, then mark shipped when dispatched. Customers see tracking in their signed-in order page. Order update emails include tracking.
- An email being queued is not confirmation of delivery. Review Operations health and provider logs if queuing fails or a mail job needs review. Never blindly retry uncertain sends.

## Release

The frontend deploys through the branch's GitHub Actions workflow. Update the API Worker separately:

```powershell
git pull --no-rebase --no-edit origin react-v3-migration
npm --prefix worker ci --no-audit --no-fund
npm --prefix worker run deploy
```

No new Firestore or Storage rules are required. Browser tests use mocked accounts and API responses; they do not send real email or take payment.
