# Drixel SA storefront

Static HTML/CSS/JavaScript storefront with Firebase Authentication, Firestore and server-controlled commerce functions. Deploy the site and API together on Firebase Hosting. GitHub Pages alone cannot serve the newsletter and administrator email API routes.

## Local checks

Use Node.js 22 and Java 21 (the Firestore emulator needs Java 21 with Firebase CLI 15).

```sh
npm ci
npm ci --prefix functions
npm test
npm run check
npm run test:rules
npx playwright install chromium --with-deps
```

For the isolated browser tests, run `python -m http.server 8765` in one terminal and `npm run test:browser` and `npm run test:layout` in another. The layout suite checks all 45 HTML pages at 320, 360, 390, 768, 1024 and 1440 pixels, including populated product templates, checkout control alignment and mobile navigation. They mock Firebase and make no real orders, payments or email requests.

## Before deploying

1. Use the existing `drixel-sa` Firebase project, with billing enabled for functions and scheduled reservation cleanup. Confirm the project explicitly in every deployment command.
2. Copy `functions/.env.example` to `functions/.env.drixel-sa`. Keep `CARD_PAYMENTS_ENABLED=false` until the provider setup and test payment have passed. Set the production `STORE_URL` and verified email sender. Preserve the existing Drixel ID `DRIXEL_API_URL` if using central account sync.
3. Set `RESEND_API_KEY`, `YOCO_SECRET_KEY`, `YOCO_WEBHOOK_SECRET`, and the existing `DRIXEL_SYNC_KEY` in Firebase Secret Manager. Do not enter keys in the storefront, commit them, or paste them into issues. Obtain the webhook secret by registering the endpoint with Yoco. Use test Yoco credentials for staging.
4. Verify the Firebase admin account email, or grant an `admin: true` custom claim from a trusted administrative environment. A matching unverified email no longer grants access. Existing users should sign out and back in after claim changes.
5. Ensure real products exist in Firestore with numeric ZAR `price`, `sizes`, `colors` and status `active`. Local sample products are not authoritative. Set `stock` to a nonnegative integer, or `null` for intentionally unlimited stock. Optional `variants` entries use `{size, color, stock}`; when present, every purchasable combination needs an entry. The stock values represent currently available units, excluding reserved stock.
6. Rotate any Yoco or Resend secret previously entered in the browser or the old `settings/store_config` document. The new rules make that document private. Saving Store Settings replaces it with delivery-only fields; the server exposes only delivery amounts through `getCheckoutConfig`.

```sh
npx firebase login
npx firebase functions:secrets:set RESEND_API_KEY --project drixel-sa
npx firebase functions:secrets:set YOCO_SECRET_KEY --project drixel-sa
npx firebase functions:secrets:set YOCO_WEBHOOK_SECRET --project drixel-sa
# Preserve/set DRIXEL_SYNC_KEY for the existing Drixel ID integration.
npx firebase deploy --only firestore,functions,hosting --project drixel-sa
```

Deploy while the storefront remains in maintenance. Do not ship only the new frontend or only the rules: old client checkout is deliberately rejected by the new rules. Firebase API deployment is required; merging the repository is not a production deployment.

## Yoco setup and release test

Register the Checkout API webhook URL:
`https://us-central1-drixel-sa.cloudfunctions.net/yocoWebhook`

The endpoint checks the raw body HMAC, timestamp, payment mode, checkout identity, amount, currency and payment ID. It requires Yoco Checkout API `payment.succeeded` notifications. A redirect back to the storefront never changes payment status. Creation uses provider idempotency keys.

Use a staging Firebase project and Yoco test keys to test an actual successful payment, rejection, cancellation and webhook retry. Update the client Firebase configuration when using a staging project. After those tests, set live secrets and `CARD_PAYMENTS_ENABLED=true`, redeploy functions, and complete a controlled production purchase before reopening. Do not enable live checkout using test keys.

Also verify a bank order, SnapScan reference, confirmation email, shipping notification, coupon, newsletter confirmation/unsubscribe and contact request. The tests in this repository do not prove live provider configuration, DNS, sender verification or real delivery.

Official references:
- https://developer.yoco.com/guides/online-payments/accepting-a-payment
- https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events
- https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout
- https://firebase.google.com/docs/functions/manage-functions

## Operational behaviour

- Server prices and validates every line and coupon. Customers review the authoritative total before creating an order. Duplicate requests return the original order.
- Stock is reserved transactionally. Unpaid card orders expire after 30 minutes; bank/SnapScan orders after 48 hours. A scheduled job releases reservations every 15 minutes. Coupon use is reserved/released with stock.
- A late paid card order with released stock becomes `payment_review`. Reconcile stock and the actual payment manually before fulfillment; do not automatically ship or silently discard it.
- Administrators confirm only bank/SnapScan payments and must verify receipts externally. Card payments require the signed provider notification. Paid cancellations/refunds require reconciliation with the provider; this change does not implement automated refunds.
- Historical orders are not retroactively trusted as proof of payment. Audit older `paid` orders against the provider before fulfillment. New orders are tied to a Firebase UID; legacy orders without a UID can be looked up only with the matching verified email, or by an administrator.
- Order emails use a private `mail_jobs` queue, provider idempotency and retryable triggers. Monitor `failed` and `needs_review` jobs. After 23 hours, automatic sending stops to avoid exceeding the provider's idempotency window. Reconcile provider delivery before manually creating a replacement job.
- Newsletter signup uses explicit opt-in and email confirmation. It no longer promises an unimplemented 15% coupon. The confirmation email retains a link for unsubscribe. Subscriber records, support messages and audit records are private.
- Existing email-template editing is for manual administrator emails. Automatic transaction notices use the server templates in `functions/notifications.js`.
- Configure Firestore TTL for `request_limits.expiresAt` through the supplied index configuration. Monitor function errors, reservation cleanup and mail jobs after release. Add Firebase App Check enforcement when production browser configuration has been verified.
